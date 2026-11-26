import type {
  AirQualityPayload,
  AlertThresholds,
  UserPreferences,
  WeeklyChallengeItem,
} from '../types';
import { extractWallClockHour } from './aqi';

export type ActivityIntensity = 'rest' | 'light_walk' | 'commute' | 'vigorous';
export type MaskType = 'none' | 'cloth_surgical' | 'n95_ffp2';
export type IndoorProtection = 'open_windows' | 'closed_windows' | 'hepa_purifier';

export interface PersonalExposureInput {
  outdoorHours: number;
  intensity: ActivityIntensity;
  mask: MaskType;
  indoorProtection: IndoorProtection;
}

export interface PersonalExposureFactor {
  label: string;
  detail: string;
  impact: string;
}

export interface PersonalExposureResult {
  score: number; // 0-100 informational index
  band: 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Very High';
  estimatedEffectivePm25: number | null;
  dataBasis: string;
  factors: PersonalExposureFactor[];
}

export function calculatePersonalExposureScore(
  input: PersonalExposureInput,
  airQuality: AirQualityPayload | null
): PersonalExposureResult {
  const pm25 = airQuality?.current.pm25 ?? null;
  const usAqi = airQuality?.current.usAqi ?? null;
  const outdoorHours = Math.max(0, Math.min(16, input.outdoorHours));
  const indoorHours = Math.max(0, 24 - outdoorHours);

  const breathingMultiplier: Record<ActivityIntensity, { val: number; label: string }> = {
    rest: { val: 1.0, label: 'Resting / sedentary (1.0× breathing rate)' },
    light_walk: { val: 1.45, label: 'Light walking / errands (1.45× breathing rate)' },
    commute: { val: 1.3, label: 'Active commute / waiting roadside (1.3× exposure)' },
    vigorous: { val: 2.3, label: 'Vigorous outdoor exercise (2.3× breathing volume)' },
  };

  const maskFactor: Record<MaskType, { val: number; label: string }> = {
    none: { val: 1.0, label: 'No respiratory mask outdoors (0% particle reduction)' },
    cloth_surgical: { val: 0.78, label: 'Cloth or loose surgical mask (~22% rough reduction)' },
    n95_ffp2: { val: 0.35, label: 'Well-fitted N95/FFP2 respirator (~65% real-world fit reduction)' },
  };

  const indoorInfiltration: Record<IndoorProtection, { val: number; label: string }> = {
    open_windows: { val: 0.82, label: 'Windows frequently open (~82% outdoor PM infiltration)' },
    closed_windows: { val: 0.52, label: 'Windows kept closed (~52% typical urban infiltration)' },
    hepa_purifier: { val: 0.24, label: 'Closed room + sized HEPA purifier (~24% residual PM2.5)' },
  };

  const basePm25 = pm25 ?? (usAqi !== null ? Math.max(8, usAqi * 0.55) : null);

  if (basePm25 === null) {
    return {
      score: 0,
      band: 'Low',
      estimatedEffectivePm25: null,
      dataBasis: 'Air-quality readings are currently unavailable; exposure cannot be estimated.',
      factors: [],
    };
  }

  const outDose = outdoorHours * basePm25 * breathingMultiplier[input.intensity].val * maskFactor[input.mask].val;
  const inDose = indoorHours * basePm25 * indoorInfiltration[input.indoorProtection].val;
  const effective24hPm25 = Number(((outDose + inDose) / 24).toFixed(1));

  // Normalize against WHO 24h guideline (15 µg/m³) up to severe 150 µg/m³ effective exposure -> 0-100 scale
  const score = Math.round(Math.max(0, Math.min(100, (effective24hPm25 / 135) * 100)));

  let band: PersonalExposureResult['band'] = 'Low';
  if (score >= 76) band = 'Very High';
  else if (score >= 56) band = 'High';
  else if (score >= 36) band = 'Elevated';
  else if (score >= 18) band = 'Moderate';

  return {
    score,
    band,
    estimatedEffectivePm25: effective24hPm25,
    dataBasis: `${airQuality?.location.name ?? 'Active city'} · PM2.5 ${basePm25.toFixed(1)} µg/m³ (${airQuality?.status ?? 'DEMO'} data)`,
    factors: [
      {
        label: 'Ambient PM2.5 Baseline',
        detail: `${basePm25.toFixed(1)} µg/m³ (WHO 24-hr guideline: 15 µg/m³)`,
        impact: basePm25 > 55 ? 'High ambient load' : basePm25 > 15 ? 'Above WHO guideline' : 'Within WHO guideline',
      },
      {
        label: 'Outdoor Time & Exertion',
        detail: `${outdoorHours} hrs outdoors · ${breathingMultiplier[input.intensity].label}`,
        impact: `${Math.round((outDose / Math.max(outDose + inDose, 1)) * 100)}% of estimated daily intake`,
      },
      {
        label: 'Outdoor Mask Protection',
        detail: maskFactor[input.mask].label,
        impact: input.mask === 'n95_ffp2' ? 'Strong reduction' : input.mask === 'cloth_surgical' ? 'Modest reduction' : 'No reduction',
      },
      {
        label: 'Indoor Environment',
        detail: `${indoorHours} hrs indoors · ${indoorInfiltration[input.indoorProtection].label}`,
        impact: `${Math.round((inDose / Math.max(outDose + inDose, 1)) * 100)}% of estimated daily intake`,
      },
    ],
  };
}

export interface TriggeredAlert {
  id: string;
  metricLabel: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  severity: 'warning' | 'high';
  sourceKind: 'FORECAST' | 'CACHED' | 'DEMO' | 'SIMULATED';
  advice: string;
}

export function evaluatePollutionAlerts(
  airQuality: AirQualityPayload | null,
  thresholds: AlertThresholds,
  includeSimulatedPreview = false
): TriggeredAlert[] {
  const alerts: TriggeredAlert[] = [];

  if (includeSimulatedPreview) {
    alerts.push({
      id: 'sim-us-aqi',
      metricLabel: 'US EPA AQI (Simulated Preview)',
      currentValue: Math.max(thresholds.usAqi + 28, 178),
      thresholdValue: thresholds.usAqi,
      unit: 'AQI',
      severity: 'high',
      sourceKind: 'SIMULATED',
      advice: 'Simulated test alert only — demonstrates how in-app warnings appear when your US AQI threshold is crossed.',
    });
  }

  if (!airQuality) return alerts;
  const sourceKind = airQuality.status;

  if (airQuality.current.usAqi !== null && airQuality.current.usAqi >= thresholds.usAqi) {
    alerts.push({
      id: 'live-us-aqi',
      metricLabel: 'US EPA AQI',
      currentValue: Math.round(airQuality.current.usAqi),
      thresholdValue: thresholds.usAqi,
      unit: 'AQI',
      severity: airQuality.current.usAqi >= 200 ? 'high' : 'warning',
      sourceKind,
      advice: 'Shift strenuous workouts indoors, keep roadside windows closed, and wear a well-fitted N95 mask outdoors.',
    });
  }

  if (airQuality.current.pm25 !== null && airQuality.current.pm25 >= thresholds.pm25) {
    alerts.push({
      id: 'live-pm25',
      metricLabel: 'Fine Particles (PM2.5)',
      currentValue: Number(airQuality.current.pm25.toFixed(1)),
      thresholdValue: thresholds.pm25,
      unit: 'µg/m³',
      severity: airQuality.current.pm25 >= 110 ? 'high' : 'warning',
      sourceKind,
      advice: 'Run a HEPA purifier in closed bedrooms and avoid outdoor cardio until hourly PM2.5 trends downward.',
    });
  }

  if (airQuality.current.pm10 !== null && airQuality.current.pm10 >= thresholds.pm10) {
    alerts.push({
      id: 'live-pm10',
      metricLabel: 'Coarse Particles (PM10)',
      currentValue: Number(airQuality.current.pm10.toFixed(1)),
      thresholdValue: thresholds.pm10,
      unit: 'µg/m³',
      severity: airQuality.current.pm10 >= 250 ? 'high' : 'warning',
      sourceKind,
      advice: 'Avoid uncovered construction stretches and damp-wipe indoor entryways rather than dry sweeping.',
    });
  }

  if (airQuality.current.no2 !== null && airQuality.current.no2 >= thresholds.no2) {
    alerts.push({
      id: 'live-no2',
      metricLabel: 'Nitrogen Dioxide (NO₂)',
      currentValue: Number(airQuality.current.no2.toFixed(1)),
      thresholdValue: thresholds.no2,
      unit: 'µg/m³',
      severity: airQuality.current.no2 >= 150 ? 'high' : 'warning',
      sourceKind,
      advice: 'Avoid congested arterial junctions and switch vehicle ventilation to cabin recirculation in traffic.',
    });
  }

  return alerts;
}

export interface ActivityAdviceItem {
  id: string;
  activity: string;
  recommendation: 'Proceed with Caution' | 'Modify / Shorten' | 'Move Indoors';
  tone: 'good' | 'moderate' | 'high';
  suggestedWindow: string;
  reason: string;
  alternative: string;
}

export function buildOutdoorActivityAdvice(
  airQuality: AirQualityPayload | null,
  preferences: UserPreferences
): ActivityAdviceItem[] {
  const usAqi = airQuality?.current.usAqi ?? null;
  const pm25 = airQuality?.current.pm25 ?? null;
  const hasRealHourly = Boolean(
    airQuality && airQuality.status !== 'DEMO' && airQuality.hourly.some((h) => h.pm25 !== null)
  );
  const sensitive =
    preferences.householdAgeGroups.includes('children_under_12') ||
    preferences.householdAgeGroups.includes('seniors_65_plus') ||
    preferences.householdAgeGroups.includes('respiratory_sensitive');

  let lowestWindow = 'Verify local conditions first (no verified live hourly forecast)';
  if (hasRealHourly && airQuality) {
    const daylight = airQuality.hourly.slice(0, 24).filter((pt) => {
      const hr = extractWallClockHour(pt.time);
      return pt.pm25 !== null && hr !== null && hr >= 6 && hr <= 20;
    });
    if (daylight.length > 0) {
      const best = daylight.reduce((min, cur) =>
        (cur.pm25 ?? Infinity) < (min.pm25 ?? Infinity) ? cur : min
      );
      const hr = extractWallClockHour(best.time);
      if (hr !== null && best.pm25 !== null) {
        lowestWindow = `${String(hr).padStart(2, '0')}:00–${String((hr + 1) % 24).padStart(2, '0')}:00 (~${best.pm25.toFixed(1)} µg/m³ modelled PM2.5)`;
      }
    }
  }

  const highRisk = usAqi === null || usAqi > 150;
  const moderateRisk = usAqi !== null && usAqi > 100 && usAqi <= 150;

  return [
    {
      id: 'act-jog',
      activity: 'Outdoor Run / Brisk Jogging',
      recommendation: highRisk || (moderateRisk && sensitive) ? 'Move Indoors' : moderateRisk ? 'Modify / Shorten' : 'Proceed with Caution',
      tone: highRisk || (moderateRisk && sensitive) ? 'high' : moderateRisk ? 'moderate' : 'good',
      suggestedWindow: lowestWindow,
      reason:
        usAqi !== null
          ? `Modelled US AQI is ${Math.round(usAqi)}${pm25 !== null ? ` (PM2.5 ${pm25.toFixed(1)} µg/m³)` : ''}. Vigorous aerobic effort elevates breathing volume 5–10×.`
          : 'Live AQI readings are unavailable; avoid intense unverified outdoor exertion.',
      alternative: 'Indoor strength training, yoga, stationary cycling, or mobility circuits in a filtered room.',
    },
    {
      id: 'act-kids',
      activity: 'Children / Senior Park Walk',
      recommendation: highRisk || (moderateRisk && sensitive) ? 'Move Indoors' : moderateRisk ? 'Modify / Shorten' : 'Proceed with Caution',
      tone: highRisk || (moderateRisk && sensitive) ? 'high' : moderateRisk ? 'moderate' : 'good',
      suggestedWindow: lowestWindow,
      reason: sensitive
        ? 'Your household profile includes sensitive age or respiratory groups, who respond earlier to PM2.5 spikes.'
        : 'Light walking has lower breathing volume than running, but roadside dust still accumulates along busy avenues.',
      alternative: 'Short indoor play/stretching or quiet interior corridors away from traffic corridors.',
    },
    {
      id: 'act-cycle',
      activity: 'Outdoor Cycling Commute',
      recommendation: highRisk ? 'Move Indoors' : moderateRisk ? 'Modify / Shorten' : 'Proceed with Caution',
      tone: highRisk ? 'high' : moderateRisk ? 'moderate' : 'good',
      suggestedWindow: lowestWindow,
      reason: 'Cycling near diesel traffic exposes riders to localized tailpipe NO₂ and PM2.5 plumes higher than city grid averages.',
      alternative: 'Switch to enclosed metro/bus transit or carpool on high-AQI days; wear a well-fitted N95 if riding is unavoidable.',
    },
    {
      id: 'act-vent',
      activity: 'Natural Window Cross-Ventilation',
      recommendation: usAqi !== null && usAqi <= 85 ? 'Proceed with Caution' : usAqi !== null && usAqi <= 120 ? 'Modify / Shorten' : 'Move Indoors',
      tone: usAqi !== null && usAqi <= 85 ? 'good' : usAqi !== null && usAqi <= 120 ? 'moderate' : 'high',
      suggestedWindow: lowestWindow,
      reason: 'Opening windows reduces indoor CO₂ when outdoor air is cleaner, but draws fine particulates indoors during smog spikes.',
      alternative: 'Keep windows closed during elevated AQI; use kitchen exhaust while cooking and run a HEPA air cleaner.',
    },
  ];
}

export interface IndoorTopicGuide {
  id: string;
  label: string;
  summary: string;
  steps: string[];
  sensorDisclaimer: string;
}

export const INDOOR_ASSISTANT_TOPICS: IndoorTopicGuide[] = [
  {
    id: 'cooking',
    label: 'Cooking Smoke & Frying',
    summary: 'High-heat tempering (tadka), frying, and gas burners generate sharp indoor PM2.5 and NO₂ spikes that can briefly exceed outdoor smog.',
    steps: [
      'Turn on the ducted chimney or kitchen exhaust fan 5 minutes before heating oil and leave it running 10 minutes after cooking.',
      'Keep kitchen doors slightly isolated from bedrooms while searing or frying.',
      'Prefer lids, pressure cooking, or induction cooking when available to cut combustion fumes.',
    ],
    sensorDisclaimer: 'Estimated risk pattern only — VayuMitra cannot measure your kitchen PM2.5 without a physical indoor monitor.',
  },
  {
    id: 'smog_infiltration',
    label: 'Winter Smog Infiltration',
    summary: 'During morning and evening temperature inversions, outdoor PM2.5 leaks through window frames, balcony doors, and exhaust gaps.',
    steps: [
      'Keep exterior windows shut when outdoor US AQI exceeds 100 and check simple silicone weatherstripping on sliding doors.',
      'Create one "clean-air bedroom" by keeping its door shut and running a true HEPA purifier sized to room CADR.',
      'Avoid ozone-generating ionizers; stick to mechanical HEPA + activated carbon filtration.',
    ],
    sensorDisclaimer: 'Guidance adapts to outdoor Open-Meteo readings; actual indoor PM2.5 depends on room sealing and purifier CADR.',
  },
  {
    id: 'dust',
    label: 'Roadside Dust & Cleaning',
    summary: 'Dry broom sweeping kicks settled coarse PM10 and fine particles back into breathing height for hours.',
    steps: [
      'Replace dry sweeping with damp microfiber mopping and wet-cloth surface wiping.',
      'Keep shoes at the entrance mat to stop tracked roadway dust from entering bedrooms.',
      'Vacuum soft furnishings with a HEPA-sealed vacuum or wash curtains/bedsheets regularly in warm water.',
    ],
    sensorDisclaimer: 'Behavioral exposure reduction guidance — not a measured indoor dust count.',
  },
  {
    id: 'combustion',
    label: 'Incense, Candles & Biomass',
    summary: 'Burning agarbatti, dhoop, mosquito coils, or scented candles inside closed winter rooms traps concentrated smoke particulates.',
    steps: [
      'Pause indoor incense, dhoop, and mosquito coils during high-AQI winter weeks; switch to non-combustion alternatives (nets, electric plug-ins).',
      'If lit briefly for rituals, place near an active exhaust fan and keep bedrooms sealed.',
      'Never burn charcoal, wood, or garden waste near home ventilation intakes.',
    ],
    sensorDisclaimer: 'Source-control guidance based on indoor air science — no live indoor sensor reading is assumed.',
  },
];

export const WEEKLY_CHALLENGE_ACTIONS: WeeklyChallengeItem[] = [
  {
    id: 'chal-transit',
    dayLabel: 'Action 01',
    title: 'Replace one solo car trip with Metro, bus, or local rail',
    category: 'Mobility',
    detail: 'Shifting a single 15 km solo petrol car trip cuts tailpipe CO₂ and congested roadside NO₂.',
    estimatedCo2SavedKg: 1.68,
    exposureNote: 'Wear a well-fitted N95 mask on open platforms if US AQI > 150.',
  },
  {
    id: 'chal-carpool',
    dayLabel: 'Action 02',
    title: 'Carpool or share a ride for one office or school run',
    category: 'Mobility',
    detail: 'Sharing a 14 km car journey across 2–3 passengers cuts per-person emissions by more than half.',
    estimatedCo2SavedKg: 1.51,
    exposureNote: 'Keep cabin air on recirculation in bumper-to-bumper traffic.',
  },
  {
    id: 'chal-combine',
    dayLabel: 'Action 03',
    title: 'Combine errands into one trip or walk short hops under 2 km',
    category: 'Mobility',
    detail: 'Eliminating a 6 km short cold-start car errand saves fuel and cold-engine exhaust spikes.',
    estimatedCo2SavedKg: 1.08,
    exposureNote: 'Prefer quieter shaded lanes away from heavy diesel corridors.',
  },
  {
    id: 'chal-noidle',
    dayLabel: 'Action 04',
    title: 'Switch off engine at red lights & waiting stops (>30 sec)',
    category: 'Source Reduction',
    detail: 'Avoiding ~10 minutes of unnecessary idling lowers localized intersection fumes and saves fuel.',
    estimatedCo2SavedKg: 0.35,
    exposureNote: 'Directly reduces immediate street-level exhaust around pedestrians.',
  },
  {
    id: 'chal-exhaust',
    dayLabel: 'Action 05',
    title: 'Run kitchen exhaust fan during every high-heat cooking session',
    category: 'Indoor Air',
    detail: 'Vents indoor cooking aerosols and NO₂ before they spread into bedrooms and living rooms.',
    estimatedCo2SavedKg: 0,
    exposureNote: 'High personal indoor PM2.5 exposure reduction (does not alter city CO₂).',
  },
  {
    id: 'chal-dampmop',
    dayLabel: 'Action 06',
    title: 'Damp-wipe floors & inspect purifier/AC pre-filters',
    category: 'Indoor Air',
    detail: 'Prevents resuspending fine settled dust and keeps filtration airflow efficient.',
    estimatedCo2SavedKg: 0,
    exposureNote: 'Improves bedroom air cleanliness without adding energy load.',
  },
  {
    id: 'chal-noburn',
    dayLabel: 'Action 07',
    title: 'Segregate dry leaves & household waste (zero open burning)',
    category: 'Source Reduction',
    detail: 'Open biomass and plastic smoldering releases severe localized PM2.5 and toxic smoke.',
    estimatedCo2SavedKg: 0.5,
    exposureNote: 'Eliminates acute neighborhood smoke plumes during calm winter evenings.',
  },
];
