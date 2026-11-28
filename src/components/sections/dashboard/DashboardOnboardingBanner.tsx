import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CommuteMode, HouseholdAgeGroup, LocationPreset, UserPreferences } from '../../../types';
import { INDIAN_METRO_PRESETS } from '../../../utils/storage';

const AGE_GROUP_OPTIONS: { id: HouseholdAgeGroup; label: string }[] = [
  { id: 'children_under_12', label: 'Children (<12)' },
  { id: 'teens', label: 'Teens' },
  { id: 'adults', label: 'Adults' },
  { id: 'seniors_65_plus', label: 'Seniors (65+)' },
  { id: 'respiratory_sensitive', label: 'Respiratory Sensitive' },
];

interface DashboardOnboardingBannerProps {
  activeLocation: LocationPreset;
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  selectLocation: (loc: LocationPreset, forceRefresh?: boolean) => Promise<void>;
  showToast: (message: string) => void;
}

export const DashboardOnboardingBanner: React.FC<DashboardOnboardingBannerProps> = ({
  activeLocation,
  preferences,
  updatePreferences,
  selectLocation,
  showToast,
}) => {
  const [obCommute, setObCommute] = useState<CommuteMode>(preferences.commuteMode);
  const [obGroups, setObGroups] = useState<HouseholdAgeGroup[]>(preferences.householdAgeGroups);
  const [obCityId, setObCityId] = useState<string>(preferences.defaultLocation.id);

  const toggleOnboardingAge = (group: HouseholdAgeGroup) => {
    setObGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenCity = INDIAN_METRO_PRESETS.find((c) => c.id === obCityId) ?? activeLocation;
    updatePreferences({
      onboardingDismissed: true,
      defaultLocation: chosenCity,
      commuteMode: obCommute,
      householdAgeGroups: obGroups.length > 0 ? obGroups : ['adults'],
    });
    if (chosenCity.id !== activeLocation.id) {
      await selectLocation({ ...chosenCity, locationSource: 'preset' });
    }
    showToast('Personalization saved. Recommendations now adapt to your household.');
  };

  return (
    <section
      aria-label="Optional household personalization setup"
      className="bg-white dark:bg-[#131E1A] border border-[#CFE0D6] dark:border-[#243B33] rounded-lg p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            Personalize VAYUMITRA for your household (optional)
          </h2>
          <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            Tailor AI guidance and daily routines using minimal preferences stored strictly on this device.
          </p>
        </div>
        <button
          type="button"
          onClick={() => updatePreferences({ onboardingDismissed: true })}
          aria-label="Skip personalization setup"
          className="text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0] inline-flex items-center gap-1 px-2 py-1.5 rounded-md whitespace-nowrap"
        >
          <span>Skip</span>
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSaveOnboarding} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="ob-city"
            className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1.5"
          >
            Primary City
          </label>
          <select
            id="ob-city"
            value={obCityId}
            onChange={(e) => setObCityId(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm text-[#16211D] dark:text-[#EDF3F0] min-h-[40px]"
          >
            {INDIAN_METRO_PRESETS.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}, {city.region}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="ob-commute"
            className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1.5"
          >
            Usual Commute Mode
          </label>
          <select
            id="ob-commute"
            value={obCommute}
            onChange={(e) => setObCommute(e.target.value as CommuteMode)}
            className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm text-[#16211D] dark:text-[#EDF3F0] min-h-[40px]"
          >
            <option value="public_transit">Public Transit (Metro / Bus)</option>
            <option value="private_car">Private Vehicle</option>
            <option value="carpool">Carpooling</option>
            <option value="cycling">Cycling</option>
            <option value="walking">Walking</option>
          </select>
        </div>

        <div>
          <span className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1.5">
            Household Age Groups (Optional)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {AGE_GROUP_OPTIONS.map((opt) => {
              const selected = obGroups.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleOnboardingAge(opt.id)}
                  aria-pressed={selected}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white border-[#1B4332] dark:border-[#2D6A4F]'
                      : 'bg-[#F6F8F7] dark:bg-[#0F1815] text-[#4E5E58] dark:text-[#9BB0A7] border-[#DCE5E0] dark:border-[#263832] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => updatePreferences({ onboardingDismissed: true })}
            className="px-4 py-2 text-sm font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0]"
          >
            Skip for now
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium transition-colors min-h-[40px]"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </section>
  );
};
