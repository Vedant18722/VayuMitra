import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AirQualityPayload,
  AlertThresholds,
  LocationPreset,
  NotificationCapabilities,
  NotificationHistoryEntry,
  NotificationPermissionState,
  NotificationSettings,
  NotificationTrackerState,
} from '../types';
import { fetchNotificationCapabilities } from '../services/api';
import {
  buildTestNotificationEntry,
  derivePermissionState,
  dispatchBrowserNotification,
  evaluateSmartAirNotification,
  getRawBrowserPermission,
  requestBrowserNotificationPermission,
} from '../utils/notifications';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_NOTIFICATION_TRACKER,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from '../utils/storage';

interface UseSmartAirAlertsParams {
  activeLocation: LocationPreset;
  airQuality: AirQualityPayload | null;
  airQualityLoading: boolean;
  alertThresholds: AlertThresholds;
  loadAirQuality: (loc: LocationPreset, forceRefresh?: boolean) => Promise<AirQualityPayload | null>;
  showToast: (msg: string) => void;
}

const DEFAULT_CAPABILITIES: NotificationCapabilities = {
  pageActiveSupported: true,
  backgroundPushConfigured: false,
  backgroundPushStatus: 'NOT_CONFIGURED',
  vapidPublicKey: null,
  reason:
    'Background Web Push (VAPID keys, push subscription storage, and a background delivery service) is not configured in this environment. Page-active Browser Notifications work while VayuMitra is open.',
};

export function useSmartAirAlerts({
  activeLocation,
  airQuality,
  airQualityLoading,
  alertThresholds,
  loadAirQuality,
  showToast,
}: UseSmartAirAlertsParams) {
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

  const [notificationCapabilities, setNotificationCapabilities] =
    useState<NotificationCapabilities>(DEFAULT_CAPABILITIES);

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
  }, [
    activeLocation.id,
    airQuality,
    alertThresholds,
    notificationSettings,
    rawNotificationPermission,
    showToast,
  ]);

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

  const resetSmartAirAlerts = useCallback(() => {
    setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    setNotificationHistory([]);
    notificationTrackerRef.current = DEFAULT_NOTIFICATION_TRACKER;
    setNotificationTracker(DEFAULT_NOTIFICATION_TRACKER);
  }, []);

  return {
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
    resetSmartAirAlerts,
  };
}
