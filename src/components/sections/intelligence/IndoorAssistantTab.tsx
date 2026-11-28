import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { NavSection } from '../../../types';
import { INDOOR_CHECKLIST_ITEMS } from '../../../data/indoorGuideData';
import { INDOOR_ASSISTANT_TOPICS } from '../../../utils/advancedIntelligence';

interface IndoorAssistantTabProps {
  indoorChecklist: Record<string, boolean>;
  toggleIndoorChecklistItem: (itemId: string) => void;
  onNavigate: (section: NavSection) => void;
}

export const IndoorAssistantTab: React.FC<IndoorAssistantTabProps> = ({
  indoorChecklist,
  toggleIndoorChecklistItem,
  onNavigate,
}) => {
  const [selectedIndoorTopicId, setSelectedIndoorTopicId] = useState<string>(
    INDOOR_ASSISTANT_TOPICS[0].id
  );

  const selectedIndoorTopic =
    INDOOR_ASSISTANT_TOPICS.find((t) => t.id === selectedIndoorTopicId) ??
    INDOOR_ASSISTANT_TOPICS[0];

  const priorityIndoorItems = useMemo(() => INDOOR_CHECKLIST_ITEMS.slice(0, 6), []);
  const indoorCompletedCount = useMemo(
    () => INDOOR_CHECKLIST_ITEMS.filter((item) => Boolean(indoorChecklist[item.id])).length,
    [indoorChecklist]
  );

  return (
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
          onClick={() => onNavigate('indoor')}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-xs font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] transition-colors min-h-[38px]"
        >
          <span>Open Full 5-Room Indoor Air Guide</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
