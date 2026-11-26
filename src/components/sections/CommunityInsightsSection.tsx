import React, { useMemo, useState } from 'react';
import { AlertCircle, Info, Search, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { CommunityCategory, CommunityStatus } from '../../types';
import { formatReadableTimestamp } from '../../utils/aqi';
import { sanitizePlainText, validateCommunityReport } from '../../utils/validation';
import { MoreInfo } from '../ui/MoreInfo';

const CATEGORY_META: Record<CommunityCategory, { label: string; short: string }> = {
  construction_dust: { label: 'Construction Dust', short: 'Construction Dust' },
  smoke: { label: 'Smoke', short: 'Smoke' },
  waste_burning: { label: 'Waste Burning', short: 'Waste Burning' },
  vehicle_emissions: { label: 'Vehicle Emissions', short: 'Vehicle Emissions' },
  other: { label: 'Other Pollution Observation', short: 'Other' },
};

const STATUS_OPTIONS: CommunityStatus[] = ['Reported', 'Acknowledged', 'Monitoring'];

export const CommunityInsightsSection: React.FC = () => {
  const {
    activeLocation,
    communityReports,
    addCommunityReport,
    updateCommunityReportStatus,
  } = useApp();

  const [category, setCategory] = useState<CommunityCategory>('construction_dust');
  const [city, setCity] = useState(activeLocation.name);
  const [areaName, setAreaName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<'all' | CommunityCategory>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | CommunityStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateCommunityReport({ category, areaName, description });
    if (!check.valid || !check.areaName) {
      setFormError(check.error ?? 'Please check your submission fields.');
      return;
    }

    setFormError(null);
    addCommunityReport({
      id: `rep-${Date.now()}`,
      category,
      city: sanitizePlainText(city, 60) || activeLocation.name,
      areaName: check.areaName,
      description: check.description ?? '',
      createdAt: new Date().toISOString(),
      status: 'Reported',
      isExample: false,
      isCommunityObservation: true,
    });
    setAreaName('');
    setDescription('');
  };

  const filteredReports = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return communityReports.filter((rep) => {
      if (filterCategory !== 'all' && rep.category !== filterCategory) return false;
      if (filterStatus !== 'all' && rep.status !== filterStatus) return false;
      if (q) {
        const hay = `${rep.city} ${rep.areaName} ${rep.description} ${CATEGORY_META[rep.category].label}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [communityReports, filterCategory, filterStatus, searchTerm]);

  return (
    <div className="space-y-8 animate-page-enter">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
          Community Pollution Insights
        </h1>
        <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
          Log and filter local pollution observations while keeping personal addresses private.
        </p>
      </div>

      {/* Explicit Unverified Community Observation Notice */}
      <section
        aria-label="Community observation verification notice"
        className="bg-[#EDF3EF] dark:bg-[#121D19] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm text-[#4E5E58] dark:text-[#9BB0A7]"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#1B4332] dark:text-[#2DD4BF]" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="font-semibold text-[#16211D] dark:text-[#EDF3F0]">Unverified community observations:</strong>{' '}
            Stored locally in this browser — <strong>not</strong> calibrated monitoring-station readings. Never enter home addresses or phone numbers.
          </p>
        </div>
        <MoreInfo label="More Info: Community Observations vs. Sensors">
          <p>
            Entries include your local submissions alongside clearly labelled illustrative examples. Official air quality measurements require calibrated regulatory monitors (such as CPCB/SPCB or OpenAQ stations).
          </p>
        </MoreInfo>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Submission Form */}
        <section
          aria-label="Submit a local pollution observation"
          className="lg:col-span-5 bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
            Report an Observation
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="comm-category" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Pollution Category
              </label>
              <select
                id="comm-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CommunityCategory)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              >
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="comm-city" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                City
              </label>
              <input
                id="comm-city"
                type="text"
                maxLength={60}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              />
            </div>

            <div>
              <label htmlFor="comm-area" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                General Locality, Road Junction, or Ward (no house/flat numbers)
              </label>
              <input
                id="comm-area"
                type="text"
                maxLength={80}
                value={areaName}
                onChange={(e) => {
                  setAreaName(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g., Koramangala 4th Block Main Road"
                required
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              />
            </div>

            <div>
              <label htmlFor="comm-desc" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                Observation Details (optional, max 320 chars)
              </label>
              <textarea
                id="comm-desc"
                rows={3}
                maxLength={320}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="Describe visible dust, smoke, or idling sources..."
                className="w-full px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm"
              />
              <span className="block text-right text-[11px] font-mono tabular-nums text-[#5B6B65] dark:text-[#8DA299]">
                {description.length} / 320
              </span>
            </div>

            {formError && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-400 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{formError}</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2.5 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium transition-colors min-h-[42px]"
            >
              Submit Observation
            </button>
          </form>
        </section>

        {/* Filterable Reports Board */}
        <section
          aria-label="Community observations list"
          className="lg:col-span-7 space-y-4"
        >
          <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B65]" aria-hidden="true" />
                <label htmlFor="comm-search" className="sr-only">
                  Filter observations by keyword
                </label>
                <input
                  id="comm-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by city, locality, or detail..."
                  className="w-full pl-9 pr-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
                />
              </div>

              <label htmlFor="comm-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="comm-status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | CommunityStatus)}
                className="px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[40px]"
              >
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by pollution category">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                aria-pressed={filterCategory === 'all'}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white'
                    : 'bg-[#F3F6F4] dark:bg-[#192622] text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
                }`}
              >
                All ({communityReports.length})
              </button>
              {(Object.keys(CATEGORY_META) as CommunityCategory[]).map((catKey) => (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setFilterCategory(catKey)}
                  aria-pressed={filterCategory === catKey}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filterCategory === catKey
                      ? 'bg-[#1B4332] dark:bg-[#2D6A4F] text-white'
                      : 'bg-[#F3F6F4] dark:bg-[#192622] text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
                  }`}
                >
                  {CATEGORY_META[catKey].short}
                </button>
              ))}
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="bg-white dark:bg-[#131E1A] border border-dashed border-[#DCE5E0] dark:border-[#263832] rounded-lg p-8 text-center text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
              No community observations match the active filters.
            </div>
          ) : (
            <div className="divide-y divide-[#DCE5E0] dark:divide-[#20302A] bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg">
              {filteredReports.map((rep) => (
                <article key={rep.id} className="p-4 sm:p-5 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                      {rep.areaName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                      <span className="font-medium text-[#1B4332] dark:text-[#2DD4BF]">
                        {CATEGORY_META[rep.category].label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{rep.city}</span>
                    </div>
                  </div>

                  {rep.description && (
                    <p className="text-sm text-[#4E5E58] dark:text-[#B5C6BE] leading-relaxed">
                      {rep.description}
                    </p>
                  )}

                  <div className="pt-1 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5B6B65] dark:text-[#8DA299]">
                    <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
                      <span>{formatReadableTimestamp(rep.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>Unverified community observation</span>
                      {rep.isExample && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Example entry</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor={`status-${rep.id}`} className="text-xs">
                        Status:
                      </label>
                      <select
                        id={`status-${rep.id}`}
                        value={rep.status}
                        onChange={(e) =>
                          updateCommunityReportStatus(rep.id, e.target.value as CommunityStatus)
                        }
                        className="px-2 py-1 rounded border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-xs font-medium text-[#16211D] dark:text-[#EDF3F0]"
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              For urgent municipal enforcement (open garbage fires or severe industrial smoke), report directly to your city pollution control helpline.
            </span>
          </p>
        </section>
      </div>
    </div>
  );
};
