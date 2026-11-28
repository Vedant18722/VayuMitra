import React from 'react';
import type { TravelModeEstimate } from '../../../types';

export function formatSavingsDisplay(
  avoidedKg: number,
  decimals: number,
  isBaseline = false
): { text: string; toneClass: string } {
  if (isBaseline) {
    return { text: 'Baseline', toneClass: 'text-[#4E5E58] dark:text-[#9BB0A7]' };
  }
  if (avoidedKg > 0.0005) {
    return {
      text: `Saves ${avoidedKg.toFixed(decimals)} kg`,
      toneClass: 'text-[#1B4332] dark:text-[#2DD4BF] font-medium',
    };
  }
  if (avoidedKg < -0.0005) {
    return {
      text: `+${Math.abs(avoidedKg).toFixed(decimals)} kg higher`,
      toneClass: 'text-[#5B6B65] dark:text-[#8DA299]',
    };
  }
  return {
    text: decimals === 0 ? '0 kg (Same)' : '0.00 kg (Same)',
    toneClass: 'text-[#4E5E58] dark:text-[#9BB0A7]',
  };
}

export interface CustomBaselineRow {
  title: string;
  subtitle: string;
  perTripKg: number;
}

interface TravelComparisonTableProps {
  title: string;
  modeColumnLabel: string;
  perTripColumnLabel: string;
  recommendedTag: string;
  rows: TravelModeEstimate[];
  customBaseline?: CustomBaselineRow;
}

/**
 * Shared accessible CO2e comparison table used by both Standard and Custom travel modes.
 */
export const TravelComparisonTable: React.FC<TravelComparisonTableProps> = ({
  title,
  modeColumnLabel,
  perTripColumnLabel,
  recommendedTag,
  rows,
  customBaseline,
}) => {
  return (
    <section className="lg:col-span-7 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 overflow-x-auto">
      <h2 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0] mb-3">{title}</h2>
      <table className="w-full text-left border-collapse text-sm min-w-[520px]">
        <thead>
          <tr className="border-b border-[#DCE5E0] dark:border-[#20302A] text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
            <th scope="col" className="py-2 pr-3 font-medium">
              {modeColumnLabel}
            </th>
            <th scope="col" className="py-2 px-3 font-medium text-right">
              {perTripColumnLabel}
            </th>
            <th scope="col" className="py-2 px-3 font-medium text-right">
              Savings / Diff (Trip)
            </th>
            <th scope="col" className="py-2 pl-3 font-medium text-right">
              Annual Savings / Diff
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#DCE5E0] dark:divide-[#20302A]">
          {customBaseline && (
            <tr className="bg-[#F3F7F5] dark:bg-[#182621]">
              <td className="py-3 pr-3">
                <div className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                  {customBaseline.title}
                </div>
                <div className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] mt-0.5">
                  {customBaseline.subtitle}
                </div>
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                {customBaseline.perTripKg.toFixed(2)} kg
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap text-[#4E5E58] dark:text-[#9BB0A7]">
                Baseline
              </td>
              <td className="py-3 pl-3 text-right font-mono tabular-nums whitespace-nowrap text-[#4E5E58] dark:text-[#9BB0A7]">
                Baseline
              </td>
            </tr>
          )}
          {rows.map((row) => {
            const isBaseline = !customBaseline && row.isCurrent;
            const tripDiff = formatSavingsDisplay(row.co2AvoidedPerTripKg, 2, isBaseline);
            const annualDiff = formatSavingsDisplay(row.co2AvoidedAnnualKg, 0, isBaseline);
            return (
              <tr
                key={row.mode}
                className={
                  isBaseline
                    ? 'bg-[#F3F7F5] dark:bg-[#182621]'
                    : 'hover:bg-[#F9FBFA] dark:hover:bg-[#16221E]'
                }
              >
                <td className="py-3 pr-3">
                  <div className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                    {row.label}
                    {isBaseline && (
                      <span className="ml-2 text-xs font-normal text-[#4E5E58] dark:text-[#9BB0A7]">
                        · Selected
                      </span>
                    )}
                    {row.isRecommended && (
                      <span className="ml-2 text-xs font-medium text-[#0F766E] dark:text-[#2DD4BF]">
                        · {recommendedTag}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] mt-0.5">
                    {row.exposureNote}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                  {row.tripCo2Kg.toFixed(2)} kg
                </td>
                <td
                  className={`py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap ${tripDiff.toneClass}`}
                >
                  {tripDiff.text}
                </td>
                <td
                  className={`py-3 pl-3 text-right font-mono tabular-nums whitespace-nowrap ${annualDiff.toneClass}`}
                >
                  {annualDiff.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};
