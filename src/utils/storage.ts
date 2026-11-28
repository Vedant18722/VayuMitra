import type {
  AlertThresholds,
  AuthSession,
  CommunityReport,
  DailyPlanInputs,
  DailyPlanItem,
  ImpactRoutineInput,
  ImpactWeeklyLog,
  LocationPreset,
  NotificationSettings,
  NotificationTrackerState,
  UserPreferences,
} from '../types';

export const INDIAN_METRO_PRESETS: LocationPreset[] = [
  {
    id: 'delhi',
    name: 'Delhi',
    region: 'National Capital Territory',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    region: 'Karnataka',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'pune',
    name: 'Pune',
    region: 'Maharashtra',
    country: 'India',
    latitude: 18.5204,
    longitude: 73.8567,
    timezone: 'Asia/Kolkata',
  },
];

export const STORAGE_KEYS = {
  PREFERENCES: 'vayumitra_v1_preferences',
  ACTIVE_LOCATION: 'vayumitra_v1_location',
  DAILY_PLAN_INPUTS: 'vayumitra_v1_plan_inputs',
  DAILY_PLAN_ITEMS: 'vayumitra_v1_plan_items',
  INDOOR_CHECKLIST: 'vayumitra_v1_indoor_checklist',
  IMPACT_ROUTINE: 'vayumitra_v1_impact_routine',
  IMPACT_LOGS: 'vayumitra_v1_impact_logs',
  COMMUNITY_REPORTS: 'vayumitra_v1_community_reports',
  ASSISTANT_HISTORY: 'vayumitra_v1_assistant_history',
  ALERT_THRESHOLDS: 'vayumitra_v1_alert_thresholds',
  WEEKLY_CHALLENGE: 'vayumitra_v1_weekly_challenge',
  AUTH_SESSION: 'vayumitra_v1_demo_session',
  DEMO_ACCOUNTS: 'vayumitra_v1_demo_accounts',
  NOTIFICATION_SETTINGS: 'vayumitra_v1_notification_settings',
  NOTIFICATION_HISTORY: 'vayumitra_v1_notification_history',
  NOTIFICATION_TRACKER: 'vayumitra_v1_notification_tracker',
} as const;

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  usAqi: 150,
  pm25: 55,
  pm10: 150,
  no2: 80,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  cooldownMinutes: 60,
  pollIntervalMinutes: 15,
  notifyOnImprovement: true,
};

export const DEFAULT_NOTIFICATION_TRACKER: NotificationTrackerState = {
  lastLocationId: null,
  lastAlertAtMs: null,
  lastAlertSeverityRank: null,
  lastConditionSignature: null,
  lastThresholdCrossed: false,
  lastEvaluatedSeverityRank: null,
};

export type StoredAuthSession = AuthSession | null;

export const DEFAULT_PREFERENCES: UserPreferences = {
  onboardingDismissed: false,
  theme: 'light',
  defaultLocation: INDIAN_METRO_PRESETS[0],
  commuteMode: 'public_transit',
  wakeTime: '06:30',
  workStart: '09:00',
  workEnd: '18:00',
  outdoorPreference: 'morning',
  householdAgeGroups: ['adults'],
  indoorConcerns: ['Cooking smoke', 'Roadside dust'],
};

export const DEFAULT_PLAN_INPUTS: DailyPlanInputs = {
  wakeTime: '06:30',
  workStart: '09:00',
  workEnd: '18:00',
  commuteMode: 'public_transit',
  outdoorPreference: 'morning',
  familyNote: '',
};

export const DEFAULT_IMPACT_ROUTINE: ImpactRoutineInput = {
  baselineCarKmPerWeek: 120,
  improvedCarKmPerWeek: 45,
  shiftedToMode: 'public_transit',
  noIdlingDaysPerWeek: 5,
  cleanCookingVentDaysPerWeek: 6,
  hepaMaintenanceDone: true,
  zeroWasteBurningPledge: true,
  carpoolTripsPerWeek: 2,
};

export const DEFAULT_IMPACT_LOGS: ImpactWeeklyLog[] = [
  {
    id: 'wk-1',
    weekLabel: 'Week 1',
    co2AvoidedKg: 6.4,
    vehicleKmAvoided: 40,
    actionsCompleted: 3,
    loggedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
  },
  {
    id: 'wk-2',
    weekLabel: 'Week 2',
    co2AvoidedKg: 9.1,
    vehicleKmAvoided: 58,
    actionsCompleted: 4,
    loggedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'wk-3',
    weekLabel: 'Week 3',
    co2AvoidedKg: 10.2,
    vehicleKmAvoided: 75,
    actionsCompleted: 5,
    loggedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

export const SEED_COMMUNITY_REPORTS: CommunityReport[] = [
  {
    id: 'seed-1',
    category: 'construction_dust',
    city: 'Delhi',
    areaName: 'Outer Ring Road Flyover Corridor',
    description: 'Uncovered sand and gravel stockpiles raising visible coarse dust during afternoon traffic.',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    status: 'Monitoring',
    isExample: true,
    isCommunityObservation: true,
  },
  {
    id: 'seed-2',
    category: 'waste_burning',
    city: 'Pune',
    areaName: 'Baner–Pashan Link Stretch',
    description: 'Dry leaf and garden trimmings smoldering along roadside verge around dusk.',
    createdAt: new Date(Date.now() - 11 * 3600000).toISOString(),
    status: 'Reported',
    isExample: true,
    isCommunityObservation: true,
  },
  {
    id: 'seed-3',
    category: 'vehicle_emissions',
    city: 'Bengaluru',
    areaName: 'Silk Board Junction Approach',
    description: 'Prolonged bumper-to-bumper diesel exhaust buildup during morning office hours.',
    createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    status: 'Acknowledged',
    isExample: true,
    isCommunityObservation: true,
  },
  {
    id: 'seed-4',
    category: 'smoke',
    city: 'Mumbai',
    areaName: 'Eastern Freeway Industrial Belt',
    description: 'Light haze and smoky odor noticeable downwind near evening breeze transition.',
    createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
    status: 'Monitoring',
    isExample: true,
    isCommunityObservation: true,
  },
];

export function readStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed : fallback) as T;
    }

    if (fallback !== null && typeof fallback === 'object') {
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return fallback;
      }
      // Shallow-merge defaults so newly added preference/settings keys stay populated across upgrades
      return { ...fallback, ...(parsed as Record<string, unknown>) } as T;
    }

    if (fallback !== null && typeof parsed !== typeof fallback) {
      return fallback;
    }

    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearAllVayumitraStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    Object.values(STORAGE_KEYS).forEach((key) => {
      window.localStorage.removeItem(key);
    });
  } catch {
    // Ignore storage removal errors in restricted environments
  }
}

export function saveDailyPlanToStorage(inputs: DailyPlanInputs, items: DailyPlanItem[]): void {
  writeStorage(STORAGE_KEYS.DAILY_PLAN_INPUTS, inputs);
  writeStorage(STORAGE_KEYS.DAILY_PLAN_ITEMS, items);
}
