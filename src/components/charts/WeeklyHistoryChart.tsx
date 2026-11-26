import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import type { DailyHistoryPoint, PollutantKey } from '../../types';
import {
  computeWeeklyHistoryStats,
  formatHistoryDateFull,
  formatHistoryDateShort,
  getUsAqiCategory,
  POLLUTANT_META,
} from '../../utils/aqi';
import { AqiStatusIcon } from '../ui/AqiStatusIcon';

export interface WeeklyHistoryChartProps {
  history: DailyHistoryPoint[];
  metric: PollutantKey;
  locationName: string;
  isDark?: boolean;
  showPeakLine?: boolean;
  onRefresh?: () => void;
}

interface ChartDatum {
  date: string;
  shortDate: string;
  fullDate: string;
  avg: number | null;
  peak: number | null;
  low: number | null;
  sampleCount: number;
  aqiLevel: string | null;
  dotColor: string;
}

interface GuidelineRef {
  value: number;
  label: string;
  stroke: string;
}

const METRIC_GUIDELINES: Record<PollutantKey, GuidelineRef[]> = {
  usAqi: [
    { value: 100, label: 'Sensitive (100)', stroke: '#EA580C' },
    { value: 150, label: 'Unhealthy (150)', stroke: '#DC2626' },
  ],
  pm25: [
    { value: 15, label: 'WHO 24h (15)', stroke: '#0F766E' },
    { value: 60, label: 'India NAAQS (60)', stroke: '#EA580C' },
  ],
  pm10: [{ value: 45, label: 'WHO 24h (45)', stroke: '#0F766E' }],
  no2: [{ value: 25, label: 'WHO 24h (25)', stroke: '#0F766E' }],
  o3: [{ value: 100, label: 'WHO 8h (100)', stroke: '#EA580C' }],
  so2: [{ value: 40, label: 'WHO 24h (40)', stroke: '#0F766E' }],
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ChartDatum }>;
  metric: PollutantKey;
}

const HistoryTooltip: React.FC<CustomTooltipProps> = ({ active, payload, metric }) => {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  const meta = POLLUTANT_META[metric];
  const isAqi = metric === 'usAqi';
  const formatVal = (val: number | null) =>
    val === null ? '—' : isAqi ? `${Math.round(val)}` : val.toFixed(1);
  const aqiMeta = isAqi && datum.avg !== null ? getUsAqiCategory(datum.avg) : null;

  return (
    <div className="rounded-lg border border-[#DCE5E0] dark:border-[#243830] bg-white/95 dark:bg-[#131E1A]/95 backdrop-blur-xs shadow-lg p-3 min-w-[205px] text-xs">
      <div className="flex items-baseline justify-between gap-3 pb-2 border-b border-[#E6EFEA] dark:border-[#20302A]">
        <span className="font-semibold text-[#16211D] dark:text-[#EDF3F0]">{datum.fullDate}</span>
        <span className="font-mono text-[10px] tabular-nums text-[#5B6B65] dark:text-[#8DA299]">
          {datum.sampleCount > 0 ? `${datum.sampleCount}h avg` : 'No samples'}
        </span>
      </div>

      {aqiMeta && (
        <div className={`mt-2 flex items-center gap-1.5 font-medium ${aqiMeta.colorClass}`}>
          <AqiStatusIcon kind={aqiMeta.iconKind} className="w-3.5 h-3.5 shrink-0" />
          <span>{aqiMeta.level}</span>
        </div>
      )}

      <dl className="mt-2 space-y-1.5 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <dt className="font-sans text-[#4E5E58] dark:text-[#9BB0A7]">Daily Avg</dt>
          <dd className="font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            {formatVal(datum.avg)} {isAqi ? 'AQI' : meta.unit}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-sans text-[#4E5E58] dark:text-[#9BB0A7]">Daily Peak</dt>
          <dd className="text-[#B45309] dark:text-amber-300 font-medium">
            {formatVal(datum.peak)} {isAqi ? 'AQI' : meta.unit}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-sans text-[#4E5E58] dark:text-[#9BB0A7]">Daily Low</dt>
          <dd className="text-[#0F766E] dark:text-[#2DD4BF]">
            {formatVal(datum.low)} {isAqi ? 'AQI' : meta.unit}
          </dd>
        </div>
      </dl>
    </div>
  );
};

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDatum;
  isDark: boolean;
  isAqi: boolean;
  active?: boolean;
}

const DailyDot: React.FC<CustomDotProps> = ({ cx, cy, payload, isDark, isAqi, active = false }) => {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload || payload.avg === null) {
    return null;
  }
  const fill = isAqi ? payload.dotColor : isDark ? '#2DD4BF' : '#1B4332';
  const stroke = isDark ? '#131E1A' : '#FFFFFF';
  return (
    <circle
      cx={cx}
      cy={cy}
      r={active ? 6 : 4.5}
      fill={fill}
      stroke={stroke}
      strokeWidth={2}
    />
  );
};

export const WeeklyHistoryChart: React.FC<WeeklyHistoryChartProps> = ({
  history,
  metric,
  locationName,
  isDark = false,
  showPeakLine = true,
  onRefresh,
}) => {
  const uid = useId().replace(/:/g, '');
  const gradientId = `vm-weekly-fill-${uid}`;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const meta = POLLUTANT_META[metric];
  const isAqi = metric === 'usAqi';

  const chartData = useMemo<ChartDatum[]>(() => {
    return history.map((day) => {
      const avg = day[metric];
      const peak = day.maxValues?.[metric] ?? null;
      const low = day.minValues?.[metric] ?? null;
      const aqiCat = isAqi ? getUsAqiCategory(avg) : null;
      return {
        date: day.date,
        shortDate: formatHistoryDateShort(day.date),
        fullDate: formatHistoryDateFull(day.date),
        avg,
        peak,
        low,
        sampleCount: day.sampleCount,
        aqiLevel: aqiCat ? aqiCat.level : null,
        dotColor: aqiCat ? aqiCat.dotColor : isDark ? '#2DD4BF' : '#1B4332',
      };
    });
  }, [history, metric, isAqi, isDark]);

  const stats = useMemo(() => computeWeeklyHistoryStats(history, metric), [history, metric]);

  const validNumbers = useMemo(() => {
    const nums: number[] = [];
    for (const d of chartData) {
      if (d.avg !== null && Number.isFinite(d.avg)) nums.push(d.avg);
      if (showPeakLine && d.peak !== null && Number.isFinite(d.peak)) nums.push(d.peak);
    }
    return nums;
  }, [chartData, showPeakLine]);

  if (validNumbers.length === 0) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border border-dashed border-[#DCE5E0] dark:border-[#22332D] rounded-lg text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
        <div>
          <p className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
            7-day historical {meta.shortName} data is currently unavailable
          </p>
          <p className="text-xs mt-1">
            Refresh air quality data to pull the past 7 calendar days from the Open-Meteo archive.
          </p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-xs font-medium whitespace-nowrap min-h-[38px]"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Refresh Data</span>
          </button>
        )}
      </div>
    );
  }

  const maxDataVal = Math.max(...validNumbers);
  const visibleGuidelines = METRIC_GUIDELINES[metric].filter(
    (ref) => ref.value <= Math.max(maxDataVal * 1.35, ref.value * 0.9)
  );
  const maxRefVal = visibleGuidelines.reduce((acc, g) => Math.max(acc, g.value), 0);
  const yMax = Math.ceil(Math.max(maxDataVal * 1.15, maxRefVal * 1.08, 10) / 5) * 5;

  const primaryStroke = isDark ? '#2DD4BF' : '#1B4332';
  const peakStroke = isDark ? '#F59E0B' : '#B45309';
  const gridStroke = isDark ? '#22332D' : '#E2EAE5';
  const axisTextColor = isDark ? '#8DA299' : '#5B6B65';
  const cursorStroke = isDark ? 'rgba(45, 212, 191, 0.35)' : 'rgba(27, 67, 50, 0.25)';

  const formatMetricVal = (val: number | null) =>
    val === null ? '—' : isAqi ? `${Math.round(val)}` : val.toFixed(1);
  const unitSuffix = isAqi ? 'US AQI' : meta.unit;

  const trendLabel =
    stats.trendDirection === 'improving'
      ? `Improving (${stats.trendDeltaPct}%)`
      : stats.trendDirection === 'worsening'
        ? `Worsening (+${stats.trendDeltaPct}%)`
        : stats.trendDirection === 'stable'
          ? `Stable (${stats.trendDeltaPct !== null && stats.trendDeltaPct > 0 ? `+${stats.trendDeltaPct}` : stats.trendDeltaPct ?? 0}%)`
          : 'Insufficient days';

  const trendColorClass =
    stats.trendDirection === 'improving'
      ? 'text-emerald-800 dark:text-emerald-300'
      : stats.trendDirection === 'worsening'
        ? 'text-red-700 dark:text-red-300'
        : 'text-[#4E5E58] dark:text-[#9BB0A7]';

  return (
    <figure
      aria-label={`7-day historical ${meta.label} trend for ${locationName}. 7-day average ${formatMetricVal(stats.avg)} ${unitSuffix}, cleanest day ${stats.cleanestDay ? `${formatHistoryDateShort(stats.cleanestDay.date)} at ${formatMetricVal(stats.cleanestDay.value)}` : 'unavailable'}, peak day ${stats.peakDay ? `${formatHistoryDateShort(stats.peakDay.date)} at ${formatMetricVal(stats.peakDay.value)}` : 'unavailable'}.`}
      className="w-full space-y-5"
    >
      {/* Unboxed 4-Column Tabular Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-3.5 border-y border-[#E6EFEA] dark:border-[#20302A]">
        <div>
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">7-Day Average</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
            {formatMetricVal(stats.avg)}
            <span className="ml-1.5 text-xs font-normal text-[#5B6B65] dark:text-[#8DA299]">
              {unitSuffix}
            </span>
          </p>
          {isAqi && stats.avg !== null && (
            <p className={`text-[11px] font-medium mt-0.5 ${getUsAqiCategory(stats.avg).colorClass}`}>
              {getUsAqiCategory(stats.avg).level}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Cleanest Day</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#0F766E] dark:text-[#2DD4BF]">
            {formatMetricVal(stats.cleanestDay?.value ?? null)}
            <span className="ml-1.5 text-xs font-normal text-[#5B6B65] dark:text-[#8DA299]">
              {stats.cleanestDay ? formatHistoryDateShort(stats.cleanestDay.date) : ''}
            </span>
          </p>
          <p className="text-[11px] text-[#5B6B65] dark:text-[#8DA299] mt-0.5">Lowest daily average</p>
        </div>

        <div>
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Peak Day</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
            {formatMetricVal(stats.peakDay?.value ?? null)}
            <span className="ml-1.5 text-xs font-normal text-[#5B6B65] dark:text-[#8DA299]">
              {stats.peakDay ? formatHistoryDateShort(stats.peakDay.date) : ''}
            </span>
          </p>
          <p className="text-[11px] text-[#5B6B65] dark:text-[#8DA299] mt-0.5">Highest daily average</p>
        </div>

        <div>
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Recent Trajectory</p>
          <div className={`mt-1 flex items-center gap-1.5 text-base font-semibold font-mono tabular-nums ${trendColorClass}`}>
            {stats.trendDirection === 'improving' ? (
              <TrendingDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : stats.trendDirection === 'worsening' ? (
              <TrendingUp className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <Minus className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{trendLabel}</span>
          </div>
          <p className="text-[11px] text-[#5B6B65] dark:text-[#8DA299] mt-0.5">Last 3 days vs prior days</p>
        </div>
      </div>

      {/* Inline Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-0.5 rounded-full"
              style={{ backgroundColor: primaryStroke }}
              aria-hidden="true"
            />
            <span>Daily Average ({meta.shortName})</span>
          </span>
          {showPeakLine && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-3 border-t-2 border-dashed"
                style={{ borderColor: peakStroke }}
                aria-hidden="true"
              />
              <span>Daily Hourly Peak</span>
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] tabular-nums">
          {chartData.length} days · {chartData[0]?.shortDate} – {chartData[chartData.length - 1]?.shortDate}
        </span>
      </div>

      {/* Recharts 7-Day Composed Visualization */}
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 680, height: 280 }}>
          <ComposedChart
            data={chartData}
            margin={{ top: 14, right: 16, left: 0, bottom: 6 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryStroke} stopOpacity={isDark ? 0.28 : 0.22} />
                <stop offset="95%" stopColor={primaryStroke} stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="shortDate"
              tick={{ fill: axisTextColor, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              axisLine={{ stroke: gridStroke }}
              tickLine={false}
              dy={6}
            />

            <YAxis
              domain={[0, yMax]}
              width={42}
              tick={{ fill: axisTextColor, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              cursor={{ stroke: cursorStroke, strokeWidth: 1, strokeDasharray: '4 4' }}
              content={<HistoryTooltip metric={metric} />}
            />

            {visibleGuidelines.map((guide) => (
              <ReferenceLine
                key={guide.label}
                y={guide.value}
                stroke={guide.stroke}
                strokeOpacity={isDark ? 0.55 : 0.45}
                strokeDasharray="4 4"
                label={{
                  value: guide.label,
                  position: 'insideTopRight',
                  fill: guide.stroke,
                  fontSize: 10,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              />
            ))}

            <Area
              type="monotone"
              dataKey="avg"
              name={`Daily Avg ${meta.shortName}`}
              stroke={primaryStroke}
              strokeWidth={2.4}
              fill={`url(#${gradientId})`}
              connectNulls
              isAnimationActive={!prefersReducedMotion}
              animationDuration={450}
              dot={<DailyDot isDark={isDark} isAqi={isAqi} />}
              activeDot={<DailyDot isDark={isDark} isAqi={isAqi} active />}
            />

            {showPeakLine && (
              <Line
                type="monotone"
                dataKey="peak"
                name={`Daily Peak ${meta.shortName}`}
                stroke={peakStroke}
                strokeWidth={1.6}
                strokeDasharray="5 4"
                dot={{ r: 2.5, fill: peakStroke, strokeWidth: 0 }}
                activeDot={{ r: 4.5, fill: peakStroke, stroke: isDark ? '#131E1A' : '#FFFFFF', strokeWidth: 1.5 }}
                connectNulls
                isAnimationActive={!prefersReducedMotion}
                animationDuration={500}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible Screen-Reader Summary */}
      <figcaption className="sr-only">
        7-day historical {meta.label} trend for {locationName} from {chartData[0]?.fullDate} to{' '}
        {chartData[chartData.length - 1]?.fullDate}. Average is {formatMetricVal(stats.avg)} {unitSuffix}.
        {stats.cleanestDay
          ? ` Cleanest day was ${formatHistoryDateFull(stats.cleanestDay.date)} at ${formatMetricVal(stats.cleanestDay.value)} ${unitSuffix}.`
          : ''}
        {stats.peakDay
          ? ` Peak day was ${formatHistoryDateFull(stats.peakDay.date)} at ${formatMetricVal(stats.peakDay.value)} ${unitSuffix}.`
          : ''}
      </figcaption>
    </figure>
  );
};
