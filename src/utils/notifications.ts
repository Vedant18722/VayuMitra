import type {
  AirQualityPayload,
  AlertThresholds,
  NotificationHistoryEntry,
  NotificationKind,
  NotificationPermissionState,
  NotificationSettings,
  NotificationTrackerState,
} from '../types';
import { formatLocalModelTimestamp, getUsAqiCategory, isDataTimestampStale } from './aqi';
import { DEFAULT_NOTIFICATION_TRACKER } from './storage';

export const NOTIFICATION_ICON_URL = '/vayumitra-alert-icon.svg';

export type NotificationSkipReason =
  | 'notifications_disabled'
  | 'permission_not_granted'
  | 'unavailable_data'
  | 'demo_data'
  | 'cached_data'
  | 'stale_data'
  | 'below_threshold'
  | 'duplicate_condition'
  | 'cooldown_active'
  | 'improvement_disabled';

export interface NotificationEvaluationResult {
  shouldNotify: boolean;
  kind?: NotificationKind;
  skipReason?: NotificationSkipReason;
  entry?: Omit<NotificationHistoryEntry, 'deliveredViaBrowser'>;
  nextTracker: NotificationTrackerState;
}

export function getUsAqiSeverityRank(usAqi: number | null): number {
  if (usAqi === null || Number.isNaN(usAqi)) return -1;
  if (usAqi <= 50) return 0; // Good
  if (usAqi <= 100) return 1; // Moderate
  if (usAqi <= 150) return 2; // Unhealthy for Sensitive Groups
  if (usAqi <= 200) return 3; // Unhealthy
  if (usAqi <= 300) return 4; // Very Unhealthy
  return 5; // Hazardous
}

export function isBrowserNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof window.Notification === 'function'
  );
}

export function getRawBrowserPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    return window.Notification.permission;
  } catch {
    return 'unsupported';
  }
}

export function derivePermissionState(
  rawPermission: NotificationPermission | 'unsupported',
  userEnabled: boolean
): NotificationPermissionState {
  if (rawPermission === 'unsupported') return 'unsupported';
  if (rawPermission === 'denied') return 'blocked';
  if (rawPermission === 'granted' && userEnabled) return 'enabled';
  return 'disabled';
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    const result = await window.Notification.requestPermission();
    return result;
  } catch {
    return getRawBrowserPermission();
  }
}

interface CrossedIndicator {
  metric: string;
  reading: string;
  threshold: string;
}

function findCrossedIndicators(
  payload: AirQualityPayload,
  thresholds: AlertThresholds
): CrossedIndicator[] {
  const crossed: CrossedIndicator[] = [];
  const { usAqi, pm25, pm10, no2 } = payload.current;

  if (usAqi !== null && usAqi >= thresholds.usAqi) {
    crossed.push({
      metric: 'US EPA AQI',
      reading: `${Math.round(usAqi)} AQI`,
      threshold: `≥ ${thresholds.usAqi}`,
    });
  }
  if (pm25 !== null && pm25 >= thresholds.pm25) {
    crossed.push({
      metric: 'PM2.5',
      reading: `${pm25.toFixed(1)} µg/m³`,
      threshold: `≥ ${thresholds.pm25} µg/m³`,
    });
  }
  if (pm10 !== null && pm10 >= thresholds.pm10) {
    crossed.push({
      metric: 'PM10',
      reading: `${pm10.toFixed(1)} µg/m³`,
      threshold: `≥ ${thresholds.pm10} µg/m³`,
    });
  }
  if (no2 !== null && no2 >= thresholds.no2) {
    crossed.push({
      metric: 'NO₂',
      reading: `${no2.toFixed(1)} µg/m³`,
      threshold: `≥ ${thresholds.no2} µg/m³`,
    });
  }

  return crossed;
}

function buildReadingSummary(payload: AirQualityPayload): string {
  const parts: string[] = [];
  if (payload.current.usAqi !== null) parts.push(`US AQI ${Math.round(payload.current.usAqi)}`);
  if (payload.current.pm25 !== null) parts.push(`PM2.5 ${payload.current.pm25.toFixed(1)} µg/m³`);
  if (payload.current.pm10 !== null) parts.push(`PM10 ${payload.current.pm10.toFixed(1)} µg/m³`);
  if (payload.current.no2 !== null) parts.push(`NO₂ ${payload.current.no2.toFixed(1)} µg/m³`);
  return parts.join(' · ') || 'Readings unavailable';
}

export function evaluateSmartAirNotification(params: {
  payload: AirQualityPayload | null;
  thresholds: AlertThresholds;
  settings: NotificationSettings;
  rawPermission: NotificationPermission | 'unsupported';
  tracker: NotificationTrackerState;
  nowMs?: number;
}): NotificationEvaluationResult {
  const { payload, thresholds, settings, rawPermission, tracker } = params;
  const nowMs = params.nowMs ?? Date.now();

  if (!settings.enabled) {
    return { shouldNotify: false, skipReason: 'notifications_disabled', nextTracker: tracker };
  }

  if (rawPermission !== 'granted') {
    return { shouldNotify: false, skipReason: 'permission_not_granted', nextTracker: tracker };
  }

  if (!payload) {
    return { shouldNotify: false, skipReason: 'unavailable_data', nextTracker: tracker };
  }

  // Never treat DEMO or CACHED data as confirmed live readings
  if (payload.status === 'DEMO') {
    return { shouldNotify: false, skipReason: 'demo_data', nextTracker: tracker };
  }
  if (payload.status === 'CACHED') {
    return { shouldNotify: false, skipReason: 'cached_data', nextTracker: tracker };
  }

  // Never send notifications when data is stale (> 30 minutes old)
  const fetchedMs = Date.parse(payload.fetchedAt);
  const isStaleAtNow =
    payload.isStale ||
    Number.isNaN(fetchedMs) ||
    nowMs - fetchedMs > 30 * 60 * 1000 ||
    (params.nowMs === undefined && isDataTimestampStale(payload.fetchedAt, 30));

  if (isStaleAtNow) {
    return { shouldNotify: false, skipReason: 'stale_data', nextTracker: tracker };
  }

  const locationId = payload.location.id;
  const locationChanged = tracker.lastLocationId !== null && tracker.lastLocationId !== locationId;
  const effectiveTracker: NotificationTrackerState = locationChanged
    ? { ...DEFAULT_NOTIFICATION_TRACKER, lastLocationId: locationId }
    : { ...tracker, lastLocationId: locationId };

  const crossed = findCrossedIndicators(payload, thresholds);
  const isCrossed = crossed.length > 0;
  const usAqi = payload.current.usAqi;
  const aqiMeta = getUsAqiCategory(usAqi);
  const severityRank = getUsAqiSeverityRank(usAqi);
  const cooldownMs = Math.max(5, settings.cooldownMinutes) * 60 * 1000;
  const readingSummary = buildReadingSummary(payload);
  const modelTimeLabel = formatLocalModelTimestamp(
    payload.dataTimestamp,
    payload.location.timezone || payload.timezoneAbbreviation
  );
  const dataSource = 'Open-Meteo Model Forecast (CAMS)';

  // Case 1: Air quality crossed one or more configured thresholds
  if (isCrossed) {
    const conditionSignature = `${locationId}|${aqiMeta.level}|${crossed.map((c) => c.metric).join(',')}`;
    const wasCrossed = effectiveTracker.lastThresholdCrossed;
    const prevAlertRank = effectiveTracker.lastAlertSeverityRank ?? -1;
    const worsened = wasCrossed && severityRank > prevAlertRank;

    // Duplicate prevention: still crossed without worsening category
    if (wasCrossed && !worsened) {
      return {
        shouldNotify: false,
        skipReason: 'duplicate_condition',
        nextTracker: {
          ...effectiveTracker,
          lastEvaluatedSeverityRank: severityRank,
        },
      };
    }

    // Re-crossing within cooldown (not a worsening escalation from an active alert)
    if (
      !worsened &&
      effectiveTracker.lastAlertAtMs !== null &&
      nowMs - effectiveTracker.lastAlertAtMs < cooldownMs
    ) {
      return {
        shouldNotify: false,
        skipReason: 'cooldown_active',
        nextTracker: {
          ...effectiveTracker,
          lastThresholdCrossed: true,
          lastEvaluatedSeverityRank: severityRank,
        },
      };
    }

    const triggerSummary = crossed.map((c) => `${c.metric} ${c.reading}`).join(', ');
    const title = 'VayuMitra Air Alert';
    const body = `Air quality in ${payload.location.name} has reached ${aqiMeta.level} (${triggerSummary}). Consider reducing prolonged outdoor activity. [Forecast · ${modelTimeLabel}]`;

    const entry: Omit<NotificationHistoryEntry, 'deliveredViaBrowser'> = {
      id: `notif-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
      kind: 'alert',
      title,
      body,
      locationName: payload.location.name,
      triggeredBy: crossed.map((c) => `${c.metric} (${c.threshold})`).join(', '),
      readingSummary,
      category: aqiMeta.level,
      dataSource,
      dataTimestamp: modelTimeLabel,
      sentAt: new Date(nowMs).toISOString(),
    };

    return {
      shouldNotify: true,
      kind: 'alert',
      entry,
      nextTracker: {
        lastLocationId: locationId,
        lastAlertAtMs: nowMs,
        lastAlertSeverityRank: severityRank,
        lastConditionSignature: conditionSignature,
        lastThresholdCrossed: true,
        lastEvaluatedSeverityRank: severityRank,
      },
    };
  }

  // Case 2: Air quality improved back below all configured thresholds after an earlier alert
  if (effectiveTracker.lastThresholdCrossed) {
    const updatedTracker: NotificationTrackerState = {
      ...effectiveTracker,
      lastThresholdCrossed: false,
      lastEvaluatedSeverityRank: severityRank,
    };

    if (!settings.notifyOnImprovement) {
      return {
        shouldNotify: false,
        skipReason: 'improvement_disabled',
        nextTracker: updatedTracker,
      };
    }

    const title = 'VayuMitra Update';
    const body = `Air quality in ${payload.location.name} has improved to ${aqiMeta.level} (${readingSummary}). Check current conditions before planning outdoor activities. [Forecast · ${modelTimeLabel}]`;

    const entry: Omit<NotificationHistoryEntry, 'deliveredViaBrowser'> = {
      id: `notif-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
      kind: 'improvement',
      title,
      body,
      locationName: payload.location.name,
      triggeredBy: 'Returned below alert thresholds',
      readingSummary,
      category: aqiMeta.level,
      dataSource,
      dataTimestamp: modelTimeLabel,
      sentAt: new Date(nowMs).toISOString(),
    };

    return {
      shouldNotify: true,
      kind: 'improvement',
      entry,
      nextTracker: updatedTracker,
    };
  }

  // Case 3: Below threshold and previously below threshold
  return {
    shouldNotify: false,
    skipReason: 'below_threshold',
    nextTracker: {
      ...effectiveTracker,
      lastThresholdCrossed: false,
      lastEvaluatedSeverityRank: severityRank,
    },
  };
}

export function buildTestNotificationEntry(
  locationName: string,
  payload: AirQualityPayload | null
): Omit<NotificationHistoryEntry, 'deliveredViaBrowser'> {
  const now = new Date();
  const aqiMeta = getUsAqiCategory(payload?.current.usAqi ?? null);
  const readingSummary = payload ? buildReadingSummary(payload) : 'Live forecast loading';
  const modelTimeLabel = payload
    ? formatLocalModelTimestamp(
        payload.dataTimestamp,
        payload.location.timezone || payload.timezoneAbbreviation
      )
    : now.toLocaleTimeString();

  return {
    id: `notif-test-${now.getTime()}`,
    kind: 'test',
    title: 'VayuMitra Air Alert (Test)',
    body: `Browser notifications are active for ${locationName}. Latest displayed status: ${aqiMeta.level} (${readingSummary}).`,
    locationName,
    triggeredBy: 'Manual test notification',
    readingSummary,
    category: aqiMeta.level,
    dataSource: payload ? `${payload.status} · Open-Meteo Forecast (Test)` : 'Manual Test',
    dataTimestamp: modelTimeLabel,
    sentAt: now.toISOString(),
  };
}

export function dispatchBrowserNotification(params: {
  title: string;
  body: string;
  tag: string;
}): { delivered: boolean; error?: string } {
  if (!isBrowserNotificationSupported()) {
    return {
      delivered: false,
      error: 'This browser does not support desktop/web Notification API alerts.',
    };
  }
  if (getRawBrowserPermission() !== 'granted') {
    return {
      delivered: false,
      error: 'Browser notification permission is not granted.',
    };
  }

  try {
    const notification = new window.Notification(params.title, {
      body: params.body,
      icon: NOTIFICATION_ICON_URL,
      badge: NOTIFICATION_ICON_URL,
      tag: params.tag,
    });
    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore focus restrictions
      }
      notification.close();
    };
    return { delivered: true };
  } catch (err) {
    return {
      delivered: false,
      error:
        err instanceof Error
          ? err.message
          : 'Browser blocked notification creation in this browsing context.',
    };
  }
}
