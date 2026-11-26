import type {
  AirQualityPayload,
  CommuteMode,
  CustomTravelInput,
  CustomTravelResult,
  CustomVehicleType,
  DailyPlanInputs,
  DailyPlanItem,
  ImpactRoutineInput,
  ImpactSummary,
  TravelComparisonInput,
  TravelModeEstimate,
} from '../types';
import { extractWallClockHour } from './aqi';

export interface EmissionFactorSpec {
  mode: CommuteMode;
  label: string;
  factorKgPerKm: number;
  exposureNote: string;
  sourceNote: string;
}

/**
 * Documented passenger-km greenhouse gas emission factors (kg CO2e / passenger-km).
 * Sources: UK DESNZ / DEFRA GHG Conversion Factors (2024) & India GHG Program urban passenger averages.
 */
export const EMISSION_FACTORS: Record<CommuteMode, EmissionFactorSpec> = {
  walking: {
    mode: 'walking',
    label: 'Walking',
    factorKgPerKm: 0,
    exposureNote: 'Zero tailpipe emissions; prefer low-traffic lanes and mask if US AQI > 150.',
    sourceNote: 'Direct tailpipe emissions: 0 kg CO₂e/km.',
  },
  cycling: {
    mode: 'cycling',
    label: 'Cycling',
    factorKgPerKm: 0,
    exposureNote: 'Zero tailpipe emissions; higher breathing rate—avoid heavy smog corridors when US AQI > 150.',
    sourceNote: 'Direct tailpipe emissions: 0 kg CO₂e/km.',
  },
  public_transit: {
    mode: 'public_transit',
    label: 'Public Transit (Metro / Bus)',
    factorKgPerKm: 0.068,
    exposureNote: 'Moderate personal exposure; air-conditioned metro lowers roadside particulate intake.',
    sourceNote: 'Blended urban rail/metro (~0.035) and city bus (~0.100) average: 0.068 kg CO₂e/pkm.',
  },
  carpool: {
    mode: 'carpool',
    label: 'Carpooling (2.5 avg occupants)',
    factorKgPerKm: 0.072,
    exposureNote: 'Cabin recirculation with clean HVAC filter reduces roadway PM2.5 infiltration.',
    sourceNote: 'Average petrol car (0.180 kg/km) shared across 2.5 occupants: 0.072 kg CO₂e/pkm.',
  },
  private_car: {
    mode: 'private_car',
    label: 'Private Vehicle (Single Occupant)',
    factorKgPerKm: 0.18,
    exposureNote: 'Highest per-person emissions; use cabin air recirculation in congested traffic.',
    sourceNote: 'Average urban petrol passenger car (single occupant): 0.180 kg CO₂e/km.',
  },
};

export function calculateTravelComparison(input: TravelComparisonInput): TravelModeEstimate[] {
  const distance = Math.max(0.1, input.distanceKm);
  const trips = Math.max(1, Math.min(28, Math.round(input.tripsPerWeek)));
  const baselineFactor = EMISSION_FACTORS[input.currentMode].factorKgPerKm;
  const baselineTripCo2 = distance * baselineFactor;

  const modes: CommuteMode[] = ['walking', 'cycling', 'public_transit', 'carpool', 'private_car'];

  const estimates: TravelModeEstimate[] = modes.map((mode) => {
    const spec = EMISSION_FACTORS[mode];
    const tripCo2Kg = Number((distance * spec.factorKgPerKm).toFixed(3));
    const weeklyCo2Kg = Number((tripCo2Kg * trips).toFixed(2));
    const annualCo2Kg = Number((weeklyCo2Kg * 50).toFixed(1));
    const co2AvoidedPerTripKg = Number((baselineTripCo2 - tripCo2Kg).toFixed(3));
    const co2AvoidedAnnualKg = Number((co2AvoidedPerTripKg * trips * 50).toFixed(1));

    let isRecommended = false;
    if (distance <= 3 && (mode === 'walking' || mode === 'cycling')) {
      isRecommended = true;
    } else if (distance > 3 && distance <= 8 && (mode === 'cycling' || mode === 'public_transit')) {
      isRecommended = true;
    } else if (distance > 8 && (mode === 'public_transit' || mode === 'carpool')) {
      isRecommended = true;
    }

    return {
      mode,
      label: spec.label,
      factorKgPerKm: spec.factorKgPerKm,
      tripCo2Kg,
      weeklyCo2Kg,
      annualCo2Kg,
      co2AvoidedPerTripKg,
      co2AvoidedAnnualKg,
      exposureNote: spec.exposureNote,
      sourceNote: spec.sourceNote,
      isCurrent: mode === input.currentMode,
      isRecommended: isRecommended && mode !== input.currentMode && spec.factorKgPerKm < baselineFactor,
    };
  });

  return estimates;
}

export interface CustomVehicleSpec {
  type: CustomVehicleType;
  label: string;
  vehicleFactorKgPerKm: number;
  sourceNote: string;
}

/**
 * Vehicle-km emission factors (kg CO2e per vehicle-km, divided by passenger count for per-passenger share).
 * Sources: UK DESNZ / DEFRA GHG Conversion Factors (2024) & India GHG Program transport averages.
 */
export const CUSTOM_VEHICLE_FACTORS: Record<CustomVehicleType, CustomVehicleSpec> = {
  petrol_car: {
    type: 'petrol_car',
    label: 'Petrol Car',
    vehicleFactorKgPerKm: 0.18,
    sourceNote: 'Average urban petrol passenger car: 0.180 kg CO₂e / vehicle-km.',
  },
  diesel_car: {
    type: 'diesel_car',
    label: 'Diesel Car',
    vehicleFactorKgPerKm: 0.171,
    sourceNote: 'Average urban diesel passenger car: 0.171 kg CO₂e / vehicle-km (higher roadside NO₂/PM than petrol).',
  },
  cng_car: {
    type: 'cng_car',
    label: 'CNG Car',
    vehicleFactorKgPerKm: 0.145,
    sourceNote: 'Compressed natural gas passenger car: ~0.145 kg CO₂e / vehicle-km.',
  },
  electric_car: {
    type: 'electric_car',
    label: 'Electric Car (Grid Avg)',
    vehicleFactorKgPerKm: 0.085,
    sourceNote: 'Zero tailpipe emissions; lifecycle grid electricity charging average (~0.085 kg CO₂e / vehicle-km in India grid mix).',
  },
  two_wheeler: {
    type: 'two_wheeler',
    label: 'Two-Wheeler / Scooter',
    vehicleFactorKgPerKm: 0.072,
    sourceNote: 'Average petrol scooter/motorcycle: ~0.072 kg CO₂e / vehicle-km.',
  },
  auto_rickshaw: {
    type: 'auto_rickshaw',
    label: 'Auto-Rickshaw (CNG)',
    vehicleFactorKgPerKm: 0.095,
    sourceNote: 'CNG three-wheeler average: ~0.095 kg CO₂e / vehicle-km.',
  },
  city_bus: {
    type: 'city_bus',
    label: 'City Bus (Per-Passenger Share)',
    vehicleFactorKgPerKm: 0.1,
    sourceNote: 'Urban bus passenger-km average: 0.100 kg CO₂e / passenger-km (scales with passengers entered).',
  },
  metro_rail: {
    type: 'metro_rail',
    label: 'Metro / Urban Rail',
    vehicleFactorKgPerKm: 0.035,
    sourceNote: 'Electric urban rail/metro passenger-km average: 0.035 kg CO₂e / passenger-km.',
  },
};

export function calculateCustomTravelComparison(input: CustomTravelInput): CustomTravelResult {
  const distanceKm = Math.max(0.1, Number(input.distanceKm.toFixed(1)));
  const passengers = Math.max(1, Math.min(50, Math.round(input.passengers)));
  const trips = Math.max(1, Math.min(28, Math.round(input.tripsPerWeek)));
  const spec = CUSTOM_VEHICLE_FACTORS[input.vehicleType];

  // For shared transit (city_bus / metro_rail), factor is already per passenger-km;
  // for private/hired vehicles, total vehicle emissions are divided across passengers.
  const isPerPassengerFactor = input.vehicleType === 'city_bus' || input.vehicleType === 'metro_rail';
  const totalTripCo2Kg = isPerPassengerFactor
    ? Number((distanceKm * spec.vehicleFactorKgPerKm * passengers).toFixed(3))
    : Number((distanceKm * spec.vehicleFactorKgPerKm).toFixed(3));
  const perPassengerTripCo2Kg = isPerPassengerFactor
    ? Number((distanceKm * spec.vehicleFactorKgPerKm).toFixed(3))
    : Number((totalTripCo2Kg / passengers).toFixed(3));
  const perPassengerFactor = perPassengerTripCo2Kg / distanceKm;
  const perPassengerWeeklyCo2Kg = Number((perPassengerTripCo2Kg * trips).toFixed(2));
  const perPassengerAnnualCo2Kg = Number((perPassengerWeeklyCo2Kg * 50).toFixed(1));

  const modes: CommuteMode[] = ['walking', 'cycling', 'public_transit', 'carpool', 'private_car'];
  const alternatives: TravelModeEstimate[] = modes.map((mode) => {
    const modeSpec = EMISSION_FACTORS[mode];
    const tripCo2Kg = Number((distanceKm * modeSpec.factorKgPerKm).toFixed(3));
    const weeklyCo2Kg = Number((tripCo2Kg * trips).toFixed(2));
    const annualCo2Kg = Number((weeklyCo2Kg * 50).toFixed(1));
    const co2AvoidedPerTripKg = Number((perPassengerTripCo2Kg - tripCo2Kg).toFixed(3));
    const co2AvoidedAnnualKg = Number((co2AvoidedPerTripKg * trips * 50).toFixed(1));

    let distanceAppropriate = false;
    if (distanceKm <= 3 && (mode === 'walking' || mode === 'cycling')) {
      distanceAppropriate = true;
    } else if (distanceKm > 3 && distanceKm <= 8 && (mode === 'cycling' || mode === 'public_transit')) {
      distanceAppropriate = true;
    } else if (distanceKm > 8 && (mode === 'public_transit' || mode === 'carpool')) {
      distanceAppropriate = true;
    }

    return {
      mode,
      label: modeSpec.label,
      factorKgPerKm: modeSpec.factorKgPerKm,
      tripCo2Kg,
      weeklyCo2Kg,
      annualCo2Kg,
      co2AvoidedPerTripKg,
      co2AvoidedAnnualKg,
      exposureNote: modeSpec.exposureNote,
      sourceNote: modeSpec.sourceNote,
      isCurrent: false,
      isRecommended: distanceAppropriate && modeSpec.factorKgPerKm < perPassengerFactor - 0.001,
    };
  });

  const bestLowerAlternative =
    alternatives
      .filter((a) => a.isRecommended && a.co2AvoidedPerTripKg > 0)
      .sort((a, b) => b.co2AvoidedPerTripKg - a.co2AvoidedPerTripKg)[0] ??
    alternatives
      .filter((a) => a.co2AvoidedPerTripKg > 0 && a.mode !== 'walking' && a.mode !== 'cycling')
      .sort((a, b) => b.co2AvoidedPerTripKg - a.co2AvoidedPerTripKg)[0] ??
    null;

  return {
    vehicleLabel: spec.label,
    vehicleFactorKgPerKm: spec.vehicleFactorKgPerKm,
    sourceNote: spec.sourceNote,
    passengers,
    distanceKm,
    totalTripCo2Kg,
    perPassengerTripCo2Kg,
    perPassengerWeeklyCo2Kg,
    perPassengerAnnualCo2Kg,
    alternatives,
    bestLowerAlternative,
  };
}

export function calculateImpactSummary(input: ImpactRoutineInput): ImpactSummary {
  const baselineKm = Math.max(0, input.baselineCarKmPerWeek);
  const improvedKm = Math.max(0, Math.min(baselineKm, input.improvedCarKmPerWeek));
  const shiftedKm = Math.max(0, baselineKm - improvedKm);

  const privateFactor = EMISSION_FACTORS.private_car.factorKgPerKm;
  const shiftedFactor = EMISSION_FACTORS[input.shiftedToMode].factorKgPerKm;

  const baselineWeeklyCo2Kg = Number((baselineKm * privateFactor).toFixed(2));

  // No-idling estimate: ~10 min/day avoided idling ≈ 0.35 kg CO2e per active day (conservative small-engine idle factor)
  const idlingSavingsKg = Number((Math.max(0, Math.min(7, input.noIdlingDaysPerWeek)) * 0.35).toFixed(2));
  const improvedTransportCo2Kg = improvedKm * privateFactor + shiftedKm * shiftedFactor;
  const improvedWeeklyCo2Kg = Number(Math.max(0, improvedTransportCo2Kg - idlingSavingsKg).toFixed(2));

  const weeklyCo2AvoidedKg = Number(Math.max(0, baselineWeeklyCo2Kg - improvedWeeklyCo2Kg).toFixed(2));
  const annualCo2AvoidedKg = Number((weeklyCo2AvoidedKg * 50).toFixed(1));

  const weeklyVehicleKmAvoided = Number(shiftedKm.toFixed(1));
  const annualVehicleKmAvoided = Number((weeklyVehicleKmAvoided * 50).toFixed(0));

  let actionsCompleted = 0;
  if (shiftedKm >= 5) actionsCompleted += 1;
  if (input.noIdlingDaysPerWeek >= 3) actionsCompleted += 1;
  if (input.cleanCookingVentDaysPerWeek >= 5) actionsCompleted += 1;
  if (input.hepaMaintenanceDone) actionsCompleted += 1;
  if (input.zeroWasteBurningPledge) actionsCompleted += 1;
  if (input.carpoolTripsPerWeek >= 2) actionsCompleted += 1;

  return {
    baselineWeeklyCo2Kg,
    improvedWeeklyCo2Kg,
    weeklyCo2AvoidedKg,
    annualCo2AvoidedKg,
    weeklyVehicleKmAvoided,
    annualVehicleKmAvoided,
    actionsCompleted,
    totalTrackedActions: 6,
  };
}

function formatHourRange(isoTime: string): string {
  const hr = extractWallClockHour(isoTime);
  if (hr === null) return 'Midday';
  const start = `${String(hr).padStart(2, '0')}:00`;
  const end = `${String((hr + 1) % 24).padStart(2, '0')}:00`;
  return `${start}–${end}`;
}

export function generateSmartDailyPlan(
  inputs: DailyPlanInputs,
  airQuality: AirQualityPayload | null
): DailyPlanItem[] {
  const hasRealHourly = Boolean(
    airQuality &&
      airQuality.status !== 'DEMO' &&
      airQuality.hourly.length >= 6 &&
      airQuality.hourly.some((h) => h.pm25 !== null)
  );

  const usAqi = airQuality?.current.usAqi ?? null;
  const pm25 = airQuality?.current.pm25 ?? null;
  const isHighPollution = usAqi !== null && usAqi > 150;
  const isModerateOrWorse = usAqi !== null && usAqi > 100;

  // Identify lowest hourly PM2.5 window strictly from real forecast data if available
  let bestHourlyWindow: { label: string; pm25: number; usAqi: number | null } | null = null;
  if (hasRealHourly && airQuality) {
    const daylightPoints = airQuality.hourly.slice(0, 24).filter((pt) => {
      const hr = extractWallClockHour(pt.time);
      return pt.pm25 !== null && hr !== null && hr >= 6 && hr <= 21;
    });
    if (daylightPoints.length > 0) {
      const best = daylightPoints.reduce((min, cur) =>
        (cur.pm25 ?? Infinity) < (min.pm25 ?? Infinity) ? cur : min
      );
      if (best.pm25 !== null) {
        bestHourlyWindow = {
          label: formatHourRange(best.time),
          pm25: best.pm25,
          usAqi: best.usAqi,
        };
      }
    }
  }

  const locationLabel = airQuality?.location.name ?? 'your city';

  const items: DailyPlanItem[] = [];

  // 1. Morning / Wake-up indoor check & ventilation
  items.push({
    id: 'plan-morning-ventilation',
    timeWindow: `${inputs.wakeTime}`,
    title: isModerateOrWorse
      ? 'Keep morning windows sealed & check indoor filtration'
      : 'Brief morning indoor air check before opening windows',
    category: 'ventilation',
    rationale: isModerateOrWorse
      ? `Current modelled readings in ${locationLabel} show elevated pollution${usAqi !== null ? ` (US AQI ${Math.round(usAqi)})` : ''}. Winter morning inversions often trap fine particles near ground level.`
      : `Confirm outdoor visibility and hourly PM2.5 before cross-ventilating rooms for 15–20 minutes.`,
    dataBasis: hasRealHourly
      ? `Based on Open-Meteo CAMS current forecast (${pm25 !== null ? `PM2.5 ${pm25.toFixed(1)} µg/m³` : 'modelled'}).`
      : 'Time-specific live forecast unavailable; using conservative winter smog ventilation guidance.',
    completed: false,
  });

  // 2. Exercise / Outdoor vs Indoor activity
  if (inputs.outdoorPreference === 'indoor_only' || isHighPollution) {
    items.push({
      id: 'plan-activity',
      timeWindow: inputs.outdoorPreference === 'evening' ? '18:30–19:15' : '07:00–07:45',
      title: 'Indoor mobility, yoga, or strength session',
      category: 'indoor',
      rationale: isHighPollution
        ? `US AQI in ${locationLabel} is ${Math.round(usAqi!)} (Unhealthy or higher). Replacing outdoor cardio with indoor exercise protects lungs from high-volume particulate intake.`
        : 'Matches your indoor exercise preference while avoiding traffic-corridor particulate exposure.',
      dataBasis: hasRealHourly
        ? `Current modelled US AQI ${usAqi !== null ? Math.round(usAqi) : 'N/A'} (${airQuality?.status}).`
        : 'Conservative precaution — no verified real-time hour-by-hour safety window available.',
      completed: false,
    });
  } else if (bestHourlyWindow && (bestHourlyWindow.usAqi === null || bestHourlyWindow.usAqi <= 100)) {
    items.push({
      id: 'plan-activity',
      timeWindow: bestHourlyWindow.label,
      title: 'Lower-exposure outdoor walk or park exercise window',
      category: 'outdoor',
      rationale: `Modelled hourly CAMS forecast indicates relatively lower PM2.5 (~${bestHourlyWindow.pm25.toFixed(1)} µg/m³) during ${bestHourlyWindow.label}. Choose tree-lined parks away from major intersections.`,
      dataBasis: `Derived from Open-Meteo CAMS 24-hour hourly forecast for ${locationLabel} (grid forecast, not a guaranteed street-level measurement).`,
      completed: false,
    });
  } else {
    items.push({
      id: 'plan-activity',
      timeWindow: inputs.outdoorPreference === 'evening' ? '18:00–18:45' : '07:30–08:15',
      title: 'Flexible indoor workout or low-intensity outdoor walk (verify conditions first)',
      category: 'indoor',
      rationale: hasRealHourly
        ? `Modelled hourly readings stay elevated across daytime hours; keep exertion light or move indoors, especially if family members are sensitive.`
        : `Time-specific forecast data is currently unavailable or in demo mode—do not assume any specific hour is safe without checking current local air conditions first.`,
      dataBasis: hasRealHourly
        ? `Open-Meteo CAMS hourly forecast (${bestHourlyWindow ? `lowest daytime PM2.5 ~${bestHourlyWindow.pm25.toFixed(1)} µg/m³` : 'elevated'}).`
        : 'No verified time-specific live forecast available.',
      completed: false,
    });
  }

  // 3. Commute recommendation
  const commuteTip =
    inputs.commuteMode === 'private_car'
      ? 'Consider public transit or carpooling today; if driving, switch off engine at long signals and use cabin recirculation.'
      : inputs.commuteMode === 'walking' || inputs.commuteMode === 'cycling'
        ? isHighPollution
          ? 'Because pollution is elevated, switch to enclosed transit if possible or wear a well-fitted N95 mask on low-traffic side streets.'
          : 'Great zero-tailpipe commute—stick to quieter secondary roads away from diesel bus and truck lanes.'
        : 'Continue using shared/public transit; carry an N95 mask for open station platforms if smog intensifies.';

  items.push({
    id: 'plan-commute',
    timeWindow: `${inputs.workStart} & ${inputs.workEnd}`,
    title: `Low-emission commute strategy (${inputs.commuteMode.replace('_', ' ')})`,
    category: 'commute',
    rationale: commuteTip,
    dataBasis: `Tailored to your ${inputs.workStart}–${inputs.workEnd} schedule and ${locationLabel} air conditions.`,
    completed: false,
  });

  // 4. Midday ventilation window (only recommend opening windows if real data supports it)
  items.push({
    id: 'plan-ventilation-midday',
    timeWindow: bestHourlyWindow ? bestHourlyWindow.label : '13:00–15:00',
    title:
      bestHourlyWindow && (bestHourlyWindow.usAqi === null || bestHourlyWindow.usAqi <= 100)
        ? 'Short 15-minute cross-ventilation window'
        : 'Keep windows closed & run kitchen exhaust during meal prep',
    category: 'ventilation',
    rationale:
      bestHourlyWindow && (bestHourlyWindow.usAqi === null || bestHourlyWindow.usAqi <= 100)
        ? `Forecast shows relatively lower particulate concentration around ${bestHourlyWindow.label}, making a brief air exchange helpful to reduce indoor CO₂.`
        : 'Avoid drawing polluted outdoor air indoors when AQI is elevated or unverified; use mechanical kitchen exhaust when cooking to clear indoor aerosols.',
    dataBasis: hasRealHourly
      ? `Open-Meteo CAMS 24-hour hourly trend for ${locationLabel}.`
      : 'Precautionary indoor ventilation rule (no verified low-pollution window confirmed).',
    completed: false,
  });

  // 5. Evening sustainable habit & bedroom prep
  items.push({
    id: 'plan-evening-eco',
    timeWindow: '20:30–21:30',
    title: 'Prepare clean-air bedroom & log one low-emission habit',
    category: 'eco',
    rationale: `${
      inputs.familyNote.trim()
        ? `Family focus ("${inputs.familyNote.trim()}"): `
        : ''
    }Damp-wipe bedside dust, inspect HEPA pre-filter if used, keep bedroom doors closed while purifier runs, and ensure household waste is segregated rather than burned.`,
    dataBasis: 'Evidence-based indoor particulate reduction & urban source-control practice.',
    completed: false,
  });

  return items;
}
