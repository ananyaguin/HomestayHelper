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
  Settings,
  Users,
  Calendar,
  IndianRupee,
  AlertCircle,
  UserCheck,
  CreditCard,
  ChevronRight,
  MapPin,
  Key,
  ShieldAlert,
  Bot,
  Menu,
  X,
  Send,
  ArrowLeft
} from 'lucide-react';

export default function OwnerApp() {
  const [activeTab, setActiveTab] = useState('tabDashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerAnimatingOut, setDrawerAnimatingOut] = useState(false);
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

  // Smooth drawer animation handlers
  const openDrawer = () => {
    setMobileMenuOpen(true);
    setDrawerAnimatingOut(false);
  };

  const closeDrawer = (callback) => {
    setDrawerAnimatingOut(true);
    setTimeout(() => {
      setMobileMenuOpen(false);
      setDrawerAnimatingOut(false);
      if (typeof callback === 'function') {
        callback();
      }
    }, 280);
  };

  // Dedicated AI Assistant Chat state (UI ONLY)
  const [aiInputText, setAiInputText] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState([
    {
      sender: 'assistant',
      text: "Hello! 👋 I'm your Homestay AI Assistant. Ask me anything about guest services, room readiness, or local recommendations.",
      time: 'Just now'
    }
  ]);

  const handleSendAiMessage = (msgText) => {
    const textToSend = msgText || aiInputText;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAiChatMessages((prev) => [...prev, userMsg]);
    setAiInputText('');

    // Simulate AI response
    setTimeout(() => {
      let replyText = "I've logged your query. Our homestay assistant system will manage guest details automatically.";
      if (textToSend.toLowerCase().includes('breakfast')) {
        replyText = "Organic breakfast is served from 7:30 AM to 10:00 AM daily in the main tea garden dining hall.";
      } else if (textToSend.toLowerCase().includes('wifi') || textToSend.toLowerCase().includes('wi-fi')) {
        replyText = "The guest Wi-Fi network is 'MountainView_Guest_5G' with password 'Homestay2026!'.";
      } else if (textToSend.toLowerCase().includes('visit') || textToSend.toLowerCase().includes('places')) {
        replyText = "Recommended nearby spots: Pine Forest Trail (15m walk), Sunrise Mountain View (2.5 km), and Organic Tea Estate (1.2 km).";
      } else if (textToSend.toLowerCase().includes('check-out') || textToSend.toLowerCase().includes('checkout')) {
        replyText = "Standard check-out time for guests is 11:00 AM.";
      } else if (textToSend.toLowerCase().includes('room service')) {
        replyText = "Room service requests can be fulfilled directly via the Requests tab or by calling host Anand (+91 98765 43210).";
      }

      const botMsg = {
        sender: 'assistant',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAiChatMessages((prev) => [...prev, botMsg]);
    }, 400);
  };

  // Compute formatted current date
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
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
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
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
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => console.log('[PWA] Service Worker registered:', reg.scope))
        .catch((err) => console.warn('[PWA] Service Worker registration failed:', err));
    }

    // 4. Standalone & PWA Install Prompt Listeners
    const checkStandalone = () => {
      const isStandaloneMode =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches ||
          window.matchMedia('(display-mode: minimal-ui)').matches ||
          window.matchMedia('(display-mode: window-controls-overlay)').matches ||
          window.navigator.standalone === true ||
          (document.referrer && document.referrer.includes('android-app://')));
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
    { id: 'tabSettings', label: 'Settings', Icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] text-slate-800 dark:text-slate-100 selection:bg-emerald-800 selection:text-white transition-colors duration-200 overflow-x-hidden">
      {/* Top Header / Branding */}
      <header className="bg-gradient-to-r from-forest-900 to-forest-800 dark:from-[#07130e] dark:via-[#0b1e16] dark:to-[#0f261c] text-white px-4 py-3 sticky top-0 z-40 shadow-sm border-b border-transparent dark:border-emerald-900/30 backdrop-blur-md transition-colors duration-200">
        <div className="w-full flex justify-between items-center gap-2 px-0 sm:px-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="./icons/icon-192.png"
              alt="Homestay Helper Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-amberGold object-contain bg-forest-900 dark:bg-forest-950 shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-white leading-tight truncate">
                Homestay Helper
              </h1>
              <p className="text-xs text-emerald-200 dark:text-emerald-300/90 truncate font-medium">
                Tea Garden Villages • Darjeeling Hills
              </p>
            </div>
          </div>

          {/* Desktop Right Actions (Theme Toggle & Download App) */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle Theme"
              className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20 text-white active:scale-95 transition-all border border-white/20 shrink-0 cursor-pointer min-h-[44px] min-w-[44px]"
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amberGold text-forest-950 hover:bg-amber-400 active:scale-95 transition-all shadow-sm border border-amber-300/50 shrink-0 cursor-pointer min-h-[44px]"
                >
                  <Download className="w-4 h-4 text-forest-950 shrink-0" aria-hidden="true" />
                  <span>Download App</span>
                </button>

                {showInstallNotice && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-900 dark:bg-[#0f1d17] text-slate-100 text-xs rounded-xl shadow-xl border border-slate-700 dark:border-emerald-700/60 z-50 animate-fadeIn">
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
                      To install: open browser menu (<span className="font-semibold text-white">⋮</span> or share button) and choose{' '}
                      <strong className="text-amberGold dark:text-emerald-300">Add to Home screen</strong> or{' '}
                      <strong className="text-amberGold dark:text-emerald-300">Install app</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Simple Hamburger Icon (Clean 3-line icon only) */}
          <div className="lg:hidden flex items-center shrink-0">
            <button
              onClick={openDrawer}
              aria-label="Open Navigation Menu"
              className="w-[44px] h-[44px] flex items-center justify-center text-white hover:text-emerald-200 active:scale-95 transition-all cursor-pointer"
            >
              <Menu className="w-6 h-6 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Left-Side Lightweight Drawer Navigation Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Clean ~18% Black Overlay Backdrop (No Blur, No Green Tint) */}
          <div
            onClick={() => closeDrawer()}
            className={`lg:hidden fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ease-out ${
              drawerAnimatingOut ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden="true"
          />

          {/* Opaque White Left-Sided Overlay Drawer */}
          <aside
            className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[74vw] max-w-[290px] bg-white dark:bg-[#0c1813] border-r border-slate-200/70 dark:border-emerald-900/30 shadow-xl rounded-r-2xl py-4 px-3 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-out ${
              drawerAnimatingOut ? '-translate-x-full' : 'translate-x-0'
            }`}
          >
            <div className="space-y-3">
              {/* Drawer Header: Logo + Name + ONE thin X close icon */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30 px-1">
                <div className="flex items-center gap-2.5">
                  <img
                    src="./icons/icon-192.png"
                    alt="Homestay Helper Logo"
                    className="w-7 h-7 rounded-md border border-amberGold object-contain bg-forest-900"
                  />
                  <span className="font-semibold text-sm text-slate-800 dark:text-white tracking-tight">
                    Homestay Helper
                  </span>
                </div>
                <button
                  onClick={() => closeDrawer()}
                  className="w-[44px] h-[44px] -mr-2 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 stroke-[1.5]" />
                </button>
              </div>

              {/* Compact Natural Navigation Items */}
              <nav className="space-y-0.5 pt-1">
                {navItems.map((item) => {
                  const ItemIcon = item.Icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        closeDrawer(() => {
                          setActiveTab(item.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        });
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer min-h-[46px] ${
                        isActive
                          ? 'bg-[#f0f7f3] dark:bg-[#0e241b] text-[#123D2A] dark:text-emerald-300 font-medium border-l-3 border-[#164A34] dark:border-emerald-400'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-emerald-950/30'
                      }`}
                    >
                      <ItemIcon
                        className={`w-[18px] h-[18px] stroke-[1.5] shrink-0 ${
                          isActive ? 'text-[#164A34] dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        </>
      )}

      {/* Offline Notice Banner */}
      {isOffline && (
        <div className="bg-amber-100 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 backdrop-blur-sm transition-colors">
          <Radio className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 animate-pulse" aria-hidden="true" />
          <span>Operating in 100% Offline Mode (Zero Signal). All guest data & AI translations are stored locally on device.</span>
        </div>
      )}

      {/* Main Layout Container (FLUSH LEFT SIDEBAR ON DESKTOP + CONTENT AREA) */}
      <div className="w-full flex flex-col lg:flex-row min-h-[calc(100vh-57px)]">
        {/* DESKTOP SIDEBAR ONLY (Hidden on mobile) */}
        <aside className="hidden lg:block w-[260px] shrink-0 bg-white dark:bg-[#0c1813] border-r border-slate-200 dark:border-emerald-900/30 py-5 px-3 transition-colors">
          <nav className="flex flex-col gap-1">
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
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-base font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-bold border-r-3 border-emerald-600 dark:border-emerald-400 shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  <ItemIcon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'tabDashboard' && (
            <div className="space-y-5">
              {/* Main 2-Column Desktop Layout Grid (Left: 70%, Right: 30%) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                {/* Left Column (Main Dashboard Sections & Compact Stat Cards) */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Compact Overview Stats Cards Grid (4-col on sm) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {/* Active Guests */}
                    <div className="bg-white dark:bg-[#0f1d17] p-2.5 sm:p-3 rounded-lg border border-slate-200/80 dark:border-emerald-900/40">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                        <span className="text-[11px] font-semibold">Active Guests</span>
                        <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      </div>
                      <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">5</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">In 3 rooms</p>
                    </div>

                    {/* Today's Bookings */}
                    <div className="bg-white dark:bg-[#0f1d17] p-2.5 sm:p-3 rounded-lg border border-slate-200/80 dark:border-emerald-900/40">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                        <span className="text-[11px] font-semibold">Today's Bookings</span>
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      </div>
                      <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">2</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Check-ins today</p>
                    </div>

                    {/* Today's Revenue */}
                    <div className="bg-white dark:bg-[#0f1d17] p-2.5 sm:p-3 rounded-lg border border-slate-200/80 dark:border-emerald-900/40">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                        <span className="text-[11px] font-semibold">Today's Revenue</span>
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      </div>
                      <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">₹4,800</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">↑ 12% vs yesterday</p>
                    </div>

                    {/* Pending Tasks */}
                    <div className="bg-white dark:bg-[#0f1d17] p-2.5 sm:p-3 rounded-lg border border-slate-200/80 dark:border-emerald-900/40">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                        <span className="text-[11px] font-semibold">Pending Tasks</span>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      </div>
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">3</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Requires attention</p>
                    </div>
                  </div>

                  {/* AI Daily Brief Section */}
                  <div className="bg-white dark:bg-[#0f1d17] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-emerald-900/40">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-emerald-900/30">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Daily Brief</h2>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Updated 8m ago</span>
                    </div>

                    <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mb-4">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                        <span>
                          <strong>2 guests</strong> are checking in today (Rahul & Ananya).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />
                        <span>
                          <strong>1 room</strong> (Room 201) will become available tomorrow.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />
                        <span>
                          You have <strong>3 pending guest requests</strong> waiting for response.
                        </span>
                      </li>
                    </ul>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setActiveTab('tabRequests')}
                        className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer min-h-[44px] flex items-center gap-1"
                      >
                        <span>View Requests</span>
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Recent Activity Section */}
                  <div className="bg-white dark:bg-[#0f1d17] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-emerald-900/40">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-emerald-900/30">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h2>
                      <span className="text-[11px] text-slate-400 font-medium">Today</span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-emerald-900/20">
                      <div className="py-2.5 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Rahul checked in</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Room 203 • Checked in at 10:30 AM</p>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">25m ago</span>
                      </div>

                      <div className="py-2.5 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">New request: Extra blanket</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Guest in Room 101 requested 1 extra blanket</p>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">1h ago</span>
                      </div>

                      <div className="py-2.5 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Payment received ₹4,800</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">UPI payment confirmed for Booking #HB-104</p>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">2h ago</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Assistance Panel Widget Column */}
                <div className="space-y-4">
                  {/* CARD 1: AI Guest Assistant (HIDDEN ON MOBILE, VISIBLE ON DESKTOP) */}
                  <div className="hidden lg:block bg-[#f0f7f4] dark:bg-[#0c1f19] p-4 sm:p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/50 shadow-2xs">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-900/80 flex items-center justify-center text-emerald-800 dark:text-emerald-300 shrink-0 shadow-2xs">
                        <Bot className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">AI Guest Assistant</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Ask anything about your stay, services or local area.
                        </p>
                      </div>
                    </div>

                    {/* Speech Bubble + Mountain Badge */}
                    <div className="my-3.5 flex items-center gap-2">
                      <div className="flex-1 bg-white dark:bg-[#07130e] p-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-2xs border border-emerald-100/80 dark:border-emerald-900/40 relative">
                        "Where can I have breakfast?"
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-100/80 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700/50 flex items-center justify-center shrink-0 text-emerald-800 dark:text-emerald-300 text-base shadow-2xs">
                        🏔️
                      </div>
                    </div>

                    {/* Suggested Questions */}
                    <div className="mt-3">
                      <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-300 mb-2">Suggested Questions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Where can I eat?', icon: '🍳' },
                          { label: 'What can I visit?', icon: '🏔️' },
                          { label: 'Check-out time?', icon: '🕒' },
                          { label: 'Room service', icon: '🛏️' },
                          { label: 'Nearby places', icon: '📍' },
                          { label: 'Emergency', icon: '🚨' }
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            onClick={() => {
                              setActiveTab('tabAiAssistant');
                              handleSendAiMessage(chip.label);
                            }}
                            className="w-full bg-white dark:bg-[#07130e] hover:bg-emerald-50 dark:hover:bg-emerald-950/80 border border-slate-200/80 dark:border-emerald-900/50 rounded-full px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer truncate"
                          >
                            <span className="shrink-0">{chip.icon}</span>
                            <span className="truncate">{chip.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: Guest Welcome Mode (HIDDEN ON MOBILE, VISIBLE ON DESKTOP) */}
                  <div className="hidden lg:flex bg-[#fff8ee] dark:bg-[#1c160c] p-4 sm:p-5 rounded-3xl border border-amber-200/70 dark:border-amber-900/40 shadow-2xs relative overflow-hidden items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 z-10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                          Guest Welcome Mode
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug">
                        Help your guests feel at home
                      </p>

                      <button
                        onClick={() => alert('Guest Welcome Mode active. Starting guest check-in & welcome guide.')}
                        className="mt-3 bg-[#ea8c1e] hover:bg-[#d87d13] text-white text-xs font-bold rounded-full py-2.5 px-4 shadow-sm inline-flex items-center gap-1.5 transition-all cursor-pointer min-h-[40px]"
                      >
                        <span>Start Guest Welcome</span>
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-amber-100/60 dark:bg-amber-900/40 flex items-center justify-center text-2xl shrink-0 border border-amber-200/50 dark:border-amber-700/30">
                      🏡
                    </div>
                  </div>

                  {/* CARD 3: Emergency Mode (VISIBLE ON BOTH MOBILE AND DESKTOP) */}
                  <div className="bg-[#fff0f3] dark:bg-[#200d11] p-4 sm:p-5 rounded-3xl border border-rose-200/70 dark:border-rose-900/40 shadow-2xs relative overflow-hidden flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          !
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                          Emergency Mode
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug">
                        Quick access to help and essential phrases
                      </p>

                      <button
                        onClick={() =>
                          alert(
                            'Emergency Assistance: Local Police (112), Medical Emergency (108), Local Clinic (+91 98320 00000).'
                          )
                        }
                        className="mt-3 bg-[#ef475d] hover:bg-[#db3349] text-white text-xs font-bold rounded-full py-2.5 px-4 shadow-sm inline-flex items-center gap-1.5 transition-all cursor-pointer min-h-[40px]"
                      >
                        <span>Open Emergency Assistance</span>
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-rose-100/60 dark:bg-rose-900/40 flex items-center justify-center text-2xl shrink-0 border border-rose-200/50 dark:border-rose-700/30">
                      🚨
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED AI ASSISTANT PAGE (UI ONLY FOR MOBILE OR FLOATING NAV) */}
          {activeTab === 'tabAiAssistant' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-emerald-900/30">
                <button
                  onClick={() => setActiveTab('tabDashboard')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0f1d17] border border-slate-200 dark:border-emerald-900/40 hover:bg-slate-50 active:scale-95 transition-all min-h-[44px] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Dashboard</span>
                </button>
                <div className="text-right">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center justify-end gap-2">
                    <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>AI Guest Assistant</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ask anything about stay, services or local area
                  </p>
                </div>
              </div>

              {/* Suggested Questions Chips */}
              <div className="bg-white dark:bg-[#0f1d17] p-3.5 rounded-2xl border border-slate-200 dark:border-emerald-900/40 space-y-2">
                <p className="text-xs font-bold text-[#164A34] dark:text-emerald-300 uppercase tracking-wider">
                  Suggested Questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Where can I have breakfast?',
                    'What is the Wi-Fi password?',
                    'What are nearby places to visit?',
                    'Check-out time?',
                    'Room service'
                  ].map((qText) => (
                    <button
                      key={qText}
                      onClick={() => handleSendAiMessage(qText)}
                      className="px-3 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/50 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer min-h-[38px]"
                    >
                      {qText}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="bg-white dark:bg-[#0f1d17] p-4 rounded-2xl border border-slate-200 dark:border-emerald-900/40 min-h-[340px] max-h-[500px] flex flex-col justify-between space-y-4">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {aiChatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm font-medium ${
                          msg.sender === 'user'
                            ? 'bg-emerald-700 text-white rounded-br-none'
                            : 'bg-slate-100 dark:bg-[#07130e] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-emerald-900/40 rounded-bl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
                    </div>
                  ))}
                </div>

                {/* Input Area */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (aiInputText.trim()) {
                      handleSendAiMessage(aiInputText);
                    }
                  }}
                  className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-emerald-900/30"
                >
                  <input
                    type="text"
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    placeholder="Ask a question about your stay..."
                    className="flex-1 bg-slate-50 dark:bg-[#07130e] text-slate-900 dark:text-white px-4 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/40 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 min-h-[44px]"
                  />
                  <button
                    type="submit"
                    disabled={!aiInputText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
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
            <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-xl border border-slate-200/80 dark:border-emerald-900/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amberGold" aria-hidden="true" />
                  <span>Guest Requests</span>
                </h3>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-md">
                  3 Pending
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Extra blanket requested</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Room 101 • Rahul Sharma</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-md bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 min-h-[44px] cursor-pointer">
                    Fulfill
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Hot tea kettle refill</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Room 203 • Ananya Sen</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 min-h-[44px] cursor-pointer">
                    Fulfill
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ROOMS */}
          {activeTab === 'tabRooms' && (
            <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-xl border border-slate-200/80 dark:border-emerald-900/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <span>Room Inventory</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">4 Total Rooms</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Room 101 — Deluxe Balcony</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Occupied
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Guest: Priya & Family</p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Room 203 — Tea Suite</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Occupied
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Guest: Rahul Sharma</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SETTINGS (INCLUDES MOVED THEME TOGGLE) */}
          {activeTab === 'tabSettings' && (
            <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-xl border border-slate-200/80 dark:border-emerald-900/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-500" aria-hidden="true" />
                  <span>Homestay Owner Settings</span>
                </h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                {/* Theme Toggle Settings Option */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30 flex justify-between items-center gap-3">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                      Appearance & Theme
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Current theme mode: <strong className="capitalize text-emerald-700 dark:text-emerald-300">{theme}</strong>
                    </p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs cursor-pointer min-h-[44px]"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-4 h-4 text-amber-300" aria-hidden="true" />
                        <span>Switch to Light</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 text-emerald-200" aria-hidden="true" />
                        <span>Switch to Dark</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Homestay Name</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Mountain View Homestay</p>
                  </div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium cursor-pointer">
                    Edit Profile
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating Circular AI Icon Button (Shown ONLY on Mobile Dashboard when activeTab === 'tabDashboard') */}
      {activeTab === 'tabDashboard' && (
        <button
          onClick={() => {
            setActiveTab('tabAiAssistant');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="lg:hidden fixed bottom-5 right-5 z-40 w-[52px] h-[52px] rounded-full bg-[#164A34] hover:bg-[#123D2A] active:scale-95 text-white shadow-lg border-2 border-emerald-400/70 flex items-center justify-center cursor-pointer transition-all"
          aria-label="Open AI Guest Assistant"
        >
          <Bot className="w-5 h-5 text-emerald-200" />
        </button>
      )}
    </div>
  );
}
