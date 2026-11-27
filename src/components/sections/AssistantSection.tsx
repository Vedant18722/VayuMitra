import React, { useRef, useState } from 'react';
import { AlertCircle, Send, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { queryAirAssistant } from '../../services/api';
import { formatReadableTimestamp, getUsAqiCategory } from '../../utils/aqi';
import { validateAssistantQuestion } from '../../utils/validation';

const EXAMPLE_QUESTIONS = [
  'Is it a good time for outdoor exercise?',
  'What should my family do during severe smog?',
  'How can I improve indoor air quality?',
  'What is a lower-emission way to commute?',
  'What changes should I make to my daily routine?',
];

export const AssistantSection: React.FC = () => {
  const {
    airQuality,
    activeLocation,
    preferences,
    assistantHistory,
    addAssistantMessage,
    clearAssistantHistory,
  } = useApp();

  const [question, setQuestion] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastSubmittedRef = useRef<{ text: string; time: number } | null>(null);

  const usAqi = airQuality?.current.usAqi ?? null;
  const pm25 = airQuality?.current.pm25 ?? null;
  const aqiMeta = getUsAqiCategory(usAqi);

  const submitQuestion = async (rawText: string) => {
    if (submitting) return;

    const check = validateAssistantQuestion(rawText);
    if (!check.valid || !check.sanitized) {
      setValidationError(check.error ?? 'Please enter a valid question.');
      return;
    }

    // Duplicate click / rapid duplicate submission guard (within 8 seconds)
    const now = Date.now();
    if (
      lastSubmittedRef.current &&
      lastSubmittedRef.current.text === check.sanitized.toLowerCase() &&
      now - lastSubmittedRef.current.time < 8000
    ) {
      setValidationError('This exact question was just submitted. Review the response below or ask a follow-up.');
      return;
    }

    setValidationError(null);
    setSubmitting(true);
    lastSubmittedRef.current = { text: check.sanitized.toLowerCase(), time: now };

    try {
      const result = await queryAirAssistant(check.sanitized, airQuality, preferences, activeLocation);
      addAssistantMessage({
        id: `msg-${Date.now()}`,
        question: check.sanitized,
        createdAt: new Date().toISOString(),
        locationName: activeLocation.name,
        source: result.source,
        notice: result.notice,
        structured: result.structured,
      });
      setQuestion('');
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_IN_FLIGHT') {
        setValidationError('Your request is already in progress. Please wait for it to finish.');
      } else {
        setValidationError('Could not process your request right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitQuestion(question);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
            AI Air Quality Assistant
          </h1>
          <p className="mt-1 text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
            Context-aware guidance grounded in your active city readings, daily schedule, and household profile.
          </p>
        </div>

        {assistantHistory.length > 0 && (
          <button
            type="button"
            onClick={clearAssistantHistory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-red-700 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-900 transition-colors whitespace-nowrap min-h-[38px]"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Attached Context Summary Strip (Clean Unboxed Metadata) */}
      <section
        aria-label="Context attached to assistant queries"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-4 text-xs text-[#4E5E58] dark:text-[#9BB0A7]"
      >
        <div className="font-medium text-[#16211D] dark:text-[#EDF3F0] mb-1.5">
          Context automatically included with your question
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono tabular-nums">
          <span>
            {activeLocation.name}
            {activeLocation.region ? `, ${activeLocation.region}` : ''} ({activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)})
          </span>
          <span aria-hidden="true">·</span>
          <span>
            US AQI {usAqi !== null ? `${Math.round(usAqi)} (${aqiMeta.level})` : 'Unavailable'}
          </span>
          <span aria-hidden="true">·</span>
          <span>PM2.5 {pm25 !== null ? `${pm25.toFixed(1)} µg/m³` : 'Unavailable'}</span>
          <span aria-hidden="true">·</span>
          <span>Data: {airQuality?.status ?? 'LOADING'}</span>
          <span aria-hidden="true">·</span>
          <span>Commute: {preferences.commuteMode.replace('_', ' ')}</span>
          <span aria-hidden="true">·</span>
          <span>
            Schedule: {preferences.workStart}–{preferences.workEnd}
          </span>
        </div>
      </section>

      {/* Prompt Form & Example Questions */}
      <section
        aria-label="Ask the air quality assistant"
        className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-4"
      >
        <div>
          <span className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-2">
            Common questions
          </span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((sample) => (
              <button
                key={sample}
                type="button"
                disabled={submitting}
                onClick={() => void submitQuestion(sample)}
                className="text-left px-3 py-2 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-xs font-medium text-[#16211D] dark:text-[#D5E1DC] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] disabled:opacity-50 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-3" noValidate>
          <div>
            <label htmlFor="assistant-question-input" className="block text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] mb-1.5">
              Ask a question about today&apos;s air quality or your routine
            </label>
            <textarea
              id="assistant-question-input"
              rows={3}
              maxLength={600}
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={`Example: My parents are visiting ${activeLocation.name} this week—how should we plan indoor ventilation and morning walks?`}
              className="w-full px-3.5 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm text-[#16211D] dark:text-[#EDF3F0] placeholder:text-[#6B7C76]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono tabular-nums text-[#5B6B65] dark:text-[#8DA299]">
              {question.length} / 600 characters
            </span>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium disabled:opacity-60 transition-colors min-h-[42px]"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>{submitting ? 'Generating guidance...' : 'Get Structured Guidance'}</span>
            </button>
          </div>

          {validationError && (
            <p role="alert" className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{validationError}</span>
            </p>
          )}
        </form>
      </section>

      {/* Responses Feed */}
      <section aria-label="Assistant responses" className="space-y-6">
        {submitting && (
          <div
            role="status"
            aria-busy="true"
            className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-6 space-y-3 animate-pulse"
          >
            <div className="h-4 w-48 bg-[#E6EFEA] dark:bg-[#1C2D27] rounded" />
            <div className="h-3 w-full bg-[#E6EFEA] dark:bg-[#1C2D27] rounded" />
            <div className="h-3 w-5/6 bg-[#E6EFEA] dark:bg-[#1C2D27] rounded" />
            <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7] pt-1">
              Analyzing {activeLocation.name} conditions and household preferences...
            </p>
          </div>
        )}

        {assistantHistory.length === 0 && !submitting ? (
          <div className="bg-white dark:bg-[#131E1A] border border-dashed border-[#CFE0D6] dark:border-[#263832] rounded-lg p-8 text-center">
            <h2 className="text-base font-semibold text-[#16211D] dark:text-[#EDF3F0]">
              No questions asked yet
            </h2>
            <p className="mt-1.5 text-sm text-[#4E5E58] dark:text-[#9BB0A7] max-w-lg mx-auto">
              Select a common question above or type your own to receive a 6-part structured briefing covering situation, recommendation, explanation, expected benefit, estimated impact, and limitations.
            </p>
          </div>
        ) : (
          assistantHistory.map((item) => (
            <article
              key={item.id}
              className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-lg p-5 sm:p-6 space-y-5"
            >
              <div className="border-b border-[#DCE5E0] dark:border-[#20302A] pb-4">
                <h2 className="text-base sm:text-lg font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                  {item.question}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                  <span
                    className={`font-semibold ${
                      item.source === 'GEMINI_AI'
                        ? 'text-[#0F766E] dark:text-[#2DD4BF]'
                        : 'text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {item.source === 'GEMINI_AI'
                      ? 'Source: Gemini AI (Server-Side)'
                      : 'Source: Rule-Based Fallback Engine'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{item.locationName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{formatReadableTimestamp(item.createdAt)}</span>
                </div>

                {item.notice && (
                  <p className="mt-2.5 text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md px-3 py-2">
                    {item.notice}
                  </p>
                )}
              </div>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                    1. Situation
                  </dt>
                  <dd className="mt-1 text-[#16211D] dark:text-[#D5E1DC] leading-relaxed">
                    {item.structured.situation}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                    2. Recommendation
                  </dt>
                  <dd className="mt-1 text-[#16211D] dark:text-[#D5E1DC] leading-relaxed">
                    {item.structured.recommendation}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                    3. Explanation
                  </dt>
                  <dd className="mt-1 text-[#16211D] dark:text-[#D5E1DC] leading-relaxed">
                    {item.structured.explanation}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                    4. Expected Benefit
                  </dt>
                  <dd className="mt-1 text-[#16211D] dark:text-[#D5E1DC] leading-relaxed">
                    {item.structured.expectedBenefit}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold text-[#1B4332] dark:text-[#2DD4BF]">
                    5. Estimated Impact
                  </dt>
                  <dd className="mt-1 text-[#16211D] dark:text-[#D5E1DC] leading-relaxed">
                    {item.structured.estimatedImpact}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold text-[#4E5E58] dark:text-[#9BB0A7]">
                    6. Limitations &amp; Uncertainty
                  </dt>
                  <dd className="mt-1 text-[#4E5E58] dark:text-[#9BB0A7] leading-relaxed">
                    {item.structured.limitationsAndUncertainty}
                  </dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </section>
    </div>
  );
};
