import React, { useState, useEffect, useCallback } from 'react';
import { homestayDB } from './services/db';
import { api } from './services/api';
import GuestCommunicator from './components/GuestCommunicator';
import BookingsLedger from './components/BookingsLedger';
import ListingPricing from './components/ListingPricing';
import HostReadinessChecklist from './components/HostReadinessChecklist';
import PropertySetup from './components/PropertySetup';
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
  ArrowLeft,
  LogOut,
  Building,
  Building2,
  Mountain,
  Utensils,
  Clock,
  BedDouble,
  Plus,
  Pencil,
  CheckCircle2
} from 'lucide-react';
import QRCode from 'qrcode';

function formatDisplayDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, monthIndex, day);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? clean : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch (e) {
    return String(dateStr);
  }
}

function formatStatus(status) {
  if (status === 'upcoming') return 'Upcoming';
  if (status === 'checked_in') return 'Checked-in';
  if (status === 'checked_out') return 'Checked-out';
  return status || 'Vacant';
}

export default function OwnerApp({ onLogout }) {
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

  // Property Onboarding & Multi-Property Management State
  const [isLoadingPropertyCheck, setIsLoadingPropertyCheck] = useState(true);
  const [propertyFetchError, setPropertyFetchError] = useState(null);
  const [hasProperty, setHasProperty] = useState(false);
  const [propertiesList, setPropertiesList] = useState([]);
  const [activePropertyId, setActivePropertyId] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('activePropertyId') || null;
    }
    return null;
  });
  const [propertyViewMode, setPropertyViewMode] = useState('list'); // 'list' | 'form'
  const [editingProperty, setEditingProperty] = useState(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  const handleSelectActiveProperty = (id) => {
    setActivePropertyId(id);
    if (typeof sessionStorage !== 'undefined') {
      if (id) {
        sessionStorage.setItem('activePropertyId', id);
      } else {
        sessionStorage.removeItem('activePropertyId');
      }
    }
  };

  const fetchProperties = useCallback(async () => {
    setIsLoadingPropertyCheck(true);
    setPropertyFetchError(null);
    try {
      const response = await api.get('/api/properties');
      if (response && Array.isArray(response.properties)) {
        setPropertiesList(response.properties);
        if (response.properties.length > 0) {
          setHasProperty(true);
          setIsOnboarding(false);
          const storedId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('activePropertyId') : null;
          const exists = response.properties.some((p) => p.id === storedId);
          let targetActiveId;
          if (exists && storedId) {
            targetActiveId = storedId;
          } else {
            targetActiveId = response.properties[0].id;
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('activePropertyId', targetActiveId);
            }
          }
          setActivePropertyId(targetActiveId);
        } else {
          // Zero properties -> Mandatory onboarding mode
          setPropertiesList([]);
          setHasProperty(false);
          setActivePropertyId(null);
          setIsOnboarding(true);
          setPropertyViewMode('form');
          setEditingProperty(null);
          setActiveTab('tabProperty');
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('activePropertyId');
          }
        }
      } else {
        setPropertiesList([]);
        setHasProperty(false);
        setActivePropertyId(null);
        setIsOnboarding(true);
        setPropertyViewMode('form');
        setEditingProperty(null);
        setActiveTab('tabProperty');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('activePropertyId');
        }
      }
    } catch (err) {
      console.error('[OwnerApp] Failed to fetch properties from backend:', err);
      setPropertyFetchError(err.message || 'Failed to load properties from server. Please check connection.');
    } finally {
      setIsLoadingPropertyCheck(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handlePropertySaved = (savedProp) => {
    const wasOnboarding = isOnboarding || propertiesList.length === 0;
    if (savedProp && savedProp.id) {
      handleSelectActiveProperty(savedProp.id);
    }
    setHasProperty(true);
    setIsOnboarding(false);
    setPropertyViewMode('list');
    setEditingProperty(null);
    fetchProperties();
    if (wasOnboarding) {
      setActiveTab('tabDashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeProperty = propertiesList.find((p) => p.id === activePropertyId) || propertiesList[0] || null;
  const activePropertyName = activeProperty ? (activeProperty.name || activeProperty.propertyName || 'My Homestay') : 'Homestay Helper';

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
    { id: 'tabProperty', label: 'Property Setup', Icon: Building },
    { id: 'tabSettings', label: 'Settings', Icon: Settings }
  ];

  if (isLoadingPropertyCheck) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <img
            src="./icons/icon-192.png"
            alt="Homestay Helper Logo"
            className="w-14 h-14 rounded-2xl border-2 border-amberGold bg-forest-900 shadow-md animate-pulse"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Homestay Helper</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Checking property setup status...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              <p className="text-xs text-emerald-200 dark:text-emerald-300/90 truncate font-medium flex items-center gap-1.5">
                <span>{activePropertyName}</span>
                <span>•</span>
                <span>Darjeeling Hills</span>
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
            className={`lg:hidden fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ease-out ${drawerAnimatingOut ? 'opacity-0' : 'opacity-100'
              }`}
            aria-hidden="true"
          />

          {/* Opaque White Left-Sided Overlay Drawer */}
          <aside
            className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[74vw] max-w-[290px] bg-white dark:bg-[#0c1813] border-r border-slate-200/70 dark:border-emerald-900/30 shadow-xl rounded-r-2xl py-4 px-3 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-out ${drawerAnimatingOut ? '-translate-x-full' : 'translate-x-0'
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
                {!hasProperty && (
                  <div className="mb-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Complete Property Setup to unlock dashboard.</span>
                  </div>
                )}
                {navItems.map((item) => {
                  const ItemIcon = item.Icon;
                  const isActive = activeTab === item.id;
                  const isDisabled = !hasProperty && item.id !== 'tabProperty';
                  return (
                    <button
                      key={item.id}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        closeDrawer(() => {
                          setActiveTab(item.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        });
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer min-h-[46px] ${isDisabled
                          ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                          : isActive
                            ? 'bg-[#f0f7f3] dark:bg-[#0e241b] text-[#123D2A] dark:text-emerald-300 font-medium border-l-3 border-[#164A34] dark:border-emerald-400'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-emerald-950/30'
                        }`}
                    >
                      <ItemIcon
                        className={`w-[18px] h-[18px] stroke-[1.5] shrink-0 ${isActive ? 'text-[#164A34] dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
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
          {!hasProperty && (
            <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 text-xs font-semibold leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>First-Time Setup: Please complete Property Setup to unlock the dashboard.</span>
            </div>
          )}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const ItemIcon = item.Icon;
              const isActive = activeTab === item.id;
              const isDisabled = !hasProperty && item.id !== 'tabProperty';
              return (
                <button
                  key={item.id}
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    setActiveTab(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-base font-semibold transition-all cursor-pointer ${isDisabled
                      ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                      : isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-bold border-r-3 border-emerald-600 dark:border-emerald-400 shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-emerald-950/30'
                    }`}
                >
                  <ItemIcon
                    className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
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

                  {/* ROOM BOOKINGS BY ROOM (A10-FLOW-FIX QR DRIVEN FLOW - REQUIREMENT 13) */}
                  <div className="bg-white dark:bg-[#0f1d17] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-emerald-900/40 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Room Bookings</span>
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Active guest bookings and QR check-ins for {activePropertyName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadRoomsAndBookings(activePropertyId)}
                          title="Refresh Bookings"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRooms ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => setActiveTab('tabRooms')}
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Room QRs</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isLoadingRooms && rooms.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                        Loading room booking status...
                      </div>
                    ) : rooms.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        No rooms configured yet for this property.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {rooms.map((room) => {
                          const roomBookings = bookings.filter((b) => b.room_id === room.id);
                          const activeBooking =
                            roomBookings.find((b) => b.status === 'checked_in') ||
                            roomBookings.find((b) => b.status === 'upcoming') ||
                            (roomBookings.length > 0 ? roomBookings[0] : null);

                          return (
                            <div
                              key={room.id}
                              className="border border-slate-200/80 dark:border-emerald-900/50 rounded-xl p-3.5 bg-slate-50/60 dark:bg-[#07130e] flex flex-col justify-between shadow-2xs hover:border-emerald-500/50 transition-all"
                            >
                              <div>
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-emerald-900/40">
                                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white truncate">
                                    {room.name}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeBooking?.status === 'checked_in'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : activeBooking?.status === 'upcoming'
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                      }`}
                                  >
                                    {activeBooking ? formatStatus(activeBooking.status) : 'Vacant'}
                                  </span>
                                </div>

                                {activeBooking ? (
                                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium my-1">
                                    <p>
                                      <span className="text-slate-500 dark:text-slate-400 font-normal">Guest:</span>{' '}
                                      <strong className="font-semibold text-slate-900 dark:text-white">
                                        {activeBooking.guest_name}
                                      </strong>
                                    </p>
                                    <p>
                                      <span className="text-slate-500 dark:text-slate-400 font-normal">Phone:</span>{' '}
                                      {activeBooking.guest_phone}
                                    </p>
                                    <p>
                                      <span className="text-slate-500 dark:text-slate-400 font-normal">Check-in:</span>{' '}
                                      {formatDisplayDate(activeBooking.check_in)}
                                    </p>
                                    <p>
                                      <span className="text-slate-500 dark:text-slate-400 font-normal">Check-out:</span>{' '}
                                      {formatDisplayDate(activeBooking.check_out)}
                                    </p>
                                    <p>
                                      <span className="text-slate-500 dark:text-slate-400 font-normal">Status:</span>{' '}
                                      <span className="font-semibold">{formatStatus(activeBooking.status)}</span>
                                    </p>
                                  </div>
                                ) : (
                                  <div className="py-3 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                    <p className="font-medium text-slate-700 dark:text-slate-300">No active booking</p>
                                    <p className="text-[11px] text-slate-400">Ready for guest QR check-in</p>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-emerald-900/40">
                                {activeBooking ? (
                                  <button
                                    onClick={() => setSelectedBookingForModal({ ...activeBooking, roomName: room.name })}
                                    className="w-full py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View Details</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setShowQrModalRoom(room)}
                                    className="w-full py-1.5 px-3 rounded-lg bg-slate-200 dark:bg-emerald-950/70 hover:bg-emerald-700 hover:text-white text-slate-700 dark:text-emerald-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                    <span>Show Room QR</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                        <Mountain className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                      </div>
                    </div>

                    {/* Suggested Questions */}
                    <div className="mt-3">
                      <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-300 mb-2">Suggested Questions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Where can I eat?', Icon: Utensils },
                          { label: 'What can I visit?', Icon: Mountain },
                          { label: 'Check-out time?', Icon: Clock },
                          { label: 'Room service', Icon: BedDouble },
                          { label: 'Nearby places', Icon: MapPin },
                          { label: 'Emergency', Icon: ShieldAlert }
                        ].map((chip) => {
                          const ChipIcon = chip.Icon;
                          return (
                            <button
                              key={chip.label}
                              onClick={() => {
                                setActiveTab('tabAiAssistant');
                                handleSendAiMessage(chip.label);
                              }}
                              className="w-full bg-white dark:bg-[#07130e] hover:bg-emerald-50 dark:hover:bg-emerald-950/80 border border-slate-200/80 dark:border-emerald-900/50 rounded-full px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer truncate"
                            >
                              <ChipIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                              <span className="truncate">{chip.label}</span>
                            </button>
                          );
                        })}
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

                    <div className="w-12 h-12 rounded-2xl bg-amber-100/60 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 border border-amber-200/50 dark:border-amber-700/30">
                      <Building2 className="w-6 h-6" />
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

                    <div className="w-12 h-12 rounded-2xl bg-rose-100/60 dark:bg-rose-900/40 flex items-center justify-center text-rose-700 dark:text-rose-300 shrink-0 border border-rose-200/50 dark:border-rose-700/30">
                      <ShieldAlert className="w-6 h-6" />
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
                        className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm font-medium ${msg.sender === 'user'
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

          {/* TAB 1.5: PROPERTY SETUP & MANAGEMENT */}
          {activeTab === 'tabProperty' && (
            <div>
              {propertyViewMode === 'form' ? (
                <PropertySetup
                  onSaveSuccess={handlePropertySaved}
                  existingProperty={editingProperty}
                  isOnboarding={isOnboarding}
                  onCancel={
                    !isOnboarding && propertiesList.length > 0
                      ? () => {
                        setEditingProperty(null);
                        setPropertyViewMode('list');
                      }
                      : null
                  }
                />
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* Management Header */}
                  <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-800 dark:text-emerald-300 shrink-0">
                        <Building2 className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          Property Setup & Management
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                          Manage your homestay properties loaded directly from server.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Error State Banner */}
                  {propertyFetchError && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-200 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold">{propertyFetchError}</span>
                      </div>
                      <button
                        onClick={fetchProperties}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto min-h-[38px]"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}

                  {/* Loading State Skeleton / Spinner */}
                  {isLoadingPropertyCheck ? (
                    <div className="p-8 rounded-2xl bg-white dark:bg-[#0f1d17] border border-slate-200/80 dark:border-emerald-900/40 text-center space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Loading properties from server...
                      </p>
                    </div>
                  ) : (
                    /* Property Cards Grid */
                    <div className="space-y-4">
                      {/* Empty State Banner */}
                      {propertiesList.length === 0 && !propertyFetchError && (
                        <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1d17] border border-slate-200/80 dark:border-emerald-900/40 text-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 mx-auto">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Properties Found</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                              No homestays registered under your account yet. Click "+ Add New Property" below to get started.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {propertiesList.map((prop) => {
                          const isActive = prop.id === activePropertyId;
                          const roomCount = prop.total_rooms || prop.totalRooms || 4;
                          return (
                            <div
                              key={prop.id}
                              onClick={() => handleSelectActiveProperty(prop.id)}
                              className={`p-5 rounded-2xl transition-all cursor-pointer relative flex flex-col justify-between group ${isActive
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-2 border-emerald-600 dark:border-emerald-400 shadow-sm'
                                  : 'bg-white dark:bg-[#0f1d17] border border-slate-200/80 dark:border-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-xs'
                                }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg leading-tight truncate flex-1">
                                    {prop.name || prop.propertyName || 'Homestay Property'}
                                  </h3>
                                  {isActive && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shrink-0">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      Active
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {prop.address || 'Takdah, Darjeeling Hills'}
                                </p>

                                <div className="pt-1 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                    <BedDouble className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    {roomCount} Rooms
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-900/30 flex items-center justify-between">
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {isActive ? 'Currently Active' : 'Click to select'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProperty(prop);
                                    setPropertyViewMode('form');
                                  }}
                                  title="Edit property details"
                                  aria-label="Edit Property"
                                  className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                                >
                                  <Pencil className="w-4 h-4 stroke-[2]" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* "+ Add New Property" Card */}
                        <div
                          onClick={() => {
                            setEditingProperty(null);
                            setPropertyViewMode('form');
                          }}
                          className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-emerald-800/60 hover:border-emerald-600 dark:hover:border-emerald-400 bg-slate-50/50 dark:bg-[#07130e]/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 min-h-[160px] group"
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 group-hover:scale-110 transition-transform">
                            <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                              + Add New Property
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                              Add another homestay
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  <button className="px-3 py-1.5 rounded-md bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 min-h-[44px] cursor-pointer">
                    Fulfill
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ROOMS (SYSTEM CONFIGURATION & QR ENTRY POINTS) */}
          {activeTab === 'tabRooms' && (
            <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-xl border border-slate-200/80 dark:border-emerald-900/40 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30 gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>Room Inventory & Guest QR Codes</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Permanent property rooms for {activePropertyName}. Each room has a stable ID and QR code for guest bookings.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadRoomsAndBookings(activePropertyId)}
                    title="Refresh Rooms"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-emerald-900/40 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRooms ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {rooms.length} System Rooms
                  </span>
                </div>
              </div>

              {/* Architecture info notice (Adheres to Requirements 3 & 4) */}
              <div className="p-3.5 bg-emerald-50/70 dark:bg-[#071912] rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">QR-Driven Booking Architecture</p>
                  <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    Rooms are permanent property configuration entities. Owners do not manually create rooms during daily operations.
                    Guests scan the room's permanent QR code to view room details and submit bookings with required ID documents.
                  </p>
                </div>
              </div>

              {/* Rooms List */}
              {isLoadingRooms && rooms.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                  Loading system room inventory and generating QR codes...
                </div>
              ) : rooms.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                  No rooms provisioned for this property yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {rooms.map((room) => {
                    const roomBookings = bookings.filter((b) => b.room_id === room.id);
                    const activeBooking =
                      roomBookings.find((b) => b.status === 'checked_in') ||
                      roomBookings.find((b) => b.status === 'upcoming') ||
                      (roomBookings.length > 0 ? roomBookings[0] : null);

                    return (
                      <div
                        key={room.id}
                        className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200/80 dark:border-emerald-900/40 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between shadow-2xs hover:border-emerald-500/50 transition-all"
                      >
                        {/* Room Info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                              {room.name}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeBooking?.status === 'checked_in'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : activeBooking?.status === 'upcoming'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                            >
                              {activeBooking ? formatStatus(activeBooking.status) : 'Vacant'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>
                              Capacity: <strong className="text-slate-700 dark:text-slate-200">{room.capacity || 2} Guests</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Rate: <strong className="text-emerald-700 dark:text-emerald-400">₹{Number(room.price || 0).toLocaleString('en-IN')}/night</strong>
                            </span>
                          </div>

                          {room.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {room.description}
                            </p>
                          )}

                          {/* Stable Room ID Badge */}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] font-mono bg-white dark:bg-[#06120e] px-2 py-1 rounded border border-slate-200 dark:border-emerald-900/60 text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                              <Key className="w-3 h-3 text-emerald-600" />
                              <span>Room ID: {room.id}</span>
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(room.id);
                                setCopiedRoomId(room.id);
                                setTimeout(() => setCopiedRoomId(null), 2000);
                              }}
                              title="Copy Room ID"
                              className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedRoomId === room.id ? (
                                <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Copied ID
                                </span>
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Active Guest Info if booked */}
                          {activeBooking && (
                            <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-[#071410] border border-slate-200/60 dark:border-emerald-900/40 text-xs">
                              <span className="text-slate-400">Current Booking: </span>
                              <strong className="text-slate-900 dark:text-white">{activeBooking.guest_name}</strong>
                              <span className="text-slate-400">
                                {' '}
                                ({activeBooking.guest_phone}) • {formatDisplayDate(activeBooking.check_in)} –{' '}
                                {formatDisplayDate(activeBooking.check_out)}
                              </span>
                              <button
                                onClick={() => setSelectedBookingForModal({ ...activeBooking, roomName: room.name })}
                                className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                              >
                                View Details
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Room QR Code & Actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                          {roomQrUrls[room.id]?.qrDataUrl ? (
                            <div
                              onClick={() => setShowQrModalRoom(room)}
                              title="Click to enlarge QR Code"
                              className="p-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                            >
                              <img
                                src={roomQrUrls[room.id].qrDataUrl}
                                alt={`QR code for ${room.name}`}
                                className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                              />
                              <p className="text-[9px] text-center text-slate-400 mt-0.5 font-medium">Click to enlarge</p>
                            </div>
                          ) : (
                            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-200 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-xs text-slate-400">
                              Loading QR...
                            </div>
                          )}

                          <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => {
                                const link = `${window.location.origin}/guest/room/${room.id}`;
                                navigator.clipboard.writeText(link);
                                setCopiedRoomLink(room.id);
                                setTimeout(() => setCopiedRoomLink(null), 2000);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-emerald-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            >
                              {copiedRoomLink === room.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Link Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>

                            <a
                              href={`/guest/room/${room.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Page</span>
                            </a>

                            <button
                              onClick={() => setShowQrModalRoom(room)}
                              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-emerald-950/70 hover:bg-slate-300 dark:hover:bg-emerald-900 text-slate-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Show QR</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: SETTINGS (INCLUDES MOVED THEME TOGGLE & LOGOUT) */}
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
                    title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                    aria-label="Toggle Theme"
                    className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-emerald-950/70 active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-200/60 dark:border-emerald-900/40"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-5 h-5 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Moon className="w-5 h-5 text-slate-700 dark:text-emerald-300" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Sign Out Option */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200/60 dark:border-emerald-900/30 flex justify-between items-center gap-3">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                      Owner Account Session
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Sign out of Homestay Owner Dashboard
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    aria-label="Sign Out"
                    className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-200/60 dark:border-emerald-900/40"
                  >
                    <LogOut className="w-5 h-5" aria-hidden="true" />
                  </button>
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

      {/* BOOKING DETAILS MODAL (VIEW DETAILS ACTION) */}
      {selectedBookingForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1a14] rounded-2xl max-w-md w-full border border-slate-200 dark:border-emerald-900/60 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Booking Details — {selectedBookingForModal.roomName || selectedBookingForModal.room_name || 'Room'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBookingForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#07130e] border border-slate-200/60 dark:border-emerald-900/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Guest Name</span>
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    {selectedBookingForModal.guest_name}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Phone Number</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono">
                    {selectedBookingForModal.guest_phone}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Check-in</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {formatDisplayDate(selectedBookingForModal.check_in)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Check-out</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {formatDisplayDate(selectedBookingForModal.check_out)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Booking Status</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${selectedBookingForModal.status === 'checked_in'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : selectedBookingForModal.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                  >
                    {formatStatus(selectedBookingForModal.status)}
                  </span>
                </div>
              </div>

              {/* Booking & Room Metadata */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 font-mono p-2.5 rounded-lg bg-slate-100/70 dark:bg-[#07130e]/70">
                <p>Booking ID: {selectedBookingForModal.id}</p>
                <p>Room ID: {selectedBookingForModal.room_id}</p>
              </div>

              {/* State Machine Transition Controls (A11 State Machine) */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Booking Lifecycle Actions:
                </p>
                {selectedBookingForModal.status === 'upcoming' && (
                  <button
                    onClick={() => handleBookingCheckIn(selectedBookingForModal.id)}
                    disabled={bookingActionLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{bookingActionLoading ? 'Processing...' : 'Check-In Guest (Transition to Checked-in)'}</span>
                  </button>
                )}

                {selectedBookingForModal.status === 'checked_in' && (
                  <button
                    onClick={() => handleBookingCheckOut(selectedBookingForModal.id)}
                    disabled={bookingActionLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{bookingActionLoading ? 'Processing...' : 'Check-Out Guest (Transition to Checked-out)'}</span>
                  </button>
                )}

                {selectedBookingForModal.status === 'checked_out' && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>This stay is completed. The guest has checked out.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-emerald-900/30">
              <button
                onClick={() => setSelectedBookingForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROOM QR MODAL (PRINT & SCAN PREVIEW) */}
      {showQrModalRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1a14] rounded-2xl max-w-sm w-full border border-slate-200 dark:border-emerald-900/60 shadow-2xl p-5 sm:p-6 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-emerald-900/30">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                {showQrModalRoom.name} QR Code
              </h3>
              <button
                onClick={() => setShowQrModalRoom(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Guests scan this QR code to access the booking and self-check-in form for this specific room.
            </p>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-inner inline-block">
              {roomQrUrls[showQrModalRoom.id]?.qrDataUrl ? (
                <img
                  src={roomQrUrls[showQrModalRoom.id].qrDataUrl}
                  alt={`QR for ${showQrModalRoom.name}`}
                  className="w-52 h-52 mx-auto object-contain"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 break-all p-2 rounded bg-slate-100 dark:bg-[#07130e] border border-slate-200/60 dark:border-emerald-900/40">
              {window.location.origin}/guest/room/{showQrModalRoom.id}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const link = `${window.location.origin}/guest/room/${showQrModalRoom.id}`;
                  navigator.clipboard.writeText(link);
                  setCopiedRoomLink(showQrModalRoom.id);
                  setTimeout(() => setCopiedRoomLink(null), 2000);
                }}
                className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-emerald-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedRoomLink === showQrModalRoom.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <a
                href={`/guest/room/${showQrModalRoom.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Page</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
