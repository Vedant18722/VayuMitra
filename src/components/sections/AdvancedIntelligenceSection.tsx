import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Compass,
  Home,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AirQualityPayload, LocationPreset } from '../../types';
import { fetchAirQuality } from '../../services/api';
import {
  buildOutdoorActivityAdvice,
  calculatePersonalExposureScore,
  evaluatePollutionAlerts,
  INDOOR_ASSISTANT_TOPICS,
  WEEKLY_CHALLENGE_ACTIONS,
  type ActivityIntensity,
  type IndoorProtection,
  type MaskType,
} from '../../utils/advancedIntelligence';
import { formatReadableTimestamp, getUsAqiCategory } from '../../utils/aqi';
import { INDOOR_CHECKLIST_ITEMS } from '../../data/indoorGuideData';
import { INDIAN_METRO_PRESETS } from '../../utils/storage';
import { AmbientSoundControl } from '../ui/AmbientSoundControl';
import { AqiStatusIcon } from '../ui/AqiStatusIcon';
import { MoreInfo } from '../ui/MoreInfo';

type IntelligenceTab = 'exposure' | 'alerts' | 'advisor' | 'indoor' | 'hotspots' | 'challenge';

const TABS: { id: IntelligenceTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'exposure', label: 'Personal Exposure', icon: Activity },
  { id: 'alerts', label: 'Smart Alerts', icon: Bell },
  { id: 'advisor', label: 'Activity Advisor', icon: Compass },
  { id: 'indoor', label: 'Indoor Assistant', icon: Home },
  { id: 'hotspots', label: 'Hotspot Explorer', icon: MapPin },
  { id: 'challenge', label: 'Clean Air Challenge', icon: Trophy },
];

const EXPOSURE_BAND_STYLES: Record<
  'Low' | 'Moderate' | 'Elevated' | 'High' | 'Very High',
  { surface: string; border: string; text: string; bar: string }
> = {
  Low: {
    surface: 'bg-emerald-50/75 dark:bg-emerald-950/30',
    border: 'border-emerald-300/80 dark:border-emerald-800/70',
    text: 'text-emerald-800 dark:text-emerald-300',
    bar: 'bg-emerald-700 dark:bg-emerald-400',
  },
  Moderate: {
    surface: 'bg-yellow-50/80 dark:bg-yellow-950/25',
    border: 'border-yellow-300/85 dark:border-yellow-800/70',
    text: 'text-amber-900 dark:text-yellow-300',
    bar: 'bg-yellow-600 dark:bg-yellow-400',
  },
  Elevated: {
    surface: 'bg-orange-50/80 dark:bg-orange-950/25',
    border: 'border-orange-300/85 dark:border-orange-800/70',
    text: 'text-orange-900 dark:text-orange-300',
    bar: 'bg-orange-600 dark:bg-orange-400',
  },
  High: {
    surface: 'bg-red-50/80 dark:bg-red-950/30',
    border: 'border-red-300/85 dark:border-red-800/75',
    text: 'text-red-800 dark:text-red-300',
    bar: 'bg-red-600 dark:bg-red-400',
  },
  'Very High': {
    surface: 'bg-purple-50/80 dark:bg-purple-950/30',
    border: 'border-purple-300/85 dark:border-purple-800/75',
    text: 'text-purple-900 dark:text-purple-300',
    bar: 'bg-purple-700 dark:bg-purple-400',
  },
};

function projectIndiaCoords(lat: number, lon: number): { x: number; y: number; inBounds: boolean } {
  const minLat = 6;
  const maxLat = 36;
  const minLon = 67;
  const maxLon = 98;
  const inBounds = lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
  const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
  const clampedLon = Math.max(minLon, Math.min(maxLon, lon));
  const x = 32 + ((clampedLon - minLon) / (maxLon - minLon)) * 276;
  const y = 26 + ((maxLat - clampedLat) / (maxLat - minLat)) * 228;
  return { x, y, inBounds };
}

export const AdvancedIntelligenceSection: React.FC = () => {
  const {
    activeLocation,
    selectLocation,
    airQuality,
    preferences,
    alertThresholds,
    updateAlertThresholds,
    resetAlertThresholds,
    notificationPermissionState,
    indoorChecklist,
    toggleIndoorChecklistItem,
    communityReports,
    weeklyChallenge,
    toggleChallengeAction,
    resetWeeklyChallenge,
    setActiveSection,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<IntelligenceTab>('exposure');

  // 1. Personal Exposure Score state
  const [outdoorHours, setOutdoorHours] = useState<number>(2);
  const [intensity, setIntensity] = useState<ActivityIntensity>('commute');
  const [mask, setMask] = useState<MaskType>('none');
  const [indoorProtection, setIndoorProtection] = useState<IndoorProtection>('closed_windows');

  // 2. Smart Alerts state
  const [simulateAlert, setSimulateAlert] = useState<boolean>(false);

  // 4. Indoor Assistant topic state
  const [selectedIndoorTopicId, setSelectedIndoorTopicId] = useState<string>(
    INDOOR_ASSISTANT_TOPICS[0].id
  );

  // 5. Hotspot Explorer state (on-demand real Open-Meteo metro comparison)
  const [metroForecasts, setMetroForecasts] = useState<Record<string, AirQualityPayload>>({});
  const [loadingMetros, setLoadingMetros] = useState(false);
  const [metroError, setMetroError] = useState<string | null>(null);

  const exposure = useMemo(
    () =>
      calculatePersonalExposureScore(
        { outdoorHours, intensity, mask, indoorProtection },
        airQuality
      ),
    [airQuality, indoorProtection, intensity, mask, outdoorHours]
  );

  const alerts = useMemo(
    () => evaluatePollutionAlerts(airQuality, alertThresholds, simulateAlert),
    [airQuality, alertThresholds, simulateAlert]
  );

  const activityAdvice = useMemo(
    () => buildOutdoorActivityAdvice(airQuality, preferences),
    [airQuality, preferences]
  );

  const selectedIndoorTopic =
    INDOOR_ASSISTANT_TOPICS.find((t) => t.id === selectedIndoorTopicId) ??
    INDOOR_ASSISTANT_TOPICS[0];

  const priorityIndoorItems = useMemo(() => INDOOR_CHECKLIST_ITEMS.slice(0, 6), []);
  const indoorCompletedCount = useMemo(
    () => INDOOR_CHECKLIST_ITEMS.filter((item) => Boolean(indoorChecklist[item.id])).length,
    [indoorChecklist]
  );

  const challengeCompletedCount = useMemo(
    () => WEEKLY_CHALLENGE_ACTIONS.filter((a) => Boolean(weeklyChallenge[a.id])).length,
    [weeklyChallenge]
  );
  const challengePct = Math.round(
    (challengeCompletedCount / WEEKLY_CHALLENGE_ACTIONS.length) * 100
  );
  const challengeCo2Saved = useMemo(
    () =>
      WEEKLY_CHALLENGE_ACTIONS.reduce(
        (sum, a) => sum + (weeklyChallenge[a.id] ? a.estimatedCo2SavedKg : 0),
        0
      ),
    [weeklyChallenge]
  );

  const handleLoadMetroComparison = async () => {
    setLoadingMetros(true);
    setMetroError(null);
    try {
      const results = await Promise.allSettled(
        INDIAN_METRO_PRESETS.map((city) => fetchAirQuality(city, false))
      );
      const nextMap: Record<string, AirQualityPayload> = {};
      let okCount = 0;
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          nextMap[INDIAN_METRO_PRESETS[idx].id] = res.value;
          okCount += 1;
        }
      });
      setMetroForecasts(nextMap);
      if (okCount === 0) {
        setMetroError('Unable to reach Open-Meteo for metro comparison right now.');
      } else {
        showToast(`Loaded modelled forecasts for ${okCount} Indian metros.`);
      }
    } catch {
      setMetroError('Metro comparison request failed.');
    } finally {
      setLoadingMetros(false);
    }
  };

  const handleSelectHotspotCity = async (loc: LocationPreset) => {
    await selectLocation({ ...loc, locationSource: 'preset' });
    showToast(`Switched active city to ${loc.name}.`);
  };

  const aqiMeta = getUsAqiCategory(airQuality?.current.usAqi ?? null);
  const bandStyle = EXPOSURE_BAND_STYLES[exposure.band];

  // Combine active location + metro presets for the SVG explorer
  const hotspotCities = useMemo(() => {
    const list: { loc: LocationPreset; payload?: AirQualityPayload; isActive: boolean }[] =
      INDIAN_METRO_PRESETS.map((city) => ({
        loc: city,
        payload:
          activeLocation.id === city.id
            ? airQuality ?? metroForecasts[city.id]
            : metroForecasts[city.id],
        isActive: activeLocation.id === city.id,
      }));
    if (!INDIAN_METRO_PRESETS.some((c) => c.id === activeLocation.id)) {
      list.unshift({
        loc: activeLocation,
        payload: airQuality ?? undefined,
        isActive: true,
      });
    }
    return list;
  }, [activeLocation, airQuality, metroForecasts]);

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
            Advanced Air Intelligence
          </h1>
          <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            Six interactive tools tailored to{' '}
            <span className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
              {activeLocation.name}
              {activeLocation.region ? `, ${activeLocation.region}` : ''}
            </span>{' '}
            <span className="font-mono text-xs tabular-nums">
              ({activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)})
            </span>{' '}
            for personal exposure, alerts, activity timing, indoor protection, regional layers, and weekly clean-air habits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <AmbientSoundControl compact />
          <div
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-mono tabular-nums transition-all duration-300 ${aqiMeta.gradientClass} ${aqiMeta.borderClass}`}
          >
            <AqiStatusIcon kind={aqiMeta.iconKind} className={`w-3.5 h-3.5 shrink-0 ${aqiMeta.colorClass}`} />
            <span className="font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              US AQI {airQuality?.current.usAqi !== null && airQuality?.current.usAqi !== undefined ? Math.round(airQuality.current.usAqi) : '—'}
            </span>
            <span className={`font-sans font-medium ${aqiMeta.colorClass}`}>{aqiMeta.level}</span>
          </div>
        </div>
      </div>

      {/* 6-Feature Accessible Tab Bar */}
      <div
        role="tablist"
        aria-label="Advanced Air Intelligence features"
        className="flex flex-wrap gap-1.5 p-1.5 rounded-lg bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A]"
      >
        {TABS.map((tab, idx) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`intel-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`intel-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => {
                let nextIdx: number | null = null;
                if (e.key === 'ArrowRight') nextIdx = (idx + 1) % TABS.length;
                else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + TABS.length) % TABS.length;
                else if (e.key === 'Home') nextIdx = 0;
                else if (e.key === 'End') nextIdx = TABS.length - 1;
                if (nextIdx !== null) {
                  e.preventDefault();
                  const nextId = TABS[nextIdx].id;
                  setActiveTab(nextId);
                  document.getElementById(`intel-tab-${nextId}`)?.focus();
                }
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors active:scale-[0.98] min-h-[40px] whitespace-nowrap ${
                selected
                  ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white'
                  : 'text-[#4E5E58] dark:text-[#9BB0A7] hover:bg-[#F1F5F3] dark:hover:bg-[#1A2924] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PERSONAL EXPOSURE SCORE */}
      {activeTab === 'exposure' && (
        <section
          id="intel-panel-exposure"
          role="tabpanel"
          aria-labelledby="intel-tab-exposure"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-page-enter"
        >
          {/* Inputs */}
          <div className="lg:col-span-5 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                1. Personal Exposure Score
              </h2>
              <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                Estimate your relative daily particulate intake using {activeLocation.name}&apos;s current PM2.5 reading and your daily routine.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="exp-hours" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                    Time Spent Outdoors Today
                  </label>
                  <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                    {outdoorHours} {outdoorHours === 1 ? 'hour' : 'hours'}
                  </span>
                </div>
                <input
                  id="exp-hours"
                  type="range"
                  min={0}
                  max={12}
                  step={0.5}
                  value={outdoorHours}
                  onChange={(e) => setOutdoorHours(Number(e.target.value))}
                  className="w-full accent-[#1B4332] dark:accent-[#2DD4BF]"
                />
              </div>

              <div>
                <label htmlFor="exp-intensity" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Outdoor Activity Intensity
                </label>
                <select
                  id="exp-intensity"
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value as ActivityIntensity)}
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
                >
                  <option value="rest">Resting / Sedentary (1.0×)</option>
                  <option value="commute">Active Commute / Roadside (1.3×)</option>
                  <option value="light_walk">Light Walking / Errands (1.45×)</option>
                  <option value="vigorous">Vigorous Outdoor Exercise (2.3×)</option>
                </select>
              </div>

              <div>
                <label htmlFor="exp-mask" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Outdoor Mask Protection
                </label>
                <select
                  id="exp-mask"
                  value={mask}
                  onChange={(e) => setMask(e.target.value as MaskType)}
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
                >
                  <option value="none">No Mask</option>
                  <option value="cloth_surgical">Cloth / Loose Surgical Mask</option>
                  <option value="n95_ffp2">Well-Fitted N95 / FFP2 Respirator</option>
                </select>
              </div>

              <div>
                <label htmlFor="exp-indoor" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Indoor Air Protection ({24 - outdoorHours} hrs)
                </label>
                <select
                  id="exp-indoor"
                  value={indoorProtection}
                  onChange={(e) => setIndoorProtection(e.target.value as IndoorProtection)}
                  className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
                >
                  <option value="open_windows">Windows Frequently Open</option>
                  <option value="closed_windows">Windows Kept Closed</option>
                  <option value="hepa_purifier">Closed Room + True HEPA Purifier</option>
                </select>
              </div>
            </div>
          </div>

          {/* Result & Factor Breakdown */}
          <div className="lg:col-span-7 space-y-4">
            <div className={`rounded-lg border p-6 transition-colors ${bandStyle.surface} ${bandStyle.border}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7]">
                    Informational Daily Exposure Indicator (0–100)
                  </p>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="font-mono text-5xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                      {exposure.estimatedEffectivePm25 !== null ? exposure.score : '—'}
                    </span>
                    <span className={`text-lg font-semibold ${bandStyle.text}`}>
                      {exposure.band} Exposure
                    </span>
                  </div>
                </div>
                {exposure.estimatedEffectivePm25 !== null && (
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Est. 24-hr Effective PM2.5</p>
                    <p className="font-mono text-xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                      {exposure.estimatedEffectivePm25.toFixed(1)} µg/m³
                    </p>
                  </div>
                )}
              </div>

              <div
                className="mt-4 h-2.5 w-full rounded-sm bg-black/10 dark:bg-white/10 overflow-hidden"
                role="progressbar"
                aria-valuenow={exposure.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Personal exposure index score"
              >
                <div
                  className={`h-full transition-all duration-300 ${bandStyle.bar}`}
                  style={{ width: `${exposure.score}%` }}
                />
              </div>

              <p className="mt-3 text-xs font-mono text-[#4E5E58] dark:text-[#9BB0A7]">
                Basis: {exposure.dataBasis}
              </p>
            </div>

            <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                Contributing Factor Breakdown
              </h3>
              <ul className="divide-y divide-[#DCE5E0] dark:divide-[#20302A] text-sm">
                {exposure.factors.map((f) => (
                  <li key={f.label} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div>
                      <p className="font-medium text-[#16211D] dark:text-[#EDF3F0]">{f.label}</p>
                      <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">{f.detail}</p>
                    </div>
                    <span className="font-mono text-xs text-[#1B4332] dark:text-[#2DD4BF] shrink-0">
                      {f.impact}
                    </span>
                  </li>
                ))}
              </ul>

              <MoreInfo label="More Info: Exposure Formula & Non-Medical Notice">
                <p>
                  <strong className="text-[#16211D] dark:text-[#EDF3F0]">Formula:</strong>{' '}
                  <code className="font-mono">
                    Effective 24h PM2.5 = ((OutdoorHours × AmbientPM2.5 × BreathingMultiplier × MaskFactor) + (IndoorHours × AmbientPM2.5 × IndoorInfiltration)) / 24
                  </code>
                  , normalized against a 0–135 µg/m³ range (WHO 24-hour guideline is 15 µg/m³).
                </p>
                <p>
                  <strong className="text-[#16211D] dark:text-[#EDF3F0]">Not a medical metric:</strong>{' '}
                  This is an educational exposure comparison tool based on modelled outdoor readings and average infiltration/fit assumptions. It does not diagnose health risk or replace clinical advice.
                </p>
              </MoreInfo>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: SMART POLLUTION ALERTS */}
      {activeTab === 'alerts' && (
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
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="alert-aqi" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                    US EPA AQI Threshold
                  </label>
                  <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                    ≥ {alertThresholds.usAqi} AQI
                  </span>
                </div>
                <input
                  id="alert-aqi"
                  type="range"
                  min={50}
                  max={300}
                  step={5}
                  value={alertThresholds.usAqi}
                  onChange={(e) => updateAlertThresholds({ usAqi: Number(e.target.value) })}
                  className="w-full accent-[#1B4332] dark:accent-[#2DD4BF]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="alert-pm25" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                    PM2.5 Threshold
                  </label>
                  <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                    ≥ {alertThresholds.pm25} µg/m³
                  </span>
                </div>
                <input
                  id="alert-pm25"
                  type="range"
                  min={15}
                  max={200}
                  step={5}
                  value={alertThresholds.pm25}
                  onChange={(e) => updateAlertThresholds({ pm25: Number(e.target.value) })}
                  className="w-full accent-[#1B4332] dark:accent-[#2DD4BF]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="alert-pm10" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                    PM10 Threshold
                  </label>
                  <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                    ≥ {alertThresholds.pm10} µg/m³
                  </span>
                </div>
                <input
                  id="alert-pm10"
                  type="range"
                  min={45}
                  max={350}
                  step={5}
                  value={alertThresholds.pm10}
                  onChange={(e) => updateAlertThresholds({ pm10: Number(e.target.value) })}
                  className="w-full accent-[#1B4332] dark:accent-[#2DD4BF]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="alert-no2" className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                    NO₂ Threshold
                  </label>
                  <span className="font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                    ≥ {alertThresholds.no2} µg/m³
                  </span>
                </div>
                <input
                  id="alert-no2"
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
                  onClick={() => setActiveSection('settings')}
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
                Evaluating {activeLocation.name} ({airQuality?.status ?? 'UNAVAILABLE'})
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="p-5 rounded-md border border-emerald-300/80 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/25 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
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
      )}

      {/* TAB 3: AI OUTDOOR ACTIVITY ADVISOR */}
      {activeTab === 'advisor' && (
        <section
          id="intel-panel-advisor"
          role="tabpanel"
          aria-labelledby="intel-tab-advisor"
          className="space-y-5 animate-page-enter"
        >
          <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                  3. Outdoor Activity Advisor — {activeLocation.name}
                </h2>
                <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                  Activity timing and safer alternatives matched to current modelled conditions and your household profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('assistant')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-xs font-medium transition-colors whitespace-nowrap self-start sm:self-auto min-h-[38px]"
              >
                <span>Ask AI Assistant Custom Question</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activityAdvice.map((item) => {
                const toneClasses =
                  item.tone === 'good'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300/80 dark:border-emerald-800/70'
                    : item.tone === 'moderate'
                      ? 'bg-orange-50/75 dark:bg-orange-950/25 border-orange-300/80 dark:border-orange-800/70'
                      : 'bg-red-50/75 dark:bg-red-950/25 border-red-300/80 dark:border-red-800/70';
                const labelTone =
                  item.tone === 'good'
                    ? 'text-emerald-800 dark:text-emerald-300'
                    : item.tone === 'moderate'
                      ? 'text-orange-900 dark:text-orange-300'
                      : 'text-red-800 dark:text-red-300';

                return (
                  <article
                    key={item.id}
                    className={`rounded-lg border p-4 sm:p-5 space-y-2.5 transition-transform duration-150 hover:-translate-y-0.5 ${toneClasses}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                        {item.activity}
                      </h3>
                      <span className={`text-xs font-semibold whitespace-nowrap ${labelTone}`}>
                        {item.recommendation}
                      </span>
                    </div>
                    <p className="text-xs text-[#16211D] dark:text-[#D5E1DC] leading-relaxed">
                      {item.reason}
                    </p>
                    <div className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] space-y-1 pt-1 border-t border-black/10 dark:border-white/10">
                      <p className="font-mono">
                        <strong className="font-sans text-[#16211D] dark:text-[#EDF3F0]">Lowest-PM2.5 window: </strong>
                        {item.suggestedWindow}
                      </p>
                      <p>
                        <strong className="text-[#16211D] dark:text-[#EDF3F0]">Alternative: </strong>
                        {item.alternative}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <MoreInfo label="More Info: Forecast Uncertainty & Safety Scope">
              <p>
                Activity recommendations use Open-Meteo CAMS (~45 km grid) modelled forecasts and cannot guarantee street-level air safety. Roadside diesel traffic, construction plumes, or local smoke can make specific parks or streets substantially worse than the citywide average.
              </p>
              <p>
                Always pause outdoor exertion immediately if you experience coughing, eye irritation, wheezing, or shortness of breath.
              </p>
            </MoreInfo>
          </div>
        </section>
      )}

      {/* TAB 4: INDOOR AIR QUALITY ASSISTANT */}
      {activeTab === 'indoor' && (
        <section
          id="intel-panel-indoor"
          role="tabpanel"
          aria-labelledby="intel-tab-indoor"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-page-enter"
        >
          {/* Contextual Indoor Source Guidance */}
          <div className="lg:col-span-7 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                4. Indoor Air Quality Assistant
              </h2>
              <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                Select an indoor pollution scenario for step-by-step source control and filtration actions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Indoor air scenarios">
              {INDOOR_ASSISTANT_TOPICS.map((topic) => {
                const active = topic.id === selectedIndoorTopic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedIndoorTopicId(topic.id)}
                    aria-pressed={active}
                    className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white border-[#1B4332] dark:border-[#2D6A4F]'
                        : 'bg-[#F6F8F7] dark:bg-[#0F1815] text-[#4E5E58] dark:text-[#9BB0A7] border-[#DCE5E0] dark:border-[#263832] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
                    }`}
                  >
                    {topic.label}
                  </button>
                );
              })}
            </div>

            <div className="p-4 rounded-md bg-[#F6F8F7] dark:bg-[#0F1815] border border-[#DCE5E0] dark:border-[#20302A] space-y-3">
              <h3 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                {selectedIndoorTopic.label}
              </h3>
              <p className="text-sm text-[#4E5E58] dark:text-[#B5C6BE] leading-relaxed">
                {selectedIndoorTopic.summary}
              </p>
              <ol className="space-y-2 text-sm text-[#16211D] dark:text-[#D5E1DC]">
                {selectedIndoorTopic.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-xs text-[#0F766E] dark:text-[#2DD4BF] mt-0.5 tabular-nums">
                      0{i + 1}.
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-[#5B6B65] dark:text-[#8DA299] pt-2 border-t border-[#DCE5E0] dark:border-[#20302A]">
                {selectedIndoorTopic.sensorDisclaimer}
              </p>
            </div>
          </div>

          {/* Synchronized Quick Indoor Readiness Checklist */}
          <div className="lg:col-span-5 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                Quick Indoor Checklist (Synced)
              </h3>
              <span className="text-xs font-mono tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                {indoorCompletedCount}/{INDOOR_CHECKLIST_ITEMS.length} total done
              </span>
            </div>

            <ul className="divide-y divide-[#DCE5E0] dark:divide-[#20302A]">
              {priorityIndoorItems.map((item) => {
                const checked = Boolean(indoorChecklist[item.id]);
                return (
                  <li key={item.id} className="py-2.5 flex items-start gap-3">
                    <input
                      id={`intel-indoor-${item.id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIndoorChecklistItem(item.id)}
                      className="mt-1 h-4 w-4 rounded border-[#8DA299] text-[#1B4332] cursor-pointer shrink-0"
                    />
                    <label
                      htmlFor={`intel-indoor-${item.id}`}
                      className={`text-xs sm:text-sm cursor-pointer leading-snug transition-colors ${
                        checked
                          ? 'line-through text-[#6B7C76] dark:text-[#6E8279]'
                          : 'text-[#16211D] dark:text-[#EDF3F0]'
                      }`}
                    >
                      {item.title}
                    </label>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={() => setActiveSection('indoor')}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-xs font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] transition-colors min-h-[38px]"
            >
              <span>Open Full 5-Room Indoor Air Guide</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* TAB 5: POLLUTION HOTSPOT EXPLORER */}
      {activeTab === 'hotspots' && (
        <section
          id="intel-panel-hotspots"
          role="tabpanel"
          aria-labelledby="intel-tab-hotspots"
          className="space-y-6 animate-page-enter"
        >
          <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                  5. Pollution Hotspot Explorer
                </h2>
                <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                  Inspect modelled metro forecasts, verified ground sensors (when configured), and unverified citizen observations in strictly separated layers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleLoadMetroComparison()}
                disabled={loadingMetros}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-xs font-medium disabled:opacity-50 transition-colors whitespace-nowrap min-h-[38px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMetros ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>{loadingMetros ? 'Fetching Forecasts...' : 'Load Metro Comparison'}</span>
              </button>
            </div>

            {metroError && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                {metroError}
              </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Interactive Regional Coordinate Explorer SVG */}
              <div className="lg:col-span-5 bg-[#F6F8F7] dark:bg-[#0F1815] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-4">
                <p className="text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-2">
                  Regional Coordinate View (Click a pin to focus city)
                </p>
                <svg
                  viewBox="0 0 340 280"
                  className="w-full h-auto block"
                  role="group"
                  aria-label="Interactive regional air quality coordinates map"
                >
                  {/* Subtle coordinate grid */}
                  {[60, 120, 180, 240].map((y) => (
                    <line
                      key={`h-${y}`}
                      x1="16"
                      y1={y}
                      x2="324"
                      y2={y}
                      className="stroke-[#DCE5E0] dark:stroke-[#1F302A]"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  ))}
                  {[80, 170, 260].map((x) => (
                    <line
                      key={`v-${x}`}
                      x1={x}
                      y1="16"
                      x2={x}
                      y2="264"
                      className="stroke-[#DCE5E0] dark:stroke-[#1F302A]"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  ))}
                  {/* Simplified geographic frame silhouette (India coordinate reference) */}
                  <path
                    d="M 118 24 L 154 34 L 175 68 L 216 92 L 266 96 L 284 126 L 240 144 L 222 172 L 178 214 L 146 254 L 122 224 L 100 176 L 80 132 L 72 104 L 96 84 L 106 52 Z"
                    className="fill-[#E6EFEA]/70 dark:fill-[#182722] stroke-[#B8CEC1] dark:stroke-[#2A4239]"
                    strokeWidth="1.2"
                  />

                  {hotspotCities.map(({ loc, payload, isActive }) => {
                    const pt = projectIndiaCoords(loc.latitude, loc.longitude);
                    const cat = getUsAqiCategory(payload?.current.usAqi ?? null);
                    return (
                      <g
                        key={loc.id}
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label={`Select ${loc.name}${payload?.current.usAqi ? `, US AQI ${Math.round(payload.current.usAqi)}` : ''}`}
                        onClick={() => void handleSelectHotspotCity(loc)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            void handleSelectHotspotCity(loc);
                          }
                        }}
                      >
                        {isActive && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="13"
                            fill="none"
                            stroke={cat.dotColor}
                            strokeWidth="1.8"
                            strokeOpacity="0.6"
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isActive ? 7 : 5.5}
                          fill={payload ? cat.dotColor : '#52796F'}
                          className="stroke-white dark:stroke-[#0F1815]"
                          strokeWidth="1.8"
                        />
                        <text
                          x={loc.id === 'mumbai' || pt.x > 215 ? pt.x - 10 : pt.x + 10}
                          y={loc.id === 'mumbai' ? pt.y - 2 : pt.y + 4}
                          textAnchor={loc.id === 'mumbai' || pt.x > 215 ? 'end' : 'start'}
                          className="fill-[#16211D] dark:fill-[#EDF3F0] text-[10px] font-medium"
                        >
                          {loc.name}
                          {payload?.current.usAqi !== null && payload?.current.usAqi !== undefined
                            ? ` (${Math.round(payload.current.usAqi)})`
                            : ''}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <p className="mt-2 text-[11px] font-mono text-[#5B6B65] dark:text-[#8DA299]">
                  Coordinates plotted on 6°N–36°N, 67°E–98°E reference grid. Unfetched metros appear grey until loaded.
                </p>
              </div>

              {/* Layer 1: Modelled Regional Forecasts */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4E5E58] dark:text-[#9BB0A7] mb-2">
                    Layer 1 · Modelled Regional Forecasts (Open-Meteo CAMS)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {hotspotCities.map(({ loc, payload, isActive }) => {
                      const cat = getUsAqiCategory(payload?.current.usAqi ?? null);
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => void handleSelectHotspotCity(loc)}
                          className={`text-left p-4 rounded-lg border transition-colors ${
                            isActive
                              ? `${cat.surfaceClass} ${cat.borderClass}`
                              : 'bg-white dark:bg-[#131E1A] border-[#DCE5E0] dark:border-[#20302A] hover:border-[#52796F]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                              {loc.name}
                            </span>
                            <span className="text-[11px] font-mono text-[#4E5E58] dark:text-[#9BB0A7]">
                              {payload ? payload.status : 'Click Load'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                              {payload?.current.usAqi !== null && payload?.current.usAqi !== undefined
                                ? Math.round(payload.current.usAqi)
                                : '—'}
                            </span>
                            <span className={`text-xs font-medium ${payload ? cat.colorClass : 'text-[#5B6B65]'}`}>
                              {payload ? cat.level : 'Not loaded yet'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
                            {payload?.current.pm25 !== null && payload?.current.pm25 !== undefined
                              ? `PM2.5 ${payload.current.pm25.toFixed(1)} µg/m³ · ${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}`
                              : `${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Layer 2: Verified Ground Stations */}
                <div className="p-4 rounded-lg border border-[#DCE5E0] dark:border-[#20302A] bg-[#F6F8F7] dark:bg-[#0F1815]">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4E5E58] dark:text-[#9BB0A7]">
                    Layer 2 · Physical Ground Monitoring Station (OpenAQ)
                  </h3>
                  {airQuality?.groundStation ? (
                    <div className="mt-2 text-xs space-y-1">
                      <p className="font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                        {airQuality.groundStation.stationName} ({airQuality.groundStation.distanceKm} km away)
                      </p>
                      <p className="font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
                        PM2.5: {airQuality.groundStation.pm25 ?? 'N/A'} µg/m³ · PM10:{' '}
                        {airQuality.groundStation.pm10 ?? 'N/A'} µg/m³ · Measured{' '}
                        {formatReadableTimestamp(airQuality.groundStation.measuredAt)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                      No physical ground monitoring station feed is configured for this session (OpenAQ API key not set). VAYUMITRA does not fabricate street-level sensor readings.
                    </p>
                  )}
                </div>

                {/* Layer 3: Unverified Community Observations */}
                <div className="p-4 rounded-lg border border-[#DCE5E0] dark:border-[#20302A] bg-white dark:bg-[#131E1A] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#4E5E58] dark:text-[#9BB0A7]">
                      Layer 3 · Unverified Community Observations ({communityReports.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSection('community')}
                      className="text-xs font-medium text-[#1B4332] dark:text-[#2DD4BF] hover:underline whitespace-nowrap"
                    >
                      Report / Filter All
                    </button>
                  </div>
                  <ul className="divide-y divide-[#DCE5E0] dark:divide-[#20302A] text-xs">
                    {communityReports.slice(0, 4).map((rep) => (
                      <li key={rep.id} className="py-2 flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <span className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                            {rep.areaName}
                          </span>{' '}
                          <span className="text-[#4E5E58] dark:text-[#9BB0A7]">({rep.city})</span>
                        </div>
                        <span className="font-mono text-[11px] text-[#5B6B65] dark:text-[#8DA299]">
                          {rep.category.replace('_', ' ')} · Unverified{rep.isExample ? ' · Example' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 6: WEEKLY CLEAN AIR CHALLENGE */}
      {activeTab === 'challenge' && (
        <section
          id="intel-panel-challenge"
          role="tabpanel"
          aria-labelledby="intel-tab-challenge"
          className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5 animate-page-enter"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                6. Weekly Clean Air Challenge
              </h2>
              <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                Complete 7 practical mobility, indoor-air, and source-control actions this week. Progress saves automatically in your browser.
              </p>
            </div>
            <button
              type="button"
              onClick={resetWeeklyChallenge}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0] self-start sm:self-auto whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Challenge</span>
            </button>
          </div>

          {/* Challenge Progress Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#F6F8F7] dark:bg-[#0F1815] border border-[#DCE5E0] dark:border-[#20302A]">
              <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Actions Completed</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                {challengeCompletedCount} / {WEEKLY_CHALLENGE_ACTIONS.length}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#F6F8F7] dark:bg-[#0F1815] border border-[#DCE5E0] dark:border-[#20302A]">
              <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Challenge Progress</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                {challengePct}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#F6F8F7] dark:bg-[#0F1815] border border-[#DCE5E0] dark:border-[#20302A]">
              <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Est. Weekly CO₂e Avoided</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#1B4332] dark:text-[#2DD4BF]">
                {challengeCo2Saved.toFixed(2)} kg
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            className="h-2.5 w-full rounded-sm bg-[#E8EFEA] dark:bg-[#1C2A25] overflow-hidden"
            role="progressbar"
            aria-valuenow={challengePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Weekly Clean Air Challenge completion"
          >
            <div
              className="h-full bg-[#1B4332] dark:bg-[#2DD4BF] transition-all duration-300"
              style={{ width: `${challengePct}%` }}
            />
          </div>

          {challengeCompletedCount === WEEKLY_CHALLENGE_ACTIONS.length && (
            <div
              role="status"
              className="p-4 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 flex items-center gap-2.5 text-sm text-emerald-900 dark:text-emerald-200"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="font-medium">
                All 7 weekly clean-air actions completed! You avoided an estimated {challengeCo2Saved.toFixed(2)} kg CO₂e and reduced household particulate exposure.
              </span>
            </div>
          )}

          <ul className="divide-y divide-[#DCE5E0] dark:divide-[#20302A]">
            {WEEKLY_CHALLENGE_ACTIONS.map((action) => {
              const checked = Boolean(weeklyChallenge[action.id]);
              return (
                <li
                  key={action.id}
                  className={`py-3.5 flex items-start gap-3.5 transition-colors ${
                    checked ? 'opacity-85' : ''
                  }`}
                >
                  <input
                    id={`chal-${action.id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      toggleChallengeAction(action.id);
                      if (!checked) {
                        showToast(`Completed: ${action.dayLabel} (${action.category})`);
                      }
                    }}
                    className="mt-1 h-4 w-4 rounded border-[#8DA299] text-[#1B4332] cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <label
                        htmlFor={`chal-${action.id}`}
                        className={`text-sm font-medium cursor-pointer ${
                          checked
                            ? 'line-through text-[#6B7C76] dark:text-[#6E8279]'
                            : 'text-[#16211D] dark:text-[#EDF3F0]'
                        }`}
                      >
                        <span className="font-mono text-xs text-[#0F766E] dark:text-[#2DD4BF] mr-2">
                          {action.dayLabel}
                        </span>
                        {action.title}
                      </label>
                      <span className="font-mono text-xs tabular-nums text-[#4E5E58] dark:text-[#9BB0A7] whitespace-nowrap">
                        {action.estimatedCo2SavedKg > 0
                          ? `~${action.estimatedCo2SavedKg.toFixed(2)} kg CO₂e`
                          : 'Exposure focus'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7] leading-relaxed">
                      {action.detail}
                    </p>
                    <p className="mt-1 text-[11px] text-[#5B6B65] dark:text-[#8DA299]">
                      <strong className="font-medium">{action.category}:</strong> {action.exposureNote}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <MoreInfo label="More Info: Challenge Impact Assumptions">
            <p>
              Mobility CO₂e savings use the same UK DESNZ/DEFRA (2024) &amp; India GHG Program urban passenger factors as the Green Travel Planner (e.g., 15 km car → public transit saves ~1.68 kg CO₂e).
            </p>
            <p>
              Indoor actions (exhaust fan, damp mopping) are explicitly marked <code className="font-mono">Exposure focus</code> (0 kg CO₂e) because they protect household breathing air rather than lowering global CO₂ emissions.
            </p>
          </MoreInfo>
        </section>
      )}
    </div>
  );
};
