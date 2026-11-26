export type NavSection =
  | 'dashboard'
  | 'intelligence'
  | 'assistant'
  | 'planner'
  | 'indoor'
  | 'travel'
  | 'impact'
  | 'community'
  | 'settings';

export type AppViewMode = 'home' | 'auth' | 'app';

export type ThemeMode = 'light' | 'dark';

export type LocationSource = 'preset' | 'gps' | 'search' | 'manual';

export interface LocationPreset {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  area?: string;
  locationSource?: LocationSource;
  locationProvider?: string;
  locationUpdatedAt?: string;
}

export interface ReverseGeocodeResult {
  resolved: boolean;
  displayName: string;
  name: string;
  area: string;
  region: string;
  country: string;
  provider: string;
  resolvedAt: string;
  error?: string;
}

export type DataSourceStatus = 'FORECAST' | 'CACHED' | 'DEMO';

export type PollutantKey = 'usAqi' | 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2';

export interface HourlyDataPoint {
  time: string;
  usAqi: number | null;
  europeanAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  so2: number | null;
}

export interface DailyHistoryPoint {
  date: string; // YYYY-MM-DD in location local calendar
  usAqi: number | null;
  europeanAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  so2: number | null;
  maxValues: Record<PollutantKey, number | null>;
  minValues: Record<PollutantKey, number | null>;
  sampleCount: number;
}

export interface GroundStationReading {
  stationName: string;
  distanceKm: number;
  measuredAt: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  source: 'OpenAQ';
}

export interface AirQualityPayload {
  location: LocationPreset;
  status: DataSourceStatus;
  isStale: boolean;
  fetchedAt: string;
  dataTimestamp: string;
  timezoneAbbreviation?: string;
  providerLabel: string;
  attribution: string;
  notice?: string;
  current: {
    usAqi: number | null;
    europeanAqi: number | null;
    pm25: number | null;
    pm10: number | null;
    no2: number | null;
    o3: number | null;
    so2: number | null;
  };
  hourly: HourlyDataPoint[];
  dailyHistory?: DailyHistoryPoint[];
  groundStation: GroundStationReading | null;
}

export type CommuteMode = 'private_car' | 'carpool' | 'public_transit' | 'cycling' | 'walking';

export type CustomVehicleType =
  | 'petrol_car'
  | 'diesel_car'
  | 'cng_car'
  | 'electric_car'
  | 'two_wheeler'
  | 'auto_rickshaw'
  | 'city_bus'
  | 'metro_rail';

export interface CustomTravelInput {
  origin: string;
  destination: string;
  distanceKm: number;
  vehicleType: CustomVehicleType;
  passengers: number;
  tripsPerWeek: number;
}

export interface CustomTravelResult {
  vehicleLabel: string;
  vehicleFactorKgPerKm: number;
  sourceNote: string;
  passengers: number;
  distanceKm: number;
  totalTripCo2Kg: number;
  perPassengerTripCo2Kg: number;
  perPassengerWeeklyCo2Kg: number;
  perPassengerAnnualCo2Kg: number;
  alternatives: TravelModeEstimate[];
  bestLowerAlternative: TravelModeEstimate | null;
}

export type OutdoorPreference = 'morning' | 'evening' | 'flexible' | 'indoor_only';

export type HouseholdAgeGroup =
  | 'children_under_12'
  | 'teens'
  | 'adults'
  | 'seniors_65_plus'
  | 'respiratory_sensitive';

export interface UserPreferences {
  onboardingDismissed: boolean;
  theme: ThemeMode;
  defaultLocation: LocationPreset;
  commuteMode: CommuteMode;
  wakeTime: string;
  workStart: string;
  workEnd: string;
  outdoorPreference: OutdoorPreference;
  householdAgeGroups: HouseholdAgeGroup[];
  indoorConcerns: string[];
}

export interface AssistantStructuredAnswer {
  situation: string;
  recommendation: string;
  explanation: string;
  expectedBenefit: string;
  estimatedImpact: string;
  limitationsAndUncertainty: string;
}

export interface AssistantMessage {
  id: string;
  question: string;
  createdAt: string;
  locationName: string;
  source: 'GEMINI_AI' | 'RULE_BASED_FALLBACK';
  notice?: string;
  structured: AssistantStructuredAnswer;
}

export type PlanCategory = 'outdoor' | 'indoor' | 'commute' | 'ventilation' | 'eco';

export interface DailyPlanInputs {
  wakeTime: string;
  workStart: string;
  workEnd: string;
  commuteMode: CommuteMode;
  outdoorPreference: OutdoorPreference;
  familyNote: string;
}

export interface DailyPlanItem {
  id: string;
  timeWindow: string;
  title: string;
  category: PlanCategory;
  rationale: string;
  dataBasis: string;
  completed: boolean;
  isCustom?: boolean;
}

export type IndoorRoomId = 'bedroom' | 'kitchen' | 'living' | 'workspace' | 'community';

export interface IndoorChecklistItem {
  id: string;
  room: IndoorRoomId;
  title: string;
  detail: string;
  frequency: string;
  topic: 'HEPA' | 'Ventilation' | 'Cooking' | 'Dust' | 'Combustion' | 'Humidity';
}

export interface IndoorGuideRoom {
  id: IndoorRoomId;
  name: string;
  summary: string;
  primaryRisks: string[];
  guidancePoints: {
    heading: string;
    body: string;
  }[];
}

export interface TravelComparisonInput {
  origin: string;
  destination: string;
  distanceKm: number;
  currentMode: CommuteMode;
  tripsPerWeek: number;
}

export interface TravelModeEstimate {
  mode: CommuteMode;
  label: string;
  factorKgPerKm: number;
  tripCo2Kg: number;
  weeklyCo2Kg: number;
  annualCo2Kg: number;
  co2AvoidedPerTripKg: number;
  co2AvoidedAnnualKg: number;
  exposureNote: string;
  sourceNote: string;
  isCurrent: boolean;
  isRecommended: boolean;
}

export interface ImpactRoutineInput {
  baselineCarKmPerWeek: number;
  improvedCarKmPerWeek: number;
  shiftedToMode: 'public_transit' | 'carpool' | 'cycling' | 'walking';
  noIdlingDaysPerWeek: number;
  cleanCookingVentDaysPerWeek: number;
  hepaMaintenanceDone: boolean;
  zeroWasteBurningPledge: boolean;
  carpoolTripsPerWeek: number;
}

export interface ImpactWeeklyLog {
  id: string;
  weekLabel: string;
  co2AvoidedKg: number;
  vehicleKmAvoided: number;
  actionsCompleted: number;
  loggedAt: string;
}

export interface ImpactSummary {
  baselineWeeklyCo2Kg: number;
  improvedWeeklyCo2Kg: number;
  weeklyCo2AvoidedKg: number;
  annualCo2AvoidedKg: number;
  weeklyVehicleKmAvoided: number;
  annualVehicleKmAvoided: number;
  actionsCompleted: number;
  totalTrackedActions: number;
}

export type CommunityCategory =
  | 'construction_dust'
  | 'smoke'
  | 'waste_burning'
  | 'vehicle_emissions'
  | 'other';

export type CommunityStatus = 'Reported' | 'Acknowledged' | 'Monitoring';

export interface CommunityReport {
  id: string;
  category: CommunityCategory;
  city: string;
  areaName: string;
  description: string;
  createdAt: string;
  status: CommunityStatus;
  isExample?: boolean;
  isCommunityObservation: true;
}

export interface GeocodingResult {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface AlertThresholds {
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
}

export interface WeeklyChallengeItem {
  id: string;
  dayLabel: string;
  title: string;
  category: 'Mobility' | 'Indoor Air' | 'Source Reduction';
  detail: string;
  estimatedCo2SavedKg: number;
  exposureNote: string;
}

export interface AuthSession {
  mode: 'demo_account' | 'guest';
  email?: string;
  displayName: string;
  signedInAt: string;
}

export type NotificationPermissionState = 'enabled' | 'disabled' | 'blocked' | 'unsupported';

export interface NotificationSettings {
  enabled: boolean;
  cooldownMinutes: number;
  pollIntervalMinutes: number;
  notifyOnImprovement: boolean;
}

export type NotificationKind = 'alert' | 'improvement' | 'test';

export interface NotificationHistoryEntry {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  locationName: string;
  triggeredBy: string;
  readingSummary: string;
  category: string;
  dataSource: string;
  dataTimestamp: string;
  sentAt: string;
  deliveredViaBrowser: boolean;
}

export interface NotificationTrackerState {
  lastLocationId: string | null;
  lastAlertAtMs: number | null;
  lastAlertSeverityRank: number | null;
  lastConditionSignature: string | null;
  lastThresholdCrossed: boolean;
  lastEvaluatedSeverityRank: number | null;
}

export interface NotificationCapabilities {
  pageActiveSupported: boolean;
  backgroundPushConfigured: boolean;
  backgroundPushStatus: 'CONFIGURED' | 'NOT_CONFIGURED';
  vapidPublicKey: string | null;
  reason: string;
}

