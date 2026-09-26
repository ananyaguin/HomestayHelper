import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Users,
  Calendar,
  Phone,
  User,
  Camera,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function GuestRoomBookingPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form State
  const [stayDuration, setStayDuration] = useState(1);
  const [totalGuests, setTotalGuests] = useState(1);
  const [guestsList, setGuestsList] = useState([
    { name: '', phone: '', email: '', id_type: 'Aadhaar', id_number: '', id_photo: null, id_photo_name: '' }
  ]);

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchRoom() {
      setIsLoading(true);
      setLoadError('');
      try {
        const res = await fetch(`/api/guest/rooms/${roomId}`);
        const data = await res.json();
        const roomData = data.room || (data.id ? data : null);
        if (res.ok && roomData) {
          if (isMounted) {
            setRoom(roomData);
            // Cap total guests if current selection exceeds room capacity
            const roomCap = Math.max(1, parseInt(roomData.capacity, 10) || 2);
            if (totalGuests > roomCap) {
              setTotalGuests(1);
              setGuestsList([
                { name: '', phone: '', email: '', id_type: 'Aadhaar', id_number: '', id_photo: null, id_photo_name: '' }
              ]);
            }
          }
        } else {
          if (isMounted) setLoadError(data.error || 'Room not found');
        }
      } catch (err) {
        console.error('Failed to load room details:', err);
        if (isMounted) setLoadError('Unable to load room details. Please try again.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (roomId) {
      fetchRoom();
    } else {
      setIsLoading(false);
      setLoadError('Invalid room ID');
    }

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const roomCapacity = Math.max(1, parseInt(room?.capacity, 10) || 2);

  const handleTotalGuestsChange = (num) => {
    const count = Math.max(1, Math.min(roomCapacity, parseInt(num, 10) || 1));
    setTotalGuests(count);
    setGuestsList((prev) => {
      const updated = [...prev];
      while (updated.length < count) {
        updated.push({ name: '', phone: '', email: '', id_type: 'Aadhaar', id_number: '', id_photo: null, id_photo_name: '' });
      }
      return updated.slice(0, count);
    });
  };

  const handleGuestChange = (index, field, value) => {
    setGuestsList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleIdPhotoChange = (index, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGuestsList((prev) => {
          const copy = [...prev];
          copy[index] = {
            ...copy[index],
            id_photo_name: file.name,
            id_photo: reader.result
          };
          return copy;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const errors = {};

    // Primary guest validation
    if (!guestsList[0]?.name?.trim()) {
      errors.primary_name = 'Please enter primary guest full name';
    }
    if (!guestsList[0]?.phone?.trim()) {
      errors.primary_phone = 'Please enter primary guest phone number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const primaryGuest = guestsList[0];

      const payload = {
        guest_name: primaryGuest.name.trim(),
        guest_phone: primaryGuest.phone.trim(),
        email: primaryGuest.email?.trim() || undefined,
        id_type: primaryGuest.id_type || undefined,
        id_number: primaryGuest.id_number?.trim() || undefined,
        total_guests: totalGuests,
        stay_duration: parseInt(stayDuration, 10) || 1,
        guests: guestsList.map((g, idx) => ({
          name: g.name.trim() || `Guest ${idx + 1}`,
          phone: g.phone?.trim() || (idx === 0 ? primaryGuest.phone.trim() : undefined),
          email: g.email?.trim() || (idx === 0 ? primaryGuest.email?.trim() : undefined),
          id_type: g.id_type || undefined,
          id_number: g.id_number?.trim() || undefined,
          id_photo: g.id_photo || undefined,
          is_primary: idx === 0
        }))
      };

      const res = await fetch(`/api/guest/rooms/${roomId}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to submit booking');
      }

      setBookingSuccess(data);
    } catch (err) {
      console.error('Booking submission error:', err);
      setSubmitError(err.message || 'An error occurred while creating your booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Loading Room Booking Details...
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !room) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#0f1d17] p-6 rounded-2xl border border-rose-200 dark:border-rose-950 text-center space-y-4 shadow-lg">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Room QR Invalid or Expired
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {loadError || 'This room does not exist or has been removed. Please scan a valid homestay room QR code.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    const stayToken = bookingSuccess.token || bookingSuccess.booking?.id;
    const checkOutStr = bookingSuccess.booking?.check_out
      ? new Date(bookingSuccess.booking.check_out).toLocaleString()
      : 'Calculated at Check-In';

    return (
      <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] text-slate-800 dark:text-slate-100 p-4 sm:p-6 flex flex-col justify-center items-center">
        <div className="max-w-md w-full bg-white dark:bg-[#0f1d17] rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 p-6 sm:p-8 shadow-xl space-y-5 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
              Booking Confirmed
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              Welcome to {room.property_name}!
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your registration is complete. Your stay access has been generated.
            </p>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-slate-50 dark:bg-[#0b1612] p-4 rounded-xl border border-slate-200/60 dark:border-emerald-900/30 text-left space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-emerald-900/20">
              <span className="text-slate-500 font-medium">Room:</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-emerald-600" />
                {room.name}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Primary Guest:</span>
              <span className="font-bold text-slate-900 dark:text-white">{guestsList[0]?.name}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Total Guests:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{totalGuests} Guest(s)</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Stay Duration:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{stayDuration} {stayDuration === 1 ? 'Day' : 'Days'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Scheduled Check-Out:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{checkOutStr}</span>
            </div>
          </div>

          <button
            onClick={() => {
              navigate(`/guest/${stayToken}`);
            }}
            className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2 shadow-md"
          >
            <span>Open Guest Stay Companion</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#080f0c] text-slate-800 dark:text-slate-100 py-6 px-4 sm:px-6">
      <div className="max-w-md mx-auto space-y-5">
        {/* Header Branding */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {room.property_name}
          </h1>
          {room.property_address && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{room.property_address}</span>
            </p>
          )}
        </div>

        {/* Selected Room Card */}
        <div className="bg-white dark:bg-[#0f1d17] p-5 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm space-y-3">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Selected Room
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <BedDouble className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{room.name}</span>
              </h2>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                ₹{Number(room.price).toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 block font-medium">/ night</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-emerald-900/30">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Capacity: {room.capacity} Guests</span>
            </span>
            {room.description && (
              <span className="truncate text-slate-500 dark:text-slate-400">
                {room.description}
              </span>
            )}
          </div>
        </div>

        {/* Guest Booking Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm space-y-5">
          <div className="border-b border-slate-100 dark:border-emerald-900/30 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Guest Registration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter guest details and select your stay duration.
            </p>
          </div>

          {submitError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Stay Duration Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Stay Duration <span className="text-rose-500">*</span></span>
            </label>
            <select
              value={stayDuration}
              onChange={(e) => setStayDuration(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-emerald-900/40 text-xs sm:text-sm bg-slate-50 dark:bg-[#0b1612] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={1}>1 Day</option>
              <option value={2}>2 Days</option>
              <option value={3}>3 Days</option>
              <option value={4}>4 Days</option>
              <option value={5}>5 Days</option>
              <option value={6}>6 Days</option>
              <option value={7}>7 Days</option>
              <option value={10}>10 Days</option>
              <option value={14}>14 Days</option>
            </select>
          </div>

          {/* Total Guests Selection (Strictly limited by room.capacity) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Total Number of Guests <span className="text-rose-500">*</span></span>
            </label>
            <select
              value={totalGuests}
              onChange={(e) => handleTotalGuestsChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-emerald-900/40 text-xs sm:text-sm bg-slate-50 dark:bg-[#0b1612] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Array.from({ length: roomCapacity }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Guest List and ID Documents */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-emerald-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                Guest Identification ({totalGuests} Registered)
              </span>
            </div>

            {guestsList.map((guest, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#0b1612]/80 border border-slate-200/80 dark:border-emerald-900/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Guest {idx + 1} {idx === 0 ? '(Primary Contact)' : ''}
                  </span>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Full Name {idx === 0 && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={guest.name}
                    onChange={(e) => handleGuestChange(idx, 'name', e.target.value)}
                    placeholder={`e.g. ${idx === 0 ? 'Priya Sen' : 'Guest Full Name'}`}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200/80 dark:border-emerald-900/40 text-xs bg-white dark:bg-[#07130e] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {idx === 0 && formErrors.primary_name && (
                    <p className="text-rose-500 text-[11px] font-semibold mt-1">{formErrors.primary_name}</p>
                  )}
                </div>

                {/* Phone & Email for Primary Guest */}
                {idx === 0 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Mobile Phone <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={guest.phone}
                          onChange={(e) => handleGuestChange(idx, 'phone', e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200/80 dark:border-emerald-900/40 text-xs bg-white dark:bg-[#07130e] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {formErrors.primary_phone && (
                          <p className="text-rose-500 text-[11px] font-semibold mt-1">{formErrors.primary_phone}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Email Address <span className="text-slate-400">(Optional)</span>
                        </label>
                        <input
                          type="email"
                          value={guest.email}
                          onChange={(e) => handleGuestChange(idx, 'email', e.target.value)}
                          placeholder="e.g. priya@example.com"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200/80 dark:border-emerald-900/40 text-xs bg-white dark:bg-[#07130e] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ID Type & Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      ID Type <span className="text-slate-400">(Optional)</span>
                    </label>
                    <select
                      value={guest.id_type || 'Aadhaar'}
                      onChange={(e) => handleGuestChange(idx, 'id_type', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200/80 dark:border-emerald-900/40 text-xs bg-white dark:bg-[#07130e] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Aadhaar">Aadhaar</option>
                      <option value="Passport">Passport</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Driving Licence">Driving Licence</option>
                      <option value="Other">Other Government ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      ID Number <span className="text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={guest.id_number || ''}
                      onChange={(e) => handleGuestChange(idx, 'id_number', e.target.value)}
                      placeholder="e.g. 1234 5678 9012"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200/80 dark:border-emerald-900/40 text-xs bg-white dark:bg-[#07130e] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* ID Photo Upload for Guest */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    ID Document / Photo (Guest {idx + 1})
                  </label>
                  <label className="border border-dashed border-slate-300 dark:border-emerald-900/50 rounded-lg p-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white dark:hover:bg-emerald-950/40 transition-all bg-white/70 dark:bg-[#07130e]/70">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {guest.id_photo_name ? guest.id_photo_name : `Upload ID Photo for Guest ${idx + 1}`}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleIdPhotoChange(idx, e)}
                      className="hidden"
                    />
                  </label>

                  {guest.id_photo && (
                    <div className="mt-2 flex items-center gap-2 p-1.5 bg-emerald-100/60 dark:bg-emerald-950/60 rounded-lg border border-emerald-300/40">
                      <img
                        src={guest.id_photo}
                        alt={`Guest ${idx + 1} ID`}
                        className="w-10 h-10 object-cover rounded-md border border-emerald-300"
                      />
                      <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                        ID Photo attached
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-700 to-forest-800 hover:from-emerald-800 hover:to-forest-900 text-white font-bold text-sm tracking-wide shadow-md active:scale-[0.98] transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Confirming Booking...</span>
              </>
            ) : (
              <>
                <span>Confirm Guest Booking</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
