import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PollutantKey } from '../../types';
import {
  formatLocalModelTimestamp,
  formatReadableTimestamp,
  getEuropeanAqiLabel,
  getUsAqiCategory,
  isDataTimestampStale,
  POLLUTANT_META,
} from '../../utils/aqi';
import { VayuMitraLogo } from '../brand/VayuMitraLogo';
import { AmbientSoundControl } from '../ui/AmbientSoundControl';
import { AqiStatusIcon } from '../ui/AqiStatusIcon';
import { MoreInfo } from '../ui/MoreInfo';
import { AirQualityTrendsPanel } from './dashboard/AirQualityTrendsPanel';
import { DashboardOnboardingBanner } from './dashboard/DashboardOnboardingBanner';
import { formatFullLocationName, LocationControlBar } from './dashboard/LocationControlBar';

const BREAKDOWN_POLLUTANTS: PollutantKey[] = ['pm25', 'pm10', 'no2', 'o3', 'so2'];

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

  const usAqi = airQuality?.current.usAqi ?? null;
  const euAqi = airQuality?.current.europeanAqi ?? null;
  const aqiMeta = getUsAqiCategory(usAqi);
  const euLabel = getEuropeanAqiLabel(euAqi);

  const isStale = airQuality
    ? airQuality.isStale || isDataTimestampStale(airQuality.fetchedAt, 30)
    : false;

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
            <RefreshCw
              className={`w-4 h-4 ${airQualityLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{airQualityLoading ? 'Updating...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Non-Blocking Optional Onboarding Card (First-Time Visitors) */}
      {!preferences.onboardingDismissed && (
        <DashboardOnboardingBanner
          activeLocation={activeLocation}
          preferences={preferences}
          updatePreferences={updatePreferences}
          selectLocation={selectLocation}
          showToast={showToast}
        />
      )}

      {/* Location Selector Bar (Presets + Manual Search + Use My Location GPS + Lat/Lon) */}
      <LocationControlBar
        activeLocation={activeLocation}
        selectLocation={selectLocation}
        showToast={showToast}
      />

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
                    <span className="font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                      {statusText}
                    </span>
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
                      <span
                        className={`inline-flex items-center gap-1.5 text-lg font-semibold ${aqiMeta.colorClass}`}
                      >
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
                  <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                    Standard clarity:
                  </strong>{' '}
                  US EPA AQI and European AQI use different breakpoints from official Indian CPCB National AQI (NAQI). These values represent atmospheric model forecasts, not official CPCB station certificates.
                </p>
                <p className="font-mono tabular-nums">
                  {airQuality.status === 'DEMO'
                    ? 'Demo sample timestamp: '
                    : 'Model forecast timestamp: '}
                  {formatLocalModelTimestamp(
                    airQuality.dataTimestamp,
                    airQuality.location.timezone || airQuality.timezoneAbbreviation
                  )}{' '}
                  · Coords: {airQuality.location.latitude.toFixed(4)},{' '}
                  {airQuality.location.longitude.toFixed(4)}
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
                    {airQuality.groundStation.pm25 !== null
                      ? `${airQuality.groundStation.pm25} µg/m³`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Station PM10</span>
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {airQuality.groundStation.pm10 !== null
                      ? `${airQuality.groundStation.pm10} µg/m³`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Station NO₂</span>
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {airQuality.groundStation.no2 !== null
                      ? `${airQuality.groundStation.no2} µg/m³`
                      : 'N/A'}
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

          {/* 24-Hour & 7-Day Historical Air Quality Trend Charts */}
          <AirQualityTrendsPanel
            airQuality={airQuality}
            locationName={activeLocation.name}
            selectedMetric={selectedMetric}
            onSelectMetric={setSelectedMetric}
            isDark={preferences.theme === 'dark'}
            onRefresh={() => void refreshAirQuality()}
          />
        </>
      ) : null}
    </div>
  );
};
