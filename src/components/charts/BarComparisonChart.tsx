import React from 'react';

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  unit: string;
  sublabel?: string;
  highlighted?: boolean;
}

interface BarComparisonChartProps {
  title: string;
  caption: string;
  data: BarDatum[];
  emptyMessage?: string;
}

export const BarComparisonChart: React.FC<BarComparisonChartProps> = ({
  title,
  caption,
  data,
  emptyMessage = 'No data available to plot.',
}) => {
  if (data.length === 0) {
    return (
      <div className="p-6 text-sm text-[#4E5E58] dark:text-[#9BB0A7] border border-dashed border-[#DCE5E0] dark:border-[#22332D] rounded-lg">
        {emptyMessage}
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 0.1);

  return (
    <figure aria-label={`${title}. ${caption}`} className="w-full space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">{title}</h3>
        <span className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">{caption}</span>
      </div>

      <div className="space-y-3 pt-1">
        {data.map((item) => {
          const pct = Math.max(0, Math.min(100, (item.value / maxVal) * 100));
          return (
            <div key={item.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <div className="min-w-0 truncate font-medium text-[#16211D] dark:text-[#EDF3F0]">
                  {item.label}
                  {item.sublabel && (
                    <span className="ml-2 text-xs font-normal text-[#4E5E58] dark:text-[#9BB0A7]">
                      · {item.sublabel}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs tabular-nums shrink-0 text-[#16211D] dark:text-[#EDF3F0]">
                  {item.value.toFixed(item.value < 10 ? 2 : 1)} {item.unit}
                </span>
              </div>
              <div
                className="h-2.5 w-full rounded-sm bg-[#E8EFEA] dark:bg-[#1C2A25] overflow-hidden"
                role="progressbar"
                aria-valuenow={Number(item.value.toFixed(2))}
                aria-valuemin={0}
                aria-valuemax={Number(maxVal.toFixed(2))}
                aria-label={`${item.label}: ${item.value} ${item.unit}`}
              >
                <div
                  className={`h-full rounded-sm transition-all duration-500 ease-out ${
                    item.highlighted
                      ? 'bg-[#0F766E] dark:bg-[#2DD4BF]'
                      : 'bg-[#1B4332] dark:bg-[#3D8B68]'
                  }`}
                  style={{ width: `${item.value === 0 ? 0 : Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className="sr-only">
        {title}: {data.map((d) => `${d.label} ${d.value} ${d.unit}`).join(', ')}.
      </figcaption>
    </figure>
  );
};
