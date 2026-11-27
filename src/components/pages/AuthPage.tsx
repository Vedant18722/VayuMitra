import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Info, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { registerDemoAccount, signInDemoAccount } from '../../utils/auth';
import { VayuMitraLogo } from '../brand/VayuMitraLogo';

export const AuthPage: React.FC = () => {
  const {
    authInitialTab,
    openHome,
    completeAuthSession,
    continueAsGuest,
    preferences,
    updatePreferences,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup'>(authInitialTab);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const outcome =
        mode === 'signup'
          ? await registerDemoAccount({ displayName, email, password, confirmPassword })
          : await signInDemoAccount({ email, password });

      if (!outcome.ok) {
        setError(outcome.error);
        setSubmitting(false);
        return;
      }

      setSuccessMessage(
        mode === 'signup'
          ? 'Local demo account created. Opening your dashboard...'
          : 'Signed in to your local demo session. Opening your dashboard...'
      );
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
      redirectTimerRef.current = window.setTimeout(() => {
        redirectTimerRef.current = null;
        completeAuthSession(outcome.session);
      }, 280);
    } catch {
      setError('Unable to complete authentication on this browser. You can still continue as Guest.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col vm-bg-atmosphere text-[#16211D] dark:text-[#EDF3F0] transition-colors duration-250">
      {/* Minimal Header */}
      <header className="h-16 border-b border-[#DCE5E0] dark:border-[#20302A] bg-white/95 dark:bg-[#111A17]/95 px-4 sm:px-6 lg:px-8 transition-colors duration-250">
        <div className="max-w-[1120px] mx-auto h-full flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={openHome}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#1B4332] dark:hover:text-[#2DD4BF] transition-colors whitespace-nowrap min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Homepage</span>
          </button>

          <button
            type="button"
            onClick={() => updatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' })}
            aria-label={`Switch to ${preferences.theme === 'dark' ? 'light' : 'dark'} theme`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] text-xs font-medium min-h-[36px]"
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

      <main className="flex-1 flex items-center justify-center px-4 py-10 animate-page-enter">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2.5">
            <div className="flex justify-center">
              <VayuMitraLogo size="lg" showWordmark showSanskrit introAnimate />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#16211D] dark:text-[#EDF3F0]">
              {mode === 'login' ? 'Sign In to VayuMitra' : 'Create a Demo Account'}
            </h1>
            <p className="text-sm text-[#4E5E58] dark:text-[#9BB0A7]">
              Breathe Smarter. Live Cleaner. Stay Safer.
            </p>
          </div>

          {/* Honest Local Demo Authentication Notice */}
          <div
            role="note"
            className="rounded-lg border border-[#CFE0D6] dark:border-[#243B33] bg-[#EDF3EF] dark:bg-[#121D19] p-4 text-xs text-[#4E5E58] dark:text-[#9BB0A7] flex items-start gap-2.5"
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#1B4332] dark:text-[#2DD4BF]" aria-hidden="true" />
            <p className="leading-relaxed">
              <strong className="text-[#16211D] dark:text-[#EDF3F0]">Local Demo Authentication:</strong>{' '}
              Cloud accounts are not configured in this build. Credentials are salted and SHA-256 hashed strictly inside your browser&apos;s local storage (never stored in plain text) and do not sync across devices.
            </p>
          </div>

          <div className="bg-white dark:bg-[#131E1A] border border-[#DCE5E0] dark:border-[#20302A] rounded-xl p-6 space-y-5">
            {/* Mode Switcher */}
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="grid grid-cols-2 gap-1 p-1 rounded-md bg-[#F2F5F3] dark:bg-[#0F1815]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className={`py-2 rounded text-sm font-medium transition-colors ${
                  mode === 'login'
                    ? 'bg-white dark:bg-[#1C2D27] text-[#1B4332] dark:text-[#EDF3F0] shadow-xs'
                    : 'text-[#4E5E58] dark:text-[#9BB0A7]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => switchMode('signup')}
                className={`py-2 rounded text-sm font-medium transition-colors ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-[#1C2D27] text-[#1B4332] dark:text-[#EDF3F0] shadow-xs'
                    : 'text-[#4E5E58] dark:text-[#9BB0A7]'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., Meena Sangale"
                    className="w-full px-3.5 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[42px]"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[42px]"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                  Password {mode === 'signup' && '(min 8 characters)'}
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-11 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm" className="block text-xs font-medium text-[#4E5E58] dark:text-[#9BB0A7] mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-3.5 pr-11 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm min-h-[42px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded text-[#4E5E58] dark:text-[#9BB0A7] hover:text-[#16211D] dark:hover:text-[#EDF3F0]"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="text-xs text-red-700 dark:text-red-400 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}

              {successMessage && (
                <p role="status" className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{successMessage}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-md bg-[#1B4332] hover:bg-[#2D6A4F] dark:bg-[#2D6A4F] dark:hover:bg-[#3D8B68] text-white text-sm font-medium disabled:opacity-60 active:scale-[0.99] transition-all min-h-[44px]"
              >
                {submitting
                  ? mode === 'signup'
                    ? 'Creating demo account...'
                    : 'Signing in...'
                  : mode === 'signup'
                    ? 'Create Local Demo Account'
                    : 'Sign In (Demo)'}
              </button>
            </form>

            <div className="pt-4 border-t border-[#DCE5E0] dark:border-[#20302A] text-center space-y-2">
              <p className="text-xs text-[#4E5E58] dark:text-[#9BB0A7]">
                Want to explore immediately without creating a local account?
              </p>
              <button
                type="button"
                onClick={() => continueAsGuest('dashboard')}
                className="w-full px-4 py-2.5 rounded-md border border-[#DCE5E0] dark:border-[#263832] bg-[#F6F8F7] dark:bg-[#0F1815] text-sm font-medium text-[#16211D] dark:text-[#EDF3F0] hover:bg-[#E6EFEA] dark:hover:bg-[#1C2D27] transition-colors min-h-[42px]"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
