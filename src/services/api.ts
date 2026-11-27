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

async function fetchJsonTimeout<T>(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<{ ok: boolean; status: number; data: T }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const data = (await res.json()) as T;
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
      const { ok, data } = await fetchJsonTimeout<AirQualityPayload & { error?: string }>(
        `/api/air-quality?${params.toString()}`,
        {},
        12000
      );
      if (!ok || !data || !('current' in data)) {
        throw new Error(data?.error || 'Air quality service returned an unexpected response.');
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
  const { ok, data } = await fetchJsonTimeout<{ results?: GeocodingResult[]; error?: string }>(
    `/api/geocode?q=${encodeURIComponent(trimmed)}`,
    {},
    9000
  );
  if (!ok) {
    throw new Error(data?.error || 'Could not search cities right now.');
  }
  return data.results ?? [];
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
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
    if (ok && data && typeof data.resolved === 'boolean') {
      return data;
    }
    return {
      resolved: false,
      displayName: '',
      name: '',
      area: '',
      region: '',
      country: '',
      provider: 'Unavailable',
      resolvedAt: new Date().toISOString(),
      error: data?.error || 'Could not resolve place name for these coordinates.',
    };
  } catch {
    return {
      resolved: false,
      displayName: '',
      name: '',
      area: '',
      region: '',
      country: '',
      provider: 'Unavailable',
      resolvedAt: new Date().toISOString(),
      error: 'Reverse geocoding timed out or could not be reached.',
    };
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
      structured?: AssistantStructuredAnswer;
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

    if (ok && data?.structured) {
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
        data?.message ||
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
      'Background Web Push (VAPID keys, subscription storage, and a background delivery service) is not configured in this environment. Page-active browser notifications work while VayuMitra is open.',
  };

  try {
    const { ok, data } = await fetchJsonTimeout<Partial<NotificationCapabilities>>(
      '/api/notifications/capabilities',
      {},
      6000
    );
    if (ok && data && typeof data.backgroundPushConfigured === 'boolean') {
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

