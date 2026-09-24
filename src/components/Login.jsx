import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';

export default function Login({ onSubmit, errorMessage = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({ email, password });
    }
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
          <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300/90 font-medium mt-1">
            Tea Garden Villages • Owner Dashboard
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Login to your owner dashboard to manage bookings & finances
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="owner-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Owner Email
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 dark:text-emerald-400/80 absolute left-3.5 pointer-events-none" aria-hidden="true" />
              <input
                id="owner-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@homestay.com"
                className="w-full bg-slate-50 dark:bg-[#0b1612] text-slate-800 dark:text-slate-100 text-sm rounded-xl pl-10 pr-3.5 min-h-[44px] border border-slate-200 dark:border-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500 transition-colors placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="owner-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 dark:text-emerald-400/80 absolute left-3.5 pointer-events-none" aria-hidden="true" />
              <input
                id="owner-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
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

          {/* Inline Error Message Area */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-600/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 shadow-sm animate-fadeIn">
              <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full min-h-[44px] bg-forest-800 hover:bg-forest-700 dark:bg-gradient-to-r dark:from-emerald-600 dark:to-forest-700 dark:hover:from-emerald-500 dark:hover:to-forest-600 text-white font-bold text-sm rounded-xl shadow-md dark:shadow-lg transition-all active:scale-[0.99] border border-transparent dark:border-emerald-500/30 flex items-center justify-center cursor-pointer"
          >
            Sign In to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
