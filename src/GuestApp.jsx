import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { mockGuestData } from './data/mockGuestData';
import GuestHome from './components/guest/GuestHome';
import { Sun, Moon, Clock, AlertCircle } from 'lucide-react';

export default function GuestApp() {
  const { token } = useParams();
  const [stayData, setStayData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    let isMounted = true;
    async function fetchStay() {
      if (!token) {
        setIsLoading(false);
        setStayData(mockGuestData);
        return;
      }
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/guest/stay/${token}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setStayData(data);
        } else {
          // If network or endpoint fails, check if fallback to mock
          const errData = await res.json().catch(() => ({}));
          if (isMounted) {
            if (errData.expired) {
              setStayData({ expired: true, message: 'Stay Expired' });
            } else {
              setStayData(mockGuestData);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch real stay data, falling back to mock data:', err);
        if (isMounted) setStayData(mockGuestData);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchStay();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const propertyName = stayData?.property?.name || mockGuestData.property.name;

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
                {propertyName}
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
        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading your stay information...</p>
          </div>
        ) : stayData?.expired ? (
          <div className="bg-white dark:bg-[#0f1d17] p-6 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-center space-y-4 shadow-lg my-6">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                Stay Completed
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                Stay Expired
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Your reservation at {propertyName} has reached its scheduled checkout time. This temporary guest access link is now invalid.
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#07130e] rounded-xl border border-slate-200 dark:border-emerald-900/30 text-xs text-slate-600 dark:text-slate-300 font-medium">
              Thank you for staying with us! Room status has automatically returned to Vacant.
            </div>
          </div>
        ) : (
          <GuestHome data={stayData} />
        )}
      </main>
    </div>
  );
}
