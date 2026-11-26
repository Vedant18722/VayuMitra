import React, { useMemo, useState } from 'react';
import { AlertCircle, Calculator, Sliders } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { CommuteMode, CustomTravelResult, CustomVehicleType } from '../../types';
import {
  calculateCustomTravelComparison,
  calculateTravelComparison,
  CUSTOM_VEHICLE_FACTORS,
  EMISSION_FACTORS,
} from '../../utils/calculations';
import { validateTravelDistance } from '../../utils/validation';
import { BarComparisonChart } from '../charts/BarComparisonChart';
import { AmbientSoundControl } from '../ui/AmbientSoundControl';
import { ResilientImage } from '../ui/ResilientImage';
import { MoreInfo } from '../ui/MoreInfo';
import { ambientWindEngine } from '../../utils/soundEngine';

type TravelSelectorMode = CommuteMode | 'custom';

const MODE_BUTTONS: { id: TravelSelectorMode; label: string }[] = [
  { id: 'private_car', label: 'Private Vehicle' },
  { id: 'carpool', label: 'Carpooling' },
  { id: 'public_transit', label: 'Public Transit' },
  { id: 'cycling', label: 'Cycling' },
  { id: 'walking', label: 'Walking' },
  { id: 'custom', label: 'Custom' },
];

export const GreenTravelSection: React.FC = () => {
  const { preferences, activeLocation, showToast } = useApp();

  const [selectedMode, setSelectedMode] = useState<TravelSelectorMode>(preferences.commuteMode);

  // Standard 5-mode planner state (preserved)
  const [origin, setOrigin] = useState(`${activeLocation.name} Residential Area`);
  const [destination, setDestination] = useState(`${activeLocation.name} Business District`);
  const [distanceRaw, setDistanceRaw] = useState('12');
  const [tripsPerWeek, setTripsPerWeek] = useState(10);
  const [distanceError, setDistanceError] = useState<string | null>(null);

  // Custom travel mode state
  const [customOrigin, setCustomOrigin] = useState(`${activeLocation.name} Home`);
  const [customDest, setCustomDest] = useState(`${activeLocation.name} Destination`);
  const [customDistanceRaw, setCustomDistanceRaw] = useState('18');
  const [customVehicle, setCustomVehicle] = useState<CustomVehicleType>('petrol_car');
  const [customPassengersRaw, setCustomPassengersRaw] = useState('2');
  const [customTripsRaw, setCustomTripsRaw] = useState('10');
  const [customError, setCustomError] = useState<string | null>(null);
  const [customResult, setCustomResult] = useState<CustomTravelResult | null>(() =>
    calculateCustomTravelComparison({
      origin: `${activeLocation.name} Home`,
      destination: `${activeLocation.name} Destination`,
      distanceKm: 18,
      vehicleType: 'petrol_car',
      passengers: 2,
      tripsPerWeek: 10,
    })
  );

  const validDistance = useMemo(() => {
    const check = validateTravelDistance(distanceRaw);
    return check.valid && check.value !== undefined ? check.value : null;
  }, [distanceRaw]);

  const handleDistanceChange = (val: string) => {
    setDistanceRaw(val);
    const check = validateTravelDistance(val);
    setDistanceError(check.valid ? null : check.error ?? 'Invalid distance.');
  };

  const standardMode: CommuteMode = selectedMode === 'custom' ? 'private_car' : selectedMode;

  const estimates = useMemo(() => {
    if (selectedMode === 'custom' || validDistance === null) return [];
    return calculateTravelComparison({
      origin,
      destination,
      distanceKm: validDistance,
      currentMode: standardMode,
      tripsPerWeek,
    });
  }, [destination, origin, selectedMode, standardMode, tripsPerWeek, validDistance]);

  const currentEstimate = estimates.find((e) => e.isCurrent);
  const recommendedAlternatives = estimates.filter((e) => e.isRecommended);

  const standardChartData = estimates.map((e) => ({
    id: e.mode,
    label: e.label,
    value: e.tripCo2Kg,
    unit: 'kg CO₂e / trip',
    sublabel: e.isCurrent ? 'Current mode' : e.isRecommended ? 'Recommended' : undefined,
    highlighted: e.isRecommended,
  }));

  const handleCalculateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const distCheck = validateTravelDistance(customDistanceRaw);
    if (!distCheck.valid || distCheck.value === undefined) {
      setCustomError(distCheck.error ?? 'Enter a valid travel distance between 0.1 and 500 km.');
      setCustomResult(null);
      return;
    }

    const paxNum = Number(customPassengersRaw);
    if (!Number.isFinite(paxNum) || !Number.isInteger(paxNum) || paxNum < 1 || paxNum > 50) {
      setCustomError('Number of passengers must be a whole number between 1 and 50.');
      setCustomResult(null);
      return;
    }

    const tripsNum = Number(customTripsRaw);
    if (!Number.isFinite(tripsNum) || tripsNum < 1 || tripsNum > 28) {
      setCustomError('One-way trips per week must be between 1 and 28.');
      setCustomResult(null);
      return;
    }

    setCustomError(null);
    const computed = calculateCustomTravelComparison({
      origin: customOrigin.trim() || 'Origin',
      destination: customDest.trim() || 'Destination',
      distanceKm: distCheck.value,
      vehicleType: customVehicle,
      passengers: paxNum,
      tripsPerWeek: Math.round(tripsNum),
    });
    setCustomResult(computed);
    ambientWindEngine.playCalculationConfirmation();
    showToast(
      `Calculated custom trip: ${computed.totalTripCo2Kg.toFixed(2)} kg CO₂e total (${computed.perPassengerTripCo2Kg.toFixed(2)} kg / passenger).`
    );
  };

  const customChartData = useMemo(() => {
    if (!customResult) return [];
    return [
      {
        id: 'custom-current',
        label: `Custom: ${customResult.vehicleLabel} (${customResult.passengers} pax)`,
        value: customResult.perPassengerTripCo2Kg,
        unit: 'kg CO₂e / pax-trip',
        sublabel: 'Your custom trip (per passenger)',
        highlighted: false,
      },
      ...customResult.alternatives.map((alt) => ({
        id: alt.mode,
        label: alt.label,
        value: alt.tripCo2Kg,
        unit: 'kg CO₂e / pax-trip',
        sublabel: alt.isRecommended ? 'Recommended lower-emission' : undefined,
        highlighted: alt.isRecommended,
      })),
    ];
  }, [customResult]);

  return (
    <div className="space-y-8 animate-page-enter">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
            Green Travel Planner
          </h1>
          <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            Compare low-emission commute options—including custom vehicles and passenger sharing—using transparent CO₂e factors.
          </p>
        </div>
        <AmbientSoundControl compact className="self-start sm:self-auto" />
      </div>

      {/* Subtle Environmental Header */}
      <section className="relative rounded-lg overflow-hidden border border-[#DCE5E0] dark:border-[#20302A] bg-[#132A1F]">
        <div className="aspect-[16/5] max-h-52 w-full relative">
          <ResilientImage
            src="/src/assets/images/urban_morning_canopy_1795419584342.jpg"
            alt="Tree-lined urban avenue in calm morning light"
            fallbackTitle="Low-Emission Urban Commuting"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex items-end p-5 sm:p-6">
            <div className="max-w-2xl text-white">
              <p className="text-xs font-mono tracking-wide text-white/80">
                TRANSPORT EMISSION COMPARISON (ESTIMATED)
              </p>
              <h2 className="mt-1 text-lg sm:text-xl font-semibold text-white">
                Transparent per-trip &amp; per-passenger estimates — manual distances, never invented traffic times
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Travel Mode Selector Buttons (including Custom) */}
      <section
        aria-label="Select travel mode"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#4E5E58] dark:text-[#9BB0A7]">
            Choose Travel Mode
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Travel mode buttons">
            {MODE_BUTTONS.map((btn) => {
              const active = selectedMode === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setSelectedMode(btn.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium border transition-colors active:scale-[0.98] min-h-[40px] whitespace-nowrap ${
                    active
                      ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white border-[#1B4332] dark:border-[#2D6A4F]'
                      : 'bg-[#F6F8F7] dark:bg-[#0F1815] text-[#16211D] dark:text-[#D5E1DC] border-[#DCE5E0] dark:border-[#263832] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27]'
                  }`}
                >
                  {btn.id === 'custom' && <Sliders className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STANDARD 5 MODES FORM */}
        {selectedMode !== 'custom' ? (
          <div className="pt-4 border-t border-[#DCE5E0] dark:border-[#20302A] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="travel-origin" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Starting Location
                </label>
                <input
                  id="travel-origin"
                  type="text"
                  maxLength={80}
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g., Indiranagar"
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="travel-dest" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Destination
                </label>
                <input
                  id="travel-dest"
                  type="text"
                  maxLength={80}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., MG Road"
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="travel-distance" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  One-Way Distance (km)
                </label>
                <input
                  id="travel-distance"
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="500"
                  value={distanceRaw}
                  onChange={(e) => handleDistanceChange(e.target.value)}
                  aria-invalid={Boolean(distanceError)}
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="travel-trips" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  One-Way Trips / Week
                </label>
                <input
                  id="travel-trips"
                  type="number"
                  min={1}
                  max={28}
                  value={tripsPerWeek}
                  onChange={(e) =>
                    setTripsPerWeek(Math.max(1, Math.min(28, Number(e.target.value) || 1)))
                  }
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
                />
              </div>
            </div>

            {distanceError && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{distanceError}</span>
              </p>
            )}
          </div>
        ) : (
          /* CUSTOM TRAVEL MODE FORM */
          <form
            onSubmit={handleCalculateCustom}
            noValidate
            aria-label="Custom travel emission calculator"
            className="pt-4 border-t border-[#DCE5E0] dark:border-[#20302A] space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="custom-origin" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Starting Location
                </label>
                <input
                  id="custom-origin"
                  type="text"
                  maxLength={80}
                  value={customOrigin}
                  onChange={(e) => setCustomOrigin(e.target.value)}
                  placeholder="e.g., Pune Shivajinagar"
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="custom-dest" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Destination
                </label>
                <input
                  id="custom-dest"
                  type="text"
                  maxLength={80}
                  value={customDest}
                  onChange={(e) => setCustomDest(e.target.value)}
                  placeholder="e.g., Hinjewadi Phase 2"
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="custom-distance" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Travel Distance (km — manual entry)
                </label>
                <input
                  id="custom-distance"
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="500"
                  value={customDistanceRaw}
                  onChange={(e) => setCustomDistanceRaw(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="custom-vehicle" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Vehicle Type (Optional)
                </label>
                <select
                  id="custom-vehicle"
                  value={customVehicle}
                  onChange={(e) => setCustomVehicle(e.target.value as CustomVehicleType)}
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
                >
                  {Object.values(CUSTOM_VEHICLE_FACTORS).map((v) => (
                    <option key={v.type} value={v.type}>
                      {v.label} ({v.vehicleFactorKgPerKm.toFixed(3)} kg/km)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="custom-passengers" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Number of Passengers (1–50)
                </label>
                <input
                  id="custom-passengers"
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={customPassengersRaw}
                  onChange={(e) => setCustomPassengersRaw(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="custom-trips" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  One-Way Trips / Week (1–28)
                </label>
                <input
                  id="custom-trips"
                  type="number"
                  min={1}
                  max={28}
                  step={1}
                  value={customTripsRaw}
                  onChange={(e) => setCustomTripsRaw(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
                />
              </div>
            </div>

            {customError && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{customError}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                Enter actual route distance manually — VAYUMITRA does not invent route distances or travel times.
              </p>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium active:scale-[0.98] transition-all min-h-[42px] whitespace-nowrap"
              >
                <Calculator className="w-4 h-4" aria-hidden="true" />
                <span>Calculate</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* RESULTS AREA: CUSTOM MODE */}
      {selectedMode === 'custom' ? (
        customResult ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
                <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                  Estimated Total CO₂e ({customResult.vehicleLabel})
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                  {customResult.totalTripCo2Kg.toFixed(2)} kg CO₂e
                </p>
                <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7] truncate">
                  {customResult.distanceKm.toFixed(1)} km · {customOrigin || 'Origin'} → {customDest || 'Destination'}
                </p>
              </div>

              <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
                <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                  Emissions per Passenger ({customResult.passengers}{' '}
                  {customResult.passengers === 1 ? 'passenger' : 'passengers'})
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                  {customResult.perPassengerTripCo2Kg.toFixed(2)} kg CO₂e
                </p>
                <p className="mt-1 text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
                  ~{customResult.perPassengerAnnualCo2Kg.toFixed(0)} kg CO₂e / pax-year (50 wks)
                </p>
              </div>

              <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
                <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                  Potential Savings (Per Passenger)
                </p>
                {customResult.bestLowerAlternative ? (
                  <>
                    <p className="mt-1 text-lg font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                      Switch to {customResult.bestLowerAlternative.label}
                    </p>
                    <p className="mt-1 text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
                      Saves ~{customResult.bestLowerAlternative.co2AvoidedPerTripKg.toFixed(2)} kg/trip (~
                      {customResult.bestLowerAlternative.co2AvoidedAnnualKg.toFixed(0)} kg/yr)
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

              <section className="lg:col-span-7 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 overflow-x-auto">
                <h2 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0] mb-3">
                  Comparison with Travel Alternatives (Per Passenger)
                </h2>
                <table className="w-full text-left border-collapse text-sm min-w-[520px]">
                  <thead>
                    <tr className="border-b border-[#DCE5E0] dark:border-[#20302A] text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                      <th className="py-2 pr-3 font-medium">Option</th>
                      <th className="py-2 px-3 font-medium text-right">Per Pax / Trip</th>
                      <th className="py-2 px-3 font-medium text-right">Diff vs. Custom</th>
                      <th className="py-2 pl-3 font-medium text-right">Annual Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE5E0] dark:divide-[#20302A]">
                    <tr className="bg-[#F3F7F5] dark:bg-[#182621]">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                          Custom: {customResult.vehicleLabel} ({customResult.passengers} pax)
                        </div>
                        <div className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] mt-0.5">
                          Total vehicle trip: {customResult.totalTripCo2Kg.toFixed(2)} kg CO₂e
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {customResult.perPassengerTripCo2Kg.toFixed(2)} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        Baseline
                      </td>
                      <td className="py-3 pl-3 text-right font-mono tabular-nums whitespace-nowrap">
                        0 kg
                      </td>
                    </tr>
                    {customResult.alternatives.map((row) => (
                      <tr key={row.mode} className="hover:bg-[#F9FBFA] dark:hover:bg-[#16221E]">
                        <td className="py-3 pr-3">
                          <div className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                            {row.label}
                            {row.isRecommended && (
                              <span className="ml-2 text-xs font-medium text-[#0F766E] dark:text-[#2DD4BF]">
                                · Lower-emission option
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
                        <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {row.co2AvoidedPerTripKg > 0
                            ? `-${row.co2AvoidedPerTripKg.toFixed(2)} kg`
                            : row.co2AvoidedPerTripKg < 0
                              ? `+${Math.abs(row.co2AvoidedPerTripKg).toFixed(2)} kg`
                              : '0.00 kg'}
                        </td>
                        <td className="py-3 pl-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {row.co2AvoidedAnnualKg > 0
                            ? `-${row.co2AvoidedAnnualKg.toFixed(0)} kg`
                            : row.co2AvoidedAnnualKg < 0
                              ? `+${Math.abs(row.co2AvoidedAnnualKg).toFixed(0)} kg`
                              : '0 kg'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-[#131E1A] border border-dashed border-[#DCE5E0] dark:border-[#263832] rounded-lg p-8 text-center text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            Enter valid distance and passenger details above, then click <strong>Calculate</strong> to estimate your custom trip emissions.
          </div>
        )
      ) : /* RESULTS AREA: STANDARD 5 MODES (PRESERVED) */
      validDistance !== null && currentEstimate ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
              <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Trip Distance</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                {validDistance.toFixed(1)} km
              </p>
              <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7] truncate">
                {origin || 'Origin'} → {destination || 'Destination'}
              </p>
            </div>

            <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
              <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                Current Mode Estimate ({currentEstimate.label})
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                {currentEstimate.tripCo2Kg.toFixed(2)} kg CO₂e
              </p>
              <p className="mt-1 text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
                ~{currentEstimate.annualCo2Kg.toFixed(0)} kg CO₂e / year ({tripsPerWeek} trips/wk × 50 wks)
              </p>
            </div>

            <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5">
              <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                Recommended Lower-Emission Option
              </p>
              {recommendedAlternatives.length > 0 ? (
                <>
                  <p className="mt-1 text-lg font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                    {recommendedAlternatives[0].label}
                  </p>
                  <p className="mt-1 text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
                    {recommendedAlternatives[0].co2AvoidedPerTripKg > 0
                      ? `Avoids ~${recommendedAlternatives[0].co2AvoidedPerTripKg.toFixed(2)} kg CO₂e/trip (~${recommendedAlternatives[0].co2AvoidedAnnualKg.toFixed(0)} kg/yr)`
                      : 'Comparable or zero tailpipe emissions'}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-lg font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                    Already on lowest-emission tier
                  </p>
                  <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                    Great choice for this distance range.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-5 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6">
              <BarComparisonChart
                title="Estimated Emissions per One-Way Trip"
                caption="Documented passenger-km averages"
                data={standardChartData}
              />
            </section>

            <section className="lg:col-span-7 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 overflow-x-auto">
              <h2 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0] mb-3">
                Mode-by-Mode Breakdown (Estimates)
              </h2>
              <table className="w-full text-left border-collapse text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-[#DCE5E0] dark:border-[#20302A] text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                    <th className="py-2 pr-3 font-medium">Mode</th>
                    <th className="py-2 px-3 font-medium text-right">Per Trip</th>
                    <th className="py-2 px-3 font-medium text-right">Avoided / Trip</th>
                    <th className="py-2 pl-3 font-medium text-right">Annual Avoided</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE5E0] dark:divide-[#20302A]">
                  {estimates.map((row) => (
                    <tr
                      key={row.mode}
                      className={
                        row.isCurrent
                          ? 'bg-[#F3F7F5] dark:bg-[#182621]'
                          : 'hover:bg-[#F9FBFA] dark:hover:bg-[#16221E]'
                      }
                    >
                      <td className="py-3 pr-3">
                        <div className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                          {row.label}
                          {row.isCurrent && (
                            <span className="ml-2 text-xs font-normal text-[#4E5E58] dark:text-[#9BB0A7]">
                              · Selected
                            </span>
                          )}
                          {row.isRecommended && (
                            <span className="ml-2 text-xs font-medium text-[#0F766E] dark:text-[#2DD4BF]">
                              · Recommended
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
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {row.co2AvoidedPerTripKg > 0
                          ? `-${row.co2AvoidedPerTripKg.toFixed(2)} kg`
                          : row.co2AvoidedPerTripKg < 0
                            ? `+${Math.abs(row.co2AvoidedPerTripKg).toFixed(2)} kg`
                            : '0.00 kg'}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {row.co2AvoidedAnnualKg > 0
                          ? `-${row.co2AvoidedAnnualKg.toFixed(0)} kg`
                          : row.co2AvoidedAnnualKg < 0
                            ? `+${Math.abs(row.co2AvoidedAnnualKg).toFixed(0)} kg`
                            : '0 kg'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-[#131E1A] border border-dashed border-[#DCE5E0] dark:border-[#263832] rounded-lg p-8 text-center text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
          Enter a valid positive distance (0.1–500 km) above to compare transport mode emissions.
        </div>
      )}

      {/* Calculation Assumptions & Methodology inside collapsible MoreInfo */}
      <section className="bg-[#EDF3EF] dark:bg-[#121D19] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg px-5 py-3">
        <MoreInfo label="More Info: Formula & Emission Factors" className="border-t-0 pt-0">
          <p>
            <strong className="text-[#16211D] dark:text-[#EDF3F0]">Standard Mode Formula:</strong>{' '}
            <code className="font-mono">Trip CO₂e (kg) = Distance (km) × Emission Factor (kg CO₂e / passenger-km)</code>.
          </p>
          <p>
            <strong className="text-[#16211D] dark:text-[#EDF3F0]">Custom Vehicle Formula:</strong>{' '}
            For private/hired vehicles,{' '}
            <code className="font-mono">Total Trip CO₂e = Distance × Vehicle Factor</code> and{' '}
            <code className="font-mono">Per-Passenger CO₂e = Total Trip CO₂e / Passengers</code>. For shared transit (city bus, metro rail), passenger-km factors scale linearly with passenger count. Annual projections assume 50 commuting weeks per year.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 font-mono text-[11px] pt-1">
            {Object.values(EMISSION_FACTORS).map((spec) => (
              <li key={spec.mode}>
                {spec.label}: {spec.factorKgPerKm.toFixed(3)} kg/pkm
              </li>
            ))}
            {Object.values(CUSTOM_VEHICLE_FACTORS).map((spec) => (
              <li key={spec.type}>
                Custom {spec.label}: {spec.vehicleFactorKgPerKm.toFixed(3)} kg/km
              </li>
            ))}
          </ul>
          <p>
            <strong className="text-[#16211D] dark:text-[#EDF3F0]">Sources &amp; Scope:</strong>{' '}
            UK DESNZ/DEFRA (2024) &amp; India GHG Program urban transport averages. Actual emissions vary by engine maintenance, AC load, electricity grid mix, and congestion. VAYUMITRA does not fabricate live traffic congestion, turn-by-turn routes, or travel durations.
          </p>
        </MoreInfo>
      </section>
    </div>
  );
};
