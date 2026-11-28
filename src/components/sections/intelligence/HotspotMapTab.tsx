import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type {
  AirQualityPayload,
  CommunityReport,
  LocationPreset,
  NavSection,
} from '../../../types';
import { fetchAirQuality } from '../../../services/api';
import { formatReadableTimestamp, getUsAqiCategory } from '../../../utils/aqi';
import { INDIAN_METRO_PRESETS } from '../../../utils/storage';

export function projectIndiaCoords(
  lat: number,
  lon: number
): { x: number; y: number; inBounds: boolean } {
  const minLat = 6;
  const maxLat = 36;
  const minLon = 67;
  const maxLon = 98;
  const inBounds = lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
  const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
  const clampedLon = Math.max(minLon, Math.min(maxLon, lon));
  const x = 32 + ((clampedLon - minLon) / (maxLon - minLon)) * 276;
  const y = 26 + ((maxLat - clampedLat) / (maxLat - minLat)) * 228;
  return { x, y, inBounds };
}

interface HotspotMapTabProps {
  activeLocation: LocationPreset;
  airQuality: AirQualityPayload | null;
  metroForecasts: Record<string, AirQualityPayload>;
  onUpdateMetroForecasts: (next: Record<string, AirQualityPayload>) => void;
  communityReports: CommunityReport[];
  selectLocation: (loc: LocationPreset, forceRefresh?: boolean) => Promise<void>;
  onNavigate: (section: NavSection) => void;
  showToast: (message: string) => void;
}

export const HotspotMapTab: React.FC<HotspotMapTabProps> = ({
  activeLocation,
  airQuality,
  metroForecasts,
  onUpdateMetroForecasts,
  communityReports,
  selectLocation,
  onNavigate,
  showToast,
}) => {
  const [loadingMetros, setLoadingMetros] = useState(false);
  const [metroError, setMetroError] = useState<string | null>(null);

  const handleLoadMetroComparison = async () => {
    setLoadingMetros(true);
    setMetroError(null);
    try {
      const results = await Promise.allSettled(
        INDIAN_METRO_PRESETS.map((city) => fetchAirQuality(city, false))
      );
      const nextMap: Record<string, AirQualityPayload> = {};
      let okCount = 0;
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          nextMap[INDIAN_METRO_PRESETS[idx].id] = res.value;
          okCount += 1;
        }
      });
      onUpdateMetroForecasts(nextMap);
      if (okCount === 0) {
        setMetroError('Unable to reach Open-Meteo for metro comparison right now.');
      } else {
        showToast(`Loaded modelled forecasts for ${okCount} Indian metros.`);
      }
    } catch {
      setMetroError('Metro comparison request failed.');
    } finally {
      setLoadingMetros(false);
    }
  };

  const handleSelectHotspotCity = async (loc: LocationPreset) => {
    await selectLocation({ ...loc, locationSource: 'preset' });
    showToast(`Switched active city to ${loc.name}.`);
  };

  const hotspotCities = useMemo(() => {
    const list: { loc: LocationPreset; payload?: AirQualityPayload; isActive: boolean }[] =
      INDIAN_METRO_PRESETS.map((city) => ({
        loc: city,
        payload:
          activeLocation.id === city.id
            ? airQuality ?? metroForecasts[city.id]
            : metroForecasts[city.id],
        isActive: activeLocation.id === city.id,
      }));
    if (!INDIAN_METRO_PRESETS.some((c) => c.id === activeLocation.id)) {
      list.unshift({
        loc: activeLocation,
        payload: airQuality ?? undefined,
        isActive: true,
      });
    }
    return list;
  }, [activeLocation, airQuality, metroForecasts]);

  return (
    <section
      id="intel-panel-hotspots"
      role="tabpanel"
      aria-labelledby="intel-tab-hotspots"
      className="space-y-6 animate-page-enter"
    >
      <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              5. Pollution Hotspot Explorer
            </h2>
            <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
              Inspect modelled metro forecasts, verified ground sensors (when configured), and unverified citizen observations in strictly separated layers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleLoadMetroComparison()}
            disabled={loadingMetros}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-xs font-medium disabled:opacity-50 transition-colors whitespace-nowrap min-h-[38px]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingMetros ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{loadingMetros ? 'Fetching Forecasts...' : 'Load Metro Comparison'}</span>
          </button>
        </div>

        {metroError && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-400">
            {metroError}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive Regional Coordinate Explorer SVG */}
          <div className="lg:col-span-5 bg-[#F6F8F7] dark:bg-[#0F1815] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-4">
            <p className="text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-2">
              Regional Coordinate View (Click a pin to focus city)
            </p>
            <svg
              viewBox="0 0 340 280"
              className="w-full h-auto block"
              role="group"
              aria-label="Interactive regional air quality coordinates map"
            >
              {[60, 120, 180, 240].map((y) => (
                <line
                  key={`h-${y}`}
                  x1="16"
                  y1={y}
                  x2="324"
                  y2={y}
                  className="stroke-[#DCE5E0] dark:stroke-[#1F302A]"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              ))}
              {[80, 170, 260].map((x) => (
                <line
                  key={`v-${x}`}
                  x1={x}
                  y1="16"
                  x2={x}
                  y2="264"
                  className="stroke-[#DCE5E0] dark:stroke-[#1F302A]"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              ))}
              <path
                d="M 118 24 L 154 34 L 175 68 L 216 92 L 266 96 L 284 126 L 240 144 L 222 172 L 178 214 L 146 254 L 122 224 L 100 176 L 80 132 L 72 104 L 96 84 L 106 52 Z"
                className="fill-[#E6EFEA]/70 dark:fill-[#182722] stroke-[#B8CEC1] dark:stroke-[#2A4239]"
                strokeWidth="1.2"
              />

              {hotspotCities.map(({ loc, payload, isActive }) => {
                const pt = projectIndiaCoords(loc.latitude, loc.longitude);
                const cat = getUsAqiCategory(payload?.current.usAqi ?? null);
                return (
                  <g
                    key={loc.id}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${loc.name}${payload?.current.usAqi ? `, US AQI ${Math.round(payload.current.usAqi)}` : ''}`}
                    onClick={() => void handleSelectHotspotCity(loc)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void handleSelectHotspotCity(loc);
                      }
                    }}
                  >
                    {isActive && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="13"
                        fill="none"
                        stroke={cat.dotColor}
                        strokeWidth="1.8"
                        strokeOpacity="0.6"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isActive ? 7 : 5.5}
                      fill={payload ? cat.dotColor : '#52796F'}
                      className="stroke-white dark:stroke-[#0F1815]"
                      strokeWidth="1.8"
                    />
                    <text
                      x={loc.id === 'mumbai' || pt.x > 215 ? pt.x - 10 : pt.x + 10}
                      y={loc.id === 'mumbai' ? pt.y - 2 : pt.y + 4}
                      textAnchor={loc.id === 'mumbai' || pt.x > 215 ? 'end' : 'start'}
                      className="fill-[#16211D] dark:fill-[#EDF3F0] text-[10px] font-medium"
                    >
                      {loc.name}
                      {payload?.current.usAqi !== null && payload?.current.usAqi !== undefined
                        ? ` (${Math.round(payload.current.usAqi)})`
                        : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="mt-2 text-[11px] font-mono text-[#5B6B65] dark:text-[#8DA299]">
              Coordinates plotted on 6°N–36°N, 67°E–98°E reference grid. Unfetched metros appear grey until loaded.
            </p>
          </div>

          {/* Layer 1: Modelled Regional Forecasts */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4E5E58] dark:text-[#9BB0A7] mb-2">
                Layer 1 · Modelled Regional Forecasts (Open-Meteo CAMS)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hotspotCities.map(({ loc, payload, isActive }) => {
                  const cat = getUsAqiCategory(payload?.current.usAqi ?? null);
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => void handleSelectHotspotCity(loc)}
                      className={`text-left p-4 rounded-lg border transition-colors ${
                        isActive
                          ? `${cat.surfaceClass} ${cat.borderClass}`
                          : 'bg-white dark:bg-[#131E1A] border-[#DCE5E0] dark:border-[#20302A] hover:border-[#52796F]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                          {loc.name}
                        </span>
                        <span className="text-[11px] font-mono text-[#4E5E58] dark:text-[#9BB0A7]">
                          {payload ? payload.status : 'Click Load'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                          {payload?.current.usAqi !== null && payload?.current.usAqi !== undefined
                            ? Math.round(payload.current.usAqi)
                            : '—'}
                        </span>
                        <span
                          className={`text-xs font-medium ${payload ? cat.colorClass : 'text-[#5B6B65]'}`}
                        >
                          {payload ? cat.level : 'Not loaded yet'}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
                        {payload?.current.pm25 !== null && payload?.current.pm25 !== undefined
                          ? `PM2.5 ${payload.current.pm25.toFixed(1)} µg/m³ · ${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}`
                          : `${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layer 2: Verified Ground Stations */}
            <div className="p-4 rounded-lg border border-[#DCE5E0] dark:border-[#20302A] bg-[#F6F8F7] dark:bg-[#0F1815]">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4E5E58] dark:text-[#9BB0A7]">
                Layer 2 · Physical Ground Monitoring Station (OpenAQ)
              </h3>
              {airQuality?.groundStation ? (
                <div className="mt-2 text-xs space-y-1">
                  <p className="font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                    {airQuality.groundStation.stationName} ({airQuality.groundStation.distanceKm} km away)
                  </p>
                  <p className="font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
                    PM2.5: {airQuality.groundStation.pm25 ?? 'N/A'} µg/m³ · PM10:{' '}
                    {airQuality.groundStation.pm10 ?? 'N/A'} µg/m³ · Measured{' '}
                    {formatReadableTimestamp(airQuality.groundStation.measuredAt)}
                  </p>
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                  No physical ground monitoring station feed is configured for this session (OpenAQ API key not set). VAYUMITRA does not fabricate street-level sensor readings.
                </p>
              )}
            </div>

            {/* Layer 3: Unverified Community Observations */}
            <div className="p-4 rounded-lg border border-[#DCE5E0] dark:border-[#20302A] bg-white dark:bg-[#131E1A] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4E5E58] dark:text-[#9BB0A7]">
                  Layer 3 · Unverified Community Observations ({communityReports.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigate('community')}
                  className="text-xs font-medium text-[#1B4332] dark:text-[#2DD4BF] hover:underline whitespace-nowrap"
                >
                  Report / Filter All
                </button>
              </div>
              <ul className="divide-y divide-[#DCE5E0] dark:divide-[#20302A] text-xs">
                {communityReports.slice(0, 4).map((rep) => (
                  <li
                    key={rep.id}
                    className="py-2 flex flex-wrap items-baseline justify-between gap-2"
                  >
                    <div>
                      <span className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                        {rep.areaName}
                      </span>{' '}
                      <span className="text-[#4E5E58] dark:text-[#9BB0A7]">({rep.city})</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#5B6B65] dark:text-[#8DA299]">
                      {rep.category.replace('_', ' ')} · Unverified
                      {rep.isExample ? ' · Example' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
