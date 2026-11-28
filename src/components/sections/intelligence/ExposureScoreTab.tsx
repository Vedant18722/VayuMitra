import React, { useMemo, useState } from 'react';
import type { AirQualityPayload } from '../../../types';
import {
  calculatePersonalExposureScore,
  type ActivityIntensity,
  type IndoorProtection,
  type MaskType,
} from '../../../utils/advancedIntelligence';
import { MoreInfo } from '../../ui/MoreInfo';

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

interface ExposureScoreTabProps {
  locationName: string;
  airQuality: AirQualityPayload | null;
}

export const ExposureScoreTab: React.FC<ExposureScoreTabProps> = ({
  locationName,
  airQuality,
}) => {
  const [outdoorHours, setOutdoorHours] = useState<number>(2);
  const [intensity, setIntensity] = useState<ActivityIntensity>('commute');
  const [mask, setMask] = useState<MaskType>('none');
  const [indoorProtection, setIndoorProtection] = useState<IndoorProtection>('closed_windows');

  const exposure = useMemo(
    () =>
      calculatePersonalExposureScore(
        { outdoorHours, intensity, mask, indoorProtection },
        airQuality
      ),
    [airQuality, indoorProtection, intensity, mask, outdoorHours]
  );

  const bandStyle = EXPOSURE_BAND_STYLES[exposure.band];

  return (
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
            Estimate your relative daily particulate intake using {locationName}&apos;s current PM2.5 reading and your daily routine.
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
            <label
              htmlFor="exp-intensity"
              className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
            >
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
            <label
              htmlFor="exp-mask"
              className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
            >
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
            <label
              htmlFor="exp-indoor"
              className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
            >
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
        <div
          className={`rounded-lg border p-6 transition-colors ${bandStyle.surface} ${bandStyle.border}`}
        >
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
                <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                  Est. 24-hr Effective PM2.5
                </p>
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
              <li
                key={f.label}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
              >
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
  );
};
