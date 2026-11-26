import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Clock,
  Info,
  RotateCcw,
  Send,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { NotificationPermissionState } from '../../types';
import { formatLocalModelTimestamp, formatReadableTimestamp, getUsAqiCategory } from '../../utils/aqi';
import { AqiStatusIcon } from '../ui/AqiStatusIcon';

const PERMISSION_STATE_META: Record<
  NotificationPermissionState,
  {
    label: string;
    detail: string;
    surfaceClass: string;
    borderClass: string;
    textClass: string;
    dotColor: string;
  }
> = {
  enabled: {
    label: 'Enabled',
    detail: 'Page-active browser alerts are active for your selected location.',
    surfaceClass: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-300/80 dark:border-emerald-800/70',
    textClass: 'text-emerald-900 dark:text-emerald-200',
    dotColor: '#15803D',
  },
  disabled: {
    label: 'Disabled',
    detail: 'Alerts are currently off. Click "Enable Air Quality Alerts" to turn them on.',
    surfaceClass: 'bg-[#F6F8F7] dark:bg-[#0F1815]',
    borderClass: 'border-[#DCE5E0] dark:border-[#263832]',
    textClass: 'text-[#31403A] dark:text-[#C4D3CC]',
    dotColor: '#64748B',
  },
  blocked: {
    label: 'Blocked',
    detail: 'Browser permission is denied for this site. Re-enable notifications in your browser site settings.',
    surfaceClass: 'bg-red-50/80 dark:bg-red-950/30',
    borderClass: 'border-red-300/80 dark:border-red-800/70',
    textClass: 'text-red-900 dark:text-red-200',
    dotColor: '#B91C1C',
  },
  unsupported: {
    label: 'Unsupported',
    detail: 'This browser or viewing environment does not expose the Web Notification API.',
    surfaceClass: 'bg-amber-50/80 dark:bg-amber-950/25',
    borderClass: 'border-amber-300/80 dark:border-amber-800/70',
    textClass: 'text-amber-900 dark:text-amber-200',
    dotColor: '#B45309',
  },
};

const COOLDOWN_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes (Recommended)' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
];

const POLL_OPTIONS = [
  { value: 10, label: 'Every 10 minutes' },
  { value: 15, label: 'Every 15 minutes (Recommended)' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every 60 minutes' },
];

export const SmartAirAlertsCard: React.FC = () => {
  const {
    activeLocation,
    airQuality,
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
  } = useApp();

  const [requesting, setRequesting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  const permMeta = PERMISSION_STATE_META[notificationPermissionState];
  const aqiMeta = getUsAqiCategory(airQuality?.current.usAqi ?? null);

  const handleEnableClick = async () => {
    setRequesting(true);
    setFeedback(null);
    try {
      const res = await enableAirAlerts();
      setFeedback({
        tone: res.ok ? 'success' : res.state === 'blocked' || res.state === 'unsupported' ? 'error' : 'info',
        text: res.message,
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleDisableClick = () => {
    disableAirAlerts();
    setFeedback({
      tone: 'info',
      text: 'Air quality browser alerts have been turned off. You can re-enable them anytime.',
    });
  };

  const handleTestClick = () => {
    const res = sendTestAirNotification();
    setFeedback({
      tone: res.ok ? 'success' : 'error',
      text: res.message,
    });
  };

  return (
    <section
      id="smart-air-alerts"
      aria-label="VayuMitra Smart Air Alerts"
      className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-6"
    >
      {/* Header & Primary Enable / Disable Controls */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-[#DCE5E0] dark:border-[#20302A]">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="w-10 h-10 rounded-md bg-[#E6EFEA] dark:bg-[#1A2B24] text-[#1B4332] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 mt-0.5">
            {notificationPermissionState === 'enabled' ? (
              <BellRing className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Bell className="w-5 h-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                VayuMitra Smart Air Alerts
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-medium ${permMeta.surfaceClass} ${permMeta.borderClass} ${permMeta.textClass}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: permMeta.dotColor }}
                  aria-hidden="true"
                />
                <span>{permMeta.label}</span>
              </span>
            </div>
            <p className="mt-1.5 text-sm text-[#4E5E58] dark:text-[#9BB0A7] leading-relaxed">
              Receive timely browser alerts when modelled air quality in{' '}
              <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                {activeLocation.name}
              </strong>{' '}
              crosses your unhealthy thresholds—or improves back below them—so your family can adjust outdoor routines, commute protection, and window ventilation early.
            </p>
            <p className="mt-1 text-xs text-[#5E7069] dark:text-[#869B92]">
              {permMeta.detail}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {notificationPermissionState === 'enabled' ? (
            <button
              type="button"
              onClick={handleDisableClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] transition-colors min-h-[42px] whitespace-nowrap"
            >
              <BellOff className="w-4 h-4" aria-hidden="true" />
              <span>Disable Alerts</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnableClick}
              disabled={requesting || notificationPermissionState === 'unsupported'}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] disabled:opacity-55 text-white text-sm font-medium transition-colors min-h-[42px] whitespace-nowrap"
            >
              <BellRing className="w-4 h-4" aria-hidden="true" />
              <span>{requesting ? 'Requesting Permission…' : 'Enable Air Quality Alerts'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleTestClick}
            disabled={rawNotificationPermission !== 'granted'}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] disabled:opacity-50 transition-colors min-h-[42px] whitespace-nowrap"
            title={
              rawNotificationPermission !== 'granted'
                ? 'Enable browser notification permission first to send a test alert'
                : 'Send a sample browser notification'
            }
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>Send Test Notification</span>
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          className={`animate-toast-enter p-3.5 rounded-md border text-xs sm:text-sm flex items-start gap-2.5 ${
            feedback.tone === 'success'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
              : feedback.tone === 'error'
                ? 'bg-red-50/80 dark:bg-red-950/30 border-red-300/80 dark:border-red-800/70 text-red-900 dark:text-red-200'
                : 'bg-[#F6F8F7] dark:bg-[#0F1815] border-[#DCE5E0] dark:border-[#263832] text-[#31403A] dark:text-[#C4D3CC]'
          }`}
        >
          {feedback.tone === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          ) : feedback.tone === 'error' ? (
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Monitored Reading Summary with Subtle AQI Category Tint */}
      <div
        className={`p-4 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300 ${aqiMeta.gradientClass} ${aqiMeta.borderClass}`}
      >
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7]">
            Currently Monitored Location &amp; Standard
          </p>
          <p className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0] flex flex-wrap items-center gap-2">
            <span>
              {activeLocation.name}
              {activeLocation.region ? `, ${activeLocation.region}` : ''} · US EPA AQI (0–500)
            </span>
          </p>
          <p className="text-xs text-[#31403A] dark:text-[#C4D3CC] flex flex-wrap items-center gap-1.5">
            {airQuality ? (
              <>
                <span className={`inline-flex items-center gap-1 font-semibold ${aqiMeta.colorClass}`}>
                  <AqiStatusIcon kind={aqiMeta.iconKind} className="w-3.5 h-3.5 shrink-0" />
                  <span>{aqiMeta.level}</span>
                </span>
                <span>
                  (US AQI {airQuality.current.usAqi ?? '—'}, PM2.5 {airQuality.current.pm25?.toFixed(1) ?? '—'} µg/m³) ·{' '}
                  {airQuality.status === 'FORECAST'
                    ? `Open-Meteo Model Forecast · ${formatLocalModelTimestamp(
                        airQuality.dataTimestamp,
                        airQuality.location.timezone || airQuality.timezoneAbbreviation
                      )}`
                    : `${airQuality.status} data (alerts paused until fresh live forecast is available)`}
                </span>
              </>
            ) : (
              'Waiting for live Open-Meteo model forecast… Alerts only fire on fresh live forecast data.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={resetAlertThresholds}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-white dark:bg-[#131E1A] text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0] self-start sm:self-center whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Thresholds</span>
        </button>
      </div>

      {/* Configurable Thresholds & Duplicate Prevention Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            Alert Thresholds (Synced with Smart Alerts)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-md border border-[#DCE5E0] dark:border-[#20302A] bg-[#FAFBF9] dark:bg-[#0F1815]">
              <div className="flex justify-between text-xs mb-1.5">
                <label htmlFor="notif-thresh-aqi" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                  US EPA AQI
                </label>
                <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                  ≥ {alertThresholds.usAqi} AQI
                </span>
              </div>
              <input
                id="notif-thresh-aqi"
                type="range"
                min={50}
                max={300}
                step={5}
                value={alertThresholds.usAqi}
                onChange={(e) => updateAlertThresholds({ usAqi: Number(e.target.value) })}
                className="w-full accent-[#1B4332] dark:accent-[#2DD4BF]"
              />
            </div>

            <div className="p-3.5 rounded-md border border-[#DCE5E0] dark:border-[#20302A] bg-[#FAFBF9] dark:bg-[#0F1815]">
              <div className="flex justify-between text-xs mb-1.5">
                <label htmlFor="notif-thresh-pm25" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                  PM2.5
                </label>
                <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                  ≥ {alertThresholds.pm25} µg/m³
                </span>
              </div>
              <input
                id="notif-thresh-pm25"
                type="range"
                min={15}
                max={200}
                step={5}
                value={alertThresholds.pm25}
                onChange={(e) => updateAlertThresholds({ pm25: Number(e.target.value) })}
                className="w-full accent-[#1B4332] dark:accent-[#2DD4BF]"
              />
            </div>

            <div className="p-3.5 rounded-md border border-[#DCE5E0] dark:border-[#20302A] bg-[#FAFBF9] dark:bg-[#0F1815]">
              <div className="flex justify-between text-xs mb-1.5">
                <label htmlFor="notif-thresh-pm10" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                  PM10
                </label>
                <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                  ≥ {alertThresholds.pm10} µg/m³
                </span>
              </div>
              <input
                id="notif-thresh-pm10"
                type="range"
                min={45}
                max={350}
                step={5}
                value={alertThresholds.pm10}
                onChange={(e) => updateAlertThresholds({ pm10: Number(e.target.value) })}
                className="w-full accent-[#1B4332] dark:accent-[#2DD4BF]"
              />
            </div>

            <div className="p-3.5 rounded-md border border-[#DCE5E0] dark:border-[#20302A] bg-[#FAFBF9] dark:bg-[#0F1815]">
              <div className="flex justify-between text-xs mb-1.5">
                <label htmlFor="notif-thresh-no2" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                  NO₂
                </label>
                <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                  ≥ {alertThresholds.no2} µg/m³
                </span>
              </div>
              <input
                id="notif-thresh-no2"
                type="range"
                min={25}
                max={200}
                step={5}
                value={alertThresholds.no2}
                onChange={(e) => updateAlertThresholds({ no2: Number(e.target.value) })}
                className="w-full accent-[#1B4332] dark:accent-[#2DD4BF]"
              />
            </div>
          </div>
        </div>

        {/* Cooldown, Polling & Improvement Preferences */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            Frequency &amp; Duplicate Protection
          </h3>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="notif-cooldown"
                className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
              >
                Repeat Alert Cooldown
              </label>
              <select
                id="notif-cooldown"
                value={notificationSettings.cooldownMinutes}
                onChange={(e) =>
                  updateNotificationSettings({ cooldownMinutes: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              >
                {COOLDOWN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#5E7069] dark:text-[#869B92]">
                Same condition will not re-alert repeatedly. Escalates immediately if AQI category worsens.
              </p>
            </div>

            <div>
              <label
                htmlFor="notif-poll"
                className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
              >
                Page-Active Check Interval
              </label>
              <select
                id="notif-poll"
                value={notificationSettings.pollIntervalMinutes}
                onChange={(e) =>
                  updateNotificationSettings({ pollIntervalMinutes: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              >
                {POLL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#5E7069] dark:text-[#869B92]">
                Checks only while this tab is visible to avoid unnecessary API calls.
              </p>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-md border border-[#DCE5E0] dark:border-[#20302A] bg-[#FAFBF9] dark:bg-[#0F1815] cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.notifyOnImprovement}
                onChange={(e) =>
                  updateNotificationSettings({ notifyOnImprovement: e.target.checked })
                }
                className="mt-0.5 rounded accent-[#1B4332] dark:accent-[#2DD4BF]"
              />
              <span className="text-xs text-[#31403A] dark:text-[#C4D3CC] leading-relaxed">
                <strong className="block font-medium text-[#16211D] dark:text-[#EDF3F0]">
                  Notify when air quality improves
                </strong>
                Send a VayuMitra Update when monitored readings return below all configured thresholds.
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Capability Transparency: Level A vs Level B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#DCE5E0] dark:border-[#20302A]">
        <div className="p-4 rounded-md border border-[#DCE5E0] dark:border-[#20302A] bg-[#FAFBF9] dark:bg-[#0F1815] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4E5E58] dark:text-[#9BB0A7]">
              Level A · Page-Active Alerts
            </h3>
            <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300">
              {notificationPermissionState === 'unsupported' ? 'UNSUPPORTED' : 'AVAILABLE'}
            </span>
          </div>
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] leading-relaxed">
            Uses the browser Notification API while VayuMitra is open. Evaluates fresh Open-Meteo model forecasts only—never fires on stale, cached, or demo fallback data.
          </p>
        </div>

        <div className="p-4 rounded-md border border-[#DCE5E0] dark:border-[#20302A] bg-[#FAFBF9] dark:bg-[#0F1815] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4E5E58] dark:text-[#9BB0A7]">
              Level B · Background Push (Closed Tab)
            </h3>
            <span className="text-xs font-mono font-semibold text-amber-800 dark:text-amber-300">
              {notificationCapabilities.backgroundPushStatus === 'CONFIGURED'
                ? 'CONFIGURED'
                : 'NOT CONFIGURED'}
            </span>
          </div>
          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] leading-relaxed">
            {notificationCapabilities.reason}
          </p>
        </div>
      </div>

      {/* Notification History */}
      <div className="pt-2 border-t border-[#DCE5E0] dark:border-[#20302A] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4E5E58] dark:text-[#9BB0A7]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              Notification History ({notificationHistory.length})
            </h3>
          </div>
          {notificationHistory.length > 0 && (
            <button
              type="button"
              onClick={clearNotificationHistory}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-red-700 dark:hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {notificationHistory.length === 0 ? (
          <p className="text-xs text-[#5E7069] dark:text-[#869B92] py-3">
            No notifications recorded on this device yet. Enable Air Quality Alerts and click &quot;Send Test Notification&quot; to verify delivery.
          </p>
        ) : (
          <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {notificationHistory.map((item) => {
              const isAlert = item.kind === 'alert';
              const isImprovement = item.kind === 'improvement';
              return (
                <li
                  key={item.id}
                  className={`p-3.5 rounded-md border text-xs space-y-1.5 ${
                    isAlert
                      ? 'bg-orange-50/70 dark:bg-orange-950/20 border-orange-300/80 dark:border-orange-800/70'
                      : isImprovement
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/70'
                        : 'bg-[#F6F8F7] dark:bg-[#0F1815] border-[#DCE5E0] dark:border-[#20302A]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                      {isAlert ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-700 dark:text-orange-300 shrink-0" aria-hidden="true" />
                      ) : isImprovement ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
                      ) : (
                        <Bell className="w-3.5 h-3.5 text-[#1B4332] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
                      )}
                      <span>{item.title}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#5E7069] dark:text-[#869B92]">
                      {formatReadableTimestamp(item.sentAt)}
                    </span>
                  </div>

                  <p className="text-[#31403A] dark:text-[#C4D3CC] leading-relaxed">
                    {item.body}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#5E7069] dark:text-[#869B92] pt-1">
                    <span>
                      <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">Location:</strong>{' '}
                      {item.locationName}
                    </span>
                    <span>
                      <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">Trigger:</strong>{' '}
                      {item.triggeredBy}
                    </span>
                    <span>
                      <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">Category:</strong>{' '}
                      {item.category}
                    </span>
                    <span>
                      <strong className="font-medium text-[#16211D] dark:text-[#EDF3F0]">Source:</strong>{' '}
                      {item.dataSource} ({item.dataTimestamp})
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
