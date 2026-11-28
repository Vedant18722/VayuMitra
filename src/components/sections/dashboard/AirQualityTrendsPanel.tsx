import React, { useState } from 'react';
import type { AirQualityPayload, PollutantKey } from '../../../types';
import { POLLUTANT_META } from '../../../utils/aqi';
import { HourlyTrendChart } from '../../charts/HourlyTrendChart';
import { WeeklyHistoryChart } from '../../charts/WeeklyHistoryChart';
import { MoreInfo } from '../../ui/MoreInfo';

const POLLUTANT_KEYS: PollutantKey[] = ['usAqi', 'pm25', 'pm10', 'no2', 'o3', 'so2'];

interface PollutantTabListProps {
  idPrefix: string;
  panelId: string;
  ariaLabel: string;
  selectedMetric: PollutantKey;
  onSelect: (metric: PollutantKey) => void;
}

const PollutantTabList: React.FC<PollutantTabListProps> = ({
  idPrefix,
  panelId,
  ariaLabel,
  selectedMetric,
  onSelect,
}) => (
  <div
    className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[#F2F5F3] dark:bg-[#0F1815]"
    role="tablist"
    aria-label={ariaLabel}
  >
    {POLLUTANT_KEYS.map((key, idx) => {
      const active = selectedMetric === key;
      return (
        <button
          key={key}
          id={`${idPrefix}-${key}`}
          type="button"
          role="tab"
          aria-selected={active}
          aria-controls={panelId}
          tabIndex={active ? 0 : -1}
          onClick={() => onSelect(key)}
          onKeyDown={(e) => {
            let nextIdx: number | null = null;
            if (e.key === 'ArrowRight') nextIdx = (idx + 1) % POLLUTANT_KEYS.length;
            else if (e.key === 'ArrowLeft') {
              nextIdx = (idx - 1 + POLLUTANT_KEYS.length) % POLLUTANT_KEYS.length;
            } else if (e.key === 'Home') nextIdx = 0;
            else if (e.key === 'End') nextIdx = POLLUTANT_KEYS.length - 1;
            if (nextIdx !== null) {
              e.preventDefault();
              const nextKey = POLLUTANT_KEYS[nextIdx];
              onSelect(nextKey);
              document.getElementById(`${idPrefix}-${nextKey}`)?.focus();
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
);

interface AirQualityTrendsPanelProps {
  airQuality: AirQualityPayload;
  locationName: string;
  selectedMetric: PollutantKey;
  onSelectMetric: (metric: PollutantKey) => void;
  isDark: boolean;
  onRefresh: () => void;
}

export const AirQualityTrendsPanel: React.FC<AirQualityTrendsPanelProps> = ({
  airQuality,
  locationName,
  selectedMetric,
  onSelectMetric,
  isDark,
  onRefresh,
}) => {
  const [historyMetric, setHistoryMetric] = useState<PollutantKey>('usAqi');
  const [showHistoryPeak, setShowHistoryPeak] = useState<boolean>(true);

  return (
    <>
      {/* 24-Hour Pollutant Trend Chart */}
      <section
        aria-label="24-hour pollutant forecast trend"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              24-Hour Pollutant Trend ({locationName})
            </h2>
            <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] mt-0.5">
              {POLLUTANT_META[selectedMetric].description}
            </p>
          </div>

          <PollutantTabList
            idPrefix="trend-tab"
            panelId="trend-tabpanel"
            ariaLabel="Select pollutant for hourly trend chart"
            selectedMetric={selectedMetric}
            onSelect={onSelectMetric}
          />
        </div>

        <div id="trend-tabpanel" role="tabpanel" aria-labelledby={`trend-tab-${selectedMetric}`}>
          <HourlyTrendChart
            hourly={airQuality.hourly}
            metric={selectedMetric}
            locationName={locationName}
          />
        </div>

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
              7-Day Historical Air Quality Trend ({locationName})
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

            <PollutantTabList
              idPrefix="history-tab"
              panelId="history-tabpanel"
              ariaLabel="Select pollutant for 7-day historical chart"
              selectedMetric={historyMetric}
              onSelect={setHistoryMetric}
            />
          </div>
        </div>

        <div id="history-tabpanel" role="tabpanel" aria-labelledby={`history-tab-${historyMetric}`}>
          <WeeklyHistoryChart
            history={airQuality.dailyHistory ?? []}
            metric={historyMetric}
            locationName={locationName}
            isDark={isDark}
            showPeakLine={showHistoryPeak}
            onRefresh={onRefresh}
          />
        </div>

        <MoreInfo label="More Info: 7-Day Historical Methodology" className="mt-5">
          <p>
            <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
              How daily values are computed:
            </strong>{' '}
            Each point averages all available hourly Open-Meteo Copernicus CAMS readings for that local calendar date (typically 24 hours for completed past days, and hours elapsed so far for today). The dashed Peak Overlay marks each day&apos;s highest hourly reading.
          </p>
          <p>
            <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
              Model archive vs. ground stations:
            </strong>{' '}
            Historical values come from Open-Meteo&apos;s atmospheric grid archive rather than official CPCB regulatory ground station logs.
          </p>
        </MoreInfo>
      </section>
    </>
  );
};
