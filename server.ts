import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import {
  getAirQualityForLocation,
  reverseGeocodeCoordinates,
  searchLocations,
} from './server/airQualityService.ts';
import { askGeminiAirAssistant, type AssistantRequestContext } from './server/geminiService.ts';
import { validatePushSubscriptionPayload } from './server/pushValidation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Bounded in-memory sliding-window rate limiter (prunes stale entries to prevent unbounded memory growth)
function createRateLimiter(maxRequests: number, windowMs: number, maxTrackedKeys = 500) {
  const buckets = new Map<string, number[]>();
  return function isRateLimited(key: string): boolean {
    const now = Date.now();
    const existing = buckets.get(key);
    const active = existing ? existing.filter((t) => now - t < windowMs) : [];

    if (active.length >= maxRequests) {
      buckets.set(key, active);
      return true;
    }

    active.push(now);
    buckets.delete(key); // Refresh LRU position
    buckets.set(key, active);

    if (buckets.size > maxTrackedKeys) {
      for (const [k, times] of buckets) {
        if (times.every((t) => now - t >= windowMs)) {
          buckets.delete(k);
        }
        if (buckets.size <= maxTrackedKeys) break;
      }
      while (buckets.size > maxTrackedKeys) {
        const oldestKey = buckets.keys().next().value;
        if (!oldestKey) break;
        buckets.delete(oldestKey);
      }
    }
    return false;
  };
}

const isAssistantRateLimited = createRateLimiter(20, 60 * 1000);
const isGeocodeRateLimited = createRateLimiter(40, 60 * 1000);
const isForceRefreshRateLimited = createRateLimiter(15, 60 * 1000);
const isPushSubRateLimited = createRateLimiter(15, 60 * 1000);

function getPushCapabilitySummary() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || '';
  const subject = process.env.VAPID_SUBJECT?.trim() || '';
  // True background push requires VAPID keys AND a configured push delivery service / persistent subscriber store.
  const hasVapid = Boolean(publicKey && privateKey && subject);
  return {
    pageActiveSupported: true,
    backgroundPushConfigured: false,
    backgroundPushStatus: 'NOT_CONFIGURED' as const,
    vapidPublicKey: hasVapid ? publicKey : null,
    reason: hasVapid
      ? 'VAPID keys detected, but no persistent push subscription store or background push scheduler is configured in this local-first environment.'
      : 'Background Web Push (VAPID keys, push subscription storage, and a background delivery worker) is not configured in this environment. Page-active Browser Notifications work while VayuMitra is open.',
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  // Baseline HTTP security headers (iframe-compatible for preview environments; geolocation permitted for Use GPS)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=()');
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  // Clean JSON error response for malformed JSON payloads
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
      res.status(400).json({ error: 'Malformed JSON request body.' });
      return;
    }
    next(err);
  });

  app.get('/api/health', (_req, res) => {
    const pushCaps = getPushCapabilitySummary();
    res.json({
      status: 'ok',
      openAqConfigured: Boolean(process.env.OPENAQ_API_KEY?.trim()),
      backgroundPushConfigured: pushCaps.backgroundPushConfigured,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/notifications/capabilities', (_req, res) => {
    res.json(getPushCapabilitySummary());
  });

  app.post('/api/notifications/subscribe', (req, res) => {
    if (isPushSubRateLimited(req.ip || 'local')) {
      res.status(429).json({
        code: 'RATE_LIMITED',
        error: 'Too many subscription attempts. Please try again shortly.',
      });
      return;
    }

    const validation = validatePushSubscriptionPayload(req.body);
    if (!validation.valid) {
      res.status(400).json({
        code: 'INVALID_SUBSCRIPTION',
        error: validation.error,
      });
      return;
    }

    const caps = getPushCapabilitySummary();
    if (!caps.backgroundPushConfigured) {
      res.status(503).json({
        code: 'PUSH_NOT_CONFIGURED',
        error: caps.reason,
      });
      return;
    }

    res.status(501).json({
      code: 'PUSH_DELIVERY_UNAVAILABLE',
      error: 'Background push delivery worker is not enabled.',
    });
  });

  app.get('/api/air-quality', async (req, res) => {
    const rawLat = typeof req.query.lat === 'string' ? req.query.lat.trim() : '';
    const rawLon = typeof req.query.lon === 'string' ? req.query.lon.trim() : '';
    const lat = rawLat ? Number(rawLat) : Number.NaN;
    const lon = rawLon ? Number(rawLon) : Number.NaN;

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Invalid latitude or longitude query parameters.' });
      return;
    }

    const name = typeof req.query.name === 'string' && req.query.name.trim() ? req.query.name.trim().slice(0, 80) : 'Selected Location';
    const region = typeof req.query.region === 'string' ? req.query.region.trim().slice(0, 80) : '';
    const country = typeof req.query.country === 'string' ? req.query.country.trim().slice(0, 80) : '';
    const timezone = typeof req.query.timezone === 'string' ? req.query.timezone.trim().slice(0, 60) : 'UTC';
    const id = typeof req.query.id === 'string' ? req.query.id.trim().slice(0, 60) : `loc-${lat.toFixed(2)}-${lon.toFixed(2)}`;
    const forceRefresh = req.query.forceRefresh === 'true';
    if (forceRefresh && isForceRefreshRateLimited(req.ip || 'local')) {
      res.status(429).json({ error: 'Too many live refresh requests. Please wait a moment before refreshing again.' });
      return;
    }

    try {
      const payload = await getAirQualityForLocation(
        { id, name, region, country, latitude: lat, longitude: lon, timezone },
        forceRefresh
      );
      res.json(payload);
    } catch {
      res.status(500).json({ error: 'Unable to retrieve air quality data.' });
    }
  });

  app.get('/api/geocode', async (req, res) => {
    if (isGeocodeRateLimited(req.ip || 'local')) {
      res.status(429).json({ error: 'Too many location searches. Please wait a moment and try again.' });
      return;
    }
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2 || q.length > 80) {
      res.status(400).json({ error: 'Search query must be between 2 and 80 characters.' });
      return;
    }
    try {
      const results = await searchLocations(q);
      res.json({ results });
    } catch {
      res.status(502).json({ error: 'Location search is temporarily unavailable. Try entering coordinates directly.' });
    }
  });

  app.get('/api/reverse-geocode', async (req, res) => {
    if (isGeocodeRateLimited(req.ip || 'local')) {
      res.status(429).json({ error: 'Too many location lookup requests. Please wait a moment and try again.' });
      return;
    }
    const rawLat = typeof req.query.lat === 'string' ? req.query.lat.trim() : '';
    const rawLon = typeof req.query.lon === 'string' ? req.query.lon.trim() : '';
    const lat = rawLat ? Number(rawLat) : Number.NaN;
    const lon = rawLon ? Number(rawLon) : Number.NaN;

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Invalid latitude or longitude query parameters.' });
      return;
    }

    try {
      const result = await reverseGeocodeCoordinates(lat, lon);
      res.json(result);
    } catch {
      res.status(502).json({
        resolved: false,
        displayName: '',
        name: '',
        area: '',
        region: '',
        country: '',
        provider: 'Unavailable',
        resolvedAt: new Date().toISOString(),
        error: 'Reverse geocoding service is temporarily unavailable.',
      });
    }
  });

  app.post('/api/assistant', async (req, res) => {
    const clientIp = req.ip || 'local';
    if (isAssistantRateLimited(clientIp)) {
      res.status(429).json({
        code: 'CLIENT_RATE_LIMITED',
        message: 'Too many requests in a short window. Please wait a moment before asking again.',
      });
      return;
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({
        code: 'INVALID_BODY',
        message: 'Request body must be a JSON object.',
      });
      return;
    }

    const body = req.body as { question?: unknown; context?: Partial<AssistantRequestContext> };
    const question = typeof body.question === 'string' ? body.question.trim() : '';

    if (!question || question.length < 4 || question.length > 600) {
      res.status(400).json({
        code: 'INVALID_QUESTION',
        message: 'Question must be between 4 and 600 characters.',
      });
      return;
    }

    const rawCtx = body.context ?? {};
    const safeNumberOrNull = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;

    const context: AssistantRequestContext = {
      locationName: typeof rawCtx.locationName === 'string' ? rawCtx.locationName.slice(0, 80) : 'Unknown City',
      region: typeof rawCtx.region === 'string' ? rawCtx.region.slice(0, 80) : undefined,
      dataStatus: typeof rawCtx.dataStatus === 'string' ? rawCtx.dataStatus.slice(0, 30) : 'DEMO',
      usAqi: safeNumberOrNull(rawCtx.usAqi),
      europeanAqi: safeNumberOrNull(rawCtx.europeanAqi),
      pm25: safeNumberOrNull(rawCtx.pm25),
      pm10: safeNumberOrNull(rawCtx.pm10),
      no2: safeNumberOrNull(rawCtx.no2),
      o3: safeNumberOrNull(rawCtx.o3),
      so2: safeNumberOrNull(rawCtx.so2),
      dataTimestamp: typeof rawCtx.dataTimestamp === 'string' ? rawCtx.dataTimestamp.slice(0, 40) : undefined,
      commuteMode: typeof rawCtx.commuteMode === 'string' ? rawCtx.commuteMode.slice(0, 30) : undefined,
      wakeTime: typeof rawCtx.wakeTime === 'string' ? rawCtx.wakeTime.slice(0, 10) : undefined,
      workStart: typeof rawCtx.workStart === 'string' ? rawCtx.workStart.slice(0, 10) : undefined,
      workEnd: typeof rawCtx.workEnd === 'string' ? rawCtx.workEnd.slice(0, 10) : undefined,
      outdoorPreference: typeof rawCtx.outdoorPreference === 'string' ? rawCtx.outdoorPreference.slice(0, 30) : undefined,
      householdAgeGroups: Array.isArray(rawCtx.householdAgeGroups)
        ? rawCtx.householdAgeGroups.filter((g): g is string => typeof g === 'string').slice(0, 6)
        : [],
      indoorConcerns: Array.isArray(rawCtx.indoorConcerns)
        ? rawCtx.indoorConcerns.filter((c): c is string => typeof c === 'string').slice(0, 8)
        : [],
    };

    const result = await askGeminiAirAssistant(question, context);
    if (result.ok) {
      res.json({
        source: 'GEMINI_AI',
        structured: result.answer,
      });
      return;
    }

    res.status(result.statusCode).json({
      code: result.code,
      message: result.message,
    });
  });

  const httpServer = http.createServer(app);
  let viteServer: ViteDevServer | null = null;

  if (!IS_PROD) {
    // Attach Vite's WebSocket server to the shared Express HTTP server (port 3000) so
    // HMR/WebSocket upgrades flow over the main HTTP/HTTPS proxy instead of an unreachable port 24678.
    viteServer = await createViteServer({
      server: {
        middlewareMode: true,
        ws: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`VAYUMITRA server listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    void (async () => {
      try {
        if (viteServer) {
          await viteServer.close();
        }
      } finally {
        httpServer.close(() => process.exit(0));
      }
    })();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start VAYUMITRA server:', err);
  process.exit(1);
});
