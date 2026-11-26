import React, { useState } from 'react';
import { LogIn, LogOut, Moon, RotateCcw, Save, Sun, Trash2, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { CommuteMode, HouseholdAgeGroup, OutdoorPreference } from '../../types';
import { INDIAN_METRO_PRESETS } from '../../utils/storage';
import { validateTimeString } from '../../utils/validation';
import { SmartAirAlertsCard } from '../settings/SmartAirAlertsCard';

const AGE_GROUPS: { id: HouseholdAgeGroup; label: string }[] = [
  { id: 'children_under_12', label: 'Children under 12' },
  { id: 'teens', label: 'Teenagers' },
  { id: 'adults', label: 'Adults' },
  { id: 'seniors_65_plus', label: 'Older adults (65+)' },
  { id: 'respiratory_sensitive', label: 'Respiratory-sensitive members' },
];

const INDOOR_CONCERN_OPTIONS = [
  'Cooking smoke',
  'Roadside dust',
  'Winter smog infiltration',
  'Dry indoor air',
  'Incense / combustion smoke',
  'Dampness / humidity',
];

export const SettingsSection: React.FC = () => {
  const {
    authSession,
    openAuth,
    logoutSession,
    preferences,
    updatePreferences,
    resetPreferencesToDefault,
    clearAllData,
    activeLocation,
    selectLocation,
    showToast,
  } = useApp();

  const [defaultCityId, setDefaultCityId] = useState(preferences.defaultLocation.id);
  const [commuteMode, setCommuteMode] = useState<CommuteMode>(preferences.commuteMode);
  const [wakeTime, setWakeTime] = useState(preferences.wakeTime);
  const [workStart, setWorkStart] = useState(preferences.workStart);
  const [workEnd, setWorkEnd] = useState(preferences.workEnd);
  const [outdoorPreference, setOutdoorPreference] = useState<OutdoorPreference>(
    preferences.outdoorPreference
  );
  const [householdAgeGroups, setHouseholdAgeGroups] = useState<HouseholdAgeGroup[]>(
    preferences.householdAgeGroups
  );
  const [indoorConcerns, setIndoorConcerns] = useState<string[]>(preferences.indoorConcerns);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const toggleAgeGroup = (id: HouseholdAgeGroup) => {
    setHouseholdAgeGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleConcern = (label: string) => {
    setIndoorConcerns((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !validateTimeString(wakeTime) ||
      !validateTimeString(workStart) ||
      !validateTimeString(workEnd)
    ) {
      setFormError('Please enter valid HH:MM times for wake-up and work/school hours.');
      return;
    }
    setFormError(null);
    const chosenCity =
      INDIAN_METRO_PRESETS.find((c) => c.id === defaultCityId) ?? activeLocation;

    updatePreferences({
      onboardingDismissed: true,
      defaultLocation: chosenCity,
      commuteMode,
      wakeTime,
      workStart,
      workEnd,
      outdoorPreference,
      householdAgeGroups,
      indoorConcerns,
    });

    if (chosenCity.id !== activeLocation.id) {
      await selectLocation(chosenCity);
    }
    showToast('Preferences saved on this device.');
  };

  const handleResetSettings = () => {
    resetPreferencesToDefault();
    setDefaultCityId(INDIAN_METRO_PRESETS[0].id);
    setCommuteMode('public_transit');
    setWakeTime('06:30');
    setWorkStart('09:00');
    setWorkEnd('18:00');
    setOutdoorPreference('morning');
    setHouseholdAgeGroups(['adults']);
    setIndoorConcerns(['Cooking smoke', 'Roadside dust']);
  };

  const handleConfirmClearAll = () => {
    clearAllData();
    setConfirmClearOpen(false);
    setDefaultCityId(INDIAN_METRO_PRESETS[0].id);
    setCommuteMode('public_transit');
    setWakeTime('06:30');
    setWorkStart('09:00');
    setWorkEnd('18:00');
    setOutdoorPreference('morning');
    setHouseholdAgeGroups(['adults']);
    setIndoorConcerns(['Cooking smoke', 'Roadside dust']);
  };

  return (
    <div className="space-y-8 animate-page-enter">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
          Settings &amp; Personalization
        </h1>
        <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
          Configure Smart Air Alerts, household preferences, appearance, default city, local session, and data privacy controls.
        </p>
      </div>

      {/* Session & Local Demo Account */}
      <section
        aria-label="Session status"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-[#E6EFEA] dark:bg-[#1A2B24] text-[#1B4332] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 mt-0.5">
            <User className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              {authSession?.mode === 'demo_account'
                ? `${authSession.displayName} (Local Demo Account)`
                : 'Guest Mode'}
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
              {authSession?.mode === 'demo_account'
                ? `${authSession.email} · Stored locally in this browser with salted SHA-256 hashing (no cloud sync).`
                : 'Using VAYUMITRA without signing in. Sign in with a local demo account or continue as guest anytime.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {authSession?.mode === 'demo_account' ? (
            <button
              type="button"
              onClick={logoutSession}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] transition-colors min-h-[40px] whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Log Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium transition-colors min-h-[40px] whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </section>

      {/* Theme Appearance */}
      <section
        aria-label="Theme selection"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            Interface Theme
          </h2>
          <p className="mt-0.5 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            Switch between crisp off-white light mode and deep pine-slate dark mode.
          </p>
        </div>

        <div className="inline-flex rounded-md bg-[#F2F5F3] dark:bg-[#0F1815] p-1 self-start">
          <button
            type="button"
            onClick={() => updatePreferences({ theme: 'light' })}
            aria-pressed={preferences.theme === 'light'}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors min-h-[38px] ${
              preferences.theme === 'light'
                ? 'bg-white text-[#1B4332] shadow-xs'
                : 'text-[#4E5E58] dark:text-[#9BB0A7]'
            }`}
          >
            <Sun className="w-4 h-4" aria-hidden="true" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => updatePreferences({ theme: 'dark' })}
            aria-pressed={preferences.theme === 'dark'}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors min-h-[38px] ${
              preferences.theme === 'dark'
                ? 'bg-[#1C2D27] text-[#EDF3F0] shadow-xs'
                : 'text-[#4E5E58] dark:text-[#9BB0A7]'
            }`}
          >
            <Moon className="w-4 h-4" aria-hidden="true" />
            <span>Dark</span>
          </button>
        </div>
      </section>

      {/* VayuMitra Smart Air Alerts (Browser Notification System) */}
      <SmartAirAlertsCard />

      {/* Household Profile & Schedule Form */}
      <section
        aria-label="Household preferences form"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6"
      >
        <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
          Location, Schedule &amp; Household Context
        </h2>
        <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
          All fields are optional and saved exclusively in your browser&apos;s local storage.
        </p>

        <form onSubmit={handleSave} noValidate className="mt-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="set-city" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Default Metro City
              </label>
              <select
                id="set-city"
                value={defaultCityId}
                onChange={(e) => setDefaultCityId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              >
                {INDIAN_METRO_PRESETS.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}, {city.region}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="set-commute" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Primary Commute Mode
              </label>
              <select
                id="set-commute"
                value={commuteMode}
                onChange={(e) => setCommuteMode(e.target.value as CommuteMode)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              >
                <option value="public_transit">Public Transit (Metro / Bus)</option>
                <option value="private_car">Private Vehicle</option>
                <option value="carpool">Carpooling</option>
                <option value="cycling">Cycling</option>
                <option value="walking">Walking</option>
              </select>
            </div>

            <div>
              <label htmlFor="set-outdoor" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Outdoor Activity Preference
              </label>
              <select
                id="set-outdoor"
                value={outdoorPreference}
                onChange={(e) => setOutdoorPreference(e.target.value as OutdoorPreference)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              >
                <option value="morning">Morning outdoors if AQI permits</option>
                <option value="evening">Evening outdoors if AQI permits</option>
                <option value="flexible">Flexible — lowest forecast PM2.5</option>
                <option value="indoor_only">Indoor workouts only</option>
              </select>
            </div>

            <div>
              <label htmlFor="set-wake" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Typical Wake-up Time
              </label>
              <input
                id="set-wake"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
              />
            </div>

            <div>
              <label htmlFor="set-work-start" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Work / School Start
              </label>
              <input
                id="set-work-start"
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
              />
            </div>

            <div>
              <label htmlFor="set-work-end" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Work / School End
              </label>
              <input
                id="set-work-end"
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-2">
              Optional Household Age Groups
            </span>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((grp) => {
                const active = householdAgeGroups.includes(grp.id);
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => toggleAgeGroup(grp.id)}
                    aria-pressed={active}
                    className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors min-h-[38px] ${
                      active
                        ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white border-[#1B4332] dark:border-[#2D6A4F]'
                        : 'bg-[#F6F8F7] dark:bg-[#0F1815] text-[#4E5E58] dark:text-[#9BB0A7] border-[#DCE5E0] dark:border-[#263832]'
                    }`}
                  >
                    {grp.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-2">
              Indoor Air Concerns (Optional)
            </span>
            <div className="flex flex-wrap gap-2">
              {INDOOR_CONCERN_OPTIONS.map((concern) => {
                const active = indoorConcerns.includes(concern);
                return (
                  <button
                    key={concern}
                    type="button"
                    onClick={() => toggleConcern(concern)}
                    aria-pressed={active}
                    className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors min-h-[38px] ${
                      active
                        ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white border-[#1B4332] dark:border-[#2D6A4F]'
                        : 'bg-[#F6F8F7] dark:bg-[#0F1815] text-[#4E5E58] dark:text-[#9BB0A7] border-[#DCE5E0] dark:border-[#263832]'
                    }`}
                  >
                    {concern}
                  </button>
                );
              })}
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-xs text-red-700 dark:text-red-400">
              {formError}
            </p>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium transition-colors min-h-[42px]"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>Save Preferences</span>
            </button>

            <button
              type="button"
              onClick={handleResetSettings}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] transition-colors min-h-[42px]"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Reset Settings to Defaults</span>
            </button>
          </div>
        </form>
      </section>

      {/* Privacy & Local Data Control */}
      <section
        aria-label="Data privacy and deletion controls"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-4"
      >
        <div>
          <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            Local Storage &amp; Data Deletion
          </h2>
          <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7] leading-relaxed">
            VAYUMITRA runs locally without external cloud accounts. Preferences, daily schedules, indoor checklists, alert thresholds, weekly challenge progress, community observations, and optional local demo accounts are stored strictly in your browser and can be wiped anytime.
          </p>
        </div>

        {!confirmClearOpen ? (
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-red-300 dark:border-red-900 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-h-[40px]"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>Clear All Stored Preferences &amp; Data</span>
          </button>
        ) : (
          <div
            role="alertdialog"
            aria-labelledby="confirm-clear-title"
            className="p-4 rounded-md border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 space-y-3"
          >
            <p id="confirm-clear-title" className="text-sm font-semibold text-red-900 dark:text-red-200">
              Clear all VAYUMITRA data stored on this browser?
            </p>
            <p className="text-xs text-red-800 dark:text-red-300">
              This removes saved preferences, assistant history, custom daily plans, checklist ticks, impact logs, and submitted community reports from local storage.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-4 py-2 rounded-md bg-red-700 hover:bg-red-800 text-white text-xs font-medium min-h-[38px]"
              >
                Confirm Delete All Local Data
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-white dark:bg-[#131E1A] text-xs font-medium text-[#16211D] dark:text-[#EDF3F0] min-h-[38px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
