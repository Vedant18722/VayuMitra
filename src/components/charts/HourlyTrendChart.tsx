import React, { useMemo, useState } from 'react';
import type { HourlyDataPoint, PollutantKey } from '../../types';
import { extractWallClockHour, getUsAqiCategory, POLLUTANT_META } from '../../utils/aqi';

interface HourlyTrendChartProps {
  hourly: HourlyDataPoint[];
  metric: PollutantKey;
  locationName: string;
}

function formatHourShort(iso: string): string {
  const hr = extractWallClockHour(iso);
  if (hr === null) return '';
  return `${String(hr).padStart(2, '0')}:00`;
}

export const HourlyTrendChart: React.FC<HourlyTrendChartProps> = ({
  hourly,
  metric,
  locationName,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const meta = POLLUTANT_META[metric];

  const series = useMemo(() => {
    return hourly.slice(0, 24).map((pt) => ({
      time: pt.time,
      label: formatHourShort(pt.time),
      value: pt[metric],
    }));
  }, [hourly, metric]);

  const validValues = series.map((s) => s.value).filter((v): v is number => v !== null && Number.isFinite(v));

  if (validValues.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center border border-dashed border-[#DCE5E0] dark:border-[#22332D] rounded-lg text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
        Hourly {meta.shortName} values are currently unavailable for this location.
      </div>
    );
  }

  const minVal = Math.min(...validValues);
  const maxVal = Math.max(...validValues);
  const yMax = Math.max(maxVal * 1.15, minVal + 10);
  const yMin = 0;

  const width = 760;
  const height = 220;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) =>
    series.length <= 1 ? padLeft : padLeft + (idx / (series.length - 1)) * plotW;

  const getY = (val: number) => {
    const ratio = (val - yMin) / (yMax - yMin || 1);
    return padTop + plotH - ratio * plotH;
  };

  const pointsWithCoords = series.map((pt, idx) => ({
    ...pt,
    x: getX(idx),
    y: pt.value !== null ? getY(pt.value) : null,
  }));

  const linePath = pointsWithCoords
    .filter((p): p is typeof p & { y: number } => p.y !== null)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const validCoords = pointsWithCoords.filter((p): p is typeof p & { y: number } => p.y !== null);
  const areaPath =
    validCoords.length > 1
      ? `${linePath} L ${validCoords[validCoords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${validCoords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  const yTicks = [0, 0.33, 0.66, 1].map((fraction) => ({
    val: Math.round(yMin + fraction * (yMax - yMin)),
    y: padTop + plotH - fraction * plotH,
  }));

  const hovered = activeIndex !== null ? pointsWithCoords[activeIndex] : null;
  const avgVal = validValues.reduce((acc, v) => acc + v, 0) / validValues.length;

  return (
    <figure
      aria-label={`24-hour ${meta.label} trend for ${locationName}. Minimum ${minVal.toFixed(1)}, maximum ${maxVal.toFixed(1)}, average ${avgVal.toFixed(1)} ${meta.unit}.`}
      className="w-full"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[#16211D] dark:text-[#EDF3F0]">{meta.label}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Min {minVal.toFixed(1)} / Avg {avgVal.toFixed(1)} / Max {maxVal.toFixed(1)} {meta.unit}
          </span>
        </div>
        <div className="font-mono tabular-nums min-h-[1rem] text-[#1B4332] dark:text-[#2DD4BF]">
          {hovered && hovered.value !== null
            ? metric === 'usAqi'
              ? `${hovered.label} — ${Math.round(hovered.value)} US AQI (${getUsAqiCategory(hovered.value).level})`
              : `${hovered.label} — ${hovered.value.toFixed(1)} ${meta.unit}`
            : 'Hover or focus data points to inspect hourly values'}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block select-none"
          role="group"
          aria-label={`Interactive 24-hour ${meta.label} data points for ${locationName}`}
        >
          <defs>
            <linearGradient id="vayumitraTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines & Y labels */}
          {yTicks.map((tick) => (
            <g key={tick.val}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={width - padRight}
                y2={tick.y}
                className="stroke-[#E2EAE5] dark:stroke-[#22332D]"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-[#5B6B65] dark:fill-[#8DA299] text-[10px] font-mono tabular-nums"
              >
                {tick.val}
              </text>
            </g>
          ))}

          {/* Area & Line */}
          {areaPath && (
            <path
              key={`area-${metric}-${locationName}`}
              d={areaPath}
              fill="url(#vayumitraTrendFill)"
              className="animate-fade-in"
            />
          )}
          {linePath && (
            <path
              key={`line-${metric}-${locationName}`}
              d={linePath}
              pathLength={1}
              fill="none"
              className="stroke-[#1B4332] dark:stroke-[#2DD4BF] vm-chart-line-draw"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* X-axis labels every 4 hours */}
          {pointsWithCoords.map((pt, idx) =>
            idx % 4 === 0 || idx === pointsWithCoords.length - 1 ? (
              <text
                key={pt.time + idx}
                x={pt.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-[#5B6B65] dark:fill-[#8DA299] text-[10px] font-mono tabular-nums"
              >
                {pt.label}
              </text>
            ) : null
          )}

          {/* Interactive hit targets & points */}
          {pointsWithCoords.map((pt, idx) => {
            if (pt.y === null || pt.value === null) return null;
            const isSelected = activeIndex === idx;
            return (
              <g key={pt.time + '-pt-' + idx}>
                {isSelected && (
                  <line
                    x1={pt.x}
                    y1={padTop}
                    x2={pt.x}
                    y2={padTop + plotH}
                    className="stroke-[#0F766E]/40 dark:stroke-[#2DD4BF]/40"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 5.2 : 3}
                  fill={metric === 'usAqi' ? getUsAqiCategory(pt.value).dotColor : undefined}
                  className={
                    metric === 'usAqi'
                      ? isSelected
                        ? 'stroke-white dark:stroke-[#131E1A]'
                        : ''
                      : isSelected
                        ? 'fill-[#0F766E] dark:fill-[#2DD4BF] stroke-white dark:stroke-[#131E1A]'
                        : 'fill-[#1B4332] dark:fill-[#2DD4BF]'
                  }
                  strokeWidth={isSelected ? 2 : 0}
                />
                <rect
                  x={pt.x - plotW / Math.max(series.length * 2, 12)}
                  y={padTop}
                  width={plotW / Math.max(series.length, 1)}
                  height={plotH}
                  fill="transparent"
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${pt.label}: ${pt.value.toFixed(1)} ${meta.unit}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(idx)}
                  onBlur={() => setActiveIndex(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveIndex(idx);
                    }
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="sr-only">
        24-hour modelled {meta.label} trend for {locationName}. Values range from {minVal.toFixed(1)} to{' '}
        {maxVal.toFixed(1)} {meta.unit}.
      </figcaption>
    </figure>
  );
};
