import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { INDOOR_CHECKLIST_ITEMS, INDOOR_GUIDE_ROOMS } from '../../data/indoorGuideData';
import type { IndoorRoomId } from '../../types';
import { getUsAqiCategory } from '../../utils/aqi';
import { ResilientImage } from '../ui/ResilientImage';
import { MoreInfo } from '../ui/MoreInfo';

export const IndoorGuideSection: React.FC = () => {
  const {
    activeLocation,
    airQuality,
    indoorChecklist,
    toggleIndoorChecklistItem,
    resetIndoorChecklist,
  } = useApp();
  const [activeRoom, setActiveRoom] = useState<IndoorRoomId>('bedroom');
  const [checklistScope, setChecklistScope] = useState<'room' | 'all'>('room');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');

  const currentRoom =
    INDOOR_GUIDE_ROOMS.find((r) => r.id === activeRoom) ?? INDOOR_GUIDE_ROOMS[0];
  const usAqi = airQuality?.current.usAqi ?? null;
  const aqiMeta = getUsAqiCategory(usAqi);

  const totalChecklistCount = INDOOR_CHECKLIST_ITEMS.length;
  const totalCompletedCount = INDOOR_CHECKLIST_ITEMS.filter(
    (item) => Boolean(indoorChecklist[item.id])
  ).length;

  const filteredChecklist = useMemo(() => {
    return INDOOR_CHECKLIST_ITEMS.filter((item) => {
      if (checklistScope === 'room' && item.room !== activeRoom) return false;
      const done = Boolean(indoorChecklist[item.id]);
      if (statusFilter === 'pending' && done) return false;
      if (statusFilter === 'done' && !done) return false;
      return true;
    });
  }, [activeRoom, checklistScope, indoorChecklist, statusFilter]);

  const pctComplete = Math.round((totalCompletedCount / totalChecklistCount) * 100);

  return (
    <div className="space-y-8 animate-page-enter">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
          Indoor Air Guide
        </h1>
        <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
          Evidence-based filtration, ventilation, cooking emission, dust, and humidity practices for homes in{' '}
          <span className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
            {activeLocation.name}
            {activeLocation.region ? `, ${activeLocation.region}` : ''}
          </span>
          .
        </p>
        <p className="mt-1 text-xs font-mono tabular-nums text-[#5B6B65] dark:text-[#8DA299]">
          Synced location: {activeLocation.name} ({activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)}) · Outdoor US AQI:{' '}
          {usAqi !== null ? `${Math.round(usAqi)} (${aqiMeta.level})` : 'Loading / Unavailable'}
        </p>
      </div>

      {/* Subtle Architectural Environmental Reference Header */}
      <section className="relative rounded-lg overflow-hidden border border-[#DCE5E0] dark:border-[#20302A] bg-[#132A1F]">
        <div className="aspect-[16/6] sm:aspect-[16/5] max-h-64 w-full relative">
          <ResilientImage
            src="/images/indoor_clean_living_room_1795419587536.jpg"
            alt="Sunlit urban apartment living room with sealed glass window and matte-white HEPA air purifier"
            fallbackTitle="Clean Indoor Air Environment"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex items-end p-5 sm:p-6">
            <div className="max-w-2xl text-white">
              <p className="text-xs font-mono tracking-wide text-white/80">
                INDOOR EXPOSURE REDUCTION
              </p>
              <h2 className="mt-1 text-lg sm:text-xl font-semibold text-white">
                Source control + mechanical HEPA filtration + timed ventilation
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-white/85">
                Urban residents spend most of the day indoors; targeting bedroom air and kitchen smoke yields the largest practical protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Room Navigation Tabs */}
      <section aria-label="Room-by-room indoor air guidance" className="space-y-5">
        <div
          className="flex flex-wrap gap-1.5 p-1.5 rounded-lg bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A]"
          role="tablist"
          aria-label="Indoor room guides"
        >
          {INDOOR_GUIDE_ROOMS.map((room, idx) => {
            const selected = room.id === activeRoom;
            return (
              <button
                key={room.id}
                id={`indoor-tab-${room.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="indoor-room-tabpanel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveRoom(room.id)}
                onKeyDown={(e) => {
                  let nextIdx: number | null = null;
                  if (e.key === 'ArrowRight') nextIdx = (idx + 1) % INDOOR_GUIDE_ROOMS.length;
                  else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + INDOOR_GUIDE_ROOMS.length) % INDOOR_GUIDE_ROOMS.length;
                  else if (e.key === 'Home') nextIdx = 0;
                  else if (e.key === 'End') nextIdx = INDOOR_GUIDE_ROOMS.length - 1;
                  if (nextIdx !== null) {
                    e.preventDefault();
                    const nextRoom = INDOOR_GUIDE_ROOMS[nextIdx].id;
                    setActiveRoom(nextRoom);
                    document.getElementById(`indoor-tab-${nextRoom}`)?.focus();
                  }
                }}
                className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] whitespace-nowrap ${
                  selected
                    ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white'
                    : 'text-[#4E5E58] dark:text-[#9BB0A7] hover:bg-[#F1F5F3] dark:hover:bg-[#1A2924] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
                }`}
              >
                {room.name}
              </button>
            );
          })}
        </div>

        {/* Active Room Details */}
        <div
          id="indoor-room-tabpanel"
          role="tabpanel"
          aria-labelledby={`indoor-tab-${activeRoom}`}
          className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5"
        >
          <div>
            <h2 className="text-xl font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              {currentRoom.name}
            </h2>
            <p className="mt-1.5 text-sm text-[#4E5E58] dark:text-[#B5C6BE] leading-relaxed">
              {currentRoom.summary}
            </p>
            <div className="mt-3 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
              <span className="font-semibold text-[#16211D] dark:text-[#EDF3F0]">Primary indoor risks: </span>
              {currentRoom.primaryRisks.join(' · ')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#DCE5E0] dark:border-[#20302A]">
            {currentRoom.guidancePoints.map((point) => (
              <div key={point.heading} className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                  {point.heading}
                </h3>
                <p className="text-sm text-[#16211D] dark:text-[#D5E1DC] leading-relaxed">
                  {point.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scientific Honesty Note (Houseplants & Medical Boundaries) */}
      <section
        aria-label="Evidence clarity on houseplants and medical scope"
        className="bg-[#EDF3EF] dark:bg-[#121D19] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg px-5 py-3"
      >
        <MoreInfo label="More Info: Houseplants & Health Expectations" className="border-t-0 pt-0">
          <p>
            Indoor plants add visual calm, but peer-reviewed indoor air studies show ordinary houseplants remove pollutants far too slowly to replace a true HEPA purifier, kitchen exhaust hood, or timed ventilation during urban smog.
          </p>
          <p>
            These measures lower particulate exposure risk rather than offering medical guarantees; consult a clinician for asthma, cardiac, or acute breathing symptoms.
          </p>
        </MoreInfo>
      </section>

      {/* Interactive Persisted Checklist */}
      <section
        aria-label="Interactive indoor air maintenance checklist"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              Interactive Indoor Air Readiness Checklist
            </h2>
            <p className="mt-0.5 text-xs font-mono tabular-nums text-[#4E5E58] dark:text-[#9BB0A7]">
              Overall completion: {totalCompletedCount} / {totalChecklistCount} items ({pctComplete}%) · Saved automatically on this device
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md bg-[#F2F5F3] dark:bg-[#0F1815] p-1">
              <button
                type="button"
                onClick={() => setChecklistScope('room')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  checklistScope === 'room'
                    ? 'bg-white dark:bg-[#1C2D27] text-[#1B4332] dark:text-[#EDF3F0]'
                    : 'text-[#4E5E58] dark:text-[#9BB0A7]'
                }`}
              >
                {currentRoom.name}
              </button>
              <button
                type="button"
                onClick={() => setChecklistScope('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  checklistScope === 'all'
                    ? 'bg-white dark:bg-[#1C2D27] text-[#1B4332] dark:text-[#EDF3F0]'
                    : 'text-[#4E5E58] dark:text-[#9BB0A7]'
                }`}
              >
                All Rooms
              </button>
            </div>

            <div className="inline-flex rounded-md bg-[#F2F5F3] dark:bg-[#0F1815] p-1">
              {(['all', 'pending', 'done'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                    statusFilter === status
                      ? 'bg-white dark:bg-[#1C2D27] text-[#1B4332] dark:text-[#EDF3F0]'
                      : 'text-[#4E5E58] dark:text-[#9BB0A7]'
                  }`}
                >
                  {status === 'done' ? 'Completed' : status}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={resetIndoorChecklist}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Clean Progress Bar */}
        <div
          className="h-2 w-full rounded-sm bg-[#E8EFEA] dark:bg-[#1C2A25] overflow-hidden"
          role="progressbar"
          aria-valuenow={pctComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Indoor air checklist completion progress"
        >
          <div
            className="h-full bg-[#1B4332] dark:bg-[#2DD4BF] transition-all duration-200"
            style={{ width: `${pctComplete}%` }}
          />
        </div>

        {filteredChecklist.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            No checklist items match this filter. Switch filter to &quot;All&quot; to see remaining actions.
          </p>
        ) : (
          <ul className="divide-y divide-[#DCE5E0] dark:divide-[#20302A]">
            {filteredChecklist.map((item) => {
              const checked = Boolean(indoorChecklist[item.id]);
              return (
                <li key={item.id} className="py-3.5 flex items-start gap-3.5">
                  <input
                    id={`indoor-chk-${item.id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleIndoorChecklistItem(item.id)}
                    className="mt-1 h-4 w-4 rounded border-[#8DA299] text-[#1B4332] focus:ring-[#1B4332] cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={`indoor-chk-${item.id}`}
                      className={`block text-sm font-medium cursor-pointer ${
                        checked
                          ? 'line-through text-[#6B7C76] dark:text-[#6E8279]'
                          : 'text-[#16211D] dark:text-[#EDF3F0]'
                      }`}
                    >
                      {item.title}
                    </label>
                    <p className="mt-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7] leading-relaxed">
                      {item.detail}
                    </p>
                    <div className="mt-1 text-[11px] font-mono text-[#5B6B65] dark:text-[#8DA299]">
                      {item.topic} · {item.frequency}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
