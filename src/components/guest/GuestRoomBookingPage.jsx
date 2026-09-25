import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BedDouble,
  Users,
  Calendar,
  Phone,
  User,
  Camera,
  CheckCircle2,
  AlertCircle,
  Building,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function GuestRoomBookingPage() {
  const { roomId } = useParams();

  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_phone: '',
    check_in: new Date().toISOString().split('T')[0],
    check_out: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    email: '',
    id_photo_name: ''
  });
  const [idPreview, setIdPreview] = useState(null);
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
        const roomData = data.room || (data.id ? data : null);
        if (res.ok && roomData) {
          if (isMounted) setRoom(roomData);
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

  const handleIdPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, id_photo_name: file.name }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.guest_name.trim()) {
      errors.guest_name = 'Please enter your full name';
    }
    if (!formData.guest_phone.trim()) {
      errors.guest_phone = 'Please enter your phone number';
    } else if (!/^[0-9+\s-]{8,15}$/.test(formData.guest_phone.trim())) {
      errors.guest_phone = 'Please enter a valid phone number';
    }
    if (!formData.check_in) {
      errors.check_in = 'Check-in date is required';
    }
    if (!formData.check_out) {
      errors.check_out = 'Check-out date is required';
    } else if (formData.check_in && formData.check_out < formData.check_in) {
      errors.check_out = 'Check-out date must be on or after check-in date';
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
      const payload = {
        guest_name: formData.guest_name.trim(),
        guest_phone: formData.guest_phone.trim(),
        check_in: formData.check_in,
        check_out: formData.check_out,
        email: formData.email.trim() || undefined,
        id_photo: idPreview || undefined
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
        throw new Error(data.error || 'Failed to submit booking');
      }

      setBookingSuccess(data.booking);
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
          <p className="text-[11px] text-slate-400 font-mono">Room ID: {roomId}</p>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
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
              Your room reservation has been submitted successfully to the host.
            </p>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-slate-50 dark:bg-[#0b1612] p-4 rounded-xl border border-slate-200/60 dark:border-emerald-900/30 text-left space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-emerald-900/20">
              <span className="text-slate-500 font-medium">Assigned Room:</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-emerald-600" />
                {room.name}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Guest Name:</span>
              <span className="font-bold text-slate-900 dark:text-white">{bookingSuccess.guest_name}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Phone:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{bookingSuccess.guest_phone}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Stay Dates:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {bookingSuccess.check_in_date || bookingSuccess.check_in} → {bookingSuccess.check_out_date || bookingSuccess.check_out}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-emerald-900/20">
              <span className="text-slate-500 font-medium">Status:</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                Upcoming / Reserved
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/30 rounded-xl text-left flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              Your host has received your booking details and will confirm your room key upon arrival.
            </span>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer min-h-[44px]"
          >
            Create Another Reservation
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>QR Guest Booking</span>
          </div>
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
              <span>Up to {room.capacity} Guests</span>
            </span>
            {room.description && (
              <span className="truncate text-slate-500 dark:text-slate-400">
                {room.description}
              </span>
            )}
          </div>
        </div>

        {/* Guest Booking Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-emerald-900/30 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Guest Registration & Check-In
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Please enter your details to reserve this room.
            </p>
          </div>

          {submitError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="guest_name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                id="guest_name"
                type="text"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="e.g. Priya Sen"
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 dark:bg-[#0b1612] text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                  formErrors.guest_name
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-slate-200/80 dark:border-emerald-900/40 focus:ring-emerald-500'
                }`}
              />
            </div>
            {formErrors.guest_name && (
              <p className="text-rose-500 text-[11px] font-semibold mt-1">{formErrors.guest_name}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="guest_phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mobile Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                id="guest_phone"
                type="tel"
                value={formData.guest_phone}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                placeholder="e.g. 9876500003"
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 dark:bg-[#0b1612] text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                  formErrors.guest_phone
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-slate-200/80 dark:border-emerald-900/40 focus:ring-emerald-500'
                }`}
              />
            </div>
            {formErrors.guest_phone && (
              <p className="text-rose-500 text-[11px] font-semibold mt-1">{formErrors.guest_phone}</p>
            )}
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="check_in" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Check-in Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="check_in"
                type="date"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-emerald-900/40 text-xs sm:text-sm bg-slate-50 dark:bg-[#0b1612] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {formErrors.check_in && (
                <p className="text-rose-500 text-[11px] font-semibold mt-1">{formErrors.check_in}</p>
              )}
            </div>

            <div>
              <label htmlFor="check_out" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Check-out Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="check_out"
                type="date"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-emerald-900/40 text-xs sm:text-sm bg-slate-50 dark:bg-[#0b1612] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {formErrors.check_out && (
                <p className="text-rose-500 text-[11px] font-semibold mt-1">{formErrors.check_out}</p>
              )}
            </div>
          </div>

          {/* Email (Optional) */}
          <div>
            <label htmlFor="guest_email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              id="guest_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. priya@example.com"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-emerald-900/40 text-xs sm:text-sm bg-slate-50 dark:bg-[#0b1612] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* ID Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ID Document / Photo <span className="text-slate-400 font-normal">(Aadhaar / Passport / Voter ID)</span>
            </label>
            <label className="border-2 border-dashed border-slate-300 dark:border-emerald-900/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-emerald-950/20 transition-all bg-slate-50/50 dark:bg-[#0b1612]/50">
              <Camera className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {formData.id_photo_name ? formData.id_photo_name : 'Upload or Capture ID Photo'}
              </span>
              <span className="text-[10px] text-slate-400">
                JPG, PNG, or camera capture
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleIdPhotoChange}
                className="hidden"
              />
            </label>

            {idPreview && (
              <div className="mt-2.5 flex items-center gap-3 p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-900/30">
                <img
                  src={idPreview}
                  alt="ID Preview"
                  className="w-12 h-12 object-cover rounded-lg border border-emerald-200"
                />
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  ID Document attached
                </span>
              </div>
            )}
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
