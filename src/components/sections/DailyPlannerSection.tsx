import React, { useState } from 'react';
import { Check, Edit3, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { CommuteMode, DailyPlanItem, OutdoorPreference, PlanCategory } from '../../types';
import { sanitizePlainText, validateTimeString } from '../../utils/validation';

const CATEGORY_LABELS: Record<PlanCategory, string> = {
  outdoor: 'Outdoor Activity',
  indoor: 'Indoor Alternative',
  commute: 'Commute',
  ventilation: 'Ventilation',
  eco: 'Sustainable Action',
};

export const DailyPlannerSection: React.FC = () => {
  const {
    activeLocation,
    airQuality,
    planInputs,
    planItems,
    setPlanInputs,
    setPlanItems,
    regeneratePlan,
    savePlan,
    resetPlan,
    showToast,
  } = useApp();

  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    timeWindow: string;
    title: string;
    category: PlanCategory;
    rationale: string;
  } | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTime, setNewTime] = useState('17:30–18:00');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<PlanCategory>('eco');
  const [newRationale, setNewRationale] = useState('');

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !validateTimeString(planInputs.wakeTime) ||
      !validateTimeString(planInputs.workStart) ||
      !validateTimeString(planInputs.workEnd)
    ) {
      setFormError('Please enter valid HH:MM times for wake-up and work/school hours.');
      return;
    }
    setFormError(null);
    regeneratePlan(planInputs);
  };

  const toggleComplete = (id: string) => {
    const updated = planItems.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setPlanItems(updated);
  };

  const startEdit = (item: DailyPlanItem) => {
    setActionError(null);
    setEditingId(item.id);
    setEditDraft({
      timeWindow: item.timeWindow,
      title: item.title,
      category: item.category,
      rationale: item.rationale,
    });
  };

  const commitEdit = (id: string) => {
    if (!editDraft) return;
    const cleanTitle = sanitizePlainText(editDraft.title, 120);
    const cleanTime = sanitizePlainText(editDraft.timeWindow, 30);
    const cleanRationale = sanitizePlainText(editDraft.rationale, 280);
    if (!cleanTitle || !cleanTime) {
      setActionError('Activity title and time window cannot be empty.');
      return;
    }
    setActionError(null);
    const updated = planItems.map((item) =>
      item.id === id
        ? {
            ...item,
            timeWindow: cleanTime,
            title: cleanTitle,
            category: editDraft.category,
            rationale: cleanRationale || item.rationale,
          }
        : item
    );
    setPlanItems(updated);
    setEditingId(null);
    setEditDraft(null);
    showToast('Activity updated.');
  };

  const deleteItem = (id: string) => {
    setActionError(null);
    setPlanItems(planItems.filter((i) => i.id !== id));
    showToast('Activity removed from schedule.');
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizePlainText(newTitle, 120);
    const cleanTime = sanitizePlainText(newTime, 30);
    const cleanRationale = sanitizePlainText(newRationale, 260);
    if (!cleanTitle || !cleanTime) {
      setActionError('Provide both a time window and title for your custom activity.');
      return;
    }
    setActionError(null);
    const created: DailyPlanItem = {
      id: `custom-${Date.now()}`,
      timeWindow: cleanTime,
      title: cleanTitle,
      category: newCategory,
      rationale: cleanRationale || 'Custom household schedule item.',
      dataBasis: 'Added manually by user.',
      completed: false,
      isCustom: true,
    };
    setPlanItems([...planItems, created]);
    setNewTitle('');
    setNewRationale('');
    setShowAddForm(false);
    showToast('Custom activity added to daily plan.');
  };

  const completedCount = planItems.filter((i) => i.completed).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
            Smart Daily Planner
          </h1>
          <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            Build, customize, and track a lower-exposure daily schedule tailored to {activeLocation.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={savePlan}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium transition-colors min-h-[40px] whitespace-nowrap"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>Save Plan</span>
          </button>
          <button
            type="button"
            onClick={resetPlan}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-white dark:bg-[#131E1A] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] transition-colors min-h-[40px] whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Inputs Panel */}
      <section
        aria-label="Daily schedule parameters"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            Routine Inputs
          </h2>
          <span className="text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
            Location: {activeLocation.name} · Feed: {airQuality?.status ?? 'LOADING'}
          </span>
        </div>

        <form onSubmit={handleGenerate} noValidate className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="plan-wake" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
              Wake-up Time
            </label>
            <input
              id="plan-wake"
              type="time"
              value={planInputs.wakeTime}
              onChange={(e) => setPlanInputs({ ...planInputs, wakeTime: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
            />
          </div>

          <div>
            <label htmlFor="plan-work-start" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
              Work / School Start
            </label>
            <input
              id="plan-work-start"
              type="time"
              value={planInputs.workStart}
              onChange={(e) => setPlanInputs({ ...planInputs, workStart: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
            />
          </div>

          <div>
            <label htmlFor="plan-work-end" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
              Work / School End
            </label>
            <input
              id="plan-work-end"
              type="time"
              value={planInputs.workEnd}
              onChange={(e) => setPlanInputs({ ...planInputs, workEnd: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono tabular-nums min-h-[40px]"
            />
          </div>

          <div>
            <label htmlFor="plan-commute" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
              Commute Type
            </label>
            <select
              id="plan-commute"
              value={planInputs.commuteMode}
              onChange={(e) => setPlanInputs({ ...planInputs, commuteMode: e.target.value as CommuteMode })}
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
            <label htmlFor="plan-outdoor" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
              Outdoor Exercise Preference
            </label>
            <select
              id="plan-outdoor"
              value={planInputs.outdoorPreference}
              onChange={(e) =>
                setPlanInputs({ ...planInputs, outdoorPreference: e.target.value as OutdoorPreference })
              }
              className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
            >
              <option value="morning">Morning outdoors if AQI permits</option>
              <option value="evening">Evening outdoors if AQI permits</option>
              <option value="flexible">Flexible — lowest forecast PM2.5 window</option>
              <option value="indoor_only">Indoor workouts only</option>
            </select>
          </div>

          <div>
            <label htmlFor="plan-family" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
              Optional Family Notes
            </label>
            <input
              id="plan-family"
              type="text"
              maxLength={120}
              value={planInputs.familyNote}
              onChange={(e) => setPlanInputs({ ...planInputs, familyNote: e.target.value })}
              placeholder="e.g., School drop-off, senior parent walk"
              className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
              Time windows reference available hourly Open-Meteo forecasts; when live hourly data is unavailable, no specific hour is claimed safe.
            </p>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium transition-colors min-h-[40px] whitespace-nowrap"
            >
              Generate Updated Schedule
            </button>
          </div>
        </form>

        {formError && (
          <p role="alert" className="mt-3 text-xs text-red-700 dark:text-red-400">
            {formError}
          </p>
        )}
      </section>

      {/* Schedule List & Add Custom Item */}
      <section aria-label="Generated daily schedule" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              Today&apos;s Action Schedule
            </h2>
            <p className="text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
              {completedCount} of {planItems.length} activities completed
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setShowAddForm((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-white dark:bg-[#131E1A] text-xs font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showAddForm ? 'Cancel Custom Item' : 'Add Custom Activity'}</span>
          </button>
        </div>

        {actionError && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-400">
            {actionError}
          </p>
        )}

        {showAddForm && (
          <form
            onSubmit={handleAddActivity}
            noValidate
            className="bg-white dark:bg-[#131E1A] border border-[#CFE0D6] dark:border-[#243B33] rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label htmlFor="new-plan-time" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Time Window
              </label>
              <input
                id="new-plan-time"
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="new-plan-title" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Activity Title
              </label>
              <input
                id="new-plan-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Check HEPA filter indicator"
                required
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="new-plan-cat" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Category
              </label>
              <select
                id="new-plan-cat"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as PlanCategory)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-sm font-medium min-h-[40px]"
            >
              Add to Plan
            </button>
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="new-plan-rationale" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Why this matters (optional)
              </label>
              <input
                id="new-plan-rationale"
                type="text"
                value={newRationale}
                onChange={(e) => setNewRationale(e.target.value)}
                placeholder="Reason or note for your household"
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              />
            </div>
          </form>
        )}

        {planItems.length === 0 ? (
          <div className="bg-white dark:bg-[#131E1A] border border-dashed border-[#DCE5E0] dark:border-[#263832] rounded-lg p-8 text-center">
            <p className="text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
              Your daily plan is empty. Click &quot;Generate Updated Schedule&quot; or add a custom activity above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#DCE5E0] dark:divide-[#20302A] bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg">
            {planItems.map((item) => {
              const isEditing = editingId === item.id && editDraft !== null;
              return (
                <div key={item.id} className="p-4 sm:p-5">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label
                            htmlFor={`edit-time-${item.id}`}
                            className="block text-xs text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
                          >
                            Time Window
                          </label>
                          <input
                            id={`edit-time-${item.id}`}
                            type="text"
                            value={editDraft.timeWindow}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, timeWindow: e.target.value })
                            }
                            className="w-full px-3 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label
                            htmlFor={`edit-title-${item.id}`}
                            className="block text-xs text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
                          >
                            Activity Title
                          </label>
                          <input
                            id={`edit-title-${item.id}`}
                            type="text"
                            value={editDraft.title}
                            onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`edit-cat-${item.id}`}
                            className="block text-xs text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
                          >
                            Category
                          </label>
                          <select
                            id={`edit-cat-${item.id}`}
                            value={editDraft.category}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, category: e.target.value as PlanCategory })
                            }
                            className="w-full px-3 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm"
                          >
                            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor={`edit-rationale-${item.id}`}
                          className="block text-xs text-[#4E5E58] dark:text-[#9BB0A7] mb-1"
                        >
                          Explanation / Rationale
                        </label>
                        <textarea
                          id={`edit-rationale-${item.id}`}
                          rows={2}
                          value={editDraft.rationale}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, rationale: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => commitEdit(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1B4332] text-white text-xs font-medium"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Apply</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setEditingId(null);
                            setEditDraft(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-xs font-medium"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3.5">
                      <input
                        id={`plan-check-${item.id}`}
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleComplete(item.id)}
                        className="mt-1 h-4 w-4 rounded border-[#8DA299] text-[#1B4332] focus:ring-[#1B4332] cursor-pointer shrink-0"
                        aria-label={`Mark "${item.title}" as completed`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <label
                            htmlFor={`plan-check-${item.id}`}
                            className={`text-sm font-semibold cursor-pointer ${
                              item.completed
                                ? 'line-through text-[#6B7C76] dark:text-[#6E8279]'
                                : 'text-[#16211D] dark:text-[#EDF3F0]'
                            }`}
                          >
                            {item.title}
                          </label>
                          <div className="flex items-center gap-2 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                            <span className="font-mono tabular-nums font-medium text-[#1B4332] dark:text-[#2DD4BF]">
                              {item.timeWindow}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{CATEGORY_LABELS[item.category]}</span>
                          </div>
                        </div>
                        <p className="mt-1.5 text-sm text-[#4E5E58] dark:text-[#B5C6BE] leading-relaxed">
                          {item.rationale}
                        </p>
                        <p className="mt-1.5 text-xs text-[#5B6B65] dark:text-[#8DA299]">
                          Basis: {item.dataBasis}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          aria-label={`Edit ${item.title}`}
                          className="p-2 rounded-md text-[#4E5E58] dark:text-[#9BB0A7] hover:bg-[#F1F5F3] dark:hover:bg-[#1C2D27] hover:text-[#16211D] dark:hover:text-[#EDF3F0]"
                        >
                          <Edit3 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          aria-label={`Remove ${item.title}`}
                          className="p-2 rounded-md text-[#4E5E58] dark:text-[#9BB0A7] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
