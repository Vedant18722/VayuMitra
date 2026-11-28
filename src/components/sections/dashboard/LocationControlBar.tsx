import React, { useEffect, useState } from 'react';
import { Compass, Loader2, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import type { LocationPreset } from '../../../types';
import { reverseGeocodeLocation, searchCityLocations } from '../../../services/api';
import { formatReadableTimestamp } from '../../../utils/aqi';
import { INDIAN_METRO_PRESETS } from '../../../utils/storage';
import { sanitizePlainText, validateCoordinates } from '../../../utils/validation';

export function formatFullLocationName(loc: LocationPreset): string {
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

export function formatLocationSourceLabel(loc: LocationPreset): string {
  if (loc.locationSource === 'gps') {
    return loc.locationProvider ? `GPS · ${loc.locationProvider}` : 'Browser GPS';
  }
  if (loc.locationSource === 'search') {
    return loc.locationProvider ? `Manual Search · ${loc.locationProvider}` : 'Manual City Search';
  }
  if (loc.locationSource === 'manual') {
    return 'Manual Coordinates';
  }
  return 'City Preset';
}

interface LocationControlBarProps {
  activeLocation: LocationPreset;
  selectLocation: (loc: LocationPreset, forceRefresh?: boolean) => Promise<void>;
  showToast: (message: string) => void;
}

export const LocationControlBar: React.FC<LocationControlBarProps> = ({
  activeLocation,
  selectLocation,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationPreset[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [showCoordForm, setShowCoordForm] = useState(false);
  const [coordLat, setCoordLat] = useState(activeLocation.latitude.toString());
  const [coordLon, setCoordLon] = useState(activeLocation.longitude.toString());
  const [coordName, setCoordName] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);

  const [geoStage, setGeoStage] = useState<'idle' | 'locating' | 'resolving'>('idle');
  const [geoMessage, setGeoMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(
    null
  );

  useEffect(() => {
    setCoordLat(activeLocation.latitude.toString());
    setCoordLon(activeLocation.longitude.toString());
    setCoordError(null);
  }, [activeLocation.latitude, activeLocation.longitude]);

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
        setSearchError(
          `No cities found matching "${trimmed}". Try another spelling or enter coordinates.`
        );
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
      locationProvider: loc.id.startsWith('nom-')
        ? 'OpenStreetMap Nominatim'
        : 'Open-Meteo Geocoding',
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
    const label =
      cleanLabel || `Coordinates (${check.latitude.toFixed(4)}, ${check.longitude.toFixed(4)})`;
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

  const displayLocationName = formatFullLocationName(activeLocation);

  return (
    <section
      aria-label="Location selection"
      className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Indian Metro Presets */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Indian metro city presets"
        >
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
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B65] dark:text-[#8DA299]"
                aria-hidden="true"
              />
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
          <MapPin
            className="w-3.5 h-3.5 text-[#1B4332] dark:text-[#2DD4BF] shrink-0"
            aria-hidden="true"
          />
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
            <label
              htmlFor="manual-lat"
              className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
            >
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
            <label
              htmlFor="manual-lon"
              className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
            >
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
            <label
              htmlFor="manual-label"
              className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
            >
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
  );
};
