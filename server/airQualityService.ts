import type {
  AirQualityPayload,
  DailyHistoryPoint,
  GroundStationReading,
  HourlyDataPoint,
  LocationPreset,
} from '../src/types/index.ts';
import { aggregateHourlyToDailyHistory } from '../src/utils/aqi.ts';
import { BoundedTtlCache, fetchJsonWithRetry } from './httpUtils.ts';

export { reverseGeocodeCoordinates, searchLocations } from './geocodingService.ts';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 100;
const aqCache = new BoundedTtlCache<AirQualityPayload>(MAX_CACHE_ENTRIES, CACHE_TTL_MS);

function buildCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function toFiniteNumberOrNull(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return Number(val.toFixed(1));
  return null;
}

interface OpenMeteoAirQualityResponse {
  error?: boolean;
  reason?: string;
  timezone?: string;
  timezone_abbreviation?: string;
  utc_offset_seconds?: number;
  current?: {
    time?: string;
    pm10?: number | null;
    pm2_5?: number | null;
    nitrogen_dioxide?: number | null;
    sulphur_dioxide?: number | null;
    ozone?: number | null;
    us_aqi?: number | null;
    european_aqi?: number | null;
  };
  hourly?: {
    time?: string[];
    pm10?: (number | null)[];
    pm2_5?: (number | null)[];
    nitrogen_dioxide?: (number | null)[];
    sulphur_dioxide?: (number | null)[];
    ozone?: (number | null)[];
    us_aqi?: (number | null)[];
    european_aqi?: (number | null)[];
  };
}

export function buildDemoFallbackPayload(location: LocationPreset, reason: string): AirQualityPayload {
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);

  // Representative illustrative winter urban diurnal profile (clearly labelled DEMO)
  const isNorthWinterProfile =
    location.latitude > 24 && location.latitude < 32 && location.longitude > 70 && location.longitude < 85;
  const basePm25 = isNorthWinterProfile ? 118 : 42;
  const basePm10 = isNorthWinterProfile ? 184 : 74;
  const baseUsAqi = isNorthWinterProfile ? 183 : 117;
  const baseEuAqi = isNorthWinterProfile ? 94 : 58;

  const hourly: HourlyDataPoint[] = Array.from({ length: 24 }, (_, idx) => {
    const dt = new Date(now.getTime() + idx * 3600000);
    const hour = dt.getUTCHours();
    const wave =
      hour >= 12 && hour <= 16
        ? -0.22
        : hour >= 6 && hour <= 9
          ? 0.16
          : hour >= 20 || hour <= 2
            ? 0.14
            : 0;
    const pm25 = Number(Math.max(8, basePm25 * (1 + wave)).toFixed(1));
    const pm10 = Number(Math.max(15, basePm10 * (1 + wave * 0.9)).toFixed(1));
    const usAqi = Math.round(Math.max(25, baseUsAqi * (1 + wave * 0.75)));
    const euAqi = Math.round(Math.max(15, baseEuAqi * (1 + wave * 0.7)));
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    const hh = String(dt.getUTCHours()).padStart(2, '0');
    return {
      time: `${yyyy}-${mm}-${dd}T${hh}:00`,
      usAqi,
      europeanAqi: euAqi,
      pm25,
      pm10,
      no2: Number(Math.max(8, (isNorthWinterProfile ? 48 : 26) * (1 + wave)).toFixed(1)),
      o3: Number(Math.max(12, 42 * (1 - wave * 1.1)).toFixed(1)),
      so2: Number(Math.max(4, (isNorthWinterProfile ? 16 : 9) * (1 + wave * 0.4)).toFixed(1)),
    };
  });

  const first = hourly[0];

  // Illustrative 7-day historical profile (clearly marked DEMO fallback)
  const dayMultipliers = [0.92, 1.04, 1.12, 0.98, 0.89, 0.95, 1.0];
  const dailyHistory: DailyHistoryPoint[] = dayMultipliers.map((mult, idx) => {
    const dt = new Date(now.getTime() - (6 - idx) * 24 * 3600000);
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    const usAqi = Math.round(Math.max(25, baseUsAqi * mult));
    const euAqi = Math.round(Math.max(15, baseEuAqi * mult));
    const pm25 = Number(Math.max(8, basePm25 * mult).toFixed(1));
    const pm10 = Number(Math.max(15, basePm10 * mult).toFixed(1));
    const no2 = Number(Math.max(8, (isNorthWinterProfile ? 48 : 26) * mult).toFixed(1));
    const o3 = Number(Math.max(12, 42 * (2 - mult)).toFixed(1));
    const so2 = Number(Math.max(4, (isNorthWinterProfile ? 16 : 9) * mult).toFixed(1));
    return {
      date: `${yyyy}-${mm}-${dd}`,
      usAqi,
      europeanAqi: euAqi,
      pm25,
      pm10,
      no2,
      o3,
      so2,
      maxValues: {
        usAqi: Math.round(usAqi * 1.14),
        pm25: Number((pm25 * 1.18).toFixed(1)),
        pm10: Number((pm10 * 1.16).toFixed(1)),
        no2: Number((no2 * 1.2).toFixed(1)),
        o3: Number((o3 * 1.22).toFixed(1)),
        so2: Number((so2 * 1.12).toFixed(1)),
      },
      minValues: {
        usAqi: Math.round(Math.max(15, usAqi * 0.82)),
        pm25: Number(Math.max(5, pm25 * 0.78).toFixed(1)),
        pm10: Number(Math.max(10, pm10 * 0.8).toFixed(1)),
        no2: Number(Math.max(5, no2 * 0.76).toFixed(1)),
        o3: Number(Math.max(8, o3 * 0.74).toFixed(1)),
        so2: Number(Math.max(3, so2 * 0.84).toFixed(1)),
      },
      sampleCount: idx === 6 ? Math.max(1, now.getUTCHours() + 1) : 24,
    };
  });

  return {
    location: {
      ...location,
      timezone: 'UTC',
    },
    status: 'DEMO',
    isStale: true,
    fetchedAt: new Date().toISOString(),
    dataTimestamp: first.time,
    timezoneAbbreviation: 'UTC',
    providerLabel: 'Illustrative Demo Profile (Live Open-Meteo Feed Temporarily Unavailable)',
    attribution:
      'Demo fallback dataset — not live sensor or forecast data. Primary provider: Open-Meteo Air Quality API powered by Copernicus Atmosphere Monitoring Service (CAMS).',
    notice: `Live Open-Meteo forecast could not be reached (${reason}). Displaying clearly labelled illustrative demo data until connection recovers.`,
    current: {
      usAqi: first.usAqi,
      europeanAqi: first.europeanAqi,
      pm25: first.pm25,
      pm10: first.pm10,
      no2: first.no2,
      o3: first.o3,
      so2: first.so2,
    },
    hourly,
    dailyHistory,
    groundStation: null,
  };
}

async function fetchOptionalOpenAqStation(lat: number, lon: number): Promise<GroundStationReading | null> {
  const apiKey = process.env.OPENAQ_API_KEY?.trim();
  if (!apiKey) return null;

  const headers = {
    'X-API-Key': apiKey,
    Accept: 'application/json',
  };

  try {
    const locUrl = `https://api.openaq.org/v3/locations?coordinates=${lat.toFixed(4)},${lon.toFixed(4)}&radius=15000&limit=3`;
    const locData = await fetchJsonWithRetry<{
      results?: Array<{
        id: number;
        name?: string;
        distance?: number;
        datetimeLast?: { utc?: string };
        sensors?: Array<{
          id: number;
          parameter?: { name?: string };
        }>;
      }>;
    }>(locUrl, { headers }, 0);

    const candidate = locData.results?.[0];
    if (!candidate) return null;

    const sensorParamMap = new Map<number, string>();
    for (const sensor of candidate.sensors ?? []) {
      const paramName = sensor.parameter?.name?.toLowerCase();
      if (typeof sensor.id === 'number' && paramName) {
        sensorParamMap.set(sensor.id, paramName);
      }
    }

    const latestUrl = `https://api.openaq.org/v3/locations/${candidate.id}/latest`;
    const latestData = await fetchJsonWithRetry<{
      results?: Array<{
        sensorsId?: number;
        value?: number;
        datetime?: { utc?: string };
      }>;
    }>(latestUrl, { headers }, 0);

    let pm25: number | null = null;
    let pm10: number | null = null;
    let no2: number | null = null;
    let measuredAt = candidate.datetimeLast?.utc ?? '';

    for (const reading of latestData.results ?? []) {
      const param = typeof reading.sensorsId === 'number' ? sensorParamMap.get(reading.sensorsId) : undefined;
      const val = reading.value;
      if (!param || typeof val !== 'number' || !Number.isFinite(val)) continue;
      if (param === 'pm25') pm25 = Number(val.toFixed(1));
      if (param === 'pm10') pm10 = Number(val.toFixed(1));
      if (param === 'no2') no2 = Number(val.toFixed(1));
      if (reading.datetime?.utc && (!measuredAt || reading.datetime.utc > measuredAt)) {
        measuredAt = reading.datetime.utc;
      }
    }

    if (pm25 === null && pm10 === null && no2 === null) return null;

    return {
      stationName: candidate.name || 'Nearby OpenAQ Station',
      distanceKm: typeof candidate.distance === 'number' ? Number((candidate.distance / 1000).toFixed(1)) : 0,
      measuredAt: measuredAt || new Date().toISOString(),
      pm25,
      pm10,
      no2,
      source: 'OpenAQ',
    };
  } catch {
    return null;
  }
}

export async function getAirQualityForLocation(
  location: LocationPreset,
  forceRefresh = false
): Promise<AirQualityPayload> {
  const key = buildCacheKey(location.latitude, location.longitude);

  if (!forceRefresh) {
    const fresh = aqCache.getFresh(key);
    if (fresh) {
      const ageMs = Date.now() - fresh.cachedAtMs;
      return {
        ...fresh.value,
        location: {
          ...location,
          timezone: fresh.value.location.timezone || location.timezone,
        },
        status: 'CACHED',
        isStale: ageMs > 30 * 60 * 1000,
      };
    }
  }

  const params = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    current: 'pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,european_aqi',
    hourly: 'pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,european_aqi',
    timezone: 'auto',
    past_days: '6',
    forecast_days: '2',
  });

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`;

  try {
    const [omData, groundStation] = await Promise.all([
      fetchJsonWithRetry<OpenMeteoAirQualityResponse>(url, {}, 1),
      fetchOptionalOpenAqStation(location.latitude, location.longitude),
    ]);

    if (omData.error || (!omData.current && !omData.hourly?.time?.length)) {
      throw new Error(omData.reason || 'Malformed Open-Meteo air quality payload');
    }

    const times = omData.hourly?.time ?? [];
    const currentIso = omData.current?.time;

    const allHourly: HourlyDataPoint[] = times.map((time, i) => ({
      time,
      usAqi: toFiniteNumberOrNull(omData.hourly?.us_aqi?.[i]),
      europeanAqi: toFiniteNumberOrNull(omData.hourly?.european_aqi?.[i]),
      pm25: toFiniteNumberOrNull(omData.hourly?.pm2_5?.[i]),
      pm10: toFiniteNumberOrNull(omData.hourly?.pm10?.[i]),
      no2: toFiniteNumberOrNull(omData.hourly?.nitrogen_dioxide?.[i]),
      o3: toFiniteNumberOrNull(omData.hourly?.ozone?.[i]),
      so2: toFiniteNumberOrNull(omData.hourly?.sulphur_dioxide?.[i]),
    }));

    // Pick 24 hourly forecast points starting near the current local timestamp
    let startIdx = Math.max(0, allHourly.length - 24);
    if (currentIso && times.length > 0) {
      const currentHourPrefix = currentIso.slice(0, 13);
      const foundIdx = times.findIndex((t) => t.startsWith(currentHourPrefix));
      if (foundIdx >= 0) {
        startIdx = Math.max(0, Math.min(foundIdx, Math.max(0, times.length - 24)));
      }
    }

    const sliceEnd = Math.min(allHourly.length, startIdx + 24);
    const hourly = allHourly.slice(startIdx, sliceEnd);
    const dailyHistory = aggregateHourlyToDailyHistory(allHourly, currentIso || hourly[0]?.time, 7);

    const payload: AirQualityPayload = {
      location: {
        ...location,
        timezone: omData.timezone || location.timezone || 'UTC',
      },
      status: 'FORECAST',
      isStale: false,
      fetchedAt: new Date().toISOString(),
      dataTimestamp: currentIso || hourly[0]?.time || new Date().toISOString(),
      timezoneAbbreviation: omData.timezone_abbreviation || omData.timezone || 'Local',
      providerLabel: 'Open-Meteo Air Quality API (Copernicus CAMS Atmospheric Model Forecast)',
      attribution:
        'Contains modified Copernicus Atmosphere Monitoring Service (CAMS) information via Open-Meteo. Modelled grid forecasts & 7-day historical reanalysis (~45 km global / ~11 km Europe) — distinct from official CPCB ground monitoring stations.',
      current: {
        usAqi: toFiniteNumberOrNull(omData.current?.us_aqi),
        europeanAqi: toFiniteNumberOrNull(omData.current?.european_aqi),
        pm25: toFiniteNumberOrNull(omData.current?.pm2_5),
        pm10: toFiniteNumberOrNull(omData.current?.pm10),
        no2: toFiniteNumberOrNull(omData.current?.nitrogen_dioxide),
        o3: toFiniteNumberOrNull(omData.current?.ozone),
        so2: toFiniteNumberOrNull(omData.current?.sulphur_dioxide),
      },
      hourly,
      dailyHistory,
      groundStation,
    };

    aqCache.set(key, payload);
    return payload;
  } catch (err) {
    const stale = aqCache.getStaleAllowed(key);
    if (stale) {
      return {
        ...stale.value,
        location: {
          ...location,
          timezone: stale.value.location.timezone || location.timezone,
        },
        status: 'CACHED',
        isStale: true,
        notice: 'Live refresh failed; displaying cached forecast data that may be outdated.',
      };
    }

    const reason = err instanceof Error ? err.message : 'Network error';
    return buildDemoFallbackPayload(location, reason);
  }
}
