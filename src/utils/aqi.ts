import type {
  AirQualityPayload,
  AssistantStructuredAnswer,
  DailyHistoryPoint,
  HourlyDataPoint,
  LocationPreset,
  PollutantKey,
  UserPreferences,
} from '../types';

export type AqiIconKind =
  | 'unavailable'
  | 'good'
  | 'moderate'
  | 'sensitive'
  | 'unhealthy'
  | 'very_unhealthy'
  | 'hazardous';

export interface AqiCategoryMeta {
  level: string;
  shortLabel: string;
  iconKind: AqiIconKind;
  colorClass: string;
  surfaceClass: string;
  gradientClass: string;
  borderClass: string;
  barClass: string;
  dotColor: string;
  summary: string;
  guidance: string[];
}

export function getUsAqiCategory(aqi: number | null): AqiCategoryMeta {
  if (aqi === null || Number.isNaN(aqi)) {
    return {
      level: 'Unavailable',
      shortLabel: 'No data',
      iconKind: 'unavailable',
      colorClass: 'text-neutral-700 dark:text-neutral-300',
      surfaceClass: 'bg-white dark:bg-[#131E1A]',
      gradientClass: 'bg-gradient-to-br from-white to-[#F6F8F7] dark:from-[#131E1A] dark:to-[#0F1815]',
      borderClass: 'border-[#DCE5E0] dark:border-[#20302A]',
      barClass: 'bg-neutral-500',
      dotColor: '#737373',
      summary: 'Current US AQI value is not available from the data feed.',
      guidance: [
        'Check local official monitoring bulletins if visible haze or smoke odor is present.',
        'Keep windows closed if outdoor visibility appears poor.',
      ],
    };
  }

  if (aqi <= 50) {
    return {
      level: 'Good',
      shortLabel: 'Good (0–50)',
      iconKind: 'good',
      colorClass: 'text-emerald-800 dark:text-emerald-300',
      surfaceClass: 'bg-emerald-50/80 dark:bg-emerald-950/35',
      gradientClass:
        'bg-gradient-to-br from-emerald-50/90 via-emerald-50/60 to-teal-50/50 dark:from-emerald-950/45 dark:via-[#12261E] dark:to-teal-950/30',
      borderClass: 'border-emerald-300/85 dark:border-emerald-800/75',
      barClass: 'bg-emerald-700 dark:bg-emerald-400',
      dotColor: '#15803D',
      summary: 'Air quality is satisfactory with minimal health risk for most people.',
      guidance: [
        'Suitable for outdoor exercise, walking, and cycling.',
        'Good window for cross-ventilating indoor rooms for 15–30 minutes.',
        'Continue low-emission commuting habits to keep local emissions low.',
      ],
    };
  }

  if (aqi <= 100) {
    return {
      level: 'Moderate',
      shortLabel: 'Moderate (51–100)',
      iconKind: 'moderate',
      colorClass: 'text-amber-900 dark:text-yellow-300',
      surfaceClass: 'bg-yellow-50/85 dark:bg-yellow-950/30',
      gradientClass:
        'bg-gradient-to-br from-yellow-50/95 via-amber-50/60 to-white dark:from-yellow-950/40 dark:via-[#1E1C10] dark:to-[#131E1A]',
      borderClass: 'border-yellow-300/90 dark:border-yellow-800/75',
      barClass: 'bg-yellow-600 dark:bg-yellow-400',
      dotColor: '#CA8A04',
      summary: 'Acceptable overall; unusually sensitive individuals should monitor symptoms during prolonged exertion.',
      guidance: [
        'Most adults can exercise outdoors; prefer parks or tree-lined streets away from heavy traffic.',
        'People with asthma or respiratory sensitivity should pace intense outdoor workouts.',
        'Use kitchen exhaust fans when cooking to prevent indoor particulate buildup.',
      ],
    };
  }

  if (aqi <= 150) {
    return {
      level: 'Unhealthy for Sensitive Groups',
      shortLabel: 'Sensitive Groups (101–150)',
      iconKind: 'sensitive',
      colorClass: 'text-orange-900 dark:text-orange-300',
      surfaceClass: 'bg-orange-50/85 dark:bg-orange-950/30',
      gradientClass:
        'bg-gradient-to-br from-orange-50/95 via-amber-50/65 to-white dark:from-orange-950/45 dark:via-[#221710] dark:to-[#131E1A]',
      borderClass: 'border-orange-300/90 dark:border-orange-800/75',
      barClass: 'bg-orange-600 dark:bg-orange-400',
      dotColor: '#EA580C',
      summary: 'Children, older adults, and people with heart or lung conditions may experience respiratory effects.',
      guidance: [
        'Sensitive groups should shorten vigorous outdoor activity or shift workouts indoors.',
        'Close windows facing busy roadways during peak traffic hours.',
        'Run a properly sized HEPA air cleaner in bedrooms and living areas if available.',
      ],
    };
  }

  if (aqi <= 200) {
    return {
      level: 'Unhealthy',
      shortLabel: 'Unhealthy (151–200)',
      iconKind: 'unhealthy',
      colorClass: 'text-red-800 dark:text-red-300',
      surfaceClass: 'bg-red-50/85 dark:bg-red-950/35',
      gradientClass:
        'bg-gradient-to-br from-red-50/95 via-rose-50/65 to-white dark:from-red-950/50 dark:via-[#231214] dark:to-[#131E1A]',
      borderClass: 'border-red-300/90 dark:border-red-800/80',
      barClass: 'bg-red-600 dark:bg-red-400',
      dotColor: '#DC2626',
      summary: 'Everyone may begin to experience health effects; sensitive groups face higher risk.',
      guidance: [
        'Move aerobic exercise indoors and limit non-essential outdoor exposure.',
        'Wear a well-fitting N95/FFP2 respirator when commuting outdoors in heavy traffic or visible smog.',
        'Keep windows closed, damp-mop dust instead of dry sweeping, and run HEPA filtration continuously.',
      ],
    };
  }

  if (aqi <= 300) {
    return {
      level: 'Very Unhealthy',
      shortLabel: 'Very Unhealthy (201–300)',
      iconKind: 'very_unhealthy',
      colorClass: 'text-purple-900 dark:text-purple-300',
      surfaceClass: 'bg-purple-50/85 dark:bg-purple-950/35',
      gradientClass:
        'bg-gradient-to-br from-purple-50/95 via-fuchsia-50/55 to-white dark:from-purple-950/50 dark:via-[#1E1326] dark:to-[#131E1A]',
      borderClass: 'border-purple-300/90 dark:border-purple-800/80',
      barClass: 'bg-purple-700 dark:bg-purple-400',
      dotColor: '#7E22CE',
      summary: 'Health alert: elevated risk of respiratory and cardiovascular strain across the general population.',
      guidance: [
        'Avoid outdoor workouts; keep children and older adults indoors with filtered air.',
        'Use a well-sealed N95/FFP2 mask for unavoidable outdoor travel.',
        'Eliminate indoor smoke sources (incense, candles, frying without exhaust) and maintain continuous HEPA filtration.',
      ],
    };
  }

  return {
    level: 'Hazardous',
    shortLabel: 'Hazardous (301+)',
    iconKind: 'hazardous',
    colorClass: 'text-[#5F131E] dark:text-rose-200',
    surfaceClass: 'bg-[#7F1D1D]/12 dark:bg-[#4C0D16]/70',
    gradientClass:
      'bg-gradient-to-br from-[#7F1D1D]/18 via-rose-100/75 to-white dark:from-[#58101C]/80 dark:via-[#360E15]/85 dark:to-[#181214]',
    borderClass: 'border-[#7F1D1D]/55 dark:border-rose-900/90',
    barClass: 'bg-[#6B1220] dark:bg-rose-400',
    dotColor: '#6B1220',
    summary: 'Emergency conditions of severe air pollution affecting the entire population.',
    guidance: [
      'Stay indoors in a designated clean-air room with sealed gaps and continuous HEPA filtration.',
      'Cancel outdoor sports and school outdoor assemblies.',
      'Seek medical advice promptly if experiencing shortness of breath, chest tightness, or persistent coughing.',
    ],
  };
}

export function getEuropeanAqiLabel(eaqi: number | null): string {
  if (eaqi === null || Number.isNaN(eaqi)) return 'Unavailable';
  if (eaqi <= 20) return 'Good';
  if (eaqi <= 40) return 'Fair';
  if (eaqi <= 60) return 'Moderate';
  if (eaqi <= 80) return 'Poor';
  if (eaqi <= 100) return 'Very Poor';
  return 'Extremely Poor';
}

export interface PollutantMeta {
  key: PollutantKey;
  label: string;
  shortName: string;
  unit: string;
  referenceNote: string;
  description: string;
}

export const POLLUTANT_META: Record<PollutantKey, PollutantMeta> = {
  usAqi: {
    key: 'usAqi',
    label: 'US EPA AQI',
    shortName: 'US AQI',
    unit: 'Index (0–500)',
    referenceNote: 'US EPA scale (differs from Indian CPCB NAQI)',
    description: 'Composite air quality index computed from modelled pollutant concentrations using US EPA breakpoints.',
  },
  pm25: {
    key: 'pm25',
    label: 'Fine Particles (PM2.5)',
    shortName: 'PM2.5',
    unit: 'µg/m³',
    referenceNote: 'WHO 24-hr guideline: 15 µg/m³',
    description: 'Fine inhalable particles ≤2.5 µm that penetrate deep into lungs; primary winter smog driver.',
  },
  pm10: {
    key: 'pm10',
    label: 'Coarse Particles (PM10)',
    shortName: 'PM10',
    unit: 'µg/m³',
    referenceNote: 'WHO 24-hr guideline: 45 µg/m³',
    description: 'Coarse dust, construction debris, road resuspension, and pollen particles ≤10 µm.',
  },
  no2: {
    key: 'no2',
    label: 'Nitrogen Dioxide (NO₂)',
    shortName: 'NO₂',
    unit: 'µg/m³',
    referenceNote: 'WHO 24-hr guideline: 25 µg/m³',
    description: 'Traffic-related combustion gas concentrated along congested urban roads and intersections.',
  },
  o3: {
    key: 'o3',
    label: 'Ground-Level Ozone (O₃)',
    shortName: 'O₃',
    unit: 'µg/m³',
    referenceNote: 'WHO 8-hr peak guideline: 100 µg/m³',
    description: 'Photochemical pollutant that typically peaks during sunny afternoon hours.',
  },
  so2: {
    key: 'so2',
    label: 'Sulphur Dioxide (SO₂)',
    shortName: 'SO₂',
    unit: 'µg/m³',
    referenceNote: 'WHO 24-hr guideline: 40 µg/m³',
    description: 'Gas emitted from coal power generation, industrial boilers, and high-sulphur fuel burning.',
  },
};

export function isDataTimestampStale(isoString: string, thresholdMinutes = 30): boolean {
  const parsed = Date.parse(isoString);
  if (Number.isNaN(parsed)) return true;
  return Date.now() - parsed > thresholdMinutes * 60 * 1000;
}

export function formatReadableTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Extracts wall-clock hour (0–23) directly from naive Open-Meteo location-local ISO strings
 * (e.g. "2026-11-23T14:00") so browser timezone never shifts the selected city's hours.
 */
export function extractWallClockHour(timestamp: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(timestamp.trim());
  if (match) {
    const hr = Number(match[4]);
    return hr >= 0 && hr <= 23 ? hr : null;
  }
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? null : d.getHours();
}

/**
 * Formats naive Open-Meteo city-local timestamps (e.g. "2026-11-23T14:30") with the location's
 * timezone label without applying browser-local timezone conversion.
 */
export function formatLocalModelTimestamp(timestamp: string, timezoneLabel?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(timestamp.trim());
  if (match) {
    const monthIdx = Number(match[2]) - 1;
    const day = Number(match[3]);
    const monthName = MONTH_SHORT[monthIdx] ?? match[2];
    const tzSuffix = timezoneLabel ? ` (${timezoneLabel})` : '';
    return `${monthName} ${day}, ${match[4]}:${match[5]}${tzSuffix}`;
  }
  const formatted = formatReadableTimestamp(timestamp);
  return timezoneLabel ? `${formatted} (${timezoneLabel})` : formatted;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Formats a YYYY-MM-DD calendar date without timezone shift (e.g. "Nov 25").
 */
export function formatHistoryDateShort(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  return `${MONTH_SHORT[monthIdx] ?? match[2]} ${day}`;
}

/**
 * Formats a YYYY-MM-DD calendar date with weekday (e.g. "Wed, Nov 25").
 */
export function formatHistoryDateFull(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, monthIdx, day));
  const weekday = WEEKDAY_SHORT[utcDate.getUTCDay()] ?? '';
  return `${weekday}, ${MONTH_SHORT[monthIdx] ?? match[2]} ${day}`;
}

const HISTORY_POLLUTANT_KEYS: PollutantKey[] = ['usAqi', 'pm25', 'pm10', 'no2', 'o3', 'so2'];

function summarizeSeries(values: (number | null)[], roundInteger: boolean): {
  avg: number | null;
  min: number | null;
  max: number | null;
} {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) return { avg: null, min: null, max: null };
  const sum = valid.reduce((acc, v) => acc + v, 0);
  const rawAvg = sum / valid.length;
  const rawMin = Math.min(...valid);
  const rawMax = Math.max(...valid);
  const fmt = (n: number) => (roundInteger ? Math.round(n) : Number(n.toFixed(1)));
  return {
    avg: fmt(rawAvg),
    min: fmt(rawMin),
    max: fmt(rawMax),
  };
}

/**
 * Aggregates hourly city-local model readings into chronological daily summaries
 * (up to `maxDays` ending on `endDateIso` if supplied, excluding future forecast days).
 */
export function aggregateHourlyToDailyHistory(
  hourlyPoints: HourlyDataPoint[],
  endDateIso?: string,
  maxDays = 7
): DailyHistoryPoint[] {
  const cutoffDate = endDateIso && /^\d{4}-\d{2}-\d{2}/.test(endDateIso) ? endDateIso.slice(0, 10) : null;
  const grouped = new Map<string, HourlyDataPoint[]>();

  for (const pt of hourlyPoints) {
    if (!pt.time || pt.time.length < 10) continue;
    const dateKey = pt.time.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    if (cutoffDate && dateKey > cutoffDate) continue;
    // For the current date, exclude future hours strictly after the current model hour if endDateIso includes HH:MM
    if (endDateIso && endDateIso.length >= 13 && dateKey === cutoffDate && pt.time.slice(0, 13) > endDateIso.slice(0, 13)) {
      continue;
    }
    const list = grouped.get(dateKey);
    if (list) list.push(pt);
    else grouped.set(dateKey, [pt]);
  }

  const sortedDates = Array.from(grouped.keys()).sort();
  const recentDates = sortedDates.slice(-Math.max(1, maxDays));

  return recentDates.map((date) => {
    const dayPoints = grouped.get(date) ?? [];
    const usAqiStats = summarizeSeries(dayPoints.map((p) => p.usAqi), true);
    const euAqiStats = summarizeSeries(dayPoints.map((p) => p.europeanAqi), true);
    const pm25Stats = summarizeSeries(dayPoints.map((p) => p.pm25), false);
    const pm10Stats = summarizeSeries(dayPoints.map((p) => p.pm10), false);
    const no2Stats = summarizeSeries(dayPoints.map((p) => p.no2), false);
    const o3Stats = summarizeSeries(dayPoints.map((p) => p.o3), false);
    const so2Stats = summarizeSeries(dayPoints.map((p) => p.so2), false);

    const maxValues: Record<PollutantKey, number | null> = {
      usAqi: usAqiStats.max,
      pm25: pm25Stats.max,
      pm10: pm10Stats.max,
      no2: no2Stats.max,
      o3: o3Stats.max,
      so2: so2Stats.max,
    };
    const minValues: Record<PollutantKey, number | null> = {
      usAqi: usAqiStats.min,
      pm25: pm25Stats.min,
      pm10: pm10Stats.min,
      no2: no2Stats.min,
      o3: o3Stats.min,
      so2: so2Stats.min,
    };

    const validSampleCount = dayPoints.filter((p) =>
      HISTORY_POLLUTANT_KEYS.some((k) => typeof p[k] === 'number' && Number.isFinite(p[k]))
    ).length;

    return {
      date,
      usAqi: usAqiStats.avg,
      europeanAqi: euAqiStats.avg,
      pm25: pm25Stats.avg,
      pm10: pm10Stats.avg,
      no2: no2Stats.avg,
      o3: o3Stats.avg,
      so2: so2Stats.avg,
      maxValues,
      minValues,
      sampleCount: validSampleCount,
    };
  });
}

export interface WeeklyHistoryStats {
  avg: number | null;
  min: number | null;
  max: number | null;
  cleanestDay: { date: string; value: number } | null;
  peakDay: { date: string; value: number } | null;
  trendDeltaPct: number | null;
  trendDirection: 'improving' | 'worsening' | 'stable' | 'insufficient';
}

export function computeWeeklyHistoryStats(
  history: DailyHistoryPoint[],
  metric: PollutantKey
): WeeklyHistoryStats {
  const valid = history
    .map((d) => ({ date: d.date, value: d[metric] }))
    .filter((d): d is { date: string; value: number } => typeof d.value === 'number' && Number.isFinite(d.value));

  if (valid.length === 0) {
    return {
      avg: null,
      min: null,
      max: null,
      cleanestDay: null,
      peakDay: null,
      trendDeltaPct: null,
      trendDirection: 'insufficient',
    };
  }

  const avg = valid.reduce((acc, d) => acc + d.value, 0) / valid.length;
  let cleanest = valid[0];
  let peak = valid[0];
  for (const item of valid) {
    if (item.value < cleanest.value) cleanest = item;
    if (item.value > peak.value) peak = item;
  }

  let trendDeltaPct: number | null = null;
  let trendDirection: WeeklyHistoryStats['trendDirection'] = 'insufficient';

  if (valid.length >= 4) {
    const splitIdx = Math.max(1, valid.length - 3);
    const earlier = valid.slice(0, splitIdx);
    const recent = valid.slice(splitIdx);
    const earlierAvg = earlier.reduce((acc, d) => acc + d.value, 0) / earlier.length;
    const recentAvg = recent.reduce((acc, d) => acc + d.value, 0) / recent.length;

    if (earlierAvg > 0) {
      trendDeltaPct = Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100);
      if (trendDeltaPct <= -5) trendDirection = 'improving';
      else if (trendDeltaPct >= 5) trendDirection = 'worsening';
      else trendDirection = 'stable';
    } else {
      trendDeltaPct = 0;
      trendDirection = 'stable';
    }
  }

  return {
    avg: metric === 'usAqi' ? Math.round(avg) : Number(avg.toFixed(1)),
    min: cleanest.value,
    max: peak.value,
    cleanestDay: cleanest,
    peakDay: peak,
    trendDeltaPct,
    trendDirection,
  };
}

export function buildRuleBasedAssistantAnswer(
  question: string,
  airQuality: AirQualityPayload | null,
  preferences: UserPreferences,
  activeLocation?: LocationPreset
): AssistantStructuredAnswer {
  const q = question.toLowerCase();
  const matchingAq =
    airQuality && (!activeLocation || airQuality.location.id === activeLocation.id)
      ? airQuality
      : null;
  const loc = activeLocation?.name ?? matchingAq?.location.name ?? preferences.defaultLocation.name;
  const usAqi = matchingAq?.current.usAqi ?? null;
  const pm25 = matchingAq?.current.pm25 ?? null;
  const pm10 = matchingAq?.current.pm10 ?? null;
  const statusTag = matchingAq?.status ?? 'UNAVAILABLE';
  const cat = getUsAqiCategory(usAqi);
  const hasSensitive =
    preferences.householdAgeGroups.includes('children_under_12') ||
    preferences.householdAgeGroups.includes('seniors_65_plus') ||
    preferences.householdAgeGroups.includes('respiratory_sensitive');

  const dataSummary =
    usAqi !== null && pm25 !== null
      ? `${loc} currently shows a US AQI of ${Math.round(usAqi)} (${cat.level}) with PM2.5 around ${pm25.toFixed(1)} µg/m³${pm10 !== null ? ` and PM10 around ${pm10.toFixed(1)} µg/m³` : ''} (${statusTag} model data).`
      : `Live pollutant readings for ${loc} are currently unavailable, so this guidance uses conservative urban smog precautions.`;

  if (q.includes('exercise') || q.includes('run') || q.includes('jog') || q.includes('walk') || q.includes('outdoor')) {
    const highRisk = usAqi === null || usAqi > 150 || (hasSensitive && usAqi > 100);
    return {
      situation: `${dataSummary} Your profile notes ${preferences.outdoorPreference.replace('_', ' ')} outdoor preference${hasSensitive ? ' and sensitive household members' : ''}.`,
      recommendation: highRisk
        ? 'Shift moderate-to-vigorous workouts indoors today (mobility, strength, yoga, or indoor cycling). If going outside for a brief walk, stay away from main arterial roads and wear a well-fitted N95 mask when US AQI exceeds 150.'
        : 'Light-to-moderate outdoor exercise is reasonable in parks or low-traffic lanes. Monitor any throat irritation and avoid peak traffic intersections.',
      explanation:
        'Aerobic exercise increases breathing volume by 5–10×, drawing substantially more fine particulate matter (PM2.5) deep into the respiratory tract during elevated smog.',
      expectedBenefit:
        'Lower inhaled particulate dose during peak pollution hours while preserving daily movement consistency.',
      estimatedImpact:
        'Moving a 45-minute vigorous outdoor run indoors during Unhealthy AQI can reduce short-term PM2.5 inhalation substantially compared with roadside exertion (exact reduction depends on indoor filtration).',
      limitationsAndUncertainty:
        'Open-Meteo CAMS forecasts represent ~45 km atmospheric grid averages rather than hyper-local street sensors; local construction dust or traffic spikes can make roadside air worse than the city estimate. This is general environmental guidance, not medical advice.',
    };
  }

  if (q.includes('indoor') || q.includes('home') || q.includes('purifier') || q.includes('hepa') || q.includes('ventilation')) {
    return {
      situation: `${dataSummary} Indoors, outdoor smog infiltrates through window gaps and combines with cooking aerosols and household dust.`,
      recommendation:
        'Keep windows closed whenever outdoor US AQI exceeds 100, run a true HEPA air purifier sized to your room CADR in sleeping spaces, use an exhaust hood while cooking, damp-mop floors instead of dry sweeping, and avoid incense or indoor smoke.',
      explanation:
        'Mechanical HEPA filtration captures fine PM2.5 particles efficiently, while source control (exhaust ventilation during cooking and eliminating indoor combustion) prevents indoor spikes that can rival outdoor smog.',
      expectedBenefit:
        'Measurably cleaner indoor breathing air during the 8–16 hours families typically spend at home each day.',
      estimatedImpact:
        'A properly sized HEPA unit in a closed bedroom commonly lowers indoor PM2.5 concentrations by 50–80% within 30–60 minutes, depending on room sealing and fan speed.',
      limitationsAndUncertainty:
        'Actual indoor air quality varies with building airtightness, filter age, and indoor cooking habits. Ordinary houseplants do not replace HEPA filtration or ventilation.',
    };
  }

  if (q.includes('commute') || q.includes('travel') || q.includes('car') || q.includes('metro') || q.includes('bus') || q.includes('emission')) {
    return {
      situation: `${dataSummary} Your saved primary commute mode is ${preferences.commuteMode.replace('_', ' ')}.`,
      recommendation:
        'Prioritize electric metro/rail or public buses for longer trips, or carpool with 2–3 colleagues when transit is unavailable. On days with US AQI > 150, keep car cabin air on recirculation with a clean cabin filter or wear an N95 mask on open transit platforms.',
      explanation:
        'Shifting from a single-occupancy private car to public transit or shared rides reduces per-passenger tailpipe CO₂ and local roadway NO₂/particulate emissions.',
      expectedBenefit:
        'Lower per-commuter greenhouse gas footprint and reduced collective urban traffic emissions.',
      estimatedImpact:
        'Replacing a 20 km round-trip private petrol car commute with public transit avoids roughly 2.2 kg CO₂e per day (~480–550 kg CO₂e/year across 220–250 workdays) based on average emission factors.',
      limitationsAndUncertainty:
        'Actual emissions depend on vehicle fuel type, occupancy, and regional electricity grid mix. Individual CO₂ savings help climate goals over time but do not immediately lower citywide AQI on their own.',
    };
  }

  return {
    situation: `${dataSummary} Household schedule runs roughly ${preferences.wakeTime} wake-up with ${preferences.workStart}–${preferences.workEnd} work/school hours.`,
    recommendation:
      usAqi !== null && usAqi > 150
        ? 'Minimize outdoor exposure, keep windows closed with HEPA filtration running, wear a well-fitted N95/FFP2 mask for necessary commutes, and shift exercise indoors until hourly PM2.5 eases.'
        : 'Time errands and brief ventilation windows for the lowest hourly PM2.5 period shown in the 24-hour trend chart, use low-emission transit where feasible, and keep indoor cooking areas exhausted.',
    explanation:
      'Winter smog often traps PM2.5 near ground level during cool night and early-morning temperature inversions, while daytime warming sometimes improves dispersion—checking actual hourly data avoids guesswork.',
    expectedBenefit:
      'Practical exposure reduction for your household combined with consistent lower-emission daily routines.',
    estimatedImpact:
      'Combining indoor source control, mask use during severe outdoor spikes, and cleaner commuting lowers personal particulate exposure while avoiding 1–3 kg CO₂e per shifted car commute day.',
    limitationsAndUncertainty:
      'Modelled CAMS forecasts (~45 km grid) can differ from neighborhood street sensors, and demo data (if active) is illustrative only. Consult a healthcare professional for personal respiratory symptoms.',
  };
}
