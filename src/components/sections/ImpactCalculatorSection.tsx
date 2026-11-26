import React, { useMemo } from 'react';
import { PlusCircle, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateImpactSummary, EMISSION_FACTORS } from '../../utils/calculations';
import { BarComparisonChart } from '../charts/BarComparisonChart';
import { MoreInfo } from '../ui/MoreInfo';
import { ambientWindEngine } from '../../utils/soundEngine';

export const ImpactCalculatorSection: React.FC = () => {
  const {
    impactRoutine,
    updateImpactRoutine,
    impactLogs,
    addImpactLog,
    resetImpactLogs,
  } = useApp();

  const summary = useMemo(() => calculateImpactSummary(impactRoutine), [impactRoutine]);

  const handleLogCurrentWeek = () => {
    const maxWeek = impactLogs.reduce((max, log) => {
      const match = /^Week\s+(\d+)$/i.exec(log.weekLabel.trim());
      const num = match ? Number(match[1]) : 0;
      return Number.isFinite(num) && num > max ? num : max;
    }, impactLogs.length);
    const nextNum = maxWeek + 1;
    addImpactLog({
      id: `wk-${Date.now()}`,
      weekLabel: `Week ${nextNum}`,
      co2AvoidedKg: summary.weeklyCo2AvoidedKg,
      vehicleKmAvoided: summary.weeklyVehicleKmAvoided,
      actionsCompleted: summary.actionsCompleted,
      loggedAt: new Date().toISOString(),
    });
    ambientWindEngine.playCalculationConfirmation();
  };

  const weeklyCo2Chart = impactLogs.map((log, idx) => ({
    id: log.id,
    label: log.weekLabel,
    value: log.co2AvoidedKg,
    unit: 'kg CO₂e avoided',
    sublabel: `${log.vehicleKmAvoided} km avoided · ${log.actionsCompleted}/6 actions`,
    highlighted: idx === impactLogs.length - 1,
  }));

  const baselineVsImprovedChart = [
    {
      id: 'baseline',
      label: 'Baseline Routine',
      value: summary.baselineWeeklyCo2Kg,
      unit: 'kg CO₂e / week',
    },
    {
      id: 'improved',
      label: 'Improved Routine',
      value: summary.improvedWeeklyCo2Kg,
      unit: 'kg CO₂e / week',
      highlighted: true,
    },
  ];

  return (
    <div className="space-y-8 animate-page-enter">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
            Environmental Impact Calculator
          </h1>
          <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            Compare your baseline and improved weekly routines with transparent, reproducible CO₂e and vehicle-km formulas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLogCurrentWeek}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium transition-colors min-h-[40px] whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>Log Current Week</span>
          </button>
          <button
            type="button"
            onClick={resetImpactLogs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-white dark:bg-[#131E1A] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] transition-colors min-h-[40px] whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="vm-card-interactive bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Estimated CO₂ Avoided</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
            {summary.weeklyCo2AvoidedKg.toFixed(2)} kg
            <span className="text-sm font-normal text-[#4E5E58] dark:text-[#9BB0A7]"> / week</span>
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
            ~{summary.annualCo2AvoidedKg.toFixed(0)} kg CO₂e / year (50 weeks)
          </p>
        </div>

        <div className="vm-card-interactive bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Private Vehicle Distance Avoided</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
            {summary.weeklyVehicleKmAvoided.toFixed(1)} km
            <span className="text-sm font-normal text-[#4E5E58] dark:text-[#9BB0A7]"> / week</span>
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
            ~{summary.annualVehicleKmAvoided} km / year shifted to lower-emission modes
          </p>
        </div>

        <div className="vm-card-interactive bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Sustainable Actions Completed</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
            {summary.actionsCompleted} / {summary.totalTrackedActions}
          </p>
          <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
            Combines mobility shifts &amp; clean-air household habits
          </p>
        </div>
      </div>

      {/* Interactive Baseline vs Improved Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section
          aria-label="Baseline versus improved routine inputs"
          className="lg:col-span-6 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5"
        >
          <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            Baseline vs. Improved Routine
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="imp-baseline-km" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                  Baseline Private Vehicle Distance (km / week)
                </label>
                <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                  {impactRoutine.baselineCarKmPerWeek} km
                </span>
              </div>
              <input
                id="imp-baseline-km"
                type="range"
                min={0}
                max={400}
                step={5}
                value={impactRoutine.baselineCarKmPerWeek}
                onChange={(e) => {
                  const nextBase = Number(e.target.value);
                  updateImpactRoutine({
                    baselineCarKmPerWeek: nextBase,
                    improvedCarKmPerWeek: Math.min(impactRoutine.improvedCarKmPerWeek, nextBase),
                  });
                }}
                className="w-full accent-[#1B4332] dark:accent-[#2DD4BF]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="imp-improved-km" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                  Improved Private Vehicle Distance (km / week)
                </label>
                <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                  {impactRoutine.improvedCarKmPerWeek} km
                </span>
              </div>
              <input
                id="imp-improved-km"
                type="range"
                min={0}
                max={impactRoutine.baselineCarKmPerWeek}
                step={5}
                disabled={impactRoutine.baselineCarKmPerWeek === 0}
                value={impactRoutine.improvedCarKmPerWeek}
                onChange={(e) => updateImpactRoutine({ improvedCarKmPerWeek: Number(e.target.value) })}
                className="w-full accent-[#1B4332] dark:accent-[#2DD4BF] disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="imp-shift-mode" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Replaced Distance Shifted To
                </label>
                <select
                  id="imp-shift-mode"
                  value={impactRoutine.shiftedToMode}
                  onChange={(e) =>
                    updateImpactRoutine({
                      shiftedToMode: e.target.value as typeof impactRoutine.shiftedToMode,
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
                >
                  <option value="public_transit">Public Transit (0.068 kg/pkm)</option>
                  <option value="carpool">Carpooling (0.072 kg/pkm)</option>
                  <option value="cycling">Cycling (0.000 kg/pkm)</option>
                  <option value="walking">Walking (0.000 kg/pkm)</option>
                </select>
              </div>

              <div>
                <label htmlFor="imp-noidle" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Engine-Off / No-Idling Days (0–7 / wk)
                </label>
                <input
                  id="imp-noidle"
                  type="number"
                  min={0}
                  max={7}
                  value={impactRoutine.noIdlingDaysPerWeek}
                  onChange={(e) =>
                    updateImpactRoutine({
                      noIdlingDaysPerWeek: Math.max(0, Math.min(7, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="imp-cook" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Kitchen Exhaust Used (days / wk)
                </label>
                <input
                  id="imp-cook"
                  type="number"
                  min={0}
                  max={7}
                  value={impactRoutine.cleanCookingVentDaysPerWeek}
                  onChange={(e) =>
                    updateImpactRoutine({
                      cleanCookingVentDaysPerWeek: Math.max(0, Math.min(7, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="imp-carpool" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Shared / Carpool Trips (per wk)
                </label>
                <input
                  id="imp-carpool"
                  type="number"
                  min={0}
                  max={20}
                  value={impactRoutine.carpoolTripsPerWeek}
                  onChange={(e) =>
                    updateImpactRoutine({
                      carpoolTripsPerWeek: Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={impactRoutine.hepaMaintenanceDone}
                  onChange={(e) => updateImpactRoutine({ hepaMaintenanceDone: e.target.checked })}
                  className="h-4 w-4 rounded border-[#8DA299] text-[#1B4332]"
                />
                <span>Completed HEPA / pre-filter dust maintenance this month</span>
              </label>

              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={impactRoutine.zeroWasteBurningPledge}
                  onChange={(e) => updateImpactRoutine({ zeroWasteBurningPledge: e.target.checked })}
                  className="h-4 w-4 rounded border-[#8DA299] text-[#1B4332]"
                />
                <span>Segregating household/garden waste (zero open burning)</span>
              </label>
            </div>
          </div>
        </section>

        {/* Charts Column */}
        <div className="lg:col-span-6 space-y-6">
          <section className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6">
            <BarComparisonChart
              title="Baseline vs. Improved Weekly CO₂e"
              caption="Transport & idling emissions only"
              data={baselineVsImprovedChart}
            />
          </section>

          <section className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6">
            <BarComparisonChart
              title="Weekly Progress Log"
              caption="Click 'Log Current Week' to record progress"
              data={weeklyCo2Chart}
            />
          </section>
        </div>
      </div>

      {/* Scientific Boundary: CO2 vs Local PM2.5 / City AQI */}
      <section
        aria-label="Scientific distinction between CO2 emissions and local PM2.5 air quality"
        className="bg-[#EDF3EF] dark:bg-[#121D19] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg px-5 py-3"
      >
        <MoreInfo label="More Info: Formulas & CO₂ vs. Local PM2.5" className="border-t-0 pt-0">
          <p className="font-mono text-xs">
            Baseline CO₂e = BaselineCarKm × {EMISSION_FACTORS.private_car.factorKgPerKm} kg/km · Improved CO₂e = (ImprovedCarKm × 0.180) + (ShiftedKm × {EMISSION_FACTORS[impactRoutine.shiftedToMode].factorKgPerKm.toFixed(3)}) - (NoIdlingDays × 0.35 kg).
          </p>
          <p>
            <strong className="text-[#16211D] dark:text-[#EDF3F0]">Important distinction:</strong>{' '}
            CO₂ is a long-lived global greenhouse gas, whereas winter smog health risk is driven by local particulate matter (PM2.5, PM10) and short-lived gases (NO₂, O₃, SO₂). An individual household&apos;s CO₂ savings contribute to long-term climate mitigation and do <strong>not</strong> directly lower citywide AQI on their own. Local PM2.5/PM10 benefits come separately from reducing local combustion (no waste burning, less idling) and controlling personal indoor exposure (exhaust hoods, HEPA filtration).
          </p>
        </MoreInfo>
      </section>
    </div>
  );
};
