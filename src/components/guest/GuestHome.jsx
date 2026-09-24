import React, { useState } from 'react';
import {
  BedDouble,
  Calendar,
  Phone,
  MapPin,
  Wifi,
  Copy,
  Check,
  MessageSquare,
  Bell,
  Compass,
  AlertTriangle,
  User
} from 'lucide-react';

export default function GuestHome({ data }) {
  const [copySuccess, setCopySuccess] = useState(false);

  if (!data) return null;

  const { guest, property, stay, wifi } = data;

  const handleCopyWifi = async () => {
    if (!wifi?.password) return;
    try {
      await navigator.clipboard.writeText(wifi.password);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.warn('Failed to copy wifi password:', err);
    }
  };

  const quickActions = [
    {
      id: 'action_chat',
      label: 'Talk to Host',
      icon: MessageSquare,
      color: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50'
    },
    {
      id: 'action_request',
      label: 'Request Item',
      icon: Bell,
      color: 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50'
    },
    {
      id: 'action_trip',
      label: 'Trip Planner',
      icon: Compass,
      color: 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700/50'
    },
    {
      id: 'action_emergency',
      label: 'Emergency',
      icon: AlertTriangle,
      color: 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/50'
    }
  ];

  return (
    <div className="space-y-4 max-w-md mx-auto w-full pb-8">
      {/* A. Welcome Section */}
      <div className="bg-gradient-to-r from-forest-900 to-forest-800 dark:from-[#07130e] dark:via-[#0b1e16] dark:to-[#0f261c] text-white rounded-2xl p-5 shadow-lg border border-forest-700/50 dark:border-emerald-900/40">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Welcome, {guest?.name || 'Guest'} 👋
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
            Active Stay
          </span>
        </div>
        <p className="text-xs text-emerald-200/90 font-medium">
          Enjoy your stay at {property?.name || 'our homestay'}
        </p>
      </div>

      {/* B. Stay Summary Card */}
      <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-4 border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-md transition-colors">
        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-emerald-900/30">
          <BedDouble className="w-5 h-5 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Your Stay Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-[#0b1612] p-3 rounded-xl border border-slate-200/80 dark:border-emerald-900/30">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              Room
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">
              {stay?.room}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
              {stay?.roomType}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-[#0b1612] p-3 rounded-xl border border-slate-200/80 dark:border-emerald-900/30">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amberGold" aria-hidden="true" /> Dates
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
              In: {stay?.checkIn}
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
              Out: {stay?.checkOut}
            </span>
          </div>
        </div>
      </div>

      {/* C. Host & Property Card */}
      <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-4 border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-md transition-colors">
        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-emerald-900/30">
          <User className="w-5 h-5 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Host & Property Details</h3>
        </div>
        <div className="space-y-2.5">
          <div>
            <span className="text-base font-bold text-forest-800 dark:text-emerald-300 block">
              {property?.name}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-amberGold shrink-0" aria-hidden="true" />
              <span>{property?.village}, {property?.location}</span>
            </p>
          </div>

          <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0b1612] p-3 rounded-xl border border-slate-200/80 dark:border-emerald-900/30 gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                Host: <strong className="text-slate-900 dark:text-white">{property?.hostName}</strong>
              </span>
            </div>
            {property?.hostPhone && (
              <a
                href={`tel:${property.hostPhone}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-600/40 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors active:scale-95 shrink-0 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>Call Host</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* D. Wi-Fi Card */}
      <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-4 border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-md transition-colors">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Wi-Fi Connection</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Guest Access
          </span>
        </div>
        <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0b1612] p-3 rounded-xl border border-slate-200/80 dark:border-emerald-900/30 gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Network: <strong className="text-slate-900 dark:text-white font-mono">{wifi?.ssid}</strong>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Password: <strong className="text-slate-900 dark:text-amberGold font-mono">{wifi?.password}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyWifi}
            aria-label="Copy Wi-Fi Password"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amberGold text-forest-950 hover:bg-amber-400 active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
          >
            {copySuccess ? (
              <>
                <Check className="w-4 h-4 text-forest-950" aria-hidden="true" />
                <span>Copied ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-forest-950" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* E. Quick Actions Grid */}
      <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-4 border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-md transition-colors">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((act) => {
            const ActIcon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer min-h-[72px] ${act.color}`}
              >
                <ActIcon className="w-6 h-6" aria-hidden="true" />
                <span className="text-xs font-bold text-center leading-tight">
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
