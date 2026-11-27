import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Compass,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { CommuteMode, HouseholdAgeGroup, LocationPreset, PollutantKey } from '../../types';
import { reverseGeocodeLocation, searchCityLocations } from '../../services/api';
import {
  formatLocalModelTimestamp,
  formatReadableTimestamp,
  getEuropeanAqiLabel,
  getUsAqiCategory,
  isDataTimestampStale,
  POLLUTANT_META,
} from '../../utils/aqi';
import { INDIAN_METRO_PRESETS } from '../../utils/storage';
import { sanitizePlainText, validateCoordinates } from '../../utils/validation';
import { HourlyTrendChart } from '../charts/HourlyTrendChart';
import { WeeklyHistoryChart } from '../charts/WeeklyHistoryChart';
import { VayuMitraLogo } from '../brand/VayuMitraLogo';
import { AmbientSoundControl } from '../ui/AmbientSoundControl';
import { AqiStatusIcon } from '../ui/AqiStatusIcon';
import { MoreInfo } from '../ui/MoreInfo';

const POLLUTANT_KEYS: PollutantKey[] = ['usAqi', 'pm25', 'pm10', 'no2', 'o3', 'so2'];
const BREAKDOWN_POLLUTANTS: PollutantKey[] = ['pm25', 'pm10', 'no2', 'o3', 'so2'];

const AGE_GROUP_OPTIONS: { id: HouseholdAgeGroup; label: string }[] = [
  { id: 'children_under_12', label: 'Children (<12)' },
  { id: 'teens', label: 'Teens' },
  { id: 'adults', label: 'Adults' },
  { id: 'seniors_65_plus', label: 'Seniors (65+)' },
  { id: 'respiratory_sensitive', label: 'Respiratory Sensitive' },
];

function formatFullLocationName(loc: LocationPreset): string {
  const parts = [loc.area, loc.name, loc.region, loc.country]
    .map((p) => (p ?? '').trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.some((existing) => existing.toLowerCase() === part.toLowerCase())) {
      unique.push(part);
    }
  }
  return unique.join(', ') || loc.name;
}

function formatLocationSourceLabel(loc: LocationPreset): string {
  if (loc.locationSource === 'gps') {
    return loc.locationProvider ? `GPS · ${loc.locationProvider}` : 'Browser GPS';
  }
  if (loc.locationSource === 'search') {
    return 'Manual City Search · Open-Meteo Geocoding';
  }
  if (loc.locationSource === 'manual') {
    return 'Manual Coordinates';
  }
  return 'City Preset';
}

export const DashboardSection: React.FC = () => {
  const {
    activeLocation,
    selectLocation,
    airQuality,
    airQualityLoading,
    airQualityError,
    refreshAirQuality,
    preferences,
    updatePreferences,
    setActiveSection,
    showToast,
  } = useApp();

  const [selectedMetric, setSelectedMetric] = useState<PollutantKey>('pm25');
  const [historyMetric, setHistoryMetric] = useState<PollutantKey>('usAqi');
  const [showHistoryPeak, setShowHistoryPeak] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationPreset[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [showCoordForm, setShowCoordForm] = useState(false);
  const [coordLat, setCoordLat] = useState(activeLocation.latitude.toString());
  const [coordLon, setCoordLon] = useState(activeLocation.longitude.toString());
  const [coordName, setCoordName] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);

  useEffect(() => {
    setCoordLat(activeLocation.latitude.toString());
    setCoordLon(activeLocation.longitude.toString());
    setCoordError(null);
  }, [activeLocation.latitude, activeLocation.longitude]);

  // GPS Detection & Reverse Geocoding UI state
  const [geoStage, setGeoStage] = useState<'idle' | 'locating' | 'resolving'>('idle');
  const [geoMessage, setGeoMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  // Onboarding setup state
  const [obCommute, setObCommute] = useState<CommuteMode>(preferences.commuteMode);
  const [obGroups, setObGroups] = useState<HouseholdAgeGroup[]>(preferences.householdAgeGroups);
  const [obCityId, setObCityId] = useState<string>(preferences.defaultLocation.id);

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchError('Enter at least 2 characters to search a city.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    setGeoMessage(null);
    try {
      const results = await searchCityLocations(trimmed);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError(`No cities found matching "${trimmed}". Try another spelling or enter coordinates.`);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'City search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handlePickSearchResult = async (loc: LocationPreset) => {
    setSearchResults([]);
    setSearchQuery('');
    setSearchError(null);
    setGeoMessage(null);
    await selectLocation({
      ...loc,
      locationSource: 'search',
      locationProvider: 'Open-Meteo Geocoding',
      locationUpdatedAt: new Date().toISOString(),
    });
    showToast(`Location updated to ${formatFullLocationName(loc)}.`);
  };

  const handleApplyCoordinates = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateCoordinates(coordLat, coordLon);
    if (!check.valid || check.latitude === undefined || check.longitude === undefined) {
      setCoordError(check.error ?? 'Invalid coordinates.');
      return;
    }
    setCoordError(null);
    setGeoMessage(null);
    const cleanLabel = sanitizePlainText(coordName, 60);
    const label = cleanLabel || `Coordinates (${check.latitude.toFixed(4)}, ${check.longitude.toFixed(4)})`;
    await selectLocation({
      id: `custom-${check.latitude}-${check.longitude}`,
      name: label,
      region: cleanLabel ? 'Custom Coordinates' : '',
      country: '',
      latitude: check.latitude,
      longitude: check.longitude,
      timezone: 'auto',
      locationSource: 'manual',
      locationProvider: 'Manual Lat/Lon Entry',
      locationUpdatedAt: new Date().toISOString(),
    });
    setShowCoordForm(false);
    showToast(`Loaded air quality for ${label}.`);
  };

  const handleUseMyLocation = () => {
    setGeoMessage(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoMessage({
        kind: 'error',
        text: 'Browser GPS geolocation is not supported on this device. Search for a city or enter coordinates manually.',
      });
      return;
    }

    setGeoStage('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lon = Number(pos.coords.longitude.toFixed(5));
        setGeoStage('resolving');

        const rev = await reverseGeocodeLocation(lat, lon);
        setGeoStage('idle');

        if (rev.resolved && rev.name) {
          const detected: LocationPreset = {
            id: `gps-${lat.toFixed(4)}-${lon.toFixed(4)}`,
            name: rev.name,
            area: rev.area || undefined,
            region: rev.region,
            country: rev.country,
            latitude: lat,
            longitude: lon,
            timezone: 'auto',
            locationSource: 'gps',
            locationProvider: rev.provider,
            locationUpdatedAt: rev.resolvedAt,
          };
          await selectLocation(detected, true);
          const fullName = formatFullLocationName(detected);
          setGeoMessage({
            kind: 'info',
            text: `Detected location: ${fullName} (${lat.toFixed(4)}, ${lon.toFixed(4)}) via ${rev.provider}.`,
          });
          showToast(`Location detected: ${fullName}`);
        } else {
          // Never invent a place name if reverse geocoding fails
          const fallbackLoc: LocationPreset = {
            id: `gps-${lat.toFixed(4)}-${lon.toFixed(4)}`,
            name: `GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
            region: '',
            country: '',
            latitude: lat,
            longitude: lon,
            timezone: 'auto',
            locationSource: 'gps',
            locationProvider: 'Browser GPS (place name unavailable)',
            locationUpdatedAt: new Date().toISOString(),
          };
          await selectLocation(fallbackLoc, true);
          setGeoMessage({
            kind: 'error',
            text: `GPS coordinates captured (${lat.toFixed(4)}, ${lon.toFixed(4)}), but reverse geocoding could not resolve a place name (${rev.error ?? 'service unavailable'}). Showing AQI for your exact coordinates.`,
          });
          showToast('GPS captured; place name unavailable — showing exact coordinates.');
        }
      },
      (err) => {
        setGeoStage('idle');
        let text = 'Unable to determine your location right now. Please search a city manually.';
        if (err.code === err.PERMISSION_DENIED) {
          text =
            'Location permission was denied. Your previous city remains selected — use city search, presets, or Lat / Lon instead.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          text =
            'Location information is unavailable from your device GPS/network right now. Try searching your city manually.';
        } else if (err.code === err.TIMEOUT) {
          text =
            'GPS location detection timed out. Check device location services or search your city manually.';
        }
        setGeoMessage({ kind: 'error', text });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const toggleOnboardingAge = (group: HouseholdAgeGroup) => {
    setObGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenCity =
      INDIAN_METRO_PRESETS.find((c) => c.id === obCityId) ?? activeLocation;
    updatePreferences({
      onboardingDismissed: true,
      defaultLocation: chosenCity,
      commuteMode: obCommute,
      householdAgeGroups: obGroups.length > 0 ? obGroups : ['adults'],
    });
    if (chosenCity.id !== activeLocation.id) {
      await selectLocation({ ...chosenCity, locationSource: 'preset' });
    }
    showToast('Personalization saved. Recommendations now adapt to your household.');
  };

  const usAqi = airQuality?.current.usAqi ?? null;
  const euAqi = airQuality?.current.europeanAqi ?? null;
  const aqiMeta = getUsAqiCategory(usAqi);
  const euLabel = getEuropeanAqiLabel(euAqi);

  const isStale =
    airQuality ? airQuality.isStale || isDataTimestampStale(airQuality.fetchedAt, 30) : false;

  const statusText =
    airQuality?.status === 'FORECAST'
      ? 'MODEL FORECAST (LIVE)'
      : airQuality?.status === 'CACHED'
        ? isStale
          ? 'CACHED · STALE'
          : 'CACHED FORECAST'
        : 'DEMO FALLBACK (NOT LIVE)';

  const displayLocationName = formatFullLocationName(activeLocation);
  const aqiScalePct = usAqi !== null ? Math.max(2, Math.min(100, (usAqi / 350) * 100)) : 0;

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Page Title & Quick Context */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
            Air Quality Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            Live atmospheric pollutant forecasts, 24-hour &amp; 7-day historical trends, and practical daily protection.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <AmbientSoundControl compact />
          <button
            type="button"
            onClick={() => void refreshAirQuality()}
            disabled={airQualityLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#DCE5E0] dark:border-[#243630] bg-white dark:bg-[#131E1A] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] active:scale-[0.98] disabled:opacity-50 transition-all whitespace-nowrap min-h-[40px]"
          >
            <RefreshCw className={`w-4 h-4 ${airQualityLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{airQualityLoading ? 'Updating...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Non-Blocking Optional Onboarding Card (First-Time Visitors) */}
      {!preferences.onboardingDismissed && (
        <section
          aria-label="Optional household personalization setup"
          className="bg-white dark:bg-[#131E1A] border border-[#CFE0D6] dark:border-[#243B33] rounded-lg p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                Personalize VAYUMITRA for your household (optional)
              </h2>
              <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
                Tailor AI guidance and daily routines using minimal preferences stored strictly on this device.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePreferences({ onboardingDismissed: true })}
              aria-label="Skip personalization setup"
              className="text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0] inline-flex items-center gap-1 px-2 py-1.5 rounded-md whitespace-nowrap"
            >
              <span>Skip</span>
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSaveOnboarding} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ob-city" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1.5">
                Primary City
              </label>
              <select
                id="ob-city"
                value={obCityId}
                onChange={(e) => setObCityId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm text-[#16211D] dark:text-[#EDF3F0] min-h-[40px]"
              >
                {INDIAN_METRO_PRESETS.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}, {city.region}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ob-commute" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1.5">
                Usual Commute Mode
              </label>
              <select
                id="ob-commute"
                value={obCommute}
                onChange={(e) => setObCommute(e.target.value as CommuteMode)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm text-[#16211D] dark:text-[#EDF3F0] min-h-[40px]"
              >
                <option value="public_transit">Public Transit (Metro / Bus)</option>
                <option value="private_car">Private Vehicle</option>
                <option value="carpool">Carpooling</option>
                <option value="cycling">Cycling</option>
                <option value="walking">Walking</option>
              </select>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1.5">
                Household Age Groups (Optional)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AGE_GROUP_OPTIONS.map((opt) => {
                  const selected = obGroups.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOnboardingAge(opt.id)}
                      aria-pressed={selected}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white border-[#1B4332] dark:border-[#2D6A4F]'
                          : 'bg-[#F6F8F7] dark:bg-[#0F1815] text-[#4E5E58] dark:text-[#9BB0A7] border-[#DCE5E0] dark:border-[#263832] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => updatePreferences({ onboardingDismissed: true })}
                className="px-4 py-2 text-sm font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0]"
              >
                Skip for now
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium transition-colors min-h-[40px]"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Location Selector Bar (Presets + Manual Search + Use My Location GPS + Lat/Lon) */}
      <section
        aria-label="Location selection"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Indian Metro Presets */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Indian metro city presets">
            {INDIAN_METRO_PRESETS.map((city) => {
              const isSelected = activeLocation.id === city.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    setGeoMessage(null);
                    void selectLocation({
                      ...city,
                      locationSource: 'preset',
                      locationUpdatedAt: new Date().toISOString(),
                    });
                  }}
                  aria-pressed={isSelected}
                  className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors active:scale-[0.98] min-h-[40px] whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white'
                      : 'bg-[#F3F6F4] dark:bg-[#192622] text-[#16211D] dark:text-[#D5E1DC] hover:bg-[#E6EFEA] dark:hover:bg-[#22352E]'
                  }`}
                >
                  {city.name}
                </button>
              );
            })}
          </div>

          {/* Search + Use My Location + Manual Coordinates */}
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleCitySearch} className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <label htmlFor="city-search-input" className="sr-only">
                Search any city or town worldwide
              </label>
              <div className="relative flex-1 sm:w-52">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B65] dark:text-[#8DA299]" aria-hidden="true" />
                <input
                  id="city-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city or town..."
                  className="w-full pl-9 pr-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm text-[#16211D] dark:text-[#EDF3F0] placeholder:text-[#6B7C76] min-h-[40px]"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-3.5 py-2 rounded-md bg-[#E6EFEA] dark:bg-[#1E312A] text-[#1B4332] dark:text-[#EDF3F0] text-sm font-medium hover:bg-[#D5E5DC] dark:hover:bg-[#263F36] active:scale-[0.98] min-h-[40px] whitespace-nowrap"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={geoStage !== 'idle'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium disabled:opacity-70 active:scale-[0.98] transition-all min-h-[40px] whitespace-nowrap"
            >
              {geoStage !== 'idle' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Compass className="w-4 h-4" aria-hidden="true" />
              )}
              <span>
                {geoStage === 'locating'
                  ? 'Detecting GPS...'
                  : geoStage === 'resolving'
                    ? 'Resolving Name...'
                    : 'Use My Location'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCoordLat(activeLocation.latitude.toString());
                setCoordLon(activeLocation.longitude.toString());
                setShowCoordForm((v) => !v);
              }}
              aria-expanded={showCoordForm}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#F3F6F4] dark:hover:bg-[#192622] min-h-[40px] whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              <span>Lat / Lon</span>
            </button>
          </div>
        </div>

        {/* Active Location Metadata Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DCE5E0] dark:border-[#20302A] text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#1B4332] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
            <span className="font-medium text-[#16211D] dark:text-[#EDF3F0] truncate">
              {displayLocationName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] tabular-nums">
            <span>{formatLocationSourceLabel(activeLocation)}</span>
            {activeLocation.locationUpdatedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>Set {formatReadableTimestamp(activeLocation.locationUpdatedAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* GPS Detection Loading / Error / Resolved Feedback */}
        {geoStage !== 'idle' && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-md bg-[#EDF3EF] dark:bg-[#16241F] border border-[#CFE0D6] dark:border-[#243B33] text-xs text-[#1B4332] dark:text-[#B5E2D4] flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span>
              {geoStage === 'locating'
                ? 'Requesting browser GPS permission and reading device coordinates...'
                : 'Converting GPS coordinates to city, area, and state via reverse geocoding...'}
            </span>
          </div>
        )}

        {geoMessage && (
          <div
            role={geoMessage.kind === 'error' ? 'alert' : 'status'}
            className={`p-3 rounded-md border text-xs leading-relaxed ${
              geoMessage.kind === 'error'
                ? 'bg-red-50/80 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                : 'bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            {geoMessage.text}
          </div>
        )}

        {/* City Search Results */}
        {searchError && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-400">
            {searchError}
          </p>
        )}

        {searchResults.length > 0 && (
          <div className="border-t border-[#DCE5E0] dark:border-[#20302A] pt-3">
            <p className="text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-2">
              Select a matching location:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => void handlePickSearchResult(res)}
                  className="text-left px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] transition-colors"
                >
                  <div className="text-sm font-medium text-[#16211D] dark:text-[#EDF3F0]">
                    {res.name}
                  </div>
                  <div className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] font-mono tabular-nums">
                    {[res.region, res.country].filter(Boolean).join(', ')} · {res.latitude.toFixed(2)},{' '}
                    {res.longitude.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Coordinates Form */}
        {showCoordForm && (
          <form
            onSubmit={handleApplyCoordinates}
            noValidate
            className="border-t border-[#DCE5E0] dark:border-[#20302A] pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label htmlFor="manual-lat" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Latitude (-90 to 90)
              </label>
              <input
                id="manual-lat"
                type="number"
                step="any"
                value={coordLat}
                onChange={(e) => setCoordLat(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="manual-lon" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Longitude (-180 to 180)
              </label>
              <input
                id="manual-lon"
                type="number"
                step="any"
                value={coordLon}
                onChange={(e) => setCoordLon(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="manual-label" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Label (optional)
              </label>
              <input
                id="manual-label"
                type="text"
                value={coordName}
                onChange={(e) => setCoordName(e.target.value)}
                placeholder="e.g., Lonavala"
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm font-medium min-h-[40px]"
            >
              Load Coordinates
            </button>
            {coordError && (
              <p role="alert" className="sm:col-span-4 text-xs text-red-700 dark:text-red-400">
                {coordError}
              </p>
            )}
          </form>
        )}
      </section>

      {/* Error Banner or Demo/Stale Provenance Alert */}
      {airQualityError && (
        <div
          role="alert"
          className="p-4 rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-sm text-red-900 dark:text-red-200 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-medium">Unable to refresh air quality data</p>
            <p className="mt-0.5 text-xs opacity-90">{airQualityError}</p>
          </div>
        </div>
      )}

      {airQuality && (airQuality.status === 'DEMO' || isStale || airQuality.notice) && (
        <div
          role="status"
          className="p-4 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-950 dark:text-amber-200 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-medium">
              {airQuality.status === 'DEMO'
                ? 'Illustrative Demo Data Active — Not Live Readings'
                : 'Cached Data Notice'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed">
              {airQuality.notice ??
                'Displayed values were cached earlier and may be stale. Use Refresh Data to query Open-Meteo again.'}
            </p>
          </div>
        </div>
      )}

      {/* Main AQI Hero Overview & Recommendations */}
      {airQualityLoading && !airQuality ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading air quality forecast">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#DCE5E0] dark:border-[#20302A] bg-white dark:bg-[#131E1A]">
            <VayuMitraLogo size="sm" showWordmark={false} loading />
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-[#16211D] dark:text-[#EDF3F0]">
                Fetching atmospheric forecast for {displayLocationName}...
              </p>
              <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                Querying Open-Meteo Copernicus CAMS pollutant model
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 h-64 rounded-lg vm-skeleton border border-[#DCE5E0] dark:border-[#20302A]" />
            <div className="lg:col-span-5 h-64 rounded-lg vm-skeleton border border-[#DCE5E0] dark:border-[#20302A]" />
          </div>
          <div className="h-80 rounded-lg vm-skeleton border border-[#DCE5E0] dark:border-[#20302A]" />
        </div>
      ) : airQuality ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Primary AQI Reading with Subtle Accessible AQI Category Tint */}
            <section
              aria-label="Primary air quality index reading"
              className={`lg:col-span-7 rounded-lg border p-6 flex flex-col justify-between transition-all duration-300 ${aqiMeta.gradientClass} ${aqiMeta.borderClass}`}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                  <div className="flex items-center gap-1.5 font-medium text-[#16211D] dark:text-[#EDF3F0]">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: aqiMeta.dotColor }}
                      aria-hidden="true"
                    />
                    <span>{displayLocationName}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
                    <span className="font-semibold text-[#1B4332] dark:text-[#2DD4BF]">{statusText}</span>
                    <span aria-hidden="true">·</span>
                    <span>Updated {formatReadableTimestamp(airQuality.fetchedAt)}</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-4">
                  <div>
                    <p className="text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7]">
                      US EPA AQI (0–500 Scale)
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="font-mono text-5xl sm:text-6xl font-semibold tracking-tight tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                        {usAqi !== null ? Math.round(usAqi) : '—'}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-lg font-semibold ${aqiMeta.colorClass}`}>
                        <AqiStatusIcon kind={aqiMeta.iconKind} className="w-5 h-5 shrink-0" />
                        <span>{aqiMeta.level}</span>
                      </span>
                    </div>
                  </div>

                  <div className="pl-0 sm:pl-6 sm:border-l border-black/10 dark:border-white/10">
                    <p className="text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7]">
                      European EEA AQI
                    </p>
                    <div className="mt-1 flex items-baseline gap-2.5">
                      <span className="font-mono text-3xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                        {euAqi !== null ? Math.round(euAqi) : '—'}
                      </span>
                      <span className="text-sm font-medium text-[#4E5E58] dark:text-[#9BB0A7]">
                        {euLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtle AQI Category Visual Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div
                    className="h-2 w-full rounded-sm bg-black/10 dark:bg-white/10 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={usAqi !== null ? Math.round(usAqi) : 0}
                    aria-valuemin={0}
                    aria-valuemax={500}
                    aria-label={`US EPA AQI status: ${aqiMeta.level}`}
                  >
                    <div
                      className={`h-full transition-all duration-300 ${aqiMeta.barClass}`}
                      style={{ width: `${aqiScalePct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#5B6B65] dark:text-[#8DA299]">
                    <span>0 Good</span>
                    <span>51 Mod</span>
                    <span>101 Sens.</span>
                    <span>151 Unhealthy</span>
                    <span>201 V. Unhealthy</span>
                    <span>301+ Haz.</span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-[#16211D] dark:text-[#D5E1DC] leading-relaxed">
                  {aqiMeta.summary}
                </p>
              </div>

              <MoreInfo label="More Info: AQI Standard & Coordinates" className="mt-5">
                <p>
                  <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">Standard clarity:</strong>{' '}
                  US EPA AQI and European AQI use different breakpoints from official Indian CPCB National AQI (NAQI). These values represent atmospheric model forecasts, not official CPCB station certificates.
                </p>
                <p className="font-mono tabular-nums">
                  {airQuality.status === 'DEMO' ? 'Demo sample timestamp: ' : 'Model forecast timestamp: '}
                  {formatLocalModelTimestamp(
                    airQuality.dataTimestamp,
                    airQuality.location.timezone || airQuality.timezoneAbbreviation
                  )}{' '}
                  · Coords: {airQuality.location.latitude.toFixed(4)}, {airQuality.location.longitude.toFixed(4)}
                </p>
              </MoreInfo>
            </section>

            {/* Practical Recommendations */}
            <section
              aria-label="Practical air quality recommendations"
              className="lg:col-span-5 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-6 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                  Practical Steps Right Now
                </h2>
                <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                  Matched to current {aqiMeta.shortLabel} conditions in {activeLocation.name}.
                </p>

                <ul className="mt-4 space-y-3 text-sm text-[#16211D] dark:text-[#D5E1DC]">
                  {aqiMeta.guidance.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="font-mono text-xs text-[#0F766E] dark:text-[#2DD4BF] mt-0.5 tabular-nums">
                        0{idx + 1}.
                      </span>
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-[#DCE5E0] dark:border-[#20302A] flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('assistant')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-xs font-medium active:scale-[0.98] transition-all whitespace-nowrap min-h-[38px]"
                >
                  <span>Ask AI Assistant</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('intelligence')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-xs font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] transition-colors whitespace-nowrap min-h-[38px]"
                >
                  <span>Exposure &amp; Alerts</span>
                </button>
              </div>
            </section>
          </div>

          {/* Optional Verified Ground Station Reading (OpenAQ) if configured */}
          {airQuality.groundStation && (
            <section
              aria-label="Nearby ground monitoring station reading"
              className="bg-white dark:bg-[#131E1A] border border-[#0F766E]/35 dark:border-[#2DD4BF]/35 rounded-lg p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                  Ground Monitoring Station Reading — {airQuality.groundStation.stationName}
                </h2>
                <span className="text-xs font-mono tabular-nums text-[#0F766E] dark:text-[#2DD4BF]">
                  GROUND SENSOR (OpenAQ) · {airQuality.groundStation.distanceKm} km away ·{' '}
                  {formatReadableTimestamp(airQuality.groundStation.measuredAt)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Station PM2.5</span>
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {airQuality.groundStation.pm25 !== null ? `${airQuality.groundStation.pm25} µg/m³` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Station PM10</span>
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {airQuality.groundStation.pm10 !== null ? `${airQuality.groundStation.pm10} µg/m³` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Station NO₂</span>
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {airQuality.groundStation.no2 !== null ? `${airQuality.groundStation.no2} µg/m³` : 'N/A'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Individual Pollutant Breakdown */}
          <section aria-label="Current pollutant concentrations">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 className="text-lg font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                Pollutant Breakdown
              </h2>
              <span className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                Select any pollutant to inspect its 24-hour forecast curve below
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {BREAKDOWN_POLLUTANTS.map((key) => {
                const meta = POLLUTANT_META[key];
                const val = airQuality.current[key];
                const isSelected = selectedMetric === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedMetric(key)}
                    aria-pressed={isSelected}
                    className={`text-left p-4 rounded-lg border transition-all duration-150 hover:-translate-y-0.5 ${
                      isSelected
                        ? 'bg-[#E6EFEA] dark:bg-[#1B2D26] border-[#1B4332] dark:border-[#2DD4BF]'
                        : 'bg-white dark:bg-[#131E1A] border-[#DCE5E0] dark:border-[#20302A] hover:border-[#52796F]'
                    }`}
                  >
                    <div className="text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7]">
                      {meta.shortName}
                    </div>
                    <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                      {val !== null ? val.toFixed(1) : '—'}
                    </div>
                    <div className="text-[11px] font-mono text-[#5B6B65] dark:text-[#8DA299]">
                      {meta.unit}
                    </div>
                    <div className="mt-2 text-[11px] text-[#4E5E58] dark:text-[#9BB0A7] leading-snug">
                      {meta.referenceNote}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 24-Hour Pollutant Trend Chart */}
          <section
            aria-label="24-hour pollutant forecast trend"
            className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                  24-Hour Pollutant Trend ({activeLocation.name})
                </h2>
                <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] mt-0.5">
                  {POLLUTANT_META[selectedMetric].description}
                </p>
              </div>

              <div
                className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[#F2F5F3] dark:bg-[#0F1815]"
                role="tablist"
                aria-label="Select pollutant for hourly trend chart"
              >
                {POLLUTANT_KEYS.map((key, idx) => {
                  const active = selectedMetric === key;
                  return (
                    <button
                      key={key}
                      id={`trend-tab-${key}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls="trend-tabpanel"
                      tabIndex={active ? 0 : -1}
                      onClick={() => setSelectedMetric(key)}
                      onKeyDown={(e) => {
                        let nextIdx: number | null = null;
                        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % POLLUTANT_KEYS.length;
                        else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + POLLUTANT_KEYS.length) % POLLUTANT_KEYS.length;
                        else if (e.key === 'Home') nextIdx = 0;
                        else if (e.key === 'End') nextIdx = POLLUTANT_KEYS.length - 1;
                        if (nextIdx !== null) {
                          e.preventDefault();
                          const nextKey = POLLUTANT_KEYS[nextIdx];
                          setSelectedMetric(nextKey);
                          document.getElementById(`trend-tab-${nextKey}`)?.focus();
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-white dark:bg-[#1C2D27] text-[#1B4332] dark:text-[#EDF3F0] shadow-xs'
                          : 'text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
                      }`}
                    >
                      {POLLUTANT_META[key].shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              id="trend-tabpanel"
              role="tabpanel"
              aria-labelledby={`trend-tab-${selectedMetric}`}
            >
              <HourlyTrendChart
                hourly={airQuality.hourly}
                metric={selectedMetric}
                locationName={activeLocation.name}
              />
            </div>

            {/* Decluttered Data Source & Model Attribution via MoreInfo */}
            <MoreInfo label="More Info: Data Source & Model Attribution" className="mt-5">
              <p className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                {airQuality.providerLabel}
              </p>
              <p>{airQuality.attribution}</p>
            </MoreInfo>
          </section>

          {/* 7-Day Historical Air Quality Trend Chart (Recharts) */}
          <section
            aria-label="7-day historical air quality trend"
            className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                  7-Day Historical Air Quality Trend ({activeLocation.name})
                </h2>
                <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] mt-0.5">
                  Daily modelled averages and intraday peaks over the past 7 calendar days
                  {airQuality.status === 'DEMO' ? ' · Illustrative demo fallback (not live archive)' : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHistoryPeak((prev) => !prev)}
                  aria-pressed={showHistoryPeak}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap min-h-[34px] ${
                    showHistoryPeak
                      ? 'bg-[#EDF3EF] dark:bg-[#1B2D26] border-[#1B4332] dark:border-[#2DD4BF] text-[#1B4332] dark:text-[#EDF3F0]'
                      : 'bg-white dark:bg-[#131E1A] border-[#DCE5E0] dark:border-[#263832] text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
                  }`}
                >
                  {showHistoryPeak ? 'Peak Overlay: On' : 'Peak Overlay: Off'}
                </button>

                <div
                  className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[#F2F5F3] dark:bg-[#0F1815]"
                  role="tablist"
                  aria-label="Select pollutant for 7-day historical chart"
                >
                  {POLLUTANT_KEYS.map((key, idx) => {
                    const active = historyMetric === key;
                    return (
                      <button
                        key={key}
                        id={`history-tab-${key}`}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls="history-tabpanel"
                        tabIndex={active ? 0 : -1}
                        onClick={() => setHistoryMetric(key)}
                        onKeyDown={(e) => {
                          let nextIdx: number | null = null;
                          if (e.key === 'ArrowRight') nextIdx = (idx + 1) % POLLUTANT_KEYS.length;
                          else if (e.key === 'ArrowLeft')
                            nextIdx = (idx - 1 + POLLUTANT_KEYS.length) % POLLUTANT_KEYS.length;
                          else if (e.key === 'Home') nextIdx = 0;
                          else if (e.key === 'End') nextIdx = POLLUTANT_KEYS.length - 1;
                          if (nextIdx !== null) {
                            e.preventDefault();
                            const nextKey = POLLUTANT_KEYS[nextIdx];
                            setHistoryMetric(nextKey);
                            document.getElementById(`history-tab-${nextKey}`)?.focus();
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-white dark:bg-[#1C2D27] text-[#1B4332] dark:text-[#EDF3F0] shadow-xs'
                            : 'text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
                        }`}
                      >
                        {POLLUTANT_META[key].shortName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              id="history-tabpanel"
              role="tabpanel"
              aria-labelledby={`history-tab-${historyMetric}`}
            >
              <WeeklyHistoryChart
                history={airQuality.dailyHistory ?? []}
                metric={historyMetric}
                locationName={activeLocation.name}
                isDark={preferences.theme === 'dark'}
                showPeakLine={showHistoryPeak}
                onRefresh={() => void refreshAirQuality()}
              />
            </div>

            <MoreInfo label="More Info: 7-Day Historical Methodology" className="mt-5">
              <p>
                <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">How daily values are computed:</strong>{' '}
                Each point averages all available hourly Open-Meteo Copernicus CAMS readings for that local calendar date (typically 24 hours for completed past days, and hours elapsed so far for today). The dashed Peak Overlay marks each day&apos;s highest hourly reading.
              </p>
              <p>
                <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">Model archive vs. ground stations:</strong>{' '}
                Historical values come from Open-Meteo&apos;s atmospheric grid archive rather than official CPCB regulatory ground station logs.
              </p>
            </MoreInfo>
          </section>
        </>
      ) : null}
    </div>
  );
};
