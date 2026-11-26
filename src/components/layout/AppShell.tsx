import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bike,
  CalendarClock,
  Globe,
  Home,
  Layers,
  LogIn,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { NavSection } from '../../types';
import { VayuMitraLogo } from '../brand/VayuMitraLogo';

interface NavItemConfig {
  id: NavSection;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Air Quality Dashboard', shortLabel: 'Dashboard', icon: Activity },
  { id: 'intelligence', label: 'Advanced Air Intelligence', shortLabel: 'Air Intelligence', icon: Layers },
  { id: 'assistant', label: 'AI Air Assistant', shortLabel: 'AI Assistant', icon: MessageSquareText },
  { id: 'planner', label: 'Smart Daily Planner', shortLabel: 'Daily Planner', icon: CalendarClock },
  { id: 'indoor', label: 'Indoor Air Guide', shortLabel: 'Indoor Guide', icon: Home },
  { id: 'travel', label: 'Green Travel Planner', shortLabel: 'Green Travel', icon: Bike },
  { id: 'impact', label: 'Environmental Impact', shortLabel: 'Impact Calc', icon: BarChart3 },
  { id: 'community', label: 'Community Insights', shortLabel: 'Community', icon: Users },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: SettingsIcon },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeSection,
    setActiveSection,
    preferences,
    updatePreferences,
    activeLocation,
    toastMessage,
    authSession,
    openHome,
    openAuth,
    logoutSession,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement | null>(null);
  const prevMobileMenuOpenRef = useRef(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      mobileMenuCloseRef.current?.focus();
    } else if (prevMobileMenuOpenRef.current) {
      mobileMenuTriggerRef.current?.focus();
    }
    prevMobileMenuOpenRef.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];

  const toggleTheme = () => {
    updatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' });
  };

  const handleSelectNav = (id: NavSection) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const readablePlace = [
    activeLocation.area,
    activeLocation.name,
    activeLocation.region && activeLocation.region !== activeLocation.name ? activeLocation.region : '',
    activeLocation.country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen flex vm-bg-atmosphere text-[#16211D] dark:text-[#EDF3F0] transition-colors duration-250">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1B4332] focus:text-white focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Desktop Left Sidebar */}
      <aside
        aria-label="Primary navigation"
        className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white dark:bg-[#111A17] border-r border-[#DCE5E0] dark:border-[#20302A] sticky top-0 h-screen transition-colors duration-250"
      >
        <div className="px-5 py-5 border-b border-[#DCE5E0] dark:border-[#20302A]">
          <button
            type="button"
            onClick={() => handleSelectNav('dashboard')}
            className="text-left group w-full"
          >
            <VayuMitraLogo size="sm" showWordmark showSanskrit animated />
            <p className="mt-2 text-xs text-[#4E5E58] dark:text-[#9BB0A7] leading-snug">
              Breathe Smarter. Live Cleaner.
            </p>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 active:scale-[0.99] whitespace-nowrap ${
                  isActive
                    ? 'bg-[#E6EFEA] dark:bg-[#1C2D27] text-[#1B4332] dark:text-[#EDF3F0]'
                    : 'text-[#4E5E58] dark:text-[#9BB0A7] hover:bg-[#F1F5F3] dark:hover:bg-[#172420] hover:text-[#16211D] dark:hover:text-[#EDF3F0]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`w-1 h-5 rounded-full transition-all duration-200 shrink-0 ${
                    isActive
                      ? 'bg-[#1B4332] dark:bg-[#2DD4BF] opacity-100 scale-y-100'
                      : 'bg-transparent opacity-0 scale-y-50'
                  }`}
                />
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                    isActive ? 'text-[#1B4332] dark:text-[#2DD4BF] translate-x-0.5' : ''
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3.5 border-t border-[#DCE5E0] dark:border-[#20302A] space-y-3 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
          <div className="px-1">
            <p className="truncate font-medium text-[#16211D] dark:text-[#EDF3F0]" title={readablePlace}>
              {readablePlace}
            </p>
            <p className="mt-0.5 font-mono tabular-nums text-[11px]">
              {Math.abs(activeLocation.latitude).toFixed(2)}°{activeLocation.latitude >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(activeLocation.longitude).toFixed(2)}°{activeLocation.longitude >= 0 ? 'E' : 'W'}
              {activeLocation.locationSource ? ` · ${activeLocation.locationSource.toUpperCase()}` : ''}
            </p>
          </div>

          <div className="pt-2 border-t border-[#DCE5E0] dark:border-[#20302A] flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={openHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#1B4332] dark:hover:text-[#2DD4BF] transition-colors whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Homepage</span>
            </button>

            {authSession?.mode === 'demo_account' ? (
              <button
                type="button"
                onClick={logoutSession}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-red-700 dark:hover:text-red-400 transition-colors whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Log Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B4332] dark:text-[#2DD4BF] hover:underline whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-nav-title"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          <div
            className="fixed inset-0 bg-black/45 animate-fade-in"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            aria-label="Mobile navigation"
            className="relative z-10 w-72 max-w-[85vw] bg-white dark:bg-[#111A17] h-full flex flex-col border-r border-[#DCE5E0] dark:border-[#20302A] animate-slide-in-left"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-[#DCE5E0] dark:border-[#20302A]">
              <span id="mobile-nav-title" className="inline-flex items-center">
                <VayuMitraLogo size="xs" showWordmark showSanskrit animated={false} />
              </span>
              <button
                ref={mobileMenuCloseRef}
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-md text-[#4E5E58] dark:text-[#9BB0A7] hover:bg-[#F1F5F3] dark:hover:bg-[#172420] min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium min-h-[44px] transition-colors ${
                      isActive
                        ? 'bg-[#E6EFEA] dark:bg-[#1C2D27] text-[#1B4332] dark:text-[#EDF3F0]'
                        : 'text-[#4E5E58] dark:text-[#9BB0A7] hover:bg-[#F1F5F3] dark:hover:bg-[#172420]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="px-4 py-3 border-t border-[#DCE5E0] dark:border-[#20302A] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openHome();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] min-h-[40px]"
              >
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Homepage</span>
              </button>
              {authSession?.mode === 'demo_account' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logoutSession();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 min-h-[40px]"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Log Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuth('login');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B4332] dark:text-[#2DD4BF] min-h-[40px]"
                >
                  <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean Contextual Top Bar (<= 56px height) */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-[#111A17]/95 backdrop-blur-xs border-b border-[#DCE5E0] dark:border-[#20302A] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 transition-colors duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              className="lg:hidden -ml-2 p-2 rounded-md text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#F1F5F3] dark:hover:bg-[#172420] min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="lg:hidden inline-flex items-center shrink-0">
                <VayuMitraLogo size="xs" showWordmark showSanskrit={false} animated={false} />
              </span>
              <span className="lg:hidden text-[#8DA299]" aria-hidden="true">
                /
              </span>
              <span className="hidden lg:inline text-[#4E5E58] dark:text-[#9BB0A7] whitespace-nowrap">
                VayuMitra
              </span>
              <span className="hidden lg:inline text-[#8DA299]" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-[#16211D] dark:text-[#EDF3F0] truncate">
                {currentNav.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-[#4E5E58] dark:text-[#9BB0A7] whitespace-nowrap max-w-[180px] truncate">
              {authSession?.mode === 'demo_account'
                ? `${authSession.displayName} (Demo)`
                : activeLocation.name}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${preferences.theme === 'dark' ? 'light' : 'dark'} theme`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#243630] bg-[#F6F8F7] dark:bg-[#16231F] text-xs font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1E3029] active:scale-[0.98] transition-all whitespace-nowrap min-h-[36px]"
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
          </div>
        </header>

        {/* Live Region Toast Confirmation */}
        <div aria-live="polite" aria-atomic="true" className="fixed bottom-4 right-4 z-40 max-w-sm">
          {toastMessage && (
            <div className="animate-toast-enter bg-[#1B4332] dark:bg-[#234F3C] text-white text-sm px-4 py-3 rounded-md border border-[#2D6A4F] shadow-sm">
              {toastMessage}
            </div>
          )}
        </div>

        {/* Active View Viewport */}
        <main
          id="main-content"
          key={activeSection}
          className="animate-page-enter flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8"
        >
          {children}
        </main>

        {/* Quiet Editorial Footer */}
        <footer className="mt-auto border-t border-[#DCE5E0] dark:border-[#20302A] px-4 sm:px-6 lg:px-8 py-4 text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              VAYUMITRA (वायुमित्र) · Environmental guidance tool — not medical advice.
            </span>
            <span>
              Air quality model data via Open-Meteo &amp; Copernicus Atmosphere Monitoring Service (CAMS).
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
