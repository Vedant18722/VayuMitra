import type {
  AirQualityPayload,
  AssistantStructuredAnswer,
  GeocodingResult,
  LocationPreset,
  NotificationCapabilities,
  ReverseGeocodeResult,
  UserPreferences,
} from '../types';
import { buildRuleBasedAssistantAnswer } from '../utils/aqi';

const inflightAirQuality = new Map<string, Promise<AirQualityPayload>>();
let inflightAssistantKey: string | null = null;

function isPlainRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Runtime type guard validating external/server AirQualityPayload shape before UI consumption.
 */
export function isValidAirQualityPayload(val: unknown): val is AirQualityPayload {
  if (!isPlainRecord(val)) return false;
  const loc = val.location;
  const cur = val.current;
  if (!isPlainRecord(loc) || !isPlainRecord(cur)) return false;
  if (
    typeof loc.id !== 'string' ||
    typeof loc.name !== 'string' ||
    typeof loc.latitude !== 'number' ||
    !Number.isFinite(loc.latitude) ||
    typeof loc.longitude !== 'number' ||
    !Number.isFinite(loc.longitude)
  ) {
    return false;
  }
  if (!Array.isArray(val.hourly)) return false;
  if (typeof val.status !== 'string' || typeof val.fetchedAt !== 'string') return false;
  return true;
}

/**
 * Runtime type guard validating all 6 structured fields of an AI Assistant answer.
 */
export function isValidAssistantStructuredAnswer(val: unknown): val is AssistantStructuredAnswer {
  if (!isPlainRecord(val)) return false;
  const requiredFields: Array<keyof AssistantStructuredAnswer> = [
    'situation',
    'recommendation',
    'explanation',
    'expectedBenefit',
    'estimatedImpact',
    'limitationsAndUncertainty',
  ];
  return requiredFields.every(
    (field) => typeof val[field] === 'string' && (val[field] as string).trim().length > 0
  );
}

/**
 * Runtime type guard for geocoding search items.
 */
export function isValidGeocodingResult(val: unknown): val is GeocodingResult {
  if (!isPlainRecord(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.name === 'string' &&
    val.name.trim().length > 0 &&
    typeof val.latitude === 'number' &&
    Number.isFinite(val.latitude) &&
    typeof val.longitude === 'number' &&
    Number.isFinite(val.longitude)
  );
}

async function fetchJsonTimeout<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15000
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    let data: T | null = null;
    try {
      data = (await res.json()) as T;
    } catch {
      // Gracefully handle non-JSON proxy error bodies (e.g. HTML 502/504 pages)
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAirQuality(
  location: LocationPreset,
  forceRefresh = false
): Promise<AirQualityPayload> {
  const dedupeKey = `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)},${forceRefresh}`;
  const existing = inflightAirQuality.get(dedupeKey);
  if (existing) return existing;

  const params = new URLSearchParams({
    id: location.id,
    name: location.name,
    region: location.region,
    country: location.country,
    timezone: location.timezone,
    lat: location.latitude.toString(),
    lon: location.longitude.toString(),
    forceRefresh: forceRefresh ? 'true' : 'false',
  });

  const promise = (async () => {
    try {
      const { ok, status, data } = await fetchJsonTimeout<AirQualityPayload & { error?: string }>(
        `/api/air-quality?${params.toString()}`,
        {},
        12000
      );
      if (!ok || !isValidAirQualityPayload(data)) {
        const msg =
          isPlainRecord(data) && typeof data.error === 'string'
            ? data.error
            : `Air quality service returned an unexpected response (HTTP ${status}).`;
        throw new Error(msg);
      }
      return data;
    } finally {
      inflightAirQuality.delete(dedupeKey);
    }
  })();

  inflightAirQuality.set(dedupeKey, promise);
  return promise;
}

export async function searchCityLocations(query: string): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const { ok, data } = await fetchJsonTimeout<{ results?: unknown[]; error?: string }>(
    `/api/geocode?q=${encodeURIComponent(trimmed)}`,
    {},
    9000
  );
  if (!ok) {
    throw new Error(data?.error || 'Could not search cities right now.');
  }
  const rawList = Array.isArray(data?.results) ? data.results : [];
  return rawList.filter(isValidGeocodingResult);
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  const unresolvedFallback = (error: string): ReverseGeocodeResult => ({
    resolved: false,
    displayName: '',
    name: '',
    area: '',
    region: '',
    country: '',
    provider: 'Unavailable',
    resolvedAt: new Date().toISOString(),
    error,
  });

  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
    });
    const { ok, data } = await fetchJsonTimeout<ReverseGeocodeResult & { error?: string }>(
      `/api/reverse-geocode?${params.toString()}`,
      {},
      9000
    );
    if (ok && isPlainRecord(data) && typeof data.resolved === 'boolean') {
      return {
        resolved: data.resolved,
        displayName: typeof data.displayName === 'string' ? data.displayName : '',
        name: typeof data.name === 'string' ? data.name : '',
        area: typeof data.area === 'string' ? data.area : '',
        region: typeof data.region === 'string' ? data.region : '',
        country: typeof data.country === 'string' ? data.country : '',
        provider: typeof data.provider === 'string' ? data.provider : 'Unavailable',
        resolvedAt: typeof data.resolvedAt === 'string' ? data.resolvedAt : new Date().toISOString(),
        error: typeof data.error === 'string' ? data.error : undefined,
      };
    }
    return unresolvedFallback(
      (isPlainRecord(data) && typeof data.error === 'string' ? data.error : null) ||
        'Could not resolve place name for these coordinates.'
    );
  } catch {
    return unresolvedFallback('Reverse geocoding timed out or could not be reached.');
  }
}

export interface AssistantApiResponse {
  source: 'GEMINI_AI' | 'RULE_BASED_FALLBACK';
  structured: AssistantStructuredAnswer;
  notice?: string;
}

export async function queryAirAssistant(
  question: string,
  airQuality: AirQualityPayload | null,
  preferences: UserPreferences,
  activeLocation?: LocationPreset
): Promise<AssistantApiResponse> {
  const effectiveLocation = activeLocation ?? airQuality?.location ?? preferences.defaultLocation;
  const matchingAq =
    airQuality && airQuality.location.id === effectiveLocation.id ? airQuality : null;

  const requestSignature = `${question.trim().toLowerCase()}::${effectiveLocation.id}`;
  if (inflightAssistantKey === requestSignature) {
    throw new Error('DUPLICATE_IN_FLIGHT');
  }

  inflightAssistantKey = requestSignature;
  try {
    const context = {
      locationName: effectiveLocation.name,
      region: effectiveLocation.region,
      dataStatus: matchingAq?.status ?? 'UNAVAILABLE',
      usAqi: matchingAq?.current.usAqi ?? null,
      europeanAqi: matchingAq?.current.europeanAqi ?? null,
      pm25: matchingAq?.current.pm25 ?? null,
      pm10: matchingAq?.current.pm10 ?? null,
      no2: matchingAq?.current.no2 ?? null,
      o3: matchingAq?.current.o3 ?? null,
      so2: matchingAq?.current.so2 ?? null,
      dataTimestamp: matchingAq?.dataTimestamp,
      commuteMode: preferences.commuteMode,
      wakeTime: preferences.wakeTime,
      workStart: preferences.workStart,
      workEnd: preferences.workEnd,
      outdoorPreference: preferences.outdoorPreference,
      householdAgeGroups: preferences.householdAgeGroups,
      indoorConcerns: preferences.indoorConcerns,
    };

    const { ok, data } = await fetchJsonTimeout<{
      source?: 'GEMINI_AI';
      structured?: unknown;
      message?: string;
      code?: string;
    }>(
      '/api/assistant',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      },
      28000
    );

    if (ok && isValidAssistantStructuredAnswer(data?.structured)) {
      return {
        source: 'GEMINI_AI',
        structured: data.structured,
      };
    }

    // Honest rule-based fallback with transparent error notice
    return {
      source: 'RULE_BASED_FALLBACK',
      structured: buildRuleBasedAssistantAnswer(question, matchingAq, preferences, effectiveLocation),
      notice:
        (isPlainRecord(data) && typeof data.message === 'string' ? data.message : null) ||
        'Gemini AI could not respond right now. Displaying context-aware rule-based guidance instead.',
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'DUPLICATE_IN_FLIGHT') {
      throw err;
    }
    return {
      source: 'RULE_BASED_FALLBACK',
      structured: buildRuleBasedAssistantAnswer(question, matchingAq, preferences, effectiveLocation),
      notice:
        'Unable to reach the AI endpoint (timeout or network error). Displaying context-aware rule-based guidance instead.',
    };
  } finally {
    inflightAssistantKey = null;
  }
}

export async function fetchNotificationCapabilities(): Promise<NotificationCapabilities> {
  const fallback: NotificationCapabilities = {
    pageActiveSupported: true,
    backgroundPushConfigured: false,
    backgroundPushStatus: 'NOT_CONFIGURED',
    vapidPublicKey: null,
    reason:
      'Background Web Push (VAPID keys, push subscription storage, and a background delivery service) is not configured in this environment. Page-active browser notifications work while VayuMitra is open.',
  };

  try {
    const { ok, data } = await fetchJsonTimeout<Partial<NotificationCapabilities>>(
      '/api/notifications/capabilities',
      {},
      6000
    );
    if (ok && isPlainRecord(data) && typeof data.backgroundPushConfigured === 'boolean') {
      return {
        pageActiveSupported: Boolean(data.pageActiveSupported ?? true),
        backgroundPushConfigured: data.backgroundPushConfigured,
        backgroundPushStatus:
          data.backgroundPushStatus === 'CONFIGURED' ? 'CONFIGURED' : 'NOT_CONFIGURED',
        vapidPublicKey: typeof data.vapidPublicKey === 'string' ? data.vapidPublicKey : null,
        reason: typeof data.reason === 'string' && data.reason.trim() ? data.reason : fallback.reason,
      };
    }
    return fallback;
  } catch {
    return fallback;
  }
}
