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
  Moon,
  LayoutDashboard,
  Bell,
  Home,
  Settings,
  Users,
  Calendar,
  IndianRupee,
  AlertCircle,
  UserCheck,
  CreditCard,
  ChevronRight,
  MapPin,
  CheckCircle2,
  Clock,
  BedDouble,
  ShieldCheck,
  Key
} from 'lucide-react';

export default function OwnerApp() {
  const [activeTab, setActiveTab] = useState('tabDashboard');
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

  // Compute formatted current date & time-based greeting
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const hour = new Date().getHours();
  const greetingText = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

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
    { id: 'tabDashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'tabCommunicator', label: 'Communicator', Icon: MessageSquare },
    { id: 'tabLedger', label: 'Bookings & Ledger', Icon: BookOpen },
    { id: 'tabListing', label: 'AI Listing', Icon: Sparkles },
    { id: 'tabChecklist', label: 'Checklist', Icon: ClipboardCheck },
    { id: 'tabRequests', label: 'Requests', Icon: Bell, badge: '3' },
    { id: 'tabRooms', label: 'Rooms', Icon: Key },
    { id: 'tabSettings', label: 'Settings', Icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] pb-24 lg:pb-12 text-slate-800 dark:text-slate-100 selection:bg-emerald-800 selection:text-white transition-colors duration-200">
      {/* Top Header / Branding */}
      <header className="bg-gradient-to-r from-forest-900 to-forest-800 dark:from-[#07130e] dark:via-[#0b1e16] dark:to-[#0f261c] text-white px-4 py-3.5 sticky top-0 z-40 shadow-md dark:shadow-lg border-b border-transparent dark:border-emerald-900/30 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="./icons/icon-192.png"
              alt="Homestay Helper Logo"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-2 border-amberGold object-contain bg-forest-900 dark:bg-forest-950 shadow-md shrink-0"
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

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle Theme"
              className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 text-white active:scale-95 transition-all shadow-sm border border-white/20 shrink-0 cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold bg-amberGold text-forest-950 hover:bg-amber-400 active:scale-95 transition-all shadow-md border border-amber-300/50 shrink-0 cursor-pointer"
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
                        className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      To install: open browser menu (<span className="font-semibold text-white">⋮</span> or share button) and choose <strong className="text-amberGold dark:text-emerald-300">Add to Home screen</strong> or <strong className="text-amberGold dark:text-emerald-300">Install app</strong>.
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

      {/* Main Responsive Grid Layout (Sidebar + Main Content) */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
        
        {/* LIGHT SIDEBAR (Desktop & Tablet View) */}
        <aside className="w-full lg:w-64 shrink-0 bg-white dark:bg-[#0c1813] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-emerald-900/30 p-3 lg:p-4 transition-colors">
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-2 mb-4 rounded-xl bg-slate-50 dark:bg-emerald-950/40 border border-slate-200/60 dark:border-emerald-900/30">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase tracking-wider">
              Owner Navigation
            </span>
          </div>

          <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 pb-1 lg:pb-0 scrollbar-none">
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
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-bold border-r-2 lg:border-r-3 border-emerald-600 dark:border-emerald-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  <ItemIcon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MAIN DASHBOARD CONTENT AREA */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'tabDashboard' && (
            <div className="space-y-6">
              
              {/* 1. Dashboard Header Banner */}
              <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {greetingText}, Host <span className="inline-block">👋</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-emerald-300/80 mt-1 font-medium leading-relaxed">
                    Here's what's happening at your homestay today.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-emerald-950/60 border border-slate-200 dark:border-emerald-800/40 text-slate-700 dark:text-emerald-200 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-amberGold shrink-0" aria-hidden="true" />
                    <span>{formattedDate}</span>
                  </div>

                  {/* Owner Profile Area */}
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs">
                    <div className="w-8 h-8 rounded-full bg-forest-900 text-white font-bold text-xs flex items-center justify-center border border-amberGold shadow-sm">
                      MG
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Maya Gurung</p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">Verified Host</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Overview Stats (4 Compact Cards) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Active Guests */}
                <div className="bg-white dark:bg-[#0f1d17] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Guests</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                      <Users className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">5</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">In 3 active rooms</p>
                </div>

                {/* Today's Bookings */}
                <div className="bg-white dark:bg-[#0f1d17] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Today's Bookings</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-300">
                      <Calendar className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">2</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">2 check-ins expected</p>
                </div>

                {/* Today's Revenue */}
                <div className="bg-white dark:bg-[#0f1d17] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Today's Revenue</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                      <IndianRupee className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">₹4,800</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">↑ 12% vs yesterday</p>
                </div>

                {/* Pending Tasks */}
                <div className="bg-white dark:bg-[#0f1d17] p-4 sm:p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Tasks</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/80 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">3</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-medium">Requires attention</p>
                </div>
              </div>

              {/* 3. AI Daily Brief + Property Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* AI Daily Brief */}
                <div className="lg:col-span-2 bg-gradient-to-br from-emerald-900/5 via-white to-amber-500/5 dark:from-emerald-950/60 dark:via-[#0f1d17] dark:to-emerald-950/30 p-5 sm:p-6 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amberGold/20 dark:bg-amberGold/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                          <Sparkles className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Daily Brief</h3>
                      </div>
                      <span className="text-[11px] font-semibold text-forest-800 dark:text-emerald-300 bg-forest-100/60 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                        Updated 8m ago
                      </span>
                    </div>

                    <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium my-4">
                      <li className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                        <span><strong>2 guests</strong> are checking in today (Rahul & Ananya).</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        <span><strong>1 room</strong> (Room 201) will become available tomorrow.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span>You have <strong>3 pending guest requests</strong> waiting for response.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 dark:border-emerald-900/30 flex justify-end">
                    <button
                      onClick={() => setActiveTab('tabRequests')}
                      className="px-4 py-2 rounded-xl bg-forest-900 dark:bg-emerald-700 text-white hover:bg-forest-800 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Property Preview */}
                <div className="bg-white dark:bg-[#0f1d17] rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm overflow-hidden flex flex-col">
                  <div className="h-32 sm:h-36 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src="/images/homestay_preview.jpg"
                      alt="Mountain View Homestay Property Preview"
                      className="w-full h-full object-cover object-center transition-transform hover:scale-105 duration-300"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-forest-900/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md">
                      4 Rooms • Active
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        Mountain View Homestay
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-amberGold shrink-0" aria-hidden="true" />
                        <span className="truncate">Darjeeling, West Bengal</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-emerald-900/30 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Occupancy Rate</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">75% (3/4 Booked)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Recent Activity Section */}
              <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-emerald-900/30">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Recent Activity</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Today</span>
                </div>

                <div className="space-y-4">
                  {/* Activity Entry 1 */}
                  <div className="flex items-start gap-3 sm:gap-4 pb-3 border-b border-slate-100 dark:border-emerald-900/20 last:border-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Rahul checked in</p>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">25m ago</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Room 203 • Checked in at 10:30 AM</p>
                    </div>
                  </div>

                  {/* Activity Entry 2 */}
                  <div className="flex items-start gap-3 sm:gap-4 pb-3 border-b border-slate-100 dark:border-emerald-900/20 last:border-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">New request: Extra blanket</p>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">1h ago</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Guest in Room 101 requested 1 extra blanket</p>
                    </div>
                  </div>

                  {/* Activity Entry 3 */}
                  <div className="flex items-start gap-3 sm:gap-4 pb-3 border-b border-slate-100 dark:border-emerald-900/20 last:border-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Payment received ₹4,800</p>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">2h ago</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">UPI payment confirmed for Booking #HB-104</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: COMMUNICATOR */}
          {activeTab === 'tabCommunicator' && <GuestCommunicator />}

          {/* TAB 3: BOOKINGS & LEDGER */}
          {activeTab === 'tabLedger' && <BookingsLedger />}

          {/* TAB 4: AI LISTING */}
          {activeTab === 'tabListing' && <ListingPricing />}

          {/* TAB 5: CHECKLIST */}
          {activeTab === 'tabChecklist' && <HostReadinessChecklist />}

          {/* TAB 6: REQUESTS */}
          {activeTab === 'tabRequests' && (
            <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amberGold" aria-hidden="true" />
                  <span>Guest Requests</span>
                </h3>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                  3 Pending
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Extra blanket requested</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Room 101 • Rahul Sharma</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 min-h-[44px] cursor-pointer">
                    Fulfill
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Hot tea kettle refill</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Room 203 • Ananya Sen</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 min-h-[44px] cursor-pointer">
                    Fulfill
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ROOMS */}
          {activeTab === 'tabRooms' && (
            <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <span>Room Inventory</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">4 Total Rooms</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Room 101 — Deluxe Balcony</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">Occupied</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Guest: Priya & Family</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Room 203 — Tea Suite</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">Occupied</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Guest: Rahul Sharma</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SETTINGS */}
          {activeTab === 'tabSettings' && (
            <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-500" aria-hidden="true" />
                  <span>Homestay Owner Settings</span>
                </h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Homestay Name</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Mountain View Homestay</p>
                  </div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Edit Profile</span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Bottom Navigation Bar (Mobile View) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0c1813]/95 backdrop-blur-lg border-t border-slate-200 dark:border-emerald-900/40 z-50 flex justify-around py-1.5 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.5)] transition-colors">
        <button
          onClick={() => {
            setActiveTab('tabDashboard');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all w-1/5 min-h-[44px] justify-center cursor-pointer ${
            activeTab === 'tabDashboard'
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${activeTab === 'tabDashboard' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} aria-hidden="true" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('tabCommunicator');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all w-1/5 min-h-[44px] justify-center cursor-pointer ${
            activeTab === 'tabCommunicator'
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <MessageSquare className={`w-4 h-4 ${activeTab === 'tabCommunicator' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} aria-hidden="true" />
          <span>Translate</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('tabLedger');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all w-1/5 min-h-[44px] justify-center cursor-pointer ${
            activeTab === 'tabLedger'
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <BookOpen className={`w-4 h-4 ${activeTab === 'tabLedger' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} aria-hidden="true" />
          <span>Ledger</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('tabListing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all w-1/5 min-h-[44px] justify-center cursor-pointer ${
            activeTab === 'tabListing'
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeTab === 'tabListing' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} aria-hidden="true" />
          <span>Listing</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('tabChecklist');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all w-1/5 min-h-[44px] justify-center cursor-pointer ${
            activeTab === 'tabChecklist'
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className={`w-4 h-4 ${activeTab === 'tabChecklist' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} aria-hidden="true" />
          <span>Checklist</span>
        </button>
      </nav>
    </div>
  );
}
