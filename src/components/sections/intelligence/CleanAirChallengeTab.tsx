import React, { useMemo } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { WEEKLY_CHALLENGE_ACTIONS } from '../../../utils/advancedIntelligence';
import { MoreInfo } from '../../ui/MoreInfo';

interface CleanAirChallengeTabProps {
  weeklyChallenge: Record<string, boolean>;
  toggleChallengeAction: (actionId: string) => void;
  resetWeeklyChallenge: () => void;
  showToast: (message: string) => void;
}

export const CleanAirChallengeTab: React.FC<CleanAirChallengeTabProps> = ({
  weeklyChallenge,
  toggleChallengeAction,
  resetWeeklyChallenge,
  showToast,
}) => {
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

  return (
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
  );
};
