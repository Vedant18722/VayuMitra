import React, { useState } from 'react';
import { Activity, Bell, Compass, Home, MapPin, Trophy } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AirQualityPayload } from '../../types';
import { getUsAqiCategory } from '../../utils/aqi';
import { AmbientSoundControl } from '../ui/AmbientSoundControl';
import { AqiStatusIcon } from '../ui/AqiStatusIcon';
import { ActivityAdvisorTab } from './intelligence/ActivityAdvisorTab';
import { CleanAirChallengeTab } from './intelligence/CleanAirChallengeTab';
import { ExposureScoreTab } from './intelligence/ExposureScoreTab';
import { HotspotMapTab } from './intelligence/HotspotMapTab';
import { IndoorAssistantTab } from './intelligence/IndoorAssistantTab';
import { PollutionAlertsTab } from './intelligence/PollutionAlertsTab';

type IntelligenceTab = 'exposure' | 'alerts' | 'advisor' | 'indoor' | 'hotspots' | 'challenge';

const TABS: {
  id: IntelligenceTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'exposure', label: 'Personal Exposure', icon: Activity },
  { id: 'alerts', label: 'Smart Alerts', icon: Bell },
  { id: 'advisor', label: 'Activity Advisor', icon: Compass },
  { id: 'indoor', label: 'Indoor Assistant', icon: Home },
  { id: 'hotspots', label: 'Hotspot Explorer', icon: MapPin },
  { id: 'challenge', label: 'Clean Air Challenge', icon: Trophy },
];

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
  const [metroForecasts, setMetroForecasts] = useState<Record<string, AirQualityPayload>>({});

  const aqiMeta = getUsAqiCategory(airQuality?.current.usAqi ?? null);

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
            <AqiStatusIcon
              kind={aqiMeta.iconKind}
              className={`w-3.5 h-3.5 shrink-0 ${aqiMeta.colorClass}`}
            />
            <span className="font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              US AQI{' '}
              {airQuality?.current.usAqi !== null && airQuality?.current.usAqi !== undefined
                ? Math.round(airQuality.current.usAqi)
                : '—'}
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

      {activeTab === 'exposure' && (
        <ExposureScoreTab locationName={activeLocation.name} airQuality={airQuality} />
      )}

      {activeTab === 'alerts' && (
        <PollutionAlertsTab
          locationName={activeLocation.name}
          airQuality={airQuality}
          alertThresholds={alertThresholds}
          updateAlertThresholds={updateAlertThresholds}
          resetAlertThresholds={resetAlertThresholds}
          notificationPermissionState={notificationPermissionState}
          onNavigate={setActiveSection}
        />
      )}

      {activeTab === 'advisor' && (
        <ActivityAdvisorTab
          locationName={activeLocation.name}
          airQuality={airQuality}
          preferences={preferences}
          onNavigate={setActiveSection}
        />
      )}

      {activeTab === 'indoor' && (
        <IndoorAssistantTab
          indoorChecklist={indoorChecklist}
          toggleIndoorChecklistItem={toggleIndoorChecklistItem}
          onNavigate={setActiveSection}
        />
      )}

      {activeTab === 'hotspots' && (
        <HotspotMapTab
          activeLocation={activeLocation}
          airQuality={airQuality}
          metroForecasts={metroForecasts}
          onUpdateMetroForecasts={setMetroForecasts}
          communityReports={communityReports}
          selectLocation={selectLocation}
          onNavigate={setActiveSection}
          showToast={showToast}
        />
      )}

      {activeTab === 'challenge' && (
        <CleanAirChallengeTab
          weeklyChallenge={weeklyChallenge}
          toggleChallengeAction={toggleChallengeAction}
          resetWeeklyChallenge={resetWeeklyChallenge}
          showToast={showToast}
        />
      )}
    </div>
  );
};
