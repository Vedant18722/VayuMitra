import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AirQualityPayload,
  AlertThresholds,
  AppViewMode,
  AssistantMessage,
  AuthSession,
  CommunityReport,
  DailyPlanInputs,
  DailyPlanItem,
  ImpactRoutineInput,
  ImpactWeeklyLog,
  LocationPreset,
  NavSection,
  NotificationCapabilities,
  NotificationHistoryEntry,
  NotificationPermissionState,
  NotificationSettings,
  NotificationTrackerState,
  UserPreferences,
} from '../types';
import { fetchAirQuality, fetchNotificationCapabilities } from '../services/api';
import { generateSmartDailyPlan } from '../utils/calculations';
import {
  buildTestNotificationEntry,
  derivePermissionState,
  dispatchBrowserNotification,
  evaluateSmartAirNotification,
  getRawBrowserPermission,
  requestBrowserNotificationPermission,
} from '../utils/notifications';
import { AMBIENT_SOUND_SECTIONS, ambientWindEngine } from '../utils/soundEngine';
import {
  clearAllVayumitraStorage,
  DEFAULT_ALERT_THRESHOLDS,
  DEFAULT_IMPACT_LOGS,
  DEFAULT_IMPACT_ROUTINE,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_NOTIFICATION_TRACKER,
  DEFAULT_PLAN_INPUTS,
  DEFAULT_PREFERENCES,
  INDIAN_METRO_PRESETS,
  readStorage,
  saveDailyPlanToStorage,
  SEED_COMMUNITY_REPORTS,
  STORAGE_KEYS,
  writeStorage,
} from '../utils/storage';

interface AppContextValue {
  viewMode: AppViewMode;
  authInitialTab: 'login' | 'signup';
  authSession: AuthSession | null;
  openHome: () => void;
  openAuth: (tab?: 'login' | 'signup') => void;
  enterWorkspace: (targetSection?: NavSection) => void;
  completeAuthSession: (session: AuthSession) => void;
  continueAsGuest: (targetSection?: NavSection) => void;
  logoutSession: () => void;

  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;

  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  resetPreferencesToDefault: () => void;
  clearAllData: () => void;

  activeLocation: LocationPreset;
  selectLocation: (loc: LocationPreset, forceRefresh?: boolean) => Promise<void>;

  airQuality: AirQualityPayload | null;
  airQualityLoading: boolean;
  airQualityError: string | null;
  refreshAirQuality: () => Promise<void>;

  assistantHistory: AssistantMessage[];
  addAssistantMessage: (msg: AssistantMessage) => void;
  clearAssistantHistory: () => void;

  planInputs: DailyPlanInputs;
  planItems: DailyPlanItem[];
  setPlanInputs: (inputs: DailyPlanInputs) => void;
  setPlanItems: (items: DailyPlanItem[]) => void;
  regeneratePlan: (inputs?: DailyPlanInputs) => void;
  savePlan: () => void;
  resetPlan: () => void;

  indoorChecklist: Record<string, boolean>;
  toggleIndoorChecklistItem: (id: string) => void;
  resetIndoorChecklist: () => void;

  impactRoutine: ImpactRoutineInput;
  updateImpactRoutine: (patch: Partial<ImpactRoutineInput>) => void;
  impactLogs: ImpactWeeklyLog[];
  addImpactLog: (log: ImpactWeeklyLog) => void;
  resetImpactLogs: () => void;

  communityReports: CommunityReport[];
  addCommunityReport: (report: CommunityReport) => void;
  updateCommunityReportStatus: (id: string, status: CommunityReport['status']) => void;

  alertThresholds: AlertThresholds;
  updateAlertThresholds: (patch: Partial<AlertThresholds>) => void;
  resetAlertThresholds: () => void;

  notificationSettings: NotificationSettings;
  notificationPermissionState: NotificationPermissionState;
  rawNotificationPermission: NotificationPermission | 'unsupported';
  notificationHistory: NotificationHistoryEntry[];
  notificationCapabilities: NotificationCapabilities;
  enableAirAlerts: () => Promise<{
    ok: boolean;
    state: NotificationPermissionState;
    message: string;
  }>;
  disableAirAlerts: () => void;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;
  sendTestAirNotification: () => { ok: boolean; message: string };
  clearNotificationHistory: () => void;

  weeklyChallenge: Record<string, boolean>;
  toggleChallengeAction: (id: string) => void;
  resetWeeklyChallenge: () => void;

  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() =>
    readStorage<AuthSession | null>(STORAGE_KEYS.AUTH_SESSION, null)
  );
  const [viewMode, setViewMode] = useState<AppViewMode>(() =>
    readStorage<AuthSession | null>(STORAGE_KEYS.AUTH_SESSION, null) ? 'app' : 'home'
  );
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'signup'>('login');

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');

  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    readStorage<UserPreferences>(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES)
  );

  const [activeLocation, setActiveLocation] = useState<LocationPreset>(() =>
    readStorage<LocationPreset>(
      STORAGE_KEYS.ACTIVE_LOCATION,
      preferences.defaultLocation || INDIAN_METRO_PRESETS[0]
    )
  );

  const [airQuality, setAirQuality] = useState<AirQualityPayload | null>(null);
  const [airQualityLoading, setAirQualityLoading] = useState<boolean>(true);
  const [airQualityError, setAirQualityError] = useState<string | null>(null);

  const [assistantHistory, setAssistantHistory] = useState<AssistantMessage[]>(() =>
    readStorage<AssistantMessage[]>(STORAGE_KEYS.ASSISTANT_HISTORY, [])
  );

  const [planInputs, setPlanInputsState] = useState<DailyPlanInputs>(() =>
    readStorage<DailyPlanInputs>(STORAGE_KEYS.DAILY_PLAN_INPUTS, {
      ...DEFAULT_PLAN_INPUTS,
      wakeTime: preferences.wakeTime,
      workStart: preferences.workStart,
      workEnd: preferences.workEnd,
      commuteMode: preferences.commuteMode,
      outdoorPreference: preferences.outdoorPreference,
    })
  );

  const hasSavedPlanItemsRef = useRef<boolean>(
    readStorage<DailyPlanItem[]>(STORAGE_KEYS.DAILY_PLAN_ITEMS, []).length > 0
  );
  const planLocationIdRef = useRef<string>(activeLocation.id);
  const planNeedsAqHydrationRef = useRef<boolean>(!hasSavedPlanItemsRef.current);

  const [planItems, setPlanItemsState] = useState<DailyPlanItem[]>(() => {
    const saved = readStorage<DailyPlanItem[]>(STORAGE_KEYS.DAILY_PLAN_ITEMS, []);
    if (saved.length > 0) return saved;
    return generateSmartDailyPlan(planInputs, null, activeLocation);
  });

  const [indoorChecklist, setIndoorChecklist] = useState<Record<string, boolean>>(() =>
    readStorage<Record<string, boolean>>(STORAGE_KEYS.INDOOR_CHECKLIST, {})
  );

  const [impactRoutine, setImpactRoutine] = useState<ImpactRoutineInput>(() =>
    readStorage<ImpactRoutineInput>(STORAGE_KEYS.IMPACT_ROUTINE, DEFAULT_IMPACT_ROUTINE)
  );

  const [impactLogs, setImpactLogs] = useState<ImpactWeeklyLog[]>(() =>
    readStorage<ImpactWeeklyLog[]>(STORAGE_KEYS.IMPACT_LOGS, DEFAULT_IMPACT_LOGS)
  );

  const [communityReports, setCommunityReports] = useState<CommunityReport[]>(() =>
    readStorage<CommunityReport[]>(STORAGE_KEYS.COMMUNITY_REPORTS, SEED_COMMUNITY_REPORTS)
  );

  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds>(() =>
    readStorage<AlertThresholds>(STORAGE_KEYS.ALERT_THRESHOLDS, DEFAULT_ALERT_THRESHOLDS)
  );

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() =>
    readStorage<NotificationSettings>(
      STORAGE_KEYS.NOTIFICATION_SETTINGS,
      DEFAULT_NOTIFICATION_SETTINGS
    )
  );

  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryEntry[]>(() =>
    readStorage<NotificationHistoryEntry[]>(STORAGE_KEYS.NOTIFICATION_HISTORY, [])
  );

  const [notificationTracker, setNotificationTracker] = useState<NotificationTrackerState>(() =>
    readStorage<NotificationTrackerState>(
      STORAGE_KEYS.NOTIFICATION_TRACKER,
      DEFAULT_NOTIFICATION_TRACKER
    )
  );
  const notificationTrackerRef = useRef<NotificationTrackerState>(notificationTracker);

  const [rawNotificationPermission, setRawNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => getRawBrowserPermission());

  const [notificationCapabilities, setNotificationCapabilities] = useState<NotificationCapabilities>({
    pageActiveSupported: true,
    backgroundPushConfigured: false,
    backgroundPushStatus: 'NOT_CONFIGURED',
    vapidPublicKey: null,
    reason:
      'Background Web Push (VAPID keys, push subscription storage, and a background delivery service) is not configured in this environment. Page-active Browser Notifications work while VayuMitra is open.',
  });

  const [weeklyChallenge, setWeeklyChallenge] = useState<Record<string, boolean>>(() =>
    readStorage<Record<string, boolean>>(STORAGE_KEYS.WEEKLY_CHALLENGE, {})
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Sync light/dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [preferences.theme]);

  // Stop ambient wind audio cleanly when leaving eligible experiences
  useEffect(() => {
    const isEligible =
      viewMode === 'home' || (viewMode === 'app' && AMBIENT_SOUND_SECTIONS.has(activeSection));
    if (!isEligible) {
      ambientWindEngine.stop();
    }
  }, [viewMode, activeSection]);

  const aqRequestSeqRef = useRef(0);

  const loadAirQuality = useCallback(
    async (loc: LocationPreset, forceRefresh = false): Promise<AirQualityPayload | null> => {
      const requestId = ++aqRequestSeqRef.current;
      setAirQualityLoading(true);
      setAirQualityError(null);
      try {
        const payload = await fetchAirQuality(loc, forceRefresh);
        if (requestId !== aqRequestSeqRef.current) return null;
        const syncedPayload: AirQualityPayload = {
          ...payload,
          location: {
            ...loc,
            timezone: payload.location.timezone || loc.timezone,
          },
        };
        setAirQuality(syncedPayload);
        return syncedPayload;
      } catch (err) {
        if (requestId !== aqRequestSeqRef.current) return null;
        setAirQualityError(
          err instanceof Error ? err.message : 'Unable to reach air quality service. Please try refreshing.'
        );
        return null;
      } finally {
        if (requestId === aqRequestSeqRef.current) {
          setAirQualityLoading(false);
        }
      }
    },
    []
  );

  // Initial load for active location (controlled single call)
  useEffect(() => {
    void loadAirQuality(activeLocation, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load honest backend push notification capability status once on mount
  useEffect(() => {
    let active = true;
    void fetchNotificationCapabilities().then((caps) => {
      if (active) setNotificationCapabilities(caps);
    });
    return () => {
      active = false;
    };
  }, []);

  // Keep raw browser notification permission synced if changed in browser site settings
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncPermission = () => {
      setRawNotificationPermission(getRawBrowserPermission());
    };
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);
    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  const notificationPermissionState = useMemo(
    () => derivePermissionState(rawNotificationPermission, notificationSettings.enabled),
    [rawNotificationPermission, notificationSettings.enabled]
  );

  // Evaluate Smart Air Alerts whenever fresh live air-quality data arrives for the active location
  useEffect(() => {
    if (
      !airQuality ||
      airQuality.location.id !== activeLocation.id ||
      !notificationSettings.enabled ||
      rawNotificationPermission !== 'granted'
    ) {
      return;
    }

    const result = evaluateSmartAirNotification({
      payload: airQuality,
      thresholds: alertThresholds,
      settings: notificationSettings,
      rawPermission: rawNotificationPermission,
      tracker: notificationTrackerRef.current,
    });

    const prevJson = JSON.stringify(notificationTrackerRef.current);
    const nextJson = JSON.stringify(result.nextTracker);
    if (prevJson !== nextJson) {
      notificationTrackerRef.current = result.nextTracker;
      setNotificationTracker(result.nextTracker);
      writeStorage(STORAGE_KEYS.NOTIFICATION_TRACKER, result.nextTracker);
    }

    if (result.shouldNotify && result.entry) {
      const dispatch = dispatchBrowserNotification({
        title: result.entry.title,
        body: result.entry.body,
        tag: `vayumitra-${result.entry.kind}-${airQuality.location.id}`,
      });
      const fullEntry: NotificationHistoryEntry = {
        ...result.entry,
        deliveredViaBrowser: dispatch.delivered,
      };
      setNotificationHistory((prev) => {
        const next = [fullEntry, ...prev].slice(0, 25);
        writeStorage(STORAGE_KEYS.NOTIFICATION_HISTORY, next);
        return next;
      });
      showToast(
        result.entry.kind === 'improvement'
          ? `VayuMitra Update: Air quality in ${result.entry.locationName} improved to ${result.entry.category}.`
          : `VayuMitra Air Alert: ${result.entry.locationName} reached ${result.entry.category}.`
      );
    }
  }, [airQuality, alertThresholds, notificationSettings, rawNotificationPermission, showToast]);

  // Visibility-aware periodic polling while page-active alerts are enabled (no duplicate requests)
  const activeLocationRef = useRef(activeLocation);
  activeLocationRef.current = activeLocation;
  const airQualityLoadingRef = useRef(airQualityLoading);
  airQualityLoadingRef.current = airQualityLoading;

  useEffect(() => {
    if (!notificationSettings.enabled || rawNotificationPermission !== 'granted') return;
    if (typeof window === 'undefined') return;

    const intervalMinutes = Math.max(5, Math.min(120, notificationSettings.pollIntervalMinutes || 15));
    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      if (airQualityLoadingRef.current) {
        return;
      }
      void loadAirQuality(activeLocationRef.current, true);
    }, intervalMinutes * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    notificationSettings.enabled,
    notificationSettings.pollIntervalMinutes,
    rawNotificationPermission,
    loadAirQuality,
  ]);

  // Keep Smart Daily Planner synchronized whenever the active location changes or fresh air-quality loads
  useEffect(() => {
    const locationChanged = planLocationIdRef.current !== activeLocation.id;
    if (locationChanged) {
      planLocationIdRef.current = activeLocation.id;
      planNeedsAqHydrationRef.current = true;
      const matchingAq = airQuality && airQuality.location.id === activeLocation.id ? airQuality : null;
      setPlanItemsState((prev) => {
        const customItems = prev.filter((item) => item.isCustom);
        const refreshed = [...generateSmartDailyPlan(planInputs, matchingAq, activeLocation), ...customItems];
        if (hasSavedPlanItemsRef.current) {
          writeStorage(STORAGE_KEYS.DAILY_PLAN_ITEMS, refreshed);
        }
        return refreshed;
      });
      if (matchingAq) {
        planNeedsAqHydrationRef.current = false;
      }
      return;
    }

    if (!airQuality || airQuality.location.id !== activeLocation.id) return;
    if (!planNeedsAqHydrationRef.current && hasSavedPlanItemsRef.current) return;

    setPlanItemsState((prev) => {
      const customItems = prev.filter((item) => item.isCustom);
      const refreshed = [...generateSmartDailyPlan(planInputs, airQuality, activeLocation), ...customItems];
      if (hasSavedPlanItemsRef.current) {
        writeStorage(STORAGE_KEYS.DAILY_PLAN_ITEMS, refreshed);
      }
      return refreshed;
    });
    planNeedsAqHydrationRef.current = false;
  }, [activeLocation, airQuality, planInputs]);

  const openHome = useCallback(() => {
    setViewMode('home');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openAuth = useCallback((tab: 'login' | 'signup' = 'login') => {
    setAuthInitialTab(tab);
    setViewMode('auth');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const continueAsGuest = useCallback(
    (targetSection: NavSection = 'dashboard') => {
      const guest: AuthSession = {
        mode: 'guest',
        displayName: 'Guest',
        signedInAt: new Date().toISOString(),
      };
      setAuthSession(guest);
      writeStorage(STORAGE_KEYS.AUTH_SESSION, guest);
      setActiveSection(targetSection);
      setViewMode('app');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const enterWorkspace = useCallback(
    (targetSection: NavSection = 'dashboard') => {
      if (!authSession) {
        continueAsGuest(targetSection);
        return;
      }
      setActiveSection(targetSection);
      setViewMode('app');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [authSession, continueAsGuest]
  );

  const completeAuthSession = useCallback(
    (session: AuthSession) => {
      setAuthSession(session);
      writeStorage(STORAGE_KEYS.AUTH_SESSION, session);
      setActiveSection('dashboard');
      setViewMode('app');
      showToast(`Signed in as ${session.displayName} (local demo session).`);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [showToast]
  );

  const logoutSession = useCallback(() => {
    setAuthSession(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      } catch {
        // ignore
      }
    }
    setViewMode('home');
    showToast('Signed out of VAYUMITRA.');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [showToast]);

  const selectLocation = useCallback(
    async (loc: LocationPreset, forceRefresh = false) => {
      const stamped: LocationPreset = {
        ...loc,
        locationUpdatedAt: loc.locationUpdatedAt ?? new Date().toISOString(),
      };
      const prev = activeLocationRef.current;
      const isDifferentLocation =
        stamped.id !== prev.id ||
        Math.abs(stamped.latitude - prev.latitude) > 0.0001 ||
        Math.abs(stamped.longitude - prev.longitude) > 0.0001;

      if (isDifferentLocation) {
        // Clear previous city's readings immediately so stale data (e.g. Delhi) never leaks into the new city
        setAirQuality(null);
        setAirQualityError(null);
      }

      activeLocationRef.current = stamped;
      setActiveLocation(stamped);
      writeStorage(STORAGE_KEYS.ACTIVE_LOCATION, stamped);
      await loadAirQuality(stamped, forceRefresh);
    },
    [loadAirQuality]
  );

  const refreshAirQuality = useCallback(async () => {
    const payload = await loadAirQuality(activeLocation, true);
    if (!payload) {
      showToast(`Refresh failed for ${activeLocation.name}.`);
    } else if (payload.status === 'DEMO') {
      showToast(`Live forecast unavailable for ${activeLocation.name}; showing labelled demo fallback.`);
    } else if (payload.status === 'CACHED') {
      showToast(`Live refresh failed; showing cached forecast for ${activeLocation.name}.`);
    } else {
      showToast(`Updated Open-Meteo model forecast for ${activeLocation.name}.`);
    }
  }, [activeLocation, loadAirQuality, showToast]);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      writeStorage(STORAGE_KEYS.PREFERENCES, next);
      return next;
    });
  }, []);

  const resetPreferencesToDefault = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    writeStorage(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
    if (activeLocationRef.current.id !== INDIAN_METRO_PRESETS[0].id) {
      setAirQuality(null);
      setAirQualityError(null);
    }
    activeLocationRef.current = INDIAN_METRO_PRESETS[0];
    setActiveLocation(INDIAN_METRO_PRESETS[0]);
    writeStorage(STORAGE_KEYS.ACTIVE_LOCATION, INDIAN_METRO_PRESETS[0]);
    void loadAirQuality(INDIAN_METRO_PRESETS[0], false);
    showToast('Settings reset to defaults.');
  }, [loadAirQuality, showToast]);

  const clearAllData = useCallback(() => {
    clearAllVayumitraStorage();
    setPreferences(DEFAULT_PREFERENCES);
    setAirQuality(null);
    setAirQualityError(null);
    activeLocationRef.current = INDIAN_METRO_PRESETS[0];
    setActiveLocation(INDIAN_METRO_PRESETS[0]);
    setAssistantHistory([]);
    setPlanInputsState(DEFAULT_PLAN_INPUTS);
    hasSavedPlanItemsRef.current = false;
    planLocationIdRef.current = INDIAN_METRO_PRESETS[0].id;
    planNeedsAqHydrationRef.current = true;
    setPlanItemsState(generateSmartDailyPlan(DEFAULT_PLAN_INPUTS, null, INDIAN_METRO_PRESETS[0]));
    setIndoorChecklist({});
    setImpactRoutine(DEFAULT_IMPACT_ROUTINE);
    setImpactLogs(DEFAULT_IMPACT_LOGS);
    setCommunityReports(SEED_COMMUNITY_REPORTS);
    setAlertThresholds(DEFAULT_ALERT_THRESHOLDS);
    setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    setNotificationHistory([]);
    notificationTrackerRef.current = DEFAULT_NOTIFICATION_TRACKER;
    setNotificationTracker(DEFAULT_NOTIFICATION_TRACKER);
    setWeeklyChallenge({});
    setAuthSession(null);
    void loadAirQuality(INDIAN_METRO_PRESETS[0], false);
    showToast('All locally stored preferences, plans, checklists, alerts, challenges, and demo accounts were cleared.');
  }, [loadAirQuality, showToast]);

  const addAssistantMessage = useCallback((msg: AssistantMessage) => {
    setAssistantHistory((prev) => {
      const next = [msg, ...prev].slice(0, 15);
      writeStorage(STORAGE_KEYS.ASSISTANT_HISTORY, next);
      return next;
    });
  }, []);

  const clearAssistantHistory = useCallback(() => {
    setAssistantHistory([]);
    writeStorage(STORAGE_KEYS.ASSISTANT_HISTORY, []);
    showToast('Cleared assistant conversation history.');
  }, [showToast]);

  const setPlanInputs = useCallback((inputs: DailyPlanInputs) => {
    setPlanInputsState(inputs);
    writeStorage(STORAGE_KEYS.DAILY_PLAN_INPUTS, inputs);
  }, []);

  const setPlanItems = useCallback((items: DailyPlanItem[]) => {
    hasSavedPlanItemsRef.current = true;
    setPlanItemsState(items);
    writeStorage(STORAGE_KEYS.DAILY_PLAN_ITEMS, items);
  }, []);

  const regeneratePlan = useCallback(
    (overrideInputs?: DailyPlanInputs) => {
      const activeInputs = overrideInputs ?? planInputs;
      const generated = generateSmartDailyPlan(activeInputs, airQuality, activeLocation);
      hasSavedPlanItemsRef.current = true;
      planLocationIdRef.current = activeLocation.id;
      planNeedsAqHydrationRef.current = !airQuality || airQuality.location.id !== activeLocation.id;
      setPlanInputsState(activeInputs);
      setPlanItemsState(generated);
      saveDailyPlanToStorage(activeInputs, generated);
      showToast(`Daily plan regenerated for ${activeLocation.name} using your schedule and available air quality data.`);
    },
    [activeLocation, airQuality, planInputs, showToast]
  );

  const savePlan = useCallback(() => {
    hasSavedPlanItemsRef.current = true;
    saveDailyPlanToStorage(planInputs, planItems);
    showToast('Daily schedule saved to this device.');
  }, [planInputs, planItems, showToast]);

  const resetPlan = useCallback(() => {
    const baseInputs: DailyPlanInputs = {
      ...DEFAULT_PLAN_INPUTS,
      wakeTime: preferences.wakeTime,
      workStart: preferences.workStart,
      workEnd: preferences.workEnd,
      commuteMode: preferences.commuteMode,
      outdoorPreference: preferences.outdoorPreference,
    };
    const fresh = generateSmartDailyPlan(baseInputs, airQuality, activeLocation);
    hasSavedPlanItemsRef.current = false;
    planLocationIdRef.current = activeLocation.id;
    planNeedsAqHydrationRef.current = !airQuality || airQuality.location.id !== activeLocation.id;
    setPlanInputsState(baseInputs);
    setPlanItemsState(fresh);
    saveDailyPlanToStorage(baseInputs, fresh);
    showToast('Daily schedule reset to recommended defaults.');
  }, [activeLocation, airQuality, preferences, showToast]);

  const toggleIndoorChecklistItem = useCallback((id: string) => {
    setIndoorChecklist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeStorage(STORAGE_KEYS.INDOOR_CHECKLIST, next);
      return next;
    });
  }, []);

  const resetIndoorChecklist = useCallback(() => {
    setIndoorChecklist({});
    writeStorage(STORAGE_KEYS.INDOOR_CHECKLIST, {});
    showToast('Indoor air checklist progress cleared.');
  }, [showToast]);

  const updateImpactRoutine = useCallback((patch: Partial<ImpactRoutineInput>) => {
    setImpactRoutine((prev) => {
      const next = { ...prev, ...patch };
      writeStorage(STORAGE_KEYS.IMPACT_ROUTINE, next);
      return next;
    });
  }, []);

  const addImpactLog = useCallback(
    (log: ImpactWeeklyLog) => {
      setImpactLogs((prev) => {
        const next = [...prev, log].slice(-12);
        writeStorage(STORAGE_KEYS.IMPACT_LOGS, next);
        return next;
      });
      showToast(`Logged ${log.weekLabel} impact snapshot.`);
    },
    [showToast]
  );

  const resetImpactLogs = useCallback(() => {
    setImpactRoutine(DEFAULT_IMPACT_ROUTINE);
    setImpactLogs(DEFAULT_IMPACT_LOGS);
    writeStorage(STORAGE_KEYS.IMPACT_ROUTINE, DEFAULT_IMPACT_ROUTINE);
    writeStorage(STORAGE_KEYS.IMPACT_LOGS, DEFAULT_IMPACT_LOGS);
    showToast('Impact calculator reset to sample baseline.');
  }, [showToast]);

  const addCommunityReport = useCallback(
    (report: CommunityReport) => {
      setCommunityReports((prev) => {
        const next = [report, ...prev];
        writeStorage(STORAGE_KEYS.COMMUNITY_REPORTS, next);
        return next;
      });
      showToast('Community pollution observation saved locally.');
    },
    [showToast]
  );

  const updateCommunityReportStatus = useCallback((id: string, status: CommunityReport['status']) => {
    setCommunityReports((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, status } : r));
      writeStorage(STORAGE_KEYS.COMMUNITY_REPORTS, next);
      return next;
    });
  }, []);

  const updateAlertThresholds = useCallback((patch: Partial<AlertThresholds>) => {
    setAlertThresholds((prev) => {
      const next = { ...prev, ...patch };
      writeStorage(STORAGE_KEYS.ALERT_THRESHOLDS, next);
      return next;
    });
  }, []);

  const resetAlertThresholds = useCallback(() => {
    setAlertThresholds(DEFAULT_ALERT_THRESHOLDS);
    writeStorage(STORAGE_KEYS.ALERT_THRESHOLDS, DEFAULT_ALERT_THRESHOLDS);
    showToast('Alert thresholds reset to defaults.');
  }, [showToast]);

  const enableAirAlerts = useCallback(async () => {
    const currentRaw = getRawBrowserPermission();
    setRawNotificationPermission(currentRaw);

    if (currentRaw === 'unsupported') {
      return {
        ok: false,
        state: 'unsupported' as NotificationPermissionState,
        message: 'This browser does not support desktop/web Notification API alerts.',
      };
    }

    if (currentRaw === 'denied') {
      setNotificationSettings((prev) => {
        const next = { ...prev, enabled: false };
        writeStorage(STORAGE_KEYS.NOTIFICATION_SETTINGS, next);
        return next;
      });
      return {
        ok: false,
        state: 'blocked' as NotificationPermissionState,
        message:
          'Notifications are blocked in your browser site settings. Allow notifications for this site and try again.',
      };
    }

    const permission =
      currentRaw === 'granted' ? 'granted' : await requestBrowserNotificationPermission();
    setRawNotificationPermission(permission);

    if (permission === 'granted') {
      setNotificationSettings((prev) => {
        const next = { ...prev, enabled: true };
        writeStorage(STORAGE_KEYS.NOTIFICATION_SETTINGS, next);
        return next;
      });
      showToast(`Smart Air Alerts enabled for ${activeLocation.name}.`);
      return {
        ok: true,
        state: 'enabled' as NotificationPermissionState,
        message: `Smart Air Alerts enabled. VayuMitra will notify you while open when ${activeLocation.name} crosses your configured thresholds.`,
      };
    }

    if (permission === 'denied') {
      setNotificationSettings((prev) => {
        const next = { ...prev, enabled: false };
        writeStorage(STORAGE_KEYS.NOTIFICATION_SETTINGS, next);
        return next;
      });
      return {
        ok: false,
        state: 'blocked' as NotificationPermissionState,
        message:
          'Notification permission was blocked. You can change this anytime in your browser site settings.',
      };
    }

    return {
      ok: false,
      state: 'disabled' as NotificationPermissionState,
      message: 'Permission prompt was dismissed. Click "Enable Air Quality Alerts" anytime to try again.',
    };
  }, [activeLocation.name, showToast]);

  const disableAirAlerts = useCallback(() => {
    setNotificationSettings((prev) => {
      const next = { ...prev, enabled: false };
      writeStorage(STORAGE_KEYS.NOTIFICATION_SETTINGS, next);
      return next;
    });
    showToast('Smart Air Alerts disabled.');
  }, [showToast]);

  const updateNotificationSettings = useCallback((patch: Partial<NotificationSettings>) => {
    setNotificationSettings((prev) => {
      const next: NotificationSettings = {
        ...prev,
        ...patch,
        cooldownMinutes: Math.max(
          5,
          Math.min(1440, Math.round(patch.cooldownMinutes ?? prev.cooldownMinutes))
        ),
        pollIntervalMinutes: Math.max(
          5,
          Math.min(120, Math.round(patch.pollIntervalMinutes ?? prev.pollIntervalMinutes))
        ),
      };
      writeStorage(STORAGE_KEYS.NOTIFICATION_SETTINGS, next);
      return next;
    });
  }, []);

  const sendTestAirNotification = useCallback(() => {
    const currentRaw = getRawBrowserPermission();
    setRawNotificationPermission(currentRaw);

    if (currentRaw === 'unsupported') {
      return {
        ok: false,
        message: 'This browser does not support Notification API alerts.',
      };
    }
    if (currentRaw === 'denied') {
      return {
        ok: false,
        message: 'Notifications are blocked by your browser. Unblock this site in browser settings first.',
      };
    }
    if (currentRaw !== 'granted') {
      return {
        ok: false,
        message: 'Click "Enable Air Quality Alerts" first to grant browser notification permission.',
      };
    }

    const baseEntry = buildTestNotificationEntry(activeLocation.name, airQuality);
    const dispatch = dispatchBrowserNotification({
      title: baseEntry.title,
      body: baseEntry.body,
      tag: `vayumitra-test-${activeLocation.id}`,
    });

    const fullEntry: NotificationHistoryEntry = {
      ...baseEntry,
      deliveredViaBrowser: dispatch.delivered,
    };
    setNotificationHistory((prev) => {
      const next = [fullEntry, ...prev].slice(0, 25);
      writeStorage(STORAGE_KEYS.NOTIFICATION_HISTORY, next);
      return next;
    });

    if (dispatch.delivered) {
      showToast('Test notification sent.');
      return {
        ok: true,
        message: `Test notification sent for ${activeLocation.name} and logged in notification history.`,
      };
    }

    return {
      ok: false,
      message:
        dispatch.error ||
        'Browser did not display the notification (this can happen inside restricted preview iframes). The test entry was logged below.',
    };
  }, [activeLocation.id, activeLocation.name, airQuality, showToast]);

  const clearNotificationHistory = useCallback(() => {
    setNotificationHistory([]);
    writeStorage(STORAGE_KEYS.NOTIFICATION_HISTORY, []);
    showToast('Notification history cleared.');
  }, [showToast]);

  const toggleChallengeAction = useCallback((id: string) => {
    setWeeklyChallenge((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeStorage(STORAGE_KEYS.WEEKLY_CHALLENGE, next);
      return next;
    });
  }, []);

  const resetWeeklyChallenge = useCallback(() => {
    setWeeklyChallenge({});
    writeStorage(STORAGE_KEYS.WEEKLY_CHALLENGE, {});
    showToast('Weekly Clean Air Challenge progress cleared.');
  }, [showToast]);

  const contextValue = useMemo<AppContextValue>(
    () => ({
      viewMode,
      authInitialTab,
      authSession,
      openHome,
      openAuth,
      enterWorkspace,
      completeAuthSession,
      continueAsGuest,
      logoutSession,
      activeSection,
      setActiveSection,
      preferences,
      updatePreferences,
      resetPreferencesToDefault,
      clearAllData,
      activeLocation,
      selectLocation,
      airQuality,
      airQualityLoading,
      airQualityError,
      refreshAirQuality,
      assistantHistory,
      addAssistantMessage,
      clearAssistantHistory,
      planInputs,
      planItems,
      setPlanInputs,
      setPlanItems,
      regeneratePlan,
      savePlan,
      resetPlan,
      indoorChecklist,
      toggleIndoorChecklistItem,
      resetIndoorChecklist,
      impactRoutine,
      updateImpactRoutine,
      impactLogs,
      addImpactLog,
      resetImpactLogs,
      communityReports,
      addCommunityReport,
      updateCommunityReportStatus,
      alertThresholds,
      updateAlertThresholds,
      resetAlertThresholds,
      notificationSettings,
      notificationPermissionState,
      rawNotificationPermission,
      notificationHistory,
      notificationCapabilities,
      enableAirAlerts,
      disableAirAlerts,
      updateNotificationSettings,
      sendTestAirNotification,
      clearNotificationHistory,
      weeklyChallenge,
      toggleChallengeAction,
      resetWeeklyChallenge,
      toastMessage,
      showToast,
    }),
    [
      viewMode,
      authInitialTab,
      authSession,
      openHome,
      openAuth,
      enterWorkspace,
      completeAuthSession,
      continueAsGuest,
      logoutSession,
      activeSection,
      preferences,
      updatePreferences,
      resetPreferencesToDefault,
      clearAllData,
      activeLocation,
      selectLocation,
      airQuality,
      airQualityLoading,
      airQualityError,
      refreshAirQuality,
      assistantHistory,
      addAssistantMessage,
      clearAssistantHistory,
      planInputs,
      planItems,
      setPlanInputs,
      setPlanItems,
      regeneratePlan,
      savePlan,
      resetPlan,
      indoorChecklist,
      toggleIndoorChecklistItem,
      resetIndoorChecklist,
      impactRoutine,
      updateImpactRoutine,
      impactLogs,
      addImpactLog,
      resetImpactLogs,
      communityReports,
      addCommunityReport,
      updateCommunityReportStatus,
      alertThresholds,
      updateAlertThresholds,
      resetAlertThresholds,
      notificationSettings,
      notificationPermissionState,
      rawNotificationPermission,
      notificationHistory,
      notificationCapabilities,
      enableAirAlerts,
      disableAirAlerts,
      updateNotificationSettings,
      sendTestAirNotification,
      clearNotificationHistory,
      weeklyChallenge,
      toggleChallengeAction,
      resetWeeklyChallenge,
      toastMessage,
      showToast,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
