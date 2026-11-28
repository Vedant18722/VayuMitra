import React, { useMemo } from 'react';
import type { CustomTravelResult } from '../../../types';
import { BarComparisonChart } from '../../charts/BarComparisonChart';
import { TravelComparisonTable } from './TravelComparisonTable';

interface CustomTravelResultsProps {
  result: CustomTravelResult | null;
  route: { origin: string; destination: string };
}

export const CustomTravelResults: React.FC<CustomTravelResultsProps> = ({ result, route }) => {
  const customChartData = useMemo(() => {
    if (!result) return [];
    return [
      {
        id: 'custom-current',
        label: `Custom: ${result.vehicleLabel} (${result.passengers} pax)`,
        value: result.perPassengerTripCo2Kg,
        unit: 'kg CO₂e / pax-trip',
        sublabel: 'Your custom trip (per passenger)',
        highlighted: false,
      },
      ...result.alternatives.map((alt) => ({
        id: alt.mode,
        label: alt.label,
        value: alt.tripCo2Kg,
        unit: 'kg CO₂e / pax-trip',
        sublabel: alt.isRecommended ? 'Recommended lower-emission' : undefined,
        highlighted: alt.isRecommended,
      })),
    ];
  }, [result]);

  if (!result) {
    return (
      <div className="bg-white dark:bg-[#131E1A] border border-dashed border-[#DCE5E0] dark:border-[#263832] rounded-lg p-8 text-center text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
        Enter valid distance and passenger details above, then click <strong>Calculate</strong> to estimate your custom trip emissions.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
            Estimated Total CO₂e ({result.vehicleLabel})
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
            {result.totalTripCo2Kg.toFixed(2)} kg CO₂e
          </p>
          <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7] truncate">
            {result.distanceKm.toFixed(1)} km · {route.origin} → {route.destination}
          </p>
        </div>

        <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
            Emissions per Passenger ({result.passengers}{' '}
            {result.passengers === 1 ? 'passenger' : 'passengers'})
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
            {result.perPassengerTripCo2Kg.toFixed(2)} kg CO₂e
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
            ~{result.perPassengerAnnualCo2Kg.toFixed(0)} kg CO₂e / pax-year (50 wks)
          </p>
        </div>

        <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
            Potential Savings (Per Passenger)
          </p>
          {result.bestLowerAlternative ? (
            <>
              <p className="mt-1 text-lg font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                Switch to {result.bestLowerAlternative.label}
              </p>
              <p className="mt-1 text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
                Saves ~{result.bestLowerAlternative.co2AvoidedPerTripKg.toFixed(2)} kg/trip (~
                {result.bestLowerAlternative.co2AvoidedAnnualKg.toFixed(0)} kg/yr)
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-lg font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                Already on a very low-emission tier
              </p>
              <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                Per-passenger emissions are below standard motorized averages for this distance.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6">
          <BarComparisonChart
            title="Per-Passenger Emissions Comparison"
            caption="Custom vehicle vs. standard urban alternatives"
            data={customChartData}
          />
        </section>

        <TravelComparisonTable
          title="Comparison with Travel Alternatives (Per Passenger)"
          modeColumnLabel="Option"
          perTripColumnLabel="Per Pax / Trip"
          recommendedTag="Lower-emission option"
          rows={result.alternatives}
          customBaseline={{
            title: `Custom: ${result.vehicleLabel} (${result.passengers} pax)`,
            subtitle: `Total vehicle trip: ${result.totalTripCo2Kg.toFixed(2)} kg CO₂e`,
            perTripKg: result.perPassengerTripCo2Kg,
          }}
        />
      </div>
    </>
  );
};
