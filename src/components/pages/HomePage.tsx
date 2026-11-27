import React, { useState } from 'react';
import { ArrowRight, Menu, Moon, Sun, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatReadableTimestamp, getUsAqiCategory } from '../../utils/aqi';
import { VayuMitraLogo } from '../brand/VayuMitraLogo';
import { AmbientSoundControl } from '../ui/AmbientSoundControl';
import { AqiStatusIcon } from '../ui/AqiStatusIcon';
import { ResilientImage } from '../ui/ResilientImage';

const HIGHLIGHTS = [
  {
    index: '01.',
    title: 'Real-Time Modelled Air Quality & GPS Location',
    body: 'Detect your city and area with readable GPS reverse geocoding or search any location worldwide, backed by transparent Open-Meteo Copernicus CAMS forecasts.',
    section: 'dashboard' as const,
  },
  {
    index: '02.',
    title: 'Advanced Air Intelligence Suite',
    body: 'Track a Personal Exposure Score, configure Smart Pollution Alerts, plan safer outdoor routines, inspect regional hotspots, and complete a Weekly Clean Air Challenge.',
    section: 'intelligence' as const,
  },
  {
    index: '03.',
    title: 'AI Air Assistant & Smart Daily Planner',
    body: 'Receive structured, context-grounded guidance for winter smog, school runs, and ventilation windows—plus customizable daily plans saved locally on your device.',
    section: 'assistant' as const,
  },
  {
    index: '04.',
    title: 'Green Travel & Environmental Impact',
    body: 'Compare commute modes—including custom vehicle and passenger trips—using documented emission factors without fabricated traffic times.',
    section: 'travel' as const,
  },
];

export const HomePage: React.FC = () => {
  const {
    airQuality,
    airQualityLoading,
    activeLocation,
    preferences,
    updatePreferences,
    authSession,
    enterWorkspace,
    openAuth,
    logoutSession,
    toastMessage,
  } = useApp();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const usAqi = airQuality?.current.usAqi ?? null;
  const pm25 = airQuality?.current.pm25 ?? null;
  const aqiMeta = getUsAqiCategory(usAqi);

  const toggleTheme = () => {
    updatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <div className="min-h-screen flex flex-col vm-bg-atmosphere text-[#16211D] dark:text-[#EDF3F0] transition-colors duration-250">
      {/* Clean 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-[#111A17]/95 backdrop-blur-xs border-b border-[#DCE5E0] dark:border-[#20302A] transition-colors duration-250">
        <div className="max-w-[1200px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <a
            href="#hero"
            className="inline-flex items-center whitespace-nowrap shrink-0"
          >
            <VayuMitraLogo size="sm" showWordmark showSanskrit={false} animated />
          </a>

          {/* Zone 2: Concise single-line nav links */}
          <nav aria-label="Homepage navigation" className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4E5E58] dark:text-[#9BB0A7]">
            <a href="#preview" className="hover:text-[#1B4332] dark:hover:text-[#2DD4BF] transition-colors whitespace-nowrap shrink-0">
              Air Preview
            </a>
            <a href="#capabilities" className="hover:text-[#1B4332] dark:hover:text-[#2DD4BF] transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <button
              type="button"
              onClick={() => enterWorkspace('intelligence')}
              className="hover:text-[#1B4332] dark:hover:text-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
            >
              Air Intelligence
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${preferences.theme === 'dark' ? 'light' : 'dark'} theme`}
              className="inline-flex items-center gap-1.5 hover:text-[#1B4332] dark:hover:text-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
            >
              {preferences.theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </nav>

          {/* Zone 3: Actions */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            {authSession?.mode === 'demo_account' ? (
              <button
                type="button"
                onClick={logoutSession}
                className="text-sm font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0] whitespace-nowrap shrink-0"
              >
                Log Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] hover:text-[#1B4332] dark:hover:text-[#2DD4BF] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
            <button
              type="button"
              onClick={() => enterWorkspace('dashboard')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium active:scale-[0.98] transition-all whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? 'Close homepage menu' : 'Open homepage menu'}
            aria-expanded={mobileNavOpen}
            className="md:hidden p-2 rounded-md text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {mobileNavOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileNavOpen && (
          <div className="md:hidden bg-white dark:bg-[#111A17] border-b border-[#DCE5E0] dark:border-[#20302A] px-4 py-4 space-y-2 animate-page-enter">
            <a
              href="#preview"
              onClick={() => setMobileNavOpen(false)}
              className="block py-2 text-sm font-medium text-[#16211D] dark:text-[#EDF3F0]"
            >
              Air Preview
            </a>
            <a
              href="#capabilities"
              onClick={() => setMobileNavOpen(false)}
              className="block py-2 text-sm font-medium text-[#16211D] dark:text-[#EDF3F0]"
            >
              Capabilities
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                enterWorkspace('intelligence');
              }}
              className="block w-full text-left py-2 text-sm font-medium text-[#16211D] dark:text-[#EDF3F0]"
            >
              Advanced Air Intelligence
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="block w-full text-left py-2 text-sm font-medium text-[#4E5E58] dark:text-[#9BB0A7]"
            >
              Switch to {preferences.theme === 'dark' ? 'Light' : 'Dark'} Theme
            </button>
            <div className="pt-2 border-t border-[#DCE5E0] dark:border-[#20302A] flex items-center gap-3">
              {authSession?.mode === 'demo_account' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    logoutSession();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-sm font-medium text-center min-h-[44px]"
                >
                  Log Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    openAuth('login');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-sm font-medium text-center min-h-[44px]"
                >
                  Sign In
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  enterWorkspace('dashboard');
                }}
                className="flex-1 px-4 py-2.5 rounded-md bg-[#1B4332] dark:bg-[#2D6A4F] text-white text-sm font-medium text-center min-h-[44px]"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Public Content */}
      <main className="flex-1 animate-page-enter">
        {/* Hero Split Section */}
        <section id="hero" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <VayuMitraLogo size="md" showWordmark showSanskrit introAnimate />
                <span className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs font-medium text-[#2D6A4F] dark:text-[#2DD4BF]">
                  Urban Air Quality Assistant
                </span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0] leading-[1.12]">
                Breathe Smarter. Live Cleaner. Stay Safer.
              </h1>
              <p className="text-base sm:text-lg text-[#4E5E58] dark:text-[#A9BCB4] leading-relaxed max-w-xl">
                Navigate winter smog and daily urban air pollution with transparent pollutant forecasts, personalized AI guidance, low-emission commute planning, and practical indoor air routines.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => enterWorkspace('dashboard')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-semibold active:scale-[0.98] transition-all min-h-[46px] whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-[#CFE0D6] dark:border-[#263832] bg-white dark:bg-[#131E1A] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] active:scale-[0.98] transition-all min-h-[46px] whitespace-nowrap"
                >
                  <span>Sign In</span>
                </button>
              </div>

              <p className="text-xs text-[#5B6B65] dark:text-[#8DA299]">
                Powered by Open-Meteo Copernicus CAMS atmospheric forecasts · Privacy-first local storage · No forced account required
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="relative rounded-xl overflow-hidden border border-[#DCE5E0] dark:border-[#20302A] h-full min-h-[280px] lg:min-h-[380px] bg-[#132A1F]">
                <ResilientImage
                  src="/images/vayumitra_clean_skyline_1795428709598.jpg"
                  alt="Green tree-lined urban residential neighborhood in clear morning light with cyclists and pedestrians"
                  fallbackTitle="VAYUMITRA Urban Air Sustainability"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end p-5 sm:p-6">
                  <div className="text-white space-y-1">
                    <p className="text-xs font-mono text-white/80">
                      Cleaner cities start with informed daily choices
                    </p>
                    <p className="text-sm sm:text-base font-medium text-white">
                      Built for Indian households &amp; communities facing seasonal urban smog
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Air-Quality Insights Preview */}
        <section id="preview" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <div className={`rounded-xl border p-6 sm:p-8 transition-all duration-300 ${aqiMeta.gradientClass} ${aqiMeta.borderClass}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#4E5E58] dark:text-[#9BB0A7] font-mono tabular-nums">
                  <span>Live Insights Preview</span>
                  <span aria-hidden="true">·</span>
                  <span>{airQuality?.location.name ?? activeLocation.name}</span>
                  <span aria-hidden="true">·</span>
                  <span>{airQuality?.status ?? (airQualityLoading ? 'LOADING' : 'UNAVAILABLE')}</span>
                  {airQuality?.fetchedAt && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Updated {formatReadableTimestamp(airQuality.fetchedAt)}</span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pt-1">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-4xl sm:text-5xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                      {usAqi !== null ? Math.round(usAqi) : '—'}
                    </span>
                    <div>
                      <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">US EPA AQI</p>
                      <p className={`inline-flex items-center gap-1.5 text-sm font-semibold ${aqiMeta.colorClass}`}>
                        <AqiStatusIcon kind={aqiMeta.iconKind} className="w-4 h-4 shrink-0" />
                        <span>{aqiMeta.level}</span>
                      </p>
                    </div>
                  </div>
                  <div className="pl-0 sm:pl-6 sm:border-l border-black/10 dark:border-white/10">
                    <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">Fine Particles (PM2.5)</p>
                    <p className="font-mono text-2xl font-semibold tabular-nums text-[#16211D] dark:text-[#EDF3F0]">
                      {pm25 !== null ? `${pm25.toFixed(1)} µg/m³` : '—'}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[#16211D] dark:text-[#D5E1DC] pt-1">
                  {aqiMeta.summary}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                <AmbientSoundControl />
                <button
                  type="button"
                  onClick={() => enterWorkspace('dashboard')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium active:scale-[0.98] transition-all min-h-[42px] whitespace-nowrap"
                >
                  <span>Open Full Dashboard</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Focused Platform Capabilities */}
        <section id="capabilities" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-2xl mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
              Practical environmental tools designed for everyday decisions
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#4E5E58] dark:text-[#9BB0A7]">
              Clear air-quality standards, transparent CO₂e formulas, and honest limitations—without cluttered telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.index}
                className="vm-card-interactive bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] hover:border-[#52796F] dark:hover:border-[#2DD4BF]/50 rounded-xl p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <span className="font-mono text-xs font-medium text-[#0F766E] dark:text-[#2DD4BF]">
                    {item.index}
                  </span>
                  <h3 className="text-lg font-semibold text-[#16211D] dark:text-[#EDF3F0]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#4E5E58] dark:text-[#9BB0A7] leading-relaxed">
                    {item.body}
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => enterWorkspace(item.section)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B4332] dark:text-[#2DD4BF] hover:underline whitespace-nowrap"
                  >
                    <span>Explore section</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Live Toast */}
      <div aria-live="polite" aria-atomic="true" className="fixed bottom-4 right-4 z-40 max-w-sm">
        {toastMessage && (
          <div className="animate-toast-enter bg-[#1B4332] dark:bg-[#234F3C] text-white text-sm px-4 py-3 rounded-md border border-[#2D6A4F] shadow-sm">
            {toastMessage}
          </div>
        )}
      </div>

      {/* Professional Quiet Footer */}
      <footer className="border-t border-[#DCE5E0] dark:border-[#20302A] bg-white dark:bg-[#111A17] px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-250">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <VayuMitraLogo size="xs" showWordmark showSanskrit animated={false} />
              <span aria-hidden="true">—</span>
              <span className="font-medium text-[#16211D] dark:text-[#EDF3F0]">
                Breathe Smarter. Live Cleaner. Stay Safer.
              </span>
            </div>
            <p>
              Air quality forecasts via Open-Meteo &amp; Copernicus Atmosphere Monitoring Service (CAMS). Informational environmental guidance, not medical advice.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => enterWorkspace('dashboard')}
              className="hover:text-[#1B4332] dark:hover:text-[#2DD4BF] font-medium whitespace-nowrap"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => enterWorkspace('intelligence')}
              className="hover:text-[#1B4332] dark:hover:text-[#2DD4BF] font-medium whitespace-nowrap"
            >
              Air Intelligence
            </button>
            <button
              type="button"
              onClick={() => openAuth('signup')}
              className="hover:text-[#1B4332] dark:hover:text-[#2DD4BF] font-medium whitespace-nowrap"
            >
              Create Demo Account
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
