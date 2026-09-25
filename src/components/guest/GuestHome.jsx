import React, { useState, useEffect, useCallback } from 'react';
import {
  BedDouble,
  Bed,
  Bath,
  GlassWater,
  Brush,
  MoreHorizontal,
  Calendar,
  Phone,
  MapPin,
  Wifi,
  Copy,
  Check,
  Bell,
  Compass,
  AlertTriangle,
  User,
  X,
  Sparkles,
  ChevronRight,
  Clock
} from 'lucide-react';

const REQUEST_ITEM_OPTIONS = [
  { id: 'Extra Towel', label: 'Extra Towel', icon: Bath },
  { id: 'Extra Pillow', label: 'Extra Pillow', icon: Bed },
  { id: 'Blanket', label: 'Blanket', icon: Bed },
  { id: 'Drinking Water', label: 'Drinking Water', icon: GlassWater },
  { id: 'Toiletries', label: 'Toiletries', icon: Sparkles },
  { id: 'Room Cleaning', label: 'Room Cleaning', icon: Brush },
  { id: 'Other', label: 'Other', icon: MoreHorizontal }
];

export default function GuestHome({ data, token }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [confirmCancelReq, setConfirmCancelReq] = useState(null);
  const [isCancellingReq, setIsCancellingReq] = useState(false);
  const [selectedItem, setSelectedItem] = useState('Extra Towel');
  const [customItem, setCustomItem] = useState('');
  const [note, setNote] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState(null);
  const [requestError, setRequestError] = useState(null);
  const [guestRequests, setGuestRequests] = useState([]);

  const activeToken = token || (typeof window !== 'undefined' ? window.location.pathname.split('/stay/')[1] : null);

  const fetchGuestRequests = useCallback(async () => {
    if (!activeToken) return;
    try {
      const res = await fetch(`/api/guest/stay/${activeToken}/requests`);
      if (res.ok) {
        const resData = await res.json();
        setGuestRequests(resData.requests || []);
      }
    } catch (err) {
      console.warn('Failed to load guest requests:', err);
    }
  }, [activeToken]);

  useEffect(() => {
    fetchGuestRequests();
  }, [fetchGuestRequests]);

  if (!data) return null;

  const { guest, property, stay, wifi } = data;

  const activeRequests = guestRequests.filter(
    (r) => (r.status || '').toUpperCase() !== 'COMPLETED' && (r.status || '').toUpperCase() !== 'REJECTED' && (r.status || '').toUpperCase() !== 'CANCELLED'
  );

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

  const handleCancelGuestRequest = async () => {
    if (!confirmCancelReq || !activeToken) return;
    setIsCancellingReq(true);
    try {
      const res = await fetch(`/api/guest/stay/${activeToken}/requests/${confirmCancelReq.id}/cancel`, {
        method: 'PATCH'
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to cancel request');
      }
      await fetchGuestRequests();
      setConfirmCancelReq(null);
    } catch (err) {
      console.error('Error cancelling guest request:', err);
      alert(err.message || 'Failed to cancel request');
    } finally {
      setIsCancellingReq(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!activeToken) {
      setRequestError('Stay token not found. Cannot submit request.');
      return;
    }

    const itemToSubmit = selectedItem === 'Other' ? customItem.trim() : selectedItem;
    if (!itemToSubmit) {
      setRequestError('Please specify a request item.');
      return;
    }

    setIsSubmittingRequest(true);
    setRequestError(null);
    setRequestSuccessMsg(null);

    try {
      const res = await fetch(`/api/guest/stay/${activeToken}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: itemToSubmit,
          note: note.trim() || undefined
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to submit request');
      }

      setRequestSuccessMsg('Request sent successfully.');
      setNote('');
      if (selectedItem === 'Other') setCustomItem('');
      await fetchGuestRequests();

      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccessMsg(null);
      }, 1500);
    } catch (err) {
      console.error('Error submitting guest request:', err);
      setRequestError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto w-full pb-8">
      {/* A. Welcome Section */}
      <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-4 border border-slate-200 dark:border-emerald-900/40 shadow-xs dark:shadow-md transition-colors flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
            <span>Welcome, {guest?.name || 'Guest'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
            Enjoy your stay{property?.name ? ` at ${property.name}` : ''}
          </p>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 shrink-0">
          Active Stay
        </span>
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
            {property?.address && String(property.address).trim().length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-amberGold shrink-0" aria-hidden="true" />
                <span>{String(property.address).trim()}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0b1612] p-3 rounded-xl border border-slate-200/80 dark:border-emerald-900/30 gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                Host: <strong className="text-slate-900 dark:text-white">{property?.hostName || 'Homestay Owner'}</strong>
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
      {wifi && wifi.ssid && wifi.password && (
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
                Network: <strong className="text-slate-900 dark:text-white font-mono">{wifi.ssid}</strong>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Password: <strong className="text-slate-900 dark:text-amberGold font-mono">{wifi.password}</strong>
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
                  <span>Copied</span>
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
      )}

      {/* E. Quick Actions Section */}
      <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-4 border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-md transition-colors space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">
          Quick Actions
        </h3>

        {/* Request Item - Full-Width Primary Action */}
        <div className="w-full p-3.5 rounded-2xl border bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 font-bold">
                <Bell className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs sm:text-sm font-extrabold block truncate">Request Item or Service</span>
                <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium block truncate">Towel, water, blanket, cleaning...</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowRequestModal(true);
                setRequestError(null);
                setRequestSuccessMsg(null);
              }}
              className="text-xs font-bold px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-400 dark:text-amber-950 shadow-2xs shrink-0 cursor-pointer transition-all active:scale-95"
            >
              Request
            </button>
          </div>

          {guestRequests.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                {activeRequests.length > 0
                  ? `${activeRequests.length} active request${activeRequests.length > 1 ? 's' : ''}`
                  : `${guestRequests.length} request${guestRequests.length > 1 ? 's' : ''}`}
              </span>
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="text-[11px] font-bold text-amber-900 dark:text-amber-200 underline hover:text-amber-700 cursor-pointer flex items-center gap-1"
              >
                <span>View Requests</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Row - 2 Equal Cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('trip-planner-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer min-h-[72px] bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700/50 hover:border-sky-300"
          >
            <Compass className="w-5 h-5" aria-hidden="true" />
            <span className="text-xs font-bold text-center leading-tight">Trip Planner</span>
          </button>

          {property?.hostPhone ? (
            <a
              href={`tel:${property.hostPhone}`}
              className="p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer min-h-[72px] bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/50 hover:border-rose-300 text-center"
            >
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs font-bold text-center leading-tight">Emergency</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => alert('Emergency Contact: Please contact your homestay reception.')}
              className="p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer min-h-[72px] bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/50 hover:border-rose-300 text-center"
            >
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs font-bold text-center leading-tight">Emergency</span>
            </button>
          )}
        </div>
      </div>

      {/* REQUEST ITEM MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1a14] rounded-2xl max-w-md w-full border border-slate-200 dark:border-emerald-900/60 shadow-2xl p-5 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Request Item or Service
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {requestSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{requestSuccessMsg}</span>
              </div>
            )}

            {requestError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                {requestError}
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Item / Service <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REQUEST_ITEM_OPTIONS.map((opt) => {
                    const IconComp = opt.icon;
                    const isSelected = selectedItem === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedItem(opt.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-[#07130e] border-slate-200 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedItem === 'Other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Specify Item Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    placeholder="e.g. Extra blanket, Hot water kettle..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 bg-slate-50 dark:bg-[#07130e] text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Please deliver around 9 PM..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 bg-slate-50 dark:bg-[#07130e] text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/60 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-emerald-950 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest || (selectedItem === 'Other' && !customItem.trim())}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white dark:text-amber-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm min-h-[40px]"
                >
                  {isSubmittingRequest ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW REQUESTS HISTORY MODAL (COMPACT ROWS) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1a14] rounded-2xl max-w-md w-full border border-slate-200 dark:border-emerald-900/60 shadow-2xl p-5 space-y-4 animate-fadeIn max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Your Requests
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {guestRequests.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No requests submitted yet.</p>
              ) : (
                guestRequests.map((reqItem) => {
                  const statusUpper = (reqItem.status || 'PENDING').toUpperCase();
                  let badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                  let statusLabel = 'Pending';

                  if (statusUpper === 'IN_PROGRESS' || statusUpper === 'ACCEPTED') {
                    badgeColor = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800';
                    statusLabel = 'In Progress';
                  } else if (statusUpper === 'COMPLETED') {
                    badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                    statusLabel = 'Completed';
                  } else if (statusUpper === 'REJECTED') {
                    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                    statusLabel = 'Declined';
                  } else if (statusUpper === 'CANCELLED') {
                    badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
                    statusLabel = 'Cancelled';
                  }

                  return (
                    <div
                      key={reqItem.id}
                      className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-[#0b1612] border border-slate-200/80 dark:border-emerald-900/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {reqItem.type}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 uppercase tracking-wider ${badgeColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        {reqItem.note && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate">
                            "{reqItem.note}"
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 block">
                          Requested {new Date(reqItem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {statusUpper === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelReq(reqItem)}
                          className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/80 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                          title="Cancel Request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-xs shrink-0 select-none px-1">—</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-emerald-900/30 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowHistoryModal(false);
                  setShowRequestModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white dark:text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs min-h-[40px]"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>New Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GUEST CANCEL CONFIRMATION MODAL */}
      {confirmCancelReq && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1a14] rounded-2xl max-w-xs w-full border border-slate-200 dark:border-emerald-900/60 shadow-2xl p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Cancel Request?</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to cancel your request for <strong>{confirmCancelReq.type}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmCancelReq(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-emerald-900/60 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-emerald-950 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCancellingReq}
                onClick={handleCancelGuestRequest}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs min-h-[32px]"
              >
                {isCancellingReq ? 'Cancelling...' : 'Yes, Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

