import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, RotateCcw, ShieldCheck } from 'lucide-react';
import type {
  AirQualityPayload,
  AlertThresholds,
  NotificationPermissionState,
  NavSection,
} from '../../../types';
import { evaluatePollutionAlerts } from '../../../utils/advancedIntelligence';
import { MoreInfo } from '../../ui/MoreInfo';

const THRESHOLD_SLIDERS: {
  key: keyof AlertThresholds;
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: 'usAqi', id: 'alert-aqi', label: 'US EPA AQI Threshold', unit: 'AQI', min: 50, max: 300, step: 5 },
  { key: 'pm25', id: 'alert-pm25', label: 'PM2.5 Threshold', unit: 'µg/m³', min: 15, max: 200, step: 5 },
  { key: 'pm10', id: 'alert-pm10', label: 'PM10 Threshold', unit: 'µg/m³', min: 45, max: 350, step: 5 },
  { key: 'no2', id: 'alert-no2', label: 'NO₂ Threshold', unit: 'µg/m³', min: 25, max: 200, step: 5 },
];

interface PollutionAlertsTabProps {
  locationName: string;
  airQuality: AirQualityPayload | null;
  alertThresholds: AlertThresholds;
  updateAlertThresholds: (patch: Partial<AlertThresholds>) => void;
  resetAlertThresholds: () => void;
  notificationPermissionState: NotificationPermissionState;
  onNavigate: (section: NavSection) => void;
}

export const PollutionAlertsTab: React.FC<PollutionAlertsTabProps> = ({
  locationName,
  airQuality,
  alertThresholds,
  updateAlertThresholds,
  resetAlertThresholds,
  notificationPermissionState,
  onNavigate,
}) => {
  const [simulateAlert, setSimulateAlert] = useState<boolean>(false);

  const alerts = useMemo(
    () => evaluatePollutionAlerts(airQuality, alertThresholds, simulateAlert),
    [airQuality, alertThresholds, simulateAlert]
  );

  return (
    <section
      id="intel-panel-alerts"
      role="tabpanel"
      aria-labelledby="intel-tab-alerts"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-page-enter"
    >
      {/* Threshold Config */}
      <div className="lg:col-span-5 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              2. Smart Pollution Alerts
            </h2>
            <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
              Set personal thresholds saved in this browser. Triggered alerts highlight immediately when readings exceed your limits.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAlertThresholds}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0] whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>

        <div className="space-y-4">
          {THRESHOLD_SLIDERS.map((slider) => (
            <div key={slider.key}>
              <div className="flex justify-between text-xs mb-1">
                <label
                  htmlFor={slider.id}
                  className="font-medium text-[#16211D] dark:text-[#EDF3F0]"
                >
                  {slider.label}
                </label>
                <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                  ≥ {alertThresholds[slider.key]} {slider.unit}
                </span>
              </div>
              <input
                id={slider.id}
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={alertThresholds[slider.key]}
                onChange={(e) =>
                  updateAlertThresholds({ [slider.key]: Number(e.target.value) })
                }
                className="w-full accent-[#1B4332] dark:accent-[#2DD4BF]"
              />
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-[#DCE5E0] dark:border-[#20302A] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
              Test how alerts look before a spike occurs:
            </span>
            <button
              type="button"
              onClick={() => setSimulateAlert((v) => !v)}
              aria-pressed={simulateAlert}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                simulateAlert
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-400 dark:border-amber-700'
                  : 'border-[#DCE5E0] dark:border-[#263832] text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#F3F6F4] dark:hover:bg-[#192622]'
              }`}
            >
              {simulateAlert ? 'Hide Simulated Alert' : 'Preview Simulated Alert'}
            </button>
          </div>

          <div className="p-3 rounded-md bg-[#F6F8F7] dark:bg-[#0F1815] border border-[#DCE5E0] dark:border-[#20302A] flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                Browser Notifications:{' '}
              </span>
              <span className="font-mono capitalize text-[#1B4332] dark:text-[#2DD4BF]">
                {notificationPermissionState}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4332] dark:text-[#2DD4BF] hover:underline whitespace-nowrap"
            >
              <span>Manage in Settings</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Alert Feed */}
      <div className="lg:col-span-7 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            Active In-App Alerts ({alerts.length})
          </h3>
          <span className="text-xs font-mono text-[#4E5E58] dark:text-[#9BB0A7]">
            Evaluating {locationName} ({airQuality?.status ?? 'UNAVAILABLE'})
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-5 rounded-md border border-emerald-300/80 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/25 flex items-start gap-3">
            <ShieldCheck
              className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-sm">
              <p className="font-medium text-emerald-900 dark:text-emerald-200">
                All monitored pollutants are below your configured thresholds
              </p>
              <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-300/90">
                Adjust any slider on the left or click &quot;Preview Simulated Alert&quot; to test alert display.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3" role="status" aria-live="polite">
            {alerts.map((al) => {
              const isSim = al.sourceKind === 'SIMULATED';
              const isHigh = al.severity === 'high' && !isSim;
              return (
                <article
                  key={al.id}
                  className={`p-4 rounded-md border space-y-1.5 ${
                    isSim
                      ? 'bg-amber-50/80 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800'
                      : isHigh
                        ? 'bg-red-50/80 dark:bg-red-950/30 border-red-300 dark:border-red-800'
                        : 'bg-orange-50/80 dark:bg-orange-950/25 border-orange-300 dark:border-orange-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 ${
                          isSim
                            ? 'text-amber-700 dark:text-amber-300'
                            : isHigh
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-orange-700 dark:text-orange-300'
                        }`}
                        aria-hidden="true"
                      />
                      <h4 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                        {al.metricLabel}
                      </h4>
                    </div>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                      {al.currentValue} {al.unit} (limit: {al.thresholdValue}) · {al.sourceKind}
                    </span>
                  </div>
                  <p className="text-xs text-[#4E5E58] dark:text-[#B5C6BE] leading-relaxed">
                    {al.advice}
                  </p>
                </article>
              );
            })}
          </div>
        )}

        <MoreInfo label="More Info: Alert Scope & Delivery">
          <p>
            Smart Pollution Alerts evaluate the currently loaded Open-Meteo atmospheric forecast (or labelled cache/demo data) directly inside VAYUMITRA while the page is open.
          </p>
          <p>
            Background push notifications, SMS, and email alerts are <strong>not</strong> configured in this local-first web application. Simulated preview alerts are always tagged <code className="font-mono">SIMULATED</code> and never mix with live readings.
          </p>
        </MoreInfo>
      </div>
    </section>
  );
};
