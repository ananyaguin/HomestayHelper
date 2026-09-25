import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Building2,
  MapPin,
  FileText,
  Wifi,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff,
  Car,
  Utensils,
  Trees,
  Droplets,
  BatteryCharging,
  Mountain,
  Shirt,
  Flame,
  Heart,
  PlusCircle,
  BedDouble,
  X
} from 'lucide-react';

// Common/Default Amenities shown directly on main screen (5 items)
const DEFAULT_AMENITIES = [
  { id: 'wifi', label: 'Wi-Fi', Icon: Wifi },
  { id: 'parking', label: 'Free Parking', Icon: Car },
  { id: 'food', label: 'Home-cooked Meals', Icon: Utensils },
  { id: 'hot_water', label: '24/7 Hot Water', Icon: Droplets },
  { id: 'power_backup', label: 'Power Backup', Icon: BatteryCharging }
];

// Additional Amenities available via "+ Add More" Popover/Modal
const ADDITIONAL_AMENITIES = [
  { id: 'mountain_view', label: 'Mountain View', Icon: Mountain },
  { id: 'laundry', label: 'Laundry Service', Icon: Shirt },
  { id: 'heater', label: 'Room Heater / Fireplace', Icon: Flame },
  { id: 'driver_acc', label: 'Driver Accommodation', Icon: Car },
  { id: 'pet_friendly', label: 'Pet Friendly', Icon: Heart },
  { id: 'first_aid', label: 'First Aid Kit', Icon: PlusCircle }
];

const ALL_AMENITIES = [...DEFAULT_AMENITIES, ...ADDITIONAL_AMENITIES];

export default function PropertySetup({ onSaveSuccess, existingProperty, isOnboarding = false, onCancel }) {
  const [formData, setFormData] = useState({
    propertyName: '',
    totalRooms: 4,
    address: '',
    description: '',
    wifiSsid: '',
    wifiPassword: '',
    amenities: ['wifi', 'hot_water', 'food', 'parking'],
    emergencyContacts: [
      { id: '1', name: 'Local Clinic / Doctor', phone: '+91 98320 12345' },
      { id: '2', name: 'Homestay Caretaker', phone: '+91 98765 43210' }
    ]
  });

  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingProperty) {
      let parsedContacts = existingProperty.emergency_contacts;
      if (typeof parsedContacts === 'string') {
        try { parsedContacts = JSON.parse(parsedContacts); } catch (e) { parsedContacts = []; }
      }
      let parsedAmenities = existingProperty.amenities;
      if (typeof parsedAmenities === 'string') {
        try { parsedAmenities = JSON.parse(parsedAmenities); } catch (e) { parsedAmenities = []; }
      }

      setFormData({
        propertyName: existingProperty.name || '',
        totalRooms: existingProperty.total_rooms || existingProperty.totalRooms || 4,
        address: existingProperty.address || '',
        description: existingProperty.description || '',
        wifiSsid: existingProperty.wifi_ssid || existingProperty.wifiSsid || '',
        wifiPassword: existingProperty.wifi_password || existingProperty.wifiPassword || '',
        amenities: Array.isArray(parsedAmenities) ? parsedAmenities : ['wifi', 'hot_water', 'food', 'parking'],
        emergencyContacts: Array.isArray(parsedContacts) && parsedContacts.length > 0
          ? parsedContacts
          : [
              { id: '1', name: 'Local Clinic / Doctor', phone: '+91 98320 12345' },
              { id: '2', name: 'Homestay Caretaker', phone: '+91 98765 43210' }
            ]
      });
    }
  }, [existingProperty]);

  // Field change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (saveSuccess) setSaveSuccess(false);
  };

  // Amenity toggle handler
  const toggleAmenity = (amenityId) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenityId);
      const updated = exists
        ? prev.amenities.filter((id) => id !== amenityId)
        : [...prev.amenities, amenityId];
      return { ...prev, amenities: updated };
    });
    if (saveSuccess) setSaveSuccess(false);
  };

  // Emergency contact handlers
  const handleContactChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    }));
    if (saveSuccess) setSaveSuccess(false);
  };

  const addEmergencyContact = () => {
    const newContact = {
      id: Date.now().toString(),
      name: '',
      phone: ''
    };
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, newContact]
    }));
    if (saveSuccess) setSaveSuccess(false);
  };

  const removeEmergencyContact = (id) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((c) => c.id !== id)
    }));
    if (saveSuccess) setSaveSuccess(false);
  };

  // Form validation & submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.propertyName.trim()) {
      newErrors.propertyName = 'Property / Homestay Name is required.';
    }

    const roomsNum = parseInt(formData.totalRooms, 10);
    if (!formData.totalRooms || isNaN(roomsNum) || roomsNum < 1) {
      newErrors.totalRooms = 'Total Rooms must be at least 1.';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Property address is required.';
    }

    // Check emergency contacts validation
    const invalidContacts = formData.emergencyContacts.some(
      (c) => (c.name.trim() && !c.phone.trim()) || (!c.name.trim() && c.phone.trim())
    );
    if (invalidContacts) {
      newErrors.emergencyContacts = 'Please fill in both name and phone number for all emergency contacts.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSaveSuccess(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    const payload = {
      name: formData.propertyName.trim(),
      address: formData.address.trim(),
      description: formData.description.trim(),
      total_rooms: roomsNum,
      wifi_ssid: formData.wifiSsid.trim(),
      wifi_password: formData.wifiPassword,
      amenities: formData.amenities,
      emergency_contacts: formData.emergencyContacts
    };

    (async () => {
      try {
        let savedProp;
        if (existingProperty && existingProperty.id) {
          const res = await api.patch(`/api/properties/${existingProperty.id}`, payload);
          savedProp = res?.property || res;
        } else {
          const res = await api.post('/api/properties', payload);
          savedProp = res?.property || res;
        }

        if (savedProp) {
          savedProp.total_rooms = roomsNum;
          savedProp.description = formData.description;
        }

        setSaveSuccess(true);
        setSubmitError(null);
        if (onSaveSuccess) {
          onSaveSuccess(savedProp);
        }
      } catch (err) {
        console.error('[PropertySetup] API save error:', err);
        setSaveSuccess(false);
        setSubmitError(err.message || 'Failed to save property. Please try again.');
      } finally {
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    })();
  };

  // Determine visible amenities: default ones + any selected additional ones
  const visibleAmenities = ALL_AMENITIES.filter((item) => {
    const isDefault = DEFAULT_AMENITIES.some((d) => d.id === item.id);
    const isSelected = formData.amenities.includes(item.id);
    return isDefault || isSelected;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Success Notification Banner */}
      {saveSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700/50 p-4 rounded-xl flex items-start gap-3 text-emerald-900 dark:text-emerald-200 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-bold">Property Details Saved Successfully!</p>
            <p className="mt-0.5 text-emerald-800 dark:text-emerald-300/90">
              Your homestay details, room count, amenities, and emergency contact list have been saved.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(false)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 text-xs font-bold px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {submitError && (
        <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-700/50 p-4 rounded-xl flex items-start gap-3 text-rose-900 dark:text-rose-200 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-bold">Failed to Save Property</p>
            <p className="mt-0.5 text-rose-800 dark:text-rose-300/90">{submitError}</p>
          </div>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="text-rose-700 dark:text-rose-400 hover:text-rose-950 text-xs font-bold px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Setup Form */}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* SECTION 1: Basic Property Information */}
        <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Basic Property Information
              </h3>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Property Name (2 cols on sm) */}
            <div className="sm:col-span-2">
              <label htmlFor="propertyName" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Homestay / Property Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="propertyName"
                name="propertyName"
                value={formData.propertyName}
                onChange={handleChange}
                placeholder="e.g. Mountain View Tea Garden Homestay"
                className={`w-full bg-slate-50 dark:bg-[#07130e] text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none transition-colors min-h-[44px] ${
                  errors.propertyName
                    ? 'border-rose-500 dark:border-rose-500 focus:border-rose-600'
                    : 'border-slate-200 dark:border-emerald-900/50 focus:border-emerald-500'
                }`}
              />
              {errors.propertyName && (
                <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.propertyName}</span>
                </p>
              )}
            </div>

            {/* Total Rooms (1 col on sm) */}
            <div>
              <label htmlFor="totalRooms" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Total Rooms <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="totalRooms"
                  name="totalRooms"
                  min={1}
                  step={1}
                  value={formData.totalRooms}
                  onChange={handleChange}
                  placeholder="4"
                  className={`w-full bg-slate-50 dark:bg-[#07130e] text-slate-900 dark:text-white pl-9 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none transition-colors min-h-[44px] ${
                    errors.totalRooms
                      ? 'border-rose-500 dark:border-rose-500 focus:border-rose-600'
                      : 'border-slate-200 dark:border-emerald-900/50 focus:border-emerald-500'
                  }`}
                />
                <BedDouble className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              </div>
              {errors.totalRooms && (
                <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.totalRooms}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. Lower Tea Estate Road, Near Pine View Point, Takdah, Darjeeling Hills, WB - 734222"
                className={`w-full bg-slate-50 dark:bg-[#07130e] text-slate-900 dark:text-white p-3 rounded-xl border text-xs sm:text-sm focus:outline-none transition-colors ${
                  errors.address
                    ? 'border-rose-500 dark:border-rose-500 focus:border-rose-600'
                    : 'border-slate-200 dark:border-emerald-900/50 focus:border-emerald-500'
                }`}
              />
              {errors.address && (
                <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.address}</span>
                </p>
              )}
            </div>

            {/* Property Description */}
            <div>
              <label htmlFor="description" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Property Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your homestay's unique atmosphere, surroundings, or special hospitality for guests..."
                className="w-full bg-slate-50 dark:bg-[#07130e] text-slate-900 dark:text-white p-3 rounded-xl border border-slate-200 dark:border-emerald-900/50 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Connectivity & Wi-Fi Credentials */}
        <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-emerald-900/30">
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Wi-Fi & Guest Access Credentials
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Wi-Fi SSID */}
            <div>
              <label htmlFor="wifiSsid" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Wi-Fi Network Name (SSID)
              </label>
              <input
                type="text"
                id="wifiSsid"
                name="wifiSsid"
                value={formData.wifiSsid}
                onChange={handleChange}
                placeholder="e.g. MountainView_Guest_5G"
                className="w-full bg-slate-50 dark:bg-[#07130e] text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/50 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
              />
            </div>

            {/* Wi-Fi Password */}
            <div>
              <label htmlFor="wifiPassword" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Wi-Fi Password
              </label>
              <div className="relative">
                <input
                  type={showWifiPassword ? 'text' : 'password'}
                  id="wifiPassword"
                  name="wifiPassword"
                  value={formData.wifiPassword}
                  onChange={handleChange}
                  placeholder="Network password"
                  className="w-full bg-slate-50 dark:bg-[#07130e] text-slate-900 dark:text-white pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/50 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowWifiPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  aria-label={showWifiPassword ? 'Hide password' : 'Show password'}
                >
                  {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Property Amenities (Simplified Default UI + "+ Add More" Popover) */}
        <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Homestay Amenities & Features
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              {formData.amenities.length} Selected
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select key amenities available at your homestay. Click "+ Add More" to choose additional services.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {visibleAmenities.map((item) => {
              const ItemIcon = item.Icon;
              const isSelected = formData.amenities.includes(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggleAmenity(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all text-left cursor-pointer min-h-[44px] ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-500 dark:border-emerald-400 font-semibold shadow-2xs'
                      : 'bg-slate-50 dark:bg-[#07130e] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-emerald-900/40 hover:border-slate-300 dark:hover:border-emerald-700'
                  }`}
                >
                  <ItemIcon className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}

            {/* "+ Add More" Popover Trigger Card */}
            <button
              type="button"
              onClick={() => setShowAmenitiesModal(true)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-emerald-600/40 dark:border-emerald-500/40 hover:border-emerald-600 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px]"
            >
              <span>+ Add More</span>
            </button>
          </div>
        </div>

        {/* Modal / Popover for Additional Amenities */}
        {showAmenitiesModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-900/60 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Additional Amenities</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAmenitiesModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto p-0.5">
                {ADDITIONAL_AMENITIES.map((item) => {
                  const ItemIcon = item.Icon;
                  const isSelected = formData.amenities.includes(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleAmenity(item.id)}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all text-left cursor-pointer min-h-[44px] ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-500 dark:border-emerald-400 font-semibold'
                          : 'bg-slate-50 dark:bg-[#07130e] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-emerald-900/40 hover:border-slate-300 dark:hover:border-emerald-700'
                      }`}
                    >
                      <ItemIcon className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAmenitiesModal(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer min-h-[40px]"
                >
                  Done ({formData.amenities.length} Selected)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: Emergency Contacts */}
        <div className="bg-white dark:bg-[#0f1d17] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Emergency Contacts
              </h3>
            </div>
            <button
              type="button"
              onClick={addEmergencyContact}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all cursor-pointer min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Contact</span>
            </button>
          </div>

          {errors.emergencyContacts && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.emergencyContacts}</span>
            </p>
          )}

          <div className="space-y-3">
            {formData.emergencyContacts.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No emergency contacts added yet. Click "+ Add Contact" above to add local doctor, caretaker, or police numbers.
              </p>
            ) : (
              formData.emergencyContacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#07130e] border border-slate-200/70 dark:border-emerald-900/30"
                >
                  <span className="text-xs font-bold text-slate-400 w-6 shrink-0 hidden sm:inline">
                    #{index + 1}
                  </span>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => handleContactChange(contact.id, 'name', e.target.value)}
                      placeholder="Contact Name (e.g. Village Medical Center)"
                      className="w-full bg-white dark:bg-[#0c1813] text-slate-900 dark:text-white px-3 py-2 rounded-lg border border-slate-200 dark:border-emerald-900/50 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 min-h-[42px]"
                    />
                    <input
                      type="text"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(contact.id, 'phone', e.target.value)}
                      placeholder="Phone Number (e.g. +91 98000 11111)"
                      className="w-full bg-white dark:bg-[#0c1813] text-slate-900 dark:text-white px-3 py-2 rounded-lg border border-slate-200 dark:border-emerald-900/50 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 min-h-[42px]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeEmergencyContact(contact.id)}
                    className="p-2.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded-lg self-end sm:self-center cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center"
                    aria-label="Remove contact"
                    title="Remove Contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Form Actions Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 transition-all cursor-pointer min-h-[48px]"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#164A34] hover:bg-[#123D2A] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px] disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" aria-hidden="true" />
            <span>{isSubmitting ? 'Saving...' : 'Save Property Details'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
