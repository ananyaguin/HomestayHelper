import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { mockGuestData } from './data/mockGuestData';
import GuestHome from './components/guest/GuestHome';
import { Sun, Moon } from 'lucide-react';

export default function GuestApp() {
  const { token } = useParams();
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('homestay_theme');
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('homestay_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] text-slate-800 dark:text-slate-100 selection:bg-emerald-800 selection:text-white transition-colors duration-200">
      {/* Guest Header */}
      <header className="bg-gradient-to-r from-forest-900 to-forest-800 dark:from-[#07130e] dark:via-[#0b1e16] dark:to-[#0f261c] text-white px-4 py-3 sticky top-0 z-40 shadow-md border-b border-transparent dark:border-emerald-900/30 backdrop-blur-md transition-colors">
        <div className="max-w-md mx-auto flex justify-between items-center gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/icons/icon-192.png"
              alt="Homestay Companion Logo"
              className="w-9 h-9 rounded-xl border-2 border-amberGold object-contain bg-forest-900 dark:bg-forest-950 shadow-md shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight truncate">
                {mockGuestData.property.name}
              </h1>
              <p className="text-[11px] text-emerald-200 dark:text-emerald-300/90 truncate font-medium">
                Guest Stay Companion
              </p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
            className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all border border-white/20 shrink-0 cursor-pointer min-h-[44px] min-w-[44px]"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-emerald-200" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Main Guest Area */}
      <main className="px-4 py-4 max-w-md mx-auto">
        <GuestHome data={mockGuestData} />
      </main>
    </div>
  );
}
