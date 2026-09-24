import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Phone, User, Shield, Info, ArrowLeft } from 'lucide-react';

export default function Login({ onSubmit, errorMessage = '' }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  // Password visibility states (independent)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Success / notice feedback state for UI testing
  const [noticeMessage, setNoticeMessage] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (mode === 'login') {
      if (onSubmit) {
        onSubmit({ mode: 'login', phone, password });
      }
    } else if (mode === 'signup') {
      if (onSubmit) {
        onSubmit({ mode: 'signup', fullName, phone, recoveryEmail, password, confirmPassword });
      }
    } else if (mode === 'forgot') {
      setNoticeMessage('Password reset functionality will be connected later.');
      setTimeout(() => setNoticeMessage(''), 4000);
      if (onSubmit) {
        onSubmit({ mode: 'forgot', recoveryEmail });
      }
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setNoticeMessage('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 selection:bg-emerald-800 selection:text-white transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#0f1d17] rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-emerald-900/40 transition-colors">
        
        {/* Branding & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-forest-900 dark:bg-forest-950 border-2 border-amberGold flex items-center justify-center shadow-lg mb-3">
            <img
              src="/icons/icon-192.png"
              alt="Homestay Helper Logo"
              className="w-10 h-10 object-contain rounded-xl"
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Homestay Helper
          </h1>
          <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300/90 font-medium mt-0.5">
            Tea Garden Villages • Owner Dashboard
          </p>

          {mode === 'login' && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Sign in with your phone number to access your dashboard
            </p>
          )}

          {mode === 'signup' && (
            <p className="text-xs font-semibold text-amberGold dark:text-amber-400 mt-2">
              Create your owner account
            </p>
          )}

          {mode === 'forgot' && (
            <div className="mt-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Forgot your password?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your recovery email to receive a password reset link.
              </p>
            </div>
          )}
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* SIGNUP: Full Name */}
          {mode === 'signup' && (
            <div>
              <label htmlFor="owner-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 dark:text-emerald-400/80 absolute left-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="owner-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maya Gurung"
                  className="w-full bg-slate-50 dark:bg-[#0b1612] text-slate-800 dark:text-slate-100 text-sm rounded-xl pl-10 pr-3.5 min-h-[44px] border border-slate-200 dark:border-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>
          )}

          {/* LOGIN & SIGNUP: Phone Number */}
          {(mode === 'login' || mode === 'signup') && (
            <div>
              <label htmlFor="owner-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Phone Number
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-slate-400 dark:text-emerald-400/80 absolute left-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="owner-phone"
                  type="tel"
                  inputMode="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-slate-50 dark:bg-[#0b1612] text-slate-800 dark:text-slate-100 text-sm rounded-xl pl-10 pr-3.5 min-h-[44px] border border-slate-200 dark:border-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 transition-colors placeholder-slate-400 dark:placeholder-slate-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* SIGNUP & FORGOT: Recovery Email */}
          {(mode === 'signup' || mode === 'forgot') && (
            <div>
              <label htmlFor="recovery-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Recovery Email
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 dark:text-emerald-400/80 absolute left-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="recovery-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="owner@homestay.com"
                  className="w-full bg-slate-50 dark:bg-[#0b1612] text-slate-800 dark:text-slate-100 text-sm rounded-xl pl-10 pr-3.5 min-h-[44px] border border-slate-200 dark:border-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>
          )}

          {/* LOGIN & SIGNUP: Password */}
          {(mode === 'login' || mode === 'signup') && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="owner-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-bold text-forest-700 dark:text-amberGold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 dark:text-emerald-400/80 absolute left-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="owner-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-[#0b1612] text-slate-800 dark:text-slate-100 text-sm rounded-xl pl-10 pr-11 min-h-[44px] border border-slate-200 dark:border-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SIGNUP: Confirm Password */}
          {mode === 'signup' && (
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 dark:text-emerald-400/80 absolute left-3.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-[#0b1612] text-slate-800 dark:text-slate-100 text-sm rounded-xl pl-10 pr-11 min-h-[44px] border border-slate-200 dark:border-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* FORGOT: Info Notice */}
          {mode === 'forgot' && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-600/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 shadow-sm">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Password reset link delivery is UI-only and will be connected to the backend later.</span>
            </div>
          )}

          {/* Temporary Feedback Banner (if set) */}
          {noticeMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-600/40 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2 shadow-sm animate-fadeIn">
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <span>{noticeMessage}</span>
            </div>
          )}

          {/* Inline Error Area */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-600/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 shadow-sm animate-fadeIn">
              <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Dynamic Action Button */}
          <button
            type="submit"
            className="w-full min-h-[44px] bg-forest-800 hover:bg-forest-700 dark:bg-gradient-to-r dark:from-emerald-600 dark:to-forest-700 dark:hover:from-emerald-500 dark:hover:to-forest-600 text-white font-bold text-sm rounded-xl shadow-md dark:shadow-lg transition-all active:scale-[0.99] border border-transparent dark:border-emerald-500/30 flex items-center justify-center cursor-pointer"
          >
            {mode === 'login' && 'Sign In to Dashboard'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Send Reset Link'}
          </button>
        </form>

        {/* View Switchers Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-emerald-900/30 text-center">
          {mode === 'login' && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="font-bold text-forest-800 dark:text-emerald-300 hover:underline cursor-pointer ml-1"
              >
                Create account
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-bold text-forest-800 dark:text-emerald-300 hover:underline cursor-pointer ml-1"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Login</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
