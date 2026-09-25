import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import {
  BedDouble,
  Receipt,
  Plus,
  RefreshCw,
  X,
  CreditCard,
  Banknote,
  Calendar,
  Phone,
  User,
  CheckCircle2,
  Clock,
  LogOut as LogOutIcon,
  LogIn as LogInIcon,
  Download,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Mail,
  ShieldCheck
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Groceries',
  'Rice',
  'Milk',
  'Vegetables',
  'Electricity',
  'Cleaning supplies',
  'Maintenance',
  'Other'
];

function formatCurrency(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function maskIdNumber(idNumber, idType = '') {
  if (!idNumber) return 'Not provided';
  const clean = String(idNumber).trim();
  if (!clean) return 'Not provided';

  const typeLower = String(idType).toLowerCase();
  const digitsOnly = clean.replace(/\D/g, '');

  if (typeLower.includes('aadhaar') || typeLower.includes('aadhar')) {
    if (digitsOnly.length >= 4) {
      return `XXXX XXXX ${digitsOnly.slice(-4)}`;
    }
  }

  if (typeLower.includes('passport')) {
    if (clean.length > 4) {
      return `${clean.slice(0, 3)}****`;
    }
  }

  // Voter ID, Driving Licence, or general ID
  if (clean.length <= 4) {
    return '•••• ' + clean;
  }
  const prefix = clean.slice(0, 2);
  const suffix = clean.slice(-3);
  return `${prefix}••••${suffix}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function BookingsLedger() {
  const [bookings, setBookings] = useState([]);
  const [bookingLedgers, setBookingLedgers] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [viewingDocumentGuest, setViewingDocumentGuest] = useState(null);

  // Form States
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'upi',
    note: ''
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const [expenseForm, setExpenseForm] = useState({
    category: 'Groceries',
    amount: '',
    paymentMethod: 'cash',
    note: ''
  });
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseError, setExpenseError] = useState('');

  // Edit Expense States
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState('');
  const [editExpenseForm, setEditExpenseForm] = useState({
    category: 'Groceries',
    amount: '',
    paymentMethod: 'cash',
    note: ''
  });
  const [editExpenseSubmitting, setEditExpenseSubmitting] = useState(false);
  const [editExpenseError, setEditExpenseError] = useState('');

  // Delete Expense States
  const [showDeleteExpenseModal, setShowDeleteExpenseModal] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Status transition loader
  const [statusUpdating, setStatusUpdating] = useState(false);

  /**
   * Loads all bookings, their respective ledger records, and property expenses from backend PostgreSQL
   */
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);

    try {
      // 1. Fetch all bookings for the authenticated owner
      const bookingsRes = await api.get('/api/bookings');
      const rawBookings = bookingsRes?.bookings || [];

      // 2. Fetch expenses for the authenticated owner
      let rawExpenses = [];
      try {
        const expRes = await api.get('/api/expenses');
        rawExpenses = expRes?.expenses || [];
      } catch (e) {
        console.warn('Could not fetch expenses:', e.message);
      }

      // 3. Fetch ledger entries for each booking in parallel
      const ledgerMap = {};
      await Promise.all(
        rawBookings.map(async (b) => {
          try {
            const ledgerRes = await api.get(`/api/bookings/${b.id}/ledger`);
            if (ledgerRes) {
              ledgerMap[b.id] = ledgerRes;
            }
          } catch (err) {
            // New booking with no ledger entries yet
            ledgerMap[b.id] = { entries: [], totalCharges: '0.00', totalPayments: '0.00', balance: '0.00' };
          }
        })
      );

      setBookings(rawBookings);
      setBookingLedgers(ledgerMap);
      setExpenses(rawExpenses);

      // Keep selected booking modal in sync if open
      if (selectedBooking) {
        const updated = rawBookings.find((b) => b.id === selectedBooking.id);
        if (updated) {
          setSelectedBooking(updated);
        }
      }
    } catch (err) {
      console.error('Error loading ledger data:', err);
      setError(err.message || 'Failed to load bookings and ledger data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBooking]);

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Computes financial state for each booking
   */
  const enrichedBookings = useMemo(() => {
    return bookings.map((b) => {
      const ledger = bookingLedgers[b.id];
      const ledgerEntries = ledger?.entries || [];

      // Booking total amount: from ledger charges if any exist, else calculated room total (nights * room_price)
      const chargeEntries = ledgerEntries.filter((e) => e.type === 'charge');
      const paymentEntries = ledgerEntries.filter((e) => e.type === 'payment');

      const totalChargesFromLedger = chargeEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const totalAmount = totalChargesFromLedger > 0
        ? totalChargesFromLedger
        : (parseFloat(b.totalAmount || b.total_amount) || 0);

      const paidAmount = paymentEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const remainingAmount = Math.max(0, totalAmount - paidAmount);

      // Payment Status
      let paymentStatus = 'PENDING';
      if (totalAmount > 0 && paidAmount >= totalAmount) {
        paymentStatus = 'PAID';
      } else if (paidAmount > 0) {
        paymentStatus = 'PARTIALLY PAID';
      }

      // Unique Payment Methods used
      const methodsSet = new Set(
        paymentEntries.map((e) => (e.payment_method || e.paymentMethod || 'upi').toLowerCase())
      );
      const paymentMethods = Array.from(methodsSet);

      return {
        ...b,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus,
        paymentMethods,
        paymentEntries,
        chargeEntries,
        ledgerEntries
      };
    });
  }, [bookings, bookingLedgers]);

  // Selected booking with enriched financial data
  const currentSelectedBooking = useMemo(() => {
    if (!selectedBooking) return null;
    const enriched = enrichedBookings.find((b) => b.id === selectedBooking.id);
    const guests = (selectedBooking.guests && selectedBooking.guests.length > 0)
      ? selectedBooking.guests
      : (enriched?.guests || []);
    return {
      ...(enriched || {}),
      ...selectedBooking,
      guests,
      totalAmount: enriched?.totalAmount ?? (parseFloat(selectedBooking.totalAmount || selectedBooking.total_amount) || 0),
      paidAmount: enriched?.paidAmount ?? 0,
      remainingAmount: enriched?.remainingAmount ?? (parseFloat(selectedBooking.totalAmount || selectedBooking.total_amount) || 0),
      paymentStatus: enriched?.paymentStatus || 'PENDING',
      paymentEntries: enriched?.paymentEntries || [],
      chargeEntries: enriched?.chargeEntries || [],
      ledgerEntries: enriched?.ledgerEntries || []
    };
  }, [selectedBooking, enrichedBookings]);

  // Extract all guests belonging to currently selected booking dynamically
  const modalGuests = useMemo(() => {
    if (!currentSelectedBooking) return [];
    if (Array.isArray(currentSelectedBooking.guests) && currentSelectedBooking.guests.length > 0) {
      return currentSelectedBooking.guests;
    }
    return [
      {
        id: 'primary',
        name: currentSelectedBooking.guest_name,
        phone: currentSelectedBooking.guest_phone,
        is_primary: true
      }
    ];
  }, [currentSelectedBooking]);

  // Fetch single booking details from backend when selected
  useEffect(() => {
    if (!selectedBooking?.id) return;
    let isCancelled = false;
    api.get(`/api/bookings/${selectedBooking.id}`)
      .then((res) => {
        if (!isCancelled && res?.booking) {
          setSelectedBooking((prev) => {
            if (!prev || prev.id !== selectedBooking.id) return prev;
            return {
              ...prev,
              ...res.booking,
              guests: res.guests || res.booking.guests || prev.guests
            };
          });
        }
      })
      .catch(() => {
        // Silently continue using already enriched booking data
      });
    return () => {
      isCancelled = true;
    };
  }, [selectedBooking?.id]);

  /**
   * FINANCIAL OVERVIEW Calculations
   * Formula:
   * Booking Income = sum of all booking charges / booking revenue
   * Expenses = sum of manual expenses
   * Net = Booking Income - Expenses
   */
  const moneySummary = useMemo(() => {
    // Total booking income derived from booking charges (or b.totalAmount)
    const totalBookingIncome = enrichedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const net = totalBookingIncome - totalExpenses;

    return {
      bookingIncome: totalBookingIncome,
      expenses: totalExpenses,
      net
    };
  }, [enrichedBookings, expenses]);

  /**
   * Combined Transaction List:
   * Date | Description | Type | Payment Method | Amount
   * 
   * Example:
   * 25 Sep | Priya Sen | Booking | — | +₹5,000
   * 25 Sep | Priya Sen | Payment | UPI | ₹2,000
   * 26 Sep | Priya Sen | Payment | Cash | ₹1,000
   * 26 Sep | Groceries | Expense | UPI | -₹6,000
   */
  const transactionList = useMemo(() => {
    const list = [];

    // 1. Booking charges
    enrichedBookings.forEach((b) => {
      if (b.chargeEntries && b.chargeEntries.length > 0) {
        b.chargeEntries.forEach((charge) => {
          list.push({
            id: `charge-${charge.id}`,
            date: charge.created_at,
            description: b.guest_name,
            type: 'Booking',
            isBooking: true,
            isPayment: false,
            isExpense: false,
            paymentMethod: '—',
            amount: parseFloat(charge.amount) || 0,
            bookingId: b.id
          });
        });
      } else if (b.totalAmount > 0) {
        list.push({
          id: `booking-${b.id}`,
          date: b.created_at,
          description: b.guest_name,
          type: 'Booking',
          isBooking: true,
          isPayment: false,
          isExpense: false,
          paymentMethod: '—',
          amount: b.totalAmount,
          bookingId: b.id
        });
      }

      // 2. Payments (settlements)
      b.paymentEntries.forEach((entry) => {
        list.push({
          id: `payment-${entry.id}`,
          date: entry.created_at,
          description: b.guest_name,
          type: 'Payment',
          isBooking: false,
          isPayment: true,
          isExpense: false,
          paymentMethod: (entry.payment_method || entry.paymentMethod || 'upi').toLowerCase(),
          amount: parseFloat(entry.amount) || 0,
          bookingId: b.id
        });
      });
    });

    // 3. Expenses from manual expense entries
    expenses.forEach((exp) => {
      list.push({
        id: `expense-${exp.id}`,
        date: exp.created_at,
        description: exp.category + (exp.note ? ` (${exp.note})` : ''),
        type: 'Expense',
        isBooking: false,
        isPayment: false,
        isExpense: true,
        paymentMethod: (exp.payment_method || exp.paymentMethod || 'cash').toLowerCase(),
        amount: parseFloat(exp.amount) || 0
      });
    });

    // Sort by date DESC
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return list;
  }, [enrichedBookings, expenses]);

  /**
   * Handle Adding Payment to Booking
   */
  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!currentSelectedBooking) return;
    setPaymentError('');

    const amountNum = Number(paymentForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentError('Please enter a valid payment amount greater than ₹0');
      return;
    }

    if (amountNum > currentSelectedBooking.remainingAmount + 0.01) {
      setPaymentError(`Payment cannot exceed remaining amount of ${formatCurrency(currentSelectedBooking.remainingAmount)}`);
      return;
    }

    setPaymentSubmitting(true);
    try {
      // If booking has no charge entry yet in ledger_entries, initialize the room charge first
      const hasCharge = currentSelectedBooking.chargeEntries && currentSelectedBooking.chargeEntries.length > 0;
      if (!hasCharge && currentSelectedBooking.totalAmount > 0) {
        await api.post(`/api/bookings/${currentSelectedBooking.id}/ledger`, {
          type: 'charge',
          amount: currentSelectedBooking.totalAmount,
          description: 'Room charge'
        });
      }

      // Record the payment entry
      await api.post(`/api/bookings/${currentSelectedBooking.id}/ledger`, {
        type: 'payment',
        amount: amountNum,
        payment_method: paymentForm.paymentMethod,
        description: paymentForm.note.trim() || `${paymentForm.paymentMethod.toUpperCase()} Payment`
      });

      // Reset and refresh
      setPaymentForm({
        amount: '',
        paymentMethod: 'upi',
        note: ''
      });
      setShowPaymentModal(false);
      await loadData();
    } catch (err) {
      console.error('Error saving payment:', err);
      setPaymentError(err.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  /**
   * Handle Adding Manual Expense
   */
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setExpenseError('');

    const amountNum = Number(expenseForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setExpenseError('Please enter a valid expense amount greater than ₹0');
      return;
    }

    setExpenseSubmitting(true);
    try {
      await api.post('/api/expenses', {
        category: expenseForm.category,
        amount: amountNum,
        payment_method: expenseForm.paymentMethod,
        note: expenseForm.note.trim() || null
      });

      setExpenseForm({
        category: 'Groceries',
        amount: '',
        paymentMethod: 'cash',
        note: ''
      });
      setShowExpenseModal(false);
      await loadData();
    } catch (err) {
      console.error('Error saving expense:', err);
      setExpenseError(err.message || 'Failed to save expense');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  /**
   * Opens Edit Expense modal populated with target or first expense
   */
  const handleOpenEditExpense = (expenseToEdit = null) => {
    if (expenses.length === 0) {
      alert('No expenses recorded yet. Tap "+ Add Expense" to record one.');
      return;
    }
    const target = expenseToEdit || expenses[0];
    setEditingExpenseId(target.id);
    setEditExpenseForm({
      category: target.category || 'Groceries',
      amount: String(target.amount || ''),
      paymentMethod: (target.payment_method || target.paymentMethod || 'cash').toLowerCase(),
      note: target.note || ''
    });
    setEditExpenseError('');
    setShowEditExpenseModal(true);
  };

  /**
   * Switches which expense is being edited in the Edit Expense modal
   */
  const handleSelectExpenseToEdit = (id) => {
    const target = expenses.find((e) => e.id === id);
    if (!target) return;
    setEditingExpenseId(target.id);
    setEditExpenseForm({
      category: target.category || 'Groceries',
      amount: String(target.amount || ''),
      paymentMethod: (target.payment_method || target.paymentMethod || 'cash').toLowerCase(),
      note: target.note || ''
    });
    setEditExpenseError('');
  };

  /**
   * Submits edited expense to PATCH /api/expenses/:id
   */
  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!editingExpenseId) return;
    setEditExpenseError('');

    const amountNum = Number(editExpenseForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setEditExpenseError('Please enter a valid expense amount greater than ₹0');
      return;
    }

    setEditExpenseSubmitting(true);
    try {
      await api.patch(`/api/expenses/${editingExpenseId}`, {
        category: editExpenseForm.category,
        amount: amountNum,
        payment_method: editExpenseForm.paymentMethod,
        note: editExpenseForm.note.trim() || null
      });

      setShowEditExpenseModal(false);
      await loadData();
    } catch (err) {
      console.error('Error updating expense:', err);
      setEditExpenseError(err.message || 'Failed to update expense');
    } finally {
      setEditExpenseSubmitting(false);
    }
  };

  /**
   * Opens Delete Expense confirmation modal
   */
  const handleOpenDeleteExpense = (expenseToDelete = null) => {
    if (expenses.length === 0) {
      alert('No expenses recorded yet to delete.');
      return;
    }
    const target = expenseToDelete || expenses[0];
    setDeletingExpenseId(target.id);
    setDeleteError('');
    setShowDeleteExpenseModal(true);
  };

  /**
   * Submits expense deletion to DELETE /api/expenses/:id
   */
  const handleConfirmDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      await api.delete(`/api/expenses/${deletingExpenseId}`);
      setShowDeleteExpenseModal(false);
      await loadData();
    } catch (err) {
      console.error('Error deleting expense:', err);
      setDeleteError(err.message || 'Failed to delete expense');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  /**
   * Handle Booking State Transitions (Check-in / Check-out)
   */
  const handleStateTransition = async (action) => {
    if (!currentSelectedBooking) return;
    setStatusUpdating(true);
    try {
      if (action === 'check-in') {
        await api.patch(`/api/bookings/${currentSelectedBooking.id}/check-in`);
      } else if (action === 'check-out') {
        await api.patch(`/api/bookings/${currentSelectedBooking.id}/check-out`);
      }
      await loadData();
    } catch (err) {
      console.error(`Error during ${action}:`, err);
      alert(err.message || `Failed to ${action}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  /**
   * Export Transactions to CSV
   */
  const handleExportCSV = () => {
    if (transactionList.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = ['Date', 'Description', 'Type', 'Payment Method', 'Amount (INR)'];
    const rows = transactionList.map((t) => [
      formatFullDate(t.date),
      `"${t.description.replace(/"/g, '""')}"`,
      t.type,
      t.paymentMethod.toUpperCase(),
      (t.isIncome ? '+' : '-') + t.amount.toFixed(2)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Homestay_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Generates a clean printable/downloadable booking statement for the currently selected booking
   */
  /**
   * Generates a clean printable/downloadable booking statement for the currently selected booking
   */
  const handleDownloadBookingDetails = useCallback((booking) => {
    if (!booking) return;

    const guestsList = (Array.isArray(booking.guests) && booking.guests.length > 0)
      ? booking.guests
      : [
          {
            name: booking.guest_name,
            phone: booking.guest_phone,
            is_primary: true
          }
        ];

    const paymentEntries = booking.paymentEntries || [];
    const propertyName = booking.property_name || 'Homestay';
    const roomName = booking.room_name || 'Room';
    const bookingId = booking.id || '';
    const shortId = bookingId ? bookingId.slice(0, 8).toUpperCase() : 'UNKNOWN';
    const checkInFormatted = formatFullDate(booking.check_in);
    const checkOutFormatted = formatFullDate(booking.check_out);
    const nights = booking.nights || 1;
    const totalAmountStr = formatCurrency(booking.totalAmount);
    const paidAmountStr = formatCurrency(booking.paidAmount);
    const pendingAmountStr = formatCurrency(booking.remainingAmount);
    const paymentStatus = booking.paymentStatus || 'PENDING';
    const generatedAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const guestsHtml = guestsList.map((g, idx) => {
      const idType = g.id_type || g.idType || 'Government ID';
      const hasIdNumber = Boolean(g.id_number || g.idNumber);
      const maskedId = hasIdNumber ? maskIdNumber(g.id_number || g.idNumber, idType) : null;
      const photoData = g.id_photo || g.idPhoto;
      const hasPhoto = Boolean(photoData);
      const isPdf = photoData && (String(photoData).startsWith('data:application/pdf') || String(photoData).endsWith('.pdf'));

      let idDocContent = '';
      if (hasPhoto) {
        if (isPdf) {
          idDocContent = `
            <div style="margin-top: 10px; padding: 10px 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;">
              <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">ID Document (PDF)</div>
              <a href="${photoData}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 6px 14px; background: #047857; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">📄 View Stored PDF Document</a>
            </div>
          `;
        } else {
          idDocContent = `
            <div style="margin-top: 10px;">
              <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">ID Document</div>
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; display: inline-block; max-width: 100%;">
                <img src="${photoData}" alt="ID Document for ${escapeHtml(g.name || 'Guest')}" style="max-height: 240px; max-width: 100%; object-fit: contain; border-radius: 4px; display: block;" />
              </div>
            </div>
          `;
        }
      } else {
        idDocContent = `
          <div style="margin-top: 8px; font-size: 12px; color: #94a3b8; font-style: italic;">
            ID: Not provided
          </div>
        `;
      }

      return `
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; background-color: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="color: #0f172a; font-size: 14px;">GUEST ${idx + 1} ${g.is_primary ? '— PRIMARY' : ''}</strong>
            <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: ${hasPhoto ? '#dcfce7' : '#f1f5f9'}; color: ${hasPhoto ? '#166534' : '#64748b'}; font-weight: 600;">
              ${hasPhoto ? 'ID Uploaded' : 'No Document'}
            </span>
          </div>
          <div style="font-size: 12px; color: #475569; line-height: 1.6;">
            <div><strong>Name:</strong> ${escapeHtml(g.name || 'Guest')}</div>
            <div><strong>Phone:</strong> ${escapeHtml(g.phone || 'Not provided')}</div>
            ${g.email ? `<div><strong>Email:</strong> ${escapeHtml(g.email)}</div>` : ''}
            <div><strong>ID Type:</strong> ${escapeHtml(idType)}</div>
            ${maskedId ? `<div><strong>ID Number:</strong> <code style="background: #e2e8f0; padding: 2px 4px; border-radius: 4px; font-family: monospace;">${escapeHtml(maskedId)}</code></div>` : ''}
          </div>
          ${idDocContent}
        </div>
      `;
    }).join('');

    const paymentHistoryHtml = paymentEntries.length === 0
      ? `<p style="color: #64748b; font-style: italic; font-size: 13px; margin: 0; padding: 12px; background: #f8fafc; border-radius: 8px; text-align: center;">No payment recorded yet.</p>`
      : `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left; color: #475569;">
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Date</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Method</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Description</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${paymentEntries.map((pe) => `
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${formatShortDate(pe.created_at)}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; text-transform: uppercase; font-weight: 600;">${escapeHtml(pe.payment_method || pe.paymentMethod || 'UPI')}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${escapeHtml(pe.description || pe.note || 'Payment')}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #16a34a;">${formatCurrency(pe.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Booking Statement — ${escapeHtml(booking.guest_name)} (#${shortId})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      border-bottom: 2px solid #047857;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header h1 {
      margin: 0;
      color: #064e3b;
      font-size: 22px;
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 24px;
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .info-card {
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .info-card .label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }
    .info-card .value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    .financial-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-top: 8px;
    }
    .finance-card {
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      text-align: center;
    }
    .finance-card.total { background: #f8fafc; }
    .finance-card.paid { background: #f0fdf4; border-color: #bbf7d0; }
    .finance-card.pending { background: #fff1f2; border-color: #fecdd3; }
    .action-bar {
      margin-bottom: 20px;
      text-align: right;
    }
    .btn-print {
      background: #047857;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="action-bar no-print">
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <div class="header">
      <div>
        <h1>HOMESTAY HELPER</h1>
        <div class="subtitle">BOOKING DETAILS</div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;"><strong>Property:</strong> ${escapeHtml(propertyName)}</div>
      </div>
      <div style="text-align: right; font-size: 12px; color: #64748b;">
        <div><strong>Booking ID:</strong> #${escapeHtml(shortId)}</div>
        <div style="margin-top: 2px;">Generated: ${escapeHtml(generatedAt)}</div>
        <div style="margin-top: 4px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${paymentStatus === 'PAID' ? '#dcfce7' : (paymentStatus === 'PARTIALLY PAID' ? '#fef3c7' : '#fee2e2')}; color: ${paymentStatus === 'PAID' ? '#15803d' : (paymentStatus === 'PARTIALLY PAID' ? '#b45309' : '#b91c1c')};">
            ${escapeHtml(paymentStatus)}
          </span>
        </div>
      </div>
    </div>

    <div class="section-title">BOOKING DETAILS</div>
    <div class="grid-2">
      <div class="info-card">
        <div class="label">Property Name</div>
        <div class="value">${escapeHtml(propertyName)}</div>
      </div>
      <div class="info-card">
        <div class="label">Guest / Booking Name</div>
        <div class="value">${escapeHtml(booking.guest_name || 'Guest')}</div>
      </div>
      <div class="info-card">
        <div class="label">Room Number / Name</div>
        <div class="value">${escapeHtml(roomName)}</div>
      </div>
      <div class="info-card">
        <div class="label">Room Category / Rate</div>
        <div class="value">${booking.room_price ? formatCurrency(booking.room_price) + ' / night' : 'Standard'}</div>
      </div>
      <div class="info-card">
        <div class="label">Check-in Date</div>
        <div class="value">${escapeHtml(checkInFormatted)}</div>
      </div>
      <div class="info-card">
        <div class="label">Check-out Date</div>
        <div class="value">${escapeHtml(checkOutFormatted)} (${nights} ${nights === 1 ? 'night' : 'nights'})</div>
      </div>
      <div class="info-card">
        <div class="label">Booking Status</div>
        <div class="value" style="text-transform: capitalize;">${escapeHtml(booking.status || 'Active')}</div>
      </div>
      <div class="info-card">
        <div class="label">Number of Guests</div>
        <div class="value">${guestsList.length} ${guestsList.length === 1 ? 'Guest' : 'Guests'}</div>
      </div>
      ${booking.guest_phone ? `
      <div class="info-card">
        <div class="label">Phone Number</div>
        <div class="value">${escapeHtml(booking.guest_phone)}</div>
      </div>
      ` : ''}
    </div>

    <div class="section-title">BOOKING / CHARGE</div>
    <div class="grid-2" style="margin-bottom: 8px;">
      <div class="info-card">
        <div class="label">Room Charge (${nights} ${nights === 1 ? 'night' : 'nights'})</div>
        <div class="value">${escapeHtml(totalAmountStr)}</div>
      </div>
      <div class="info-card">
        <div class="label">Final Amount</div>
        <div class="value" style="color: #064e3b; font-weight: 700;">${escapeHtml(totalAmountStr)}</div>
      </div>
    </div>

    <div class="section-title">PAYMENT</div>
    <div class="financial-grid">
      <div class="finance-card paid">
        <div class="label" style="font-size: 11px; color: #166534; font-weight: 600;">TOTAL PAID</div>
        <div style="font-size: 18px; font-weight: 700; color: #166534; margin-top: 4px;">${escapeHtml(paidAmountStr)}</div>
      </div>
      <div class="finance-card pending">
        <div class="label" style="font-size: 11px; color: #991b1b; font-weight: 600;">PENDING AMOUNT</div>
        <div style="font-size: 18px; font-weight: 700; color: #991b1b; margin-top: 4px;">${escapeHtml(pendingAmountStr)}</div>
      </div>
      <div class="finance-card total">
        <div class="label" style="font-size: 11px; color: #64748b; font-weight: 600;">PAYMENT STATUS</div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 6px; text-transform: uppercase;">${escapeHtml(paymentStatus)}</div>
      </div>
    </div>

    <div class="section-title">PAYMENT HISTORY</div>
    ${paymentHistoryHtml}

    <div class="section-title">GUEST DETAILS (${guestsList.length})</div>
    ${guestsHtml}

    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
      This is a computer-generated booking statement from Homestay Helper. All information is confidential to property ownership.
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeGuest = (booking.guest_name || 'Guest').replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `Booking_${safeGuest}_${shortId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading bookings & ledger data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Bookings & Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Automatic calculation of QR booking income, guest payments & real expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 sm:px-3 sm:py-2 rounded-lg bg-white dark:bg-[#0f1d17] border border-slate-200 dark:border-emerald-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-emerald-950/40 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2 sm:px-3 sm:py-2 rounded-lg bg-white dark:bg-[#0f1d17] border border-slate-200 dark:border-emerald-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-emerald-950/40 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load data</p>
            <p className="text-xs mt-0.5 text-rose-700 dark:text-rose-300">{error}</p>
          </div>
          <button onClick={() => loadData(true)} className="text-xs underline font-bold hover:text-rose-900 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION A — GUEST BOOKINGS                                                */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-[#0f1d17] rounded-2xl border border-slate-200 dark:border-emerald-900/40 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-emerald-900/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <BedDouble className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Guest Bookings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Created via guest QR scan • Automated room rates & payment tracking
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
            {enrichedBookings.length} {enrichedBookings.length === 1 ? 'Booking' : 'Bookings'}
          </span>
        </div>

        {/* Guest Bookings Table / List */}
        {enrichedBookings.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <BedDouble className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No guest bookings recorded yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Guests scan your Room QR code to book. Bookings and room income will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-[#0b1612] border-b border-slate-200/80 dark:border-emerald-900/30 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Remaining</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-center">Method</th>
                  <th className="py-3 px-4 text-center">Booking Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/20">
                {enrichedBookings.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-[#13231c] transition-colors cursor-pointer"
                    onClick={() => setSelectedBooking(b)}
                  >
                    {/* Guest Name & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{b.guest_name}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{b.guest_phone}</span>
                      </div>
                    </td>

                    {/* Room */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {b.room_name || 'Room'}
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <div>
                        {formatShortDate(b.check_in)} → {formatShortDate(b.check_out)}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {b.nights} {b.nights === 1 ? 'night' : 'nights'}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(b.totalAmount)}
                    </td>

                    {/* Amount Paid */}
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatCurrency(b.paidAmount)}
                    </td>

                    {/* Amount Remaining */}
                    <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                      <span className={b.remainingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>
                        {formatCurrency(b.remainingAmount)}
                      </span>
                    </td>

                    {/* Payment Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {b.paymentStatus === 'PAID' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          PAID
                        </span>
                      )}
                      {b.paymentStatus === 'PARTIALLY PAID' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          PARTIALLY PAID
                        </span>
                      )}
                      {b.paymentStatus === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          PENDING
                        </span>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap text-xs">
                      {b.paymentMethods.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {b.paymentMethods.includes('upi') && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              <CreditCard className="w-3 h-3 text-emerald-600" />
                              UPI
                            </span>
                          )}
                          {b.paymentMethods.includes('cash') && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              <Banknote className="w-3 h-3 text-amber-600" />
                              Cash
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Booking Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {b.status === 'upcoming' && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                          UPCOMING
                        </span>
                      )}
                      {b.status === 'checked_in' && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          CHECKED-IN
                        </span>
                      )}
                      {b.status === 'checked_out' && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          CHECKED-OUT
                        </span>
                      )}
                    </td>

                    {/* Action: View Details */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(b);
                        }}
                        className="px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-[#13231c] hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-emerald-900/40 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION B — FINANCIAL OVERVIEW                                            */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-[#0f1d17] rounded-2xl border border-slate-200 dark:border-emerald-900/40 shadow-sm p-5 space-y-5">
        {/* Section Header with Add Expense Button */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-emerald-900/30 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                FINANCIAL OVERVIEW
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calculated money flow from booking revenue, guest payments & operational expenses
              </p>
            </div>
          </div>

          {/* Add Expense Button (aligned to the far right) */}
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>

        {/* Top 3 Compact Summary Values (Booking Income, Expenses, Net) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Booking Income */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0b1612] border border-slate-200/80 dark:border-emerald-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Booking Income
              </span>
              <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(moneySummary.bookingIncome)}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Total confirmed booking revenue
            </p>
          </div>

          {/* 2. Expenses */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0b1612] border border-slate-200/80 dark:border-emerald-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Expenses
              </span>
              <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(moneySummary.expenses)}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Sum of manual operating costs
            </p>
          </div>

          {/* 3. Net */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0b1612] border border-slate-200/80 dark:border-emerald-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Net
              </span>
              <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-2xl font-bold mt-1 ${moneySummary.net >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(moneySummary.net)}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Booking Income − Expenses
            </p>
          </div>
        </div>

        {/* Transaction List */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Transactions ({transactionList.length})
            </h4>
            <span className="text-[11px] text-slate-400">
              Sorted by date
            </span>
          </div>

          {transactionList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#0b1612]/50 rounded-xl border border-dashed border-slate-200 dark:border-emerald-900/30">
              No transactions yet. Record an expense or receive booking payments to see the flow.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-emerald-900/30">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0b1612] border-b border-slate-200/80 dark:border-emerald-900/30 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/20">
                  {transactionList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-[#13231c]/50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        {formatShortDate(t.date)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {t.description}
                      </td>
                      <td className="py-2.5 px-3">
                        {t.isBooking && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                            Booking
                          </span>
                        )}
                        {t.isPayment && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                            Payment
                          </span>
                        )}
                        {t.isExpense && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                            Expense
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {t.isBooking ? (
                          <span className="text-slate-400">—</span>
                        ) : t.paymentMethod === 'upi' ? (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                            UPI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <Banknote className="w-3.5 h-3.5 text-amber-600" />
                            Cash
                          </span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${t.isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        <div className="flex items-center justify-end gap-2">
                          <span>
                            {t.isBooking ? `+${formatCurrency(t.amount)}` : t.isExpense ? `-${formatCurrency(t.amount)}` : formatCurrency(t.amount)}
                          </span>
                          {t.isExpense && (
                            <div className="flex items-center gap-1 opacity-75 hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rawExp = expenses.find((exp) => `expense-${exp.id}` === t.id || exp.id === t.id.replace('expense-', ''));
                                  if (rawExp) handleOpenEditExpense(rawExp);
                                }}
                                title="Edit this expense"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rawExp = expenses.find((exp) => `expense-${exp.id}` === t.id || exp.id === t.id.replace('expense-', ''));
                                  if (rawExp) handleOpenDeleteExpense(rawExp);
                                }}
                                title="Delete this expense"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. GUEST DETAIL MODAL                                                     */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 3. BOOKING DETAILS MODAL                                                  */}
      {/* ========================================================================= */}
      {currentSelectedBooking && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bg-white dark:bg-[#0f1d17] border border-slate-200 dark:border-emerald-900/50 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Pinned at top) */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-emerald-900/30 p-5 sm:p-6 pb-4 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {currentSelectedBooking.guest_name}
                  </h3>
                  {currentSelectedBooking.status === 'upcoming' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                      Upcoming
                    </span>
                  )}
                  {currentSelectedBooking.status === 'checked_in' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                      Checked-in
                    </span>
                  )}
                  {currentSelectedBooking.status === 'checked_out' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Checked-out
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{currentSelectedBooking.room_name || 'Room'}</span>
                  <span>•</span>
                  <span>{formatShortDate(currentSelectedBooking.check_in)} → {formatShortDate(currentSelectedBooking.check_out)}</span>
                  {currentSelectedBooking.guest_phone && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {currentSelectedBooking.guest_phone}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable inside the modal) */}
            <div className="p-5 sm:p-6 py-4 overflow-y-auto space-y-5 flex-1 overscroll-contain">
              {/* BOOKING SECTION */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  BOOKING
                </div>
                <div className="bg-slate-50 dark:bg-[#0b1612] p-3 rounded-xl border border-slate-200/60 dark:border-emerald-900/30 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Room charge ({currentSelectedBooking.nights} {currentSelectedBooking.nights === 1 ? 'night' : 'nights'})</span>
                    <span className="font-semibold">{formatCurrency(currentSelectedBooking.totalAmount)}</span>
                  </div>
                  <div className="border-t border-slate-200/80 dark:border-emerald-900/40 pt-1.5 flex justify-between font-bold text-slate-900 dark:text-white text-sm">
                    <span>Final amount</span>
                    <span>{formatCurrency(currentSelectedBooking.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* PAYMENT SECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    PAYMENT
                  </span>
                  {currentSelectedBooking.paymentStatus === 'PAID' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                      🟢 PAID
                    </span>
                  )}
                  {currentSelectedBooking.paymentStatus === 'PARTIALLY PAID' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                      🟠 PARTIALLY PAID
                    </span>
                  )}
                  {currentSelectedBooking.paymentStatus === 'PENDING' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                      🔴 PENDING
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30">
                    <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Paid</div>
                    <div className="text-base font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                      {formatCurrency(currentSelectedBooking.paidAmount)}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0b1612] p-2.5 rounded-xl border border-slate-200/60 dark:border-emerald-900/30">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pending</div>
                    <div className={`text-base font-bold mt-0.5 ${currentSelectedBooking.remainingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                      {formatCurrency(currentSelectedBooking.remainingAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* PAYMENT HISTORY */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    PAYMENT HISTORY
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Total paid: {formatCurrency(currentSelectedBooking.paidAmount)}
                  </span>
                </div>

                {currentSelectedBooking.paymentEntries.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#0b1612] rounded-xl border border-dashed border-slate-200 dark:border-emerald-900/30">
                    No payment recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-emerald-900/30 bg-slate-50/60 dark:bg-[#0b1612] rounded-xl border border-slate-200/60 dark:border-emerald-900/30 overflow-hidden max-h-36 overflow-y-auto">
                    {currentSelectedBooking.paymentEntries.map((pe) => (
                      <div key={pe.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400">{formatShortDate(pe.created_at)}</span>
                          {(pe.payment_method || pe.paymentMethod) === 'cash' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <Banknote className="w-3 h-3 text-amber-600" />
                              Cash
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <CreditCard className="w-3 h-3 text-emerald-600" />
                              UPI
                            </span>
                          )}
                          {pe.description && pe.description !== 'UPI Payment' && pe.description !== 'Cash Payment' && (
                            <span className="text-slate-400 text-[11px] truncate max-w-[120px]">
                              • {pe.description}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(pe.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* GUEST DETAILS SECTION */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    GUEST DETAILS
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {modalGuests.length} {modalGuests.length === 1 ? 'Guest' : 'Guests'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {modalGuests.map((guest, idx) => {
                    const hasPhoto = Boolean(guest.id_photo || guest.idPhoto);
                    const idType = guest.id_type || guest.idType || 'Government ID';
                    const hasIdNumber = Boolean(guest.id_number || guest.idNumber);
                    const maskedId = hasIdNumber ? maskIdNumber(guest.id_number || guest.idNumber, idType) : null;

                    return (
                      <div
                        key={guest.id || `guest-${idx}`}
                        className="bg-slate-50 dark:bg-[#0b1612] p-3 rounded-xl border border-slate-200/60 dark:border-emerald-900/30 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            GUEST {idx + 1} {guest.is_primary ? '• PRIMARY' : ''}
                          </span>
                          {hasPhoto ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                              ID Uploaded
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              No Document
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {guest.name || 'Guest'}
                        </div>

                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {guest.phone || 'Not provided'}
                          </span>
                          {guest.email && (
                            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {guest.email}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-emerald-900/30 gap-2">
                          <div className="text-slate-600 dark:text-slate-300 truncate">
                            <span className="text-slate-400 dark:text-slate-500">ID: </span>
                            <span className="font-medium">{idType}</span>
                            {maskedId && (
                              <>
                                <span className="mx-1 text-slate-400">•</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{maskedId}</span>
                              </>
                            )}
                          </div>

                          {hasPhoto && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingDocumentGuest(guest);
                              }}
                              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View ID</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer (Pinned at bottom) */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-emerald-900/30 bg-slate-50/60 dark:bg-[#0b1612]/60 shrink-0">
              <div className="flex items-center justify-end gap-3 flex-wrap">
                {currentSelectedBooking.status === 'upcoming' && (
                  <button
                    onClick={() => handleStateTransition('check-in')}
                    disabled={statusUpdating}
                    className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <LogInIcon className="w-4 h-4" />
                    <span>Check-in</span>
                  </button>
                )}

                {currentSelectedBooking.status === 'checked_in' && (
                  <button
                    onClick={() => handleStateTransition('check-out')}
                    disabled={statusUpdating}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 border border-slate-700 dark:border-emerald-800"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    <span>Check-out</span>
                  </button>
                )}

                <button
                  onClick={() => handleDownloadBookingDetails(currentSelectedBooking)}
                  className="py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Download booking statement"
                >
                  <Download className="w-4 h-4" />
                  <span>Download ↓</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ID DOCUMENT PREVIEW MODAL / LIGHTBOX */}
      {viewingDocumentGuest && (
        <div
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
          style={{ zIndex: 100 }}
          onClick={() => setViewingDocumentGuest(null)}
        >
          <div
            className="bg-white dark:bg-[#0f1d17] border border-slate-200 dark:border-emerald-900/50 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Guest ID \n Guest Name */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-emerald-900/30 pb-3 shrink-0">
              <div>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Guest ID
                </span>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {viewingDocumentGuest.name || 'Guest'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setViewingDocumentGuest(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: Actual uploaded ID image or PDF preview */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-3 bg-slate-100/70 dark:bg-[#07130e] rounded-xl border border-slate-200/80 dark:border-emerald-900/30 min-h-[220px]">
              {viewingDocumentGuest.id_photo ? (
                String(viewingDocumentGuest.id_photo).startsWith('data:application/pdf') || String(viewingDocumentGuest.id_photo).endsWith('.pdf') ? (
                  <div className="text-center p-6 space-y-3">
                    <FileText className="w-12 h-12 text-emerald-600 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      PDF Document Uploaded
                    </p>
                    <a
                      href={viewingDocumentGuest.id_photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-sm"
                    >
                      <span>Open ID Document</span>
                    </a>
                  </div>
                ) : (
                  <img
                    src={viewingDocumentGuest.id_photo}
                    alt={`ID Document for ${viewingDocumentGuest.name}`}
                    className="max-h-[60vh] max-w-full w-auto object-contain rounded-lg shadow-xs"
                  />
                )
              ) : (
                <div className="py-12 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
                  No ID document uploaded
                </div>
              )}
            </div>

            {/* Footer: Government ID \n [ Close ] */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-emerald-900/30 shrink-0">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {viewingDocumentGuest.id_type || 'Government ID'}
                </span>
                {viewingDocumentGuest.id_number && (
                  <span className="ml-2 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                    • {maskIdNumber(viewingDocumentGuest.id_number, viewingDocumentGuest.id_type)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewingDocumentGuest(null)}
                className="py-2 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADD PAYMENT MODAL                                                      */}
      {/* ========================================================================= */}
      {showPaymentModal && currentSelectedBooking && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1d17] border border-slate-200 dark:border-emerald-900/50 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-900/30 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Payment
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentSelectedBooking.guest_name} • Remaining: {formatCurrency(currentSelectedBooking.remainingAmount)}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleSavePayment} className="space-y-4 text-xs">
              {/* Amount */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={currentSelectedBooking.remainingAmount}
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="Enter payment amount"
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Remaining: {formatCurrency(currentSelectedBooking.remainingAmount)}</span>
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, amount: String(currentSelectedBooking.remainingAmount) })}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    Pay Full ({formatCurrency(currentSelectedBooking.remainingAmount)})
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer font-semibold transition-all ${paymentForm.paymentMethod === 'upi' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-[#0b1612] border-slate-200 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi"
                      checked={paymentForm.paymentMethod === 'upi'}
                      onChange={() => setPaymentForm({ ...paymentForm, paymentMethod: 'upi' })}
                      className="sr-only"
                    />
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>UPI</span>
                  </label>

                  <label className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer font-semibold transition-all ${paymentForm.paymentMethod === 'cash' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-[#0b1612] border-slate-200 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300'}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentForm.paymentMethod === 'cash'}
                      onChange={() => setPaymentForm({ ...paymentForm, paymentMethod: 'cash' })}
                      className="sr-only"
                    />
                    <Banknote className="w-4 h-4 text-amber-600" />
                    <span>Cash</span>
                  </label>
                </div>
              </div>

              {/* Note (optional) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  placeholder="Advance payment, balance clearance, etc."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/40 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {paymentSubmitting ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD EXPENSE MODAL                                                      */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1d17] border border-slate-200 dark:border-emerald-900/50 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-900/30 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Expense
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Record genuine operating expenses (groceries, utilities, etc.)
                </p>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {expenseError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                {expenseError}
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="e.g. 800"
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer font-semibold transition-all ${expenseForm.paymentMethod === 'cash' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-[#0b1612] border-slate-200 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300'}`}>
                    <input
                      type="radio"
                      name="expensePaymentMethod"
                      value="cash"
                      checked={expenseForm.paymentMethod === 'cash'}
                      onChange={() => setExpenseForm({ ...expenseForm, paymentMethod: 'cash' })}
                      className="sr-only"
                    />
                    <Banknote className="w-4 h-4 text-amber-600" />
                    <span>Cash</span>
                  </label>

                  <label className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer font-semibold transition-all ${expenseForm.paymentMethod === 'upi' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-[#0b1612] border-slate-200 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300'}`}>
                    <input
                      type="radio"
                      name="expensePaymentMethod"
                      value="upi"
                      checked={expenseForm.paymentMethod === 'upi'}
                      onChange={() => setExpenseForm({ ...expenseForm, paymentMethod: 'upi' })}
                      className="sr-only"
                    />
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>UPI</span>
                  </label>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={expenseForm.note}
                  onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                  placeholder="e.g. 10kg basmati rice, vegetables from market"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/40 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {expenseSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. EDIT EXPENSE MODAL                                                     */}
      {/* ========================================================================= */}
      {showEditExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0f1d17] border border-slate-200 dark:border-emerald-900/50 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-900/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Expense
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Modify existing operational expense record
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditExpenseModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Select expense dropdown if multiple exist */}
            {expenses.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Expense to Edit
                </label>
                <select
                  value={editingExpenseId}
                  onChange={(e) => handleSelectExpenseToEdit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/40 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                >
                  {expenses.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.category} — {formatCurrency(exp.amount)} {exp.note ? `(${exp.note})` : ''} • {formatShortDate(exp.created_at)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {editExpenseError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                {editExpenseError}
              </div>
            )}

            <form onSubmit={handleUpdateExpense} className="space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={editExpenseForm.category}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={editExpenseForm.amount}
                    onChange={(e) => setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })}
                    placeholder="e.g. 800"
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/40 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer font-semibold transition-all ${editExpenseForm.paymentMethod === 'cash' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-[#0b1612] border-slate-200 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300'}`}>
                    <input
                      type="radio"
                      name="editExpensePaymentMethod"
                      value="cash"
                      checked={editExpenseForm.paymentMethod === 'cash'}
                      onChange={() => setEditExpenseForm({ ...editExpenseForm, paymentMethod: 'cash' })}
                      className="sr-only"
                    />
                    <Banknote className="w-4 h-4 text-amber-600" />
                    <span>Cash</span>
                  </label>

                  <label className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer font-semibold transition-all ${editExpenseForm.paymentMethod === 'upi' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-[#0b1612] border-slate-200 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300'}`}>
                    <input
                      type="radio"
                      name="editExpensePaymentMethod"
                      value="upi"
                      checked={editExpenseForm.paymentMethod === 'upi'}
                      onChange={() => setEditExpenseForm({ ...editExpenseForm, paymentMethod: 'upi' })}
                      className="sr-only"
                    />
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>UPI</span>
                  </label>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={editExpenseForm.note}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, note: e.target.value })}
                  placeholder="e.g. 10kg basmati rice, vegetables from market"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/40 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditExpenseModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editExpenseSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {editExpenseSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. DELETE EXPENSE CONFIRMATION MODAL                                      */}
      {/* ========================================================================= */}
      {showDeleteExpenseModal && (() => {
        const expToDelete = expenses.find((e) => e.id === deletingExpenseId) || expenses[0];
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0f1d17] border border-slate-200 dark:border-rose-900/40 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-900/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/50 flex items-center justify-center text-rose-700 dark:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Delete Expense
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Remove operational expense
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteExpenseModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Select expense dropdown if multiple exist */}
              {expenses.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Expense to Delete
                  </label>
                  <select
                    value={deletingExpenseId}
                    onChange={(e) => setDeletingExpenseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0b1612] border border-slate-200 dark:border-emerald-900/40 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-rose-500"
                  >
                    {expenses.map((exp) => (
                      <option key={exp.id} value={exp.id}>
                        {exp.category} — {formatCurrency(exp.amount)} {exp.note ? `(${exp.note})` : ''} • {formatShortDate(exp.created_at)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {deleteError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                  {deleteError}
                </div>
              )}

              {/* Confirmation card */}
              <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
                <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Are you sure you want to delete this expense?
                </p>

                {expToDelete && (
                  <div className="p-3 rounded-lg bg-white dark:bg-[#0b1612] border border-rose-100 dark:border-rose-900/30 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Category & Note</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {expToDelete.category} {expToDelete.note ? `(${expToDelete.note})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Amount</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                        {formatCurrency(expToDelete.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Payment & Date</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {(expToDelete.payment_method || expToDelete.paymentMethod || 'cash').toUpperCase()} • {formatShortDate(expToDelete.created_at)}
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  This expense will be permanently deleted from the database. Financial totals and transaction list will recalculate automatically.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteExpenseModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteExpense}
                  disabled={deleteSubmitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-sm disabled:opacity-50 text-xs inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteSubmitting ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
