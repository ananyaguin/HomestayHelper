import React, { useState, useEffect } from 'react';
import { homestayDB } from '../services/db';
import { ShareUtils } from '../services/share';
import {
  Plus,
  Banknote,
  Download,
  BedDouble,
  Receipt,
  Trash2,
  UserPlus
} from 'lucide-react';

export default function BookingsLedger() {
  const [guests, setGuests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);

  // New Guest Form State
  const [guestForm, setGuestForm] = useState({
    name: '',
    phone: '',
    roomNo: '',
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date().toISOString().split('T')[0],
    totalAmount: '',
    advancePaid: 0
  });

  // New Transaction Form State
  const [txForm, setTxForm] = useState({
    type: 'INCOME',
    amount: '',
    category: 'Room Rent',
    notes: ''
  });

  const loadData = async () => {
    const allGuests = await homestayDB.getAllGuests();
    const allTx = await homestayDB.getAllTransactions();
    allTx.sort((a, b) => new Date(b.date) - new Date(a.date));
    setGuests(allGuests);
    setTransactions(allTx);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalance = totalIncome - totalExpense;
  const activeGuestsCount = guests.filter(g => g.status === 'Checked-in').length;

  const handleCheckoutGuest = async (id) => {
    const guest = guests.find(g => g.id === id);
    if (!guest) return;

    if (window.confirm(`Check-out guest ${guest.name}? This will record the final room rent income of ₹${guest.totalAmount} in your cash ledger.`)) {
      guest.status = 'Checked-out';
      await homestayDB.saveGuest(guest);

      await homestayDB.saveTransaction({
        type: 'INCOME',
        category: 'Room Rent',
        amount: Number(guest.totalAmount || 0),
        notes: `Final settlement for guest ${guest.name} (Room ${guest.roomNo})`
      });

      await loadData();
    }
  };

  const handleDeleteGuest = async (id) => {
    if (window.confirm('Are you sure you want to delete this guest record?')) {
      await homestayDB.deleteGuest(id);
      await loadData();
    }
  };

  const handleDeleteTx = async (id) => {
    if (window.confirm('Delete this cash register transaction?')) {
      await homestayDB.deleteTransaction(id);
      await loadData();
    }
  };

  const handleExportCSV = () => {
    ShareUtils.exportLedgerCSV(transactions);
  };

  const handleSubmitGuest = async (e) => {
    e.preventDefault();
    const newGuest = {
      name: guestForm.name.trim(),
      phone: guestForm.phone.trim(),
      roomNo: guestForm.roomNo.trim(),
      checkIn: guestForm.checkIn,
      checkOut: guestForm.checkOut,
      totalAmount: Number(guestForm.totalAmount || 0),
      advancePaid: Number(guestForm.advancePaid || 0),
      status: 'Checked-in'
    };

    await homestayDB.saveGuest(newGuest);

    if (newGuest.advancePaid > 0) {
      await homestayDB.saveTransaction({
        type: 'INCOME',
        category: 'Room Rent',
        amount: newGuest.advancePaid,
        notes: `Advance payment from guest ${newGuest.name}`
      });
    }

    setShowGuestModal(false);
    setGuestForm({
      name: '',
      phone: '',
      roomNo: '',
      checkIn: new Date().toISOString().split('T')[0],
      checkOut: new Date().toISOString().split('T')[0],
      totalAmount: '',
      advancePaid: 0
    });
    await loadData();
  };

  const handleSubmitTx = async (e) => {
    e.preventDefault();
    const newTx = {
      type: txForm.type,
      amount: Number(txForm.amount || 0),
      category: txForm.category,
      notes: txForm.notes.trim()
    };

    await homestayDB.saveTransaction(newTx);
    setShowTxModal(false);
    setTxForm({
      type: 'INCOME',
      amount: '',
      category: 'Room Rent',
      notes: ''
    });
    await loadData();
  };

  return (
    <div>
      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-[#0f1d17] p-4 rounded-xl border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-lg transition-colors">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cash in Hand</div>
          <div className="text-xl sm:text-2xl font-bold text-amberGold-hover dark:text-amberGold mt-1">₹{netBalance.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-[#0f1d17] p-4 rounded-xl border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-lg transition-colors">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Income</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">₹{totalIncome.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-[#0f1d17] p-4 rounded-xl border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-lg transition-colors">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expenses</div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">₹{totalExpense.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-[#0f1d17] p-4 rounded-xl border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-lg transition-colors">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Guests</div>
          <div className="text-xl sm:text-2xl font-bold text-forest-800 dark:text-sky-300 mt-1">{activeGuestsCount}</div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex gap-3 flex-wrap mb-5">
        <button
          onClick={() => {
            setGuestForm({
              name: '',
              phone: '',
              roomNo: '',
              checkIn: new Date().toISOString().split('T')[0],
              checkOut: new Date().toISOString().split('T')[0],
              totalAmount: '',
              advancePaid: 0
            });
            setShowGuestModal(true);
          }}
          className="bg-forest-800 hover:bg-forest-700 dark:bg-gradient-to-r dark:from-emerald-600 dark:to-forest-700 dark:hover:from-emerald-500 dark:hover:to-forest-600 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-all shadow-sm dark:shadow-md inline-flex items-center gap-1.5 border border-transparent dark:border-emerald-500/30 active:scale-[0.99] cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-300 dark:text-amberGold" aria-hidden="true" />
          <span>New Guest Booking</span>
        </button>
        <button
          onClick={() => setShowTxModal(true)}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-[#13231c] dark:hover:bg-[#1a3528] text-slate-800 dark:text-slate-200 font-semibold text-sm px-4 py-2.5 rounded-lg border border-slate-300 dark:border-emerald-900/50 transition-colors inline-flex items-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
        >
          <Banknote className="w-4 h-4 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
          <span>Log Income / Expense</span>
        </button>
        <button
          onClick={handleExportCSV}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-[#13231c] dark:hover:bg-[#1a3528] text-slate-800 dark:text-slate-200 font-semibold text-sm px-4 py-2.5 rounded-lg border border-slate-300 dark:border-emerald-900/50 transition-colors ml-auto inline-flex items-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
        >
          <Download className="w-4 h-4 text-amberGold" aria-hidden="true" />
          <span>Export CSV Ledger</span>
        </button>
      </div>

      {/* Bookings Table Card */}
      <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-5 mb-5 border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <span className="text-lg font-bold text-forest-800 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest-50 dark:bg-emerald-950/80 border border-forest-200 dark:border-emerald-700/40 flex items-center justify-center text-forest-800 dark:text-emerald-400">
              <BedDouble className="w-4 h-4 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <span>Active & Recent Guest Bookings</span>
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-pill bg-forest-100 dark:bg-emerald-950/80 text-forest-800 dark:text-emerald-300 border border-forest-200 dark:border-emerald-500/30">
            {guests.length} Total
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0b1612] border-b border-slate-200 dark:border-emerald-900/40 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                <th className="py-3 px-3">Guest Name</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Dates</th>
                <th className="py-3 px-3">Room #</th>
                <th className="py-3 px-3">Total (INR)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {guests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-slate-400 dark:text-slate-500">
                    No guest bookings recorded yet. Tap "+ New Guest Booking" to add one.
                  </td>
                </tr>
              ) : (
                guests.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 dark:border-emerald-900/20 hover:bg-slate-50 dark:hover:bg-[#13231c] transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">{g.name}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{g.phone || '-'}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{g.checkIn} to {g.checkOut}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-pill bg-forest-100 dark:bg-emerald-950/80 text-forest-800 dark:text-emerald-300 border border-forest-200 dark:border-emerald-800/40">
                        Room {g.roomNo}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">
                      ₹{Number(g.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-pill border ${
                          g.status === 'Checked-in'
                            ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                            : 'bg-sky-100 dark:bg-slate-900/90 text-sky-800 dark:text-slate-400 border-sky-200 dark:border-slate-700'
                        }`}
                      >
                        {g.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {g.status === 'Checked-in' ? (
                        <button
                          onClick={() => handleCheckoutGuest(g.id)}
                          className="bg-amberGold hover:bg-amber-400 text-white dark:text-forest-950 text-xs font-bold px-3 py-1 rounded-lg transition-colors shadow-sm cursor-pointer"
                        >
                          Check-out
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteGuest(g.id)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-[#13231c] dark:hover:bg-rose-950 text-slate-700 dark:text-slate-400 dark:hover:text-rose-300 border border-slate-200 dark:border-emerald-900/30 text-xs font-semibold px-3 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Register Transactions Table */}
      <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-5 mb-5 border border-slate-200 dark:border-emerald-900/40 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="text-lg font-bold text-forest-800 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest-50 dark:bg-emerald-950/80 border border-forest-200 dark:border-emerald-700/40 flex items-center justify-center text-forest-800 dark:text-emerald-400">
              <Receipt className="w-4 h-4 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <span>Cash Register Transactions</span>
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0b1612] border-b border-slate-200 dark:border-emerald-900/40 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Amount (INR)</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-slate-400 dark:text-slate-500">
                    No cash transactions logged yet.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-emerald-900/20 hover:bg-slate-50 dark:hover:bg-[#13231c] transition-colors">
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{t.date}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-pill border ${
                          t.type === 'INCOME'
                            ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                            : 'bg-rose-100 dark:bg-rose-950/90 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/40'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">{t.category}</td>
                    <td className={`py-3 px-3 font-semibold ${t.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {t.type === 'INCOME' ? '+' : '-'}₹{Number(t.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{t.notes || '-'}</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleDeleteTx(t.id)}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-[#13231c] hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 border border-slate-200 dark:border-emerald-900/30 text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add Guest */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm dark:backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-6 w-full max-w-lg shadow-xl dark:shadow-2xl border border-slate-200 dark:border-emerald-800/60 max-h-[90vh] overflow-y-auto text-slate-800 dark:text-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-forest-800 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
                <span>Add New Guest Booking</span>
              </h3>
              <button
                onClick={() => setShowGuestModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmitGuest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  value={guestForm.name}
                  onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Room Number / Name *</label>
                  <input
                    type="text"
                    required
                    value={guestForm.roomNo}
                    onChange={(e) => setGuestForm({ ...guestForm, roomNo: e.target.value })}
                    placeholder="e.g. 101 or Kanchenjunga View"
                    className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Check-in Date *</label>
                  <input
                    type="date"
                    required
                    value={guestForm.checkIn}
                    onChange={(e) => setGuestForm({ ...guestForm, checkIn: e.target.value })}
                    className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Check-out Date *</label>
                  <input
                    type="date"
                    required
                    value={guestForm.checkOut}
                    onChange={(e) => setGuestForm({ ...guestForm, checkOut: e.target.value })}
                    className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Total Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    value={guestForm.totalAmount}
                    onChange={(e) => setGuestForm({ ...guestForm, totalAmount: e.target.value })}
                    placeholder="e.g. 3000"
                    className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Advance Paid (₹)</label>
                  <input
                    type="number"
                    value={guestForm.advancePaid}
                    onChange={(e) => setGuestForm({ ...guestForm, advancePaid: e.target.value })}
                    placeholder="e.g. 1000"
                    className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGuestModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-[#13231c] dark:hover:bg-[#1a3528] text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors border border-slate-200 dark:border-emerald-900/40 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-forest-800 hover:bg-forest-700 dark:bg-gradient-to-r dark:from-emerald-600 dark:to-forest-700 dark:hover:from-emerald-500 dark:hover:to-forest-600 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm dark:shadow-md transition-colors border border-transparent dark:border-emerald-500/30 cursor-pointer"
                >
                  Save Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Transaction */}
      {showTxModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm dark:backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0f1d17] rounded-2xl p-6 w-full max-w-lg shadow-xl dark:shadow-2xl border border-slate-200 dark:border-emerald-800/60 max-h-[90vh] overflow-y-auto text-slate-800 dark:text-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-forest-800 dark:text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-forest-800 dark:text-emerald-400" aria-hidden="true" />
                <span>Log Cash Transaction</span>
              </h3>
              <button
                onClick={() => setShowTxModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmitTx} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction Type *</label>
                  <select
                    value={txForm.type}
                    onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                    className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                  >
                    <option value="INCOME" className="bg-white dark:bg-[#0b1612]">INCOME (+ Cash Received)</option>
                    <option value="EXPENSE" className="bg-white dark:bg-[#0b1612]">EXPENSE (- Cash Spent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                <select
                  value={txForm.category}
                  onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                  className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                >
                  <option value="Room Rent" className="bg-white dark:bg-[#0b1612]">Room Rent / Booking</option>
                  <option value="Meals & Drinks" className="bg-white dark:bg-[#0b1612]">Meals, Tea & Food</option>
                  <option value="Firewood & Heating" className="bg-white dark:bg-[#0b1612]">Firewood & Heating</option>
                  <option value="Groceries & Milk" className="bg-white dark:bg-[#0b1612]">Groceries & Milk</option>
                  <option value="Shared Taxi / Transport" className="bg-white dark:bg-[#0b1612]">Shared Taxi / Transport</option>
                  <option value="Other" className="bg-white dark:bg-[#0b1612]">Other Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={txForm.notes}
                  onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                  placeholder="e.g. Advance paid by Mr. Sharma"
                  className="w-full bg-white dark:bg-[#0b1612] border border-slate-300 dark:border-emerald-900/50 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-forest-700 dark:focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-[#13231c] dark:hover:bg-[#1a3528] text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors border border-slate-200 dark:border-emerald-900/40 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-forest-800 hover:bg-forest-700 dark:bg-gradient-to-r dark:from-emerald-600 dark:to-forest-700 dark:hover:from-emerald-500 dark:hover:to-forest-600 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm dark:shadow-md transition-colors border border-transparent dark:border-emerald-500/30 cursor-pointer"
                >
                  Log Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
