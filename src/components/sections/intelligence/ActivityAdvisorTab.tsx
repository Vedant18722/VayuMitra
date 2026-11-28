import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import type { AirQualityPayload, NavSection, UserPreferences } from '../../../types';
import { buildOutdoorActivityAdvice } from '../../../utils/advancedIntelligence';
import { MoreInfo } from '../../ui/MoreInfo';

interface ActivityAdvisorTabProps {
  locationName: string;
  airQuality: AirQualityPayload | null;
  preferences: UserPreferences;
  onNavigate: (section: NavSection) => void;
}

export const ActivityAdvisorTab: React.FC<ActivityAdvisorTabProps> = ({
  locationName,
  airQuality,
  preferences,
  onNavigate,
}) => {
  const activityAdvice = useMemo(
    () => buildOutdoorActivityAdvice(airQuality, preferences),
    [airQuality, preferences]
  );

  return (
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
              3. Outdoor Activity Advisor — {locationName}
            </h2>
            <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
              Activity timing and safer alternatives matched to current modelled conditions and your household profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('assistant')}
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
                    <strong className="font-sans text-[#16211D] dark:text-[#EDF3F0]">
                      Lowest-PM2.5 window:{' '}
                    </strong>
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
  );
};
