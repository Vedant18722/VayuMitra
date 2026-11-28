import type { GeocodingResult, ReverseGeocodeResult } from '../src/types/index.ts';
import { BoundedTtlCache, fetchJsonWithRetry } from './httpUtils.ts';

const GEO_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_GEO_CACHE_ENTRIES = 100;

const geoCache = new BoundedTtlCache<GeocodingResult[]>(MAX_GEO_CACHE_ENTRIES, GEO_CACHE_TTL_MS);
const reverseGeoCache = new BoundedTtlCache<ReverseGeocodeResult>(MAX_GEO_CACHE_ENTRIES, GEO_CACHE_TTL_MS);

const NOMINATIM_HEADERS = {
  'User-Agent': 'VayuMitra-AirQuality-Assistant/1.0 (https://open-meteo.com)',
  Accept: 'application/json',
};

export function composeReadablePlace(parts: {
  area?: string;
  city?: string;
  state?: string;
  country?: string;
}): { name: string; area: string; region: string; country: string; displayName: string } {
  const clean = (s?: string) => (s ?? '').trim();
  const area = clean(parts.area);
  const city = clean(parts.city);
  const state = clean(parts.state);
  const country = clean(parts.country);

  const primaryName = city || area || state || '';
  const distinctArea = area && area.toLowerCase() !== primaryName.toLowerCase() ? area : '';
  const distinctState = state && state.toLowerCase() !== primaryName.toLowerCase() ? state : '';

  const segments = [distinctArea, primaryName, distinctState, country].filter(Boolean);
  return {
    name: primaryName,
    area: distinctArea,
    region: distinctState || state,
    country,
    displayName: segments.join(', '),
  };
}

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  const cleaned = query.trim().slice(0, 80);
  if (cleaned.length < 2) return [];

  const cacheKey = cleaned.toLowerCase();
  const cached = geoCache.getFresh(cacheKey);
  if (cached) return cached.value;

  const params = new URLSearchParams({
    name: cleaned,
    count: '6',
    language: 'en',
    format: 'json',
  });

  const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
  const data = await fetchJsonWithRetry<{
    results?: Array<{
      id: number;
      name: string;
      admin1?: string;
      country?: string;
      latitude: number;
      longitude: number;
      timezone?: string;
    }>;
  }>(url, {}, 1);

  let results: GeocodingResult[] = (data.results ?? [])
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && Boolean(item.name))
    .map((item) => ({
      id: `geo-${item.id}`,
      name: item.name,
      region: item.admin1 || '',
      country: item.country || '',
      latitude: Number(item.latitude.toFixed(4)),
      longitude: Number(item.longitude.toFixed(4)),
      timezone: item.timezone || 'UTC',
    }));

  // Fallback to OpenStreetMap Nominatim when Open-Meteo GeoNames has no match
  if (results.length === 0) {
    try {
      const nomSearchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        cleaned
      )}&addressdetails=1&limit=5&accept-language=en`;
      const nomItems = await fetchJsonWithRetry<
        Array<{
          place_id: number;
          name?: string;
          display_name?: string;
          lat: string;
          lon: string;
          address?: {
            city?: string;
            town?: string;
            village?: string;
            municipality?: string;
            suburb?: string;
            state?: string;
            country?: string;
          };
        }>
      >(nomSearchUrl, { headers: NOMINATIM_HEADERS }, 0);

      results = (nomItems ?? [])
        .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
        .map((item) => {
          const a = item.address;
          const primaryName =
            item.name ||
            a?.city ||
            a?.town ||
            a?.municipality ||
            a?.village ||
            a?.suburb ||
            (item.display_name ? item.display_name.split(',')[0].trim() : cleaned);
          return {
            id: `nom-${item.place_id}`,
            name: primaryName,
            region: a?.state || '',
            country: a?.country || '',
            latitude: Number(Number(item.lat).toFixed(4)),
            longitude: Number(Number(item.lon).toFixed(4)),
            timezone: 'auto',
          };
        });
    } catch {
      // Preserve empty results gracefully if fallback fails
    }
  }

  geoCache.set(cacheKey, results);
  return results;
}

export async function reverseGeocodeCoordinates(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = reverseGeoCache.getFresh(key);
  if (cached) return cached.value;

  const nowIso = new Date().toISOString();

  // Primary: OpenStreetMap Nominatim reverse geocoding
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat.toFixed(5)
    )}&lon=${encodeURIComponent(lon.toFixed(5))}&zoom=14&addressdetails=1&accept-language=en`;
    const data = await fetchJsonWithRetry<{
      address?: {
        neighbourhood?: string;
        suburb?: string;
        quarter?: string;
        city_district?: string;
        village?: string;
        town?: string;
        city?: string;
        municipality?: string;
        county?: string;
        state_district?: string;
        state?: string;
        country?: string;
      };
    }>(nomUrl, { headers: NOMINATIM_HEADERS }, 0);

    if (data?.address) {
      const a = data.address;
      const townOrCity = a.city || a.town || a.municipality || '';
      const area =
        a.neighbourhood ||
        a.suburb ||
        a.quarter ||
        a.city_district ||
        (townOrCity && a.village ? a.village : '');
      const city = townOrCity || a.village || a.county || a.state_district || '';
      const composed = composeReadablePlace({
        area,
        city,
        state: a.state,
        country: a.country,
      });

      if (composed.displayName) {
        const result: ReverseGeocodeResult = {
          resolved: true,
          displayName: composed.displayName,
          name: composed.name,
          area: composed.area,
          region: composed.region,
          country: composed.country,
          provider: 'OpenStreetMap Nominatim',
          resolvedAt: nowIso,
        };
        reverseGeoCache.set(key, result);
        return result;
      }
    }
  } catch {
    // Fall through to secondary provider
  }

  // Secondary fallback: BigDataCloud client-free reverse geocoding
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
      lat.toFixed(5)
    )}&longitude=${encodeURIComponent(lon.toFixed(5))}&localityLanguage=en`;
    const data = await fetchJsonWithRetry<{
      locality?: string;
      city?: string;
      principalSubdivision?: string;
      countryName?: string;
    }>(bdcUrl, { headers: { Accept: 'application/json' } }, 0);

    const composed = composeReadablePlace({
      area: data?.locality,
      city: data?.city || data?.locality,
      state: data?.principalSubdivision,
      country: data?.countryName,
    });

    if (composed.displayName) {
      const result: ReverseGeocodeResult = {
        resolved: true,
        displayName: composed.displayName,
        name: composed.name,
        area: composed.area,
        region: composed.region,
        country: composed.country,
        provider: 'BigDataCloud Reverse Geocoding',
        resolvedAt: nowIso,
      };
      reverseGeoCache.set(key, result);
      return result;
    }
  } catch {
    // Fall through to honest unresolved result
  }

  // Never invent a location name when reverse geocoding fails
  return {
    resolved: false,
    displayName: '',
    name: '',
    area: '',
    region: '',
    country: '',
    provider: 'Unavailable',
    resolvedAt: nowIso,
    error: 'Could not convert GPS coordinates to a readable place name right now. Using exact coordinates instead.',
  };
}
