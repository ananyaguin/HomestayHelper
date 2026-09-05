import React, { useState, useEffect } from 'react';
import { homestayDB } from './services/db';
import GuestCommunicator from './components/GuestCommunicator';
import BookingsLedger from './components/BookingsLedger';
import ListingPricing from './components/ListingPricing';
import HostReadinessChecklist from './components/HostReadinessChecklist';
import {
  Radio,
  MessageSquare,
  BookOpen,
  Sparkles,
  ClipboardCheck,
  Download,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('tabCommunicator');
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [deferredPrompt, setDeferredPrompt] = useState(typeof window !== 'undefined' ? window.deferredPrompt || null : null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('homestay_theme');
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.navigator.standalone === true ||
      (document.referrer && document.referrer.includes('android-app://'))
    );
  });
  const [showInstallNotice, setShowInstallNotice] = useState(false);

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

  useEffect(() => {
    // 1. Initialize IndexedDB & Seed sample data
    async function initDB() {
      try {
        await homestayDB.init();
        await homestayDB.seedInitialSampleData();
      } catch (err) {
        console.error('[App] Database init failed:', err);
      }
    }
    initDB();

    // 2. Offline Status Listener
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
        .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
    }

    // 4. Standalone & PWA Install Prompt Listeners
    const checkStandalone = () => {
      const isStandaloneMode = (typeof window !== 'undefined') && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        window.navigator.standalone === true ||
        (document.referrer && document.referrer.includes('android-app://'))
      );
      if (isStandaloneMode) {
        setIsStandalone(true);
        setShowInstallNotice(false);
      }
    };
    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e) => {
      if (e.matches) {
        setIsStandalone(true);
        setShowInstallNotice(false);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleMediaChange);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
    };

    const handlePwaInstallable = () => {
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      window.deferredPrompt = null;
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowInstallNotice(false);
      console.log('[PWA] Homestay Helper was successfully installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-installable', handlePwaInstallable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-installable', handlePwaInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (isStandalone) return;
    const promptEvent = deferredPrompt || window.deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`[PWA] Install prompt outcome: ${outcome}`);
      window.deferredPrompt = null;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        setIsStandalone(true);
        setShowInstallNotice(false);
      }
    } else {
      setShowInstallNotice(true);
      setTimeout(() => setShowInstallNotice(false), 6000);
    }
  };

  const navItems = [
    { id: 'tabCommunicator', label: 'Communicator', Icon: MessageSquare },
    { id: 'tabLedger', label: 'Bookings & Ledger', Icon: BookOpen },
    { id: 'tabListing', label: 'AI Listing', Icon: Sparkles },
    { id: 'tabChecklist', label: 'Checklist', Icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] pb-24 md:pb-12 text-slate-800 dark:text-slate-100 selection:bg-emerald-800 selection:text-white transition-colors duration-200">
      {/* App Header */}
      <header className="bg-gradient-to-r from-forest-900 to-forest-800 dark:from-[#07130e] dark:via-[#0b1e16] dark:to-[#0f261c] text-white px-4 py-3.5 sticky top-0 z-40 shadow-md dark:shadow-lg border-b border-transparent dark:border-emerald-900/30 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="./icons/icon-192.png"
              alt="Homestay Helper Logo"
              className="w-11 h-11 rounded-xl border-2 border-amberGold object-contain bg-forest-900 dark:bg-forest-950 shadow-md shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight truncate">
                Homestay Helper
              </h1>
              <p className="text-xs text-emerald-200 dark:text-emerald-300/90 truncate font-medium">
                Tea Garden Villages • Darjeeling Hills
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle Theme"
              className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 text-white active:scale-95 transition-all shadow-sm border border-white/20 shrink-0 cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-200" aria-hidden="true" />
              )}
            </button>

            {!isStandalone && (
              <div className="relative flex items-center shrink-0">
                <button
                  onClick={handleInstallClick}
                  title="Download and install Homestay Helper app on your device"
                  aria-label="Download App"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold bg-amberGold text-forest-950 hover:bg-amber-400 active:scale-95 transition-all shadow-md border border-amber-300/50 shrink-0"
                >
                  <Download className="w-4 h-4 text-forest-950 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Download App</span>
                  <span className="sm:hidden">Download</span>
                </button>

                {showInstallNotice && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-3.5 bg-slate-900 dark:bg-[#0f1d17] text-slate-100 text-xs rounded-xl shadow-2xl border border-slate-700 dark:border-emerald-700/60 z-50 animate-fadeIn">
                    <div className="flex justify-between items-start mb-1.5">
                      <p className="font-bold text-amberGold flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" aria-hidden="true" /> Install Homestay Helper
                      </p>
                      <button
                        onClick={() => setShowInstallNotice(false)}
                        className="text-slate-400 hover:text-white text-xs px-1"
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      To install: open your browser menu (<span className="font-semibold text-white">⋮</span> or share button) and choose <strong className="text-amberGold dark:text-emerald-300">Add to Home screen</strong> or <strong className="text-amberGold dark:text-emerald-300">Install app</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Offline Notice Banner */}
      {isOffline && (
        <div className="bg-amber-100 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 backdrop-blur-sm transition-colors">
          <Radio className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 animate-pulse" aria-hidden="true" />
          <span>Operating in 100% Offline Mode (Zero Signal). All guest data & AI translations are stored locally on device.</span>
        </div>
      )}

      {/* Navigation Tabs (Desktop / Tablet) */}
      <nav className="bg-white dark:bg-[#0c1813]/90 backdrop-blur-md border-b border-slate-200 dark:border-emerald-900/30 px-2 sticky top-[72px] z-30 shadow-sm dark:shadow-md hidden sm:flex justify-center transition-colors">
        <div className="max-w-5xl w-full flex">
          {navItems.map((item) => {
            const ItemIcon = item.Icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex-1 py-3 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                  isActive
                    ? 'text-forest-800 dark:text-emerald-300 border-amberGold bg-forest-100/30 dark:bg-emerald-950/50 shadow-inner'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-forest-900/30'
                }`}
              >
                <ItemIcon className={`w-4 h-4 ${isActive ? 'text-amberGold' : 'text-slate-400'}`} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-5">
        {activeTab === 'tabCommunicator' && <GuestCommunicator />}
        {activeTab === 'tabLedger' && <BookingsLedger />}
        {activeTab === 'tabListing' && <ListingPricing />}
        {activeTab === 'tabChecklist' && <HostReadinessChecklist />}
      </main>

      {/* Bottom Navigation Bar (Mobile View) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-forest-900 dark:bg-[#0c1813]/95 backdrop-blur-lg border-t border-white/10 dark:border-emerald-900/40 z-50 flex justify-around py-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.6)] transition-colors">
        <button
          onClick={() => {
            setActiveTab('tabCommunicator');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all w-1/4 ${
            activeTab === 'tabCommunicator'
              ? 'text-white dark:text-emerald-300 bg-white/10 dark:bg-emerald-950/60 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className={`w-5 h-5 ${activeTab === 'tabCommunicator' ? 'text-amberGold' : 'text-slate-400'}`} aria-hidden="true" />
          <span>Translate</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('tabLedger');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all w-1/4 ${
            activeTab === 'tabLedger'
              ? 'text-white dark:text-emerald-300 bg-white/10 dark:bg-emerald-950/60 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className={`w-5 h-5 ${activeTab === 'tabLedger' ? 'text-amberGold' : 'text-slate-400'}`} aria-hidden="true" />
          <span>Ledger</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('tabListing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all w-1/4 ${
            activeTab === 'tabListing'
              ? 'text-white dark:text-emerald-300 bg-white/10 dark:bg-emerald-950/60 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className={`w-5 h-5 ${activeTab === 'tabListing' ? 'text-amberGold' : 'text-slate-400'}`} aria-hidden="true" />
          <span>AI Listing</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('tabChecklist');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all w-1/4 ${
            activeTab === 'tabChecklist'
              ? 'text-white dark:text-emerald-300 bg-white/10 dark:bg-emerald-950/60 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardCheck className={`w-5 h-5 ${activeTab === 'tabChecklist' ? 'text-amberGold' : 'text-slate-400'}`} aria-hidden="true" />
          <span>Checklist</span>
        </button>
      </nav>
    </div>
  );
}
