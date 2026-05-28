"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, User, Calendar, Clock, Plus, 
  Settings, LogOut, ShieldAlert, TrendingUp, 
  Coins, FileText, CheckCircle2, AlertTriangle, X, 
  Users, CreditCard, Wallet, Tv, Flame, ArrowUpRight, 
  Lock, KeyRound, Phone, Delete, RefreshCw
} from 'lucide-react';

const formatCurrency = (val) => {
  return `₹${Number(val || 0).toLocaleString('en-IN')}`;
};

export default function Home() {
  // --- Core Application States ---
  const [operator, setOperator] = useState(null); // Authenticated Operator User
  const [activeTab, setActiveTab] = useState('dashboard'); // Current visual tab
  const [bookings, setBookings] = useState([]); // Database bookings registry
  const [expenses, setExpenses] = useState([]); // Operational expenses ledger
  const [reports, setReports] = useState(null); // Aggregated reports from API
  const [pricingSettings, setPricingSettings] = useState(null); // Dynamic capacity prices
  const [whitelist, setWhitelist] = useState([]); // Whitelist emails
  
  // Real-time ticking timers state
  const [timers, setTimers] = useState({}); // { bookingId: { timeStr, percentage, expiring } }

  // Modal triggers
  const [newBookingModal, setNewBookingModal] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(null);
  const [extensionModal, setExtensionModal] = useState(null);
  const [adminPasscodeModal, setAdminPasscodeModal] = useState(false);

  // Authentication states
  const [authMode, setAuthMode] = useState('signin'); // signin / signup
  const [authForm, setAuthForm] = useState({ name: '', email: '' });
  const [passcode, setPasscode] = useState(''); // 4-Digit Passcode
  const [authStep, setAuthStep] = useState(1); // 1 = Name/Email, 2 = Passcode Keypad
  const [accessDeniedEmail, setAccessDeniedEmail] = useState('');
  const [accessDeniedModal, setAccessDeniedModal] = useState(false);

  // Dynamic new booking form state
  const [newBookingForm, setNewBookingForm] = useState({
    customerName: '',
    phoneNumber: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    consoleType: 'PS5',
    hours: 1,
    persons: 1,
    paymentStatus: 'Unpaid', // Default Pay-at-counter
    paymentOption: 'GPay'
  });

  // Dynamic extension form state
  const [extensionForm, setExtensionForm] = useState({
    extraHours: 1,
    paymentOption: 'GPay',
    paymentStatus: 'Unpaid' // Default adds to counter tab
  });

  // Dynamic expense logger form
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    category: 'Utility',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Whitelist admin input form
  const [whitelistInput, setWhitelistInput] = useState('');
  const [adminPasscodeInput, setAdminPasscodeInput] = useState('');
  const [adminPasscodeDots, setAdminPasscodeDots] = useState(''); // 4-digit admin passcode state

  // Financial Category Filter
  const [paymentFilter, setPaymentFilter] = useState('All'); // All / GPay / Cash

  // Interactive Toast Notifications System
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // --- Initial Data Fetching ---
  const fetchAllData = async () => {
    try {
      const resBookings = await fetch('/api/bookings');
      const dataBookings = await resBookings.json();
      if (dataBookings.bookings) setBookings(dataBookings.bookings);

      const resExpenses = await fetch('/api/expenses');
      const dataExpenses = await resExpenses.json();
      if (dataExpenses.expenses) setExpenses(dataExpenses.expenses);

      const resSettings = await fetch('/api/settings');
      const dataSettings = await resSettings.json();
      if (dataSettings.settings) setPricingSettings(dataSettings.settings);

      const resReports = await fetch('/api/reports');
      const dataReports = await resReports.json();
      if (dataReports) setReports(dataReports);

      const resWhitelist = await fetch('/api/whitelist');
      const dataWhitelist = await resWhitelist.json();
      if (dataWhitelist.emails) setWhitelist(dataWhitelist.emails);

    } catch (err) {
      console.error('Error fetching initial database elements:', err);
      addToast('Failed to connect to MongoDB server APIs.', 'error');
    }
  };

  // Run initial fetch on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('operator_token');
    const savedUser = localStorage.getItem('operator_profile');
    if (savedToken && savedUser) {
      setOperator(JSON.parse(savedUser));
    }
    fetchAllData();
  }, []);

  // Sync data whenever operator session starts or tab changes
  useEffect(() => {
    if (operator) {
      fetchAllData();
    }
  }, [operator, activeTab]);

  // --- Ticking Interval Timer Engine for Active Slots ---
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimers = {};
      const now = new Date();
      let timerExpiredFlag = false;

      bookings.forEach((booking) => {
        if (booking.activeStatus === 'Active') {
          const start = new Date(booking.createdAt);
          const end = new Date(booking.endedAt);
          
          const totalDuration = end.getTime() - start.getTime();
          const elapsed = now.getTime() - start.getTime();
          const remaining = end.getTime() - now.getTime();

            // Removed auto-completion; keep session active until user ends it
            // No status change here
            // Optionally could set a flag for UI indication but keep booking.activeStatus as 'Active'

          if (remaining < 0) {
            const seconds = Math.floor((Math.abs(remaining) / 1000) % 60);
            const minutes = Math.floor((Math.abs(remaining) / (1000 * 60)) % 60);
            const hours = Math.floor(Math.abs(remaining) / (1000 * 60 * 60));
            const timeStr = `+${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            updatedTimers[booking._id] = { timeStr, percentage: 100, expiring: true };
          } else {
            const percentage = Math.min((elapsed / totalDuration) * 100, 100);
            
            const seconds = Math.floor((remaining / 1000) % 60);
            const minutes = Math.floor((remaining / (1000 * 60)) % 60);
            const hours = Math.floor(remaining / (1000 * 60 * 60));

            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            const expiring = remaining <= 5 * 60 * 1000; // Less than 5 mins is warning state

            updatedTimers[booking._id] = {
              timeStr,
              percentage,
              expiring
            };
          }
        }
      });

      setTimers(updatedTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [bookings]);

  // --- 🔢 Passcode Keypad Input Handler ---
  const handleKeypadPress = (val) => {
    if (val === 'back') {
      setPasscode((prev) => prev.slice(0, -1));
    } else if (val === 'clear') {
      setPasscode('');
    } else {
      if (passcode.length < 4) {
        const nextPasscode = passcode + val;
        setPasscode(nextPasscode);
        
        // Auto-submit once 4 digits are completed!
        if (nextPasscode.length === 4) {
          handlePasscodeSubmit(nextPasscode);
        }
      }
    }
  };

  // Enforces actual whitelisted credentials checks via POST API
  const handlePasscodeSubmit = async (codeToSubmit) => {
    try {
      const payload = {
        action: authMode,
        name: authForm.name,
        email: authForm.email,
        password: codeToSubmit // Enforce passcode string as credentials password
      };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setPasscode(''); // Clear keypad input on error
        if (res.status === 403) {
          setAccessDeniedEmail(authForm.email);
          setAccessDeniedModal(true);
          setAuthStep(1);
          return;
        }
        throw new Error(data.details || data.error || 'Authentication failed');
      }

      localStorage.setItem('operator_token', data.token);
      localStorage.setItem('operator_profile', JSON.stringify(data.user));
      setOperator(data.user);
      addToast(data.message);
      
      // Reset authentication controller
      setAuthForm({ name: '', email: '' });
      setPasscode('');
      setAuthStep(1);
    } catch (err) {
      setPasscode(''); // Clear on failure
      addToast(err.message, 'error');
    }
  };

  const handleEmailStepSubmit = (e) => {
    e.preventDefault();
    if (!authForm.email) return;

    if (authMode === 'signup' && !authForm.name) {
      addToast('Name is required for registration.', 'error');
      return;
    }

    // Email or username format checks
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isAppOwner = authForm.email.trim().toLowerCase() === 'appowner';
    if (!isAppOwner && !emailPattern.test(authForm.email)) {
      addToast('Please enter a valid username or email address.', 'error');
      return;
    }

    // Go to keypad
    setAuthStep(2);
  };

  const handleLogout = () => {
    localStorage.removeItem('operator_token');
    localStorage.removeItem('operator_profile');
    setOperator(null);
    setActiveTab('dashboard');
    addToast('Operator logged out successfully.');
  };

  // --- Whitelist Management Handlers ---
  const handleAddWhitelist = async (e) => {
    e.preventDefault();
    if (!whitelistInput) return;

    try {
      const res = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: whitelistInput })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      addToast(data.message);
      setWhitelistInput('');
      fetchAllData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleRemoveWhitelist = async (email) => {
    try {
      const res = await fetch(`/api/whitelist?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      addToast(data.message);
      fetchAllData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // --- Dynamic Pricing Settings Handlers ---
  const handleSavePricing = async (e) => {
    e.preventDefault();
    if (!pricingSettings || !pricingSettings.rates) return;

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: pricingSettings.rates })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      addToast(data.message);
      fetchAllData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const calculatePrice = (persons, hours) => {
    if (!pricingSettings || !pricingSettings.rates) {
      const defaultRates = { 1: 100, 2: 180, 3: 220, 4: 250 };
      return (defaultRates[persons] || 250) * hours;
    }
    const ratesObj = pricingSettings.rates;
    const rate = ratesObj[String(persons)] || ratesObj['4'] || 100;
    return rate * hours;
  };

  // --- Expense Logger Handler ---
  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      addToast(data.message);
      setExpenseForm({
        name: '',
        category: 'Utility',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchAllData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // --- Booking creation/extension/checkout handlers ---
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBookingForm)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      addToast(data.message);
      setNewBookingModal(false);
      setNewBookingForm({
        customerName: '',
        phoneNumber: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        consoleType: 'PS5',
        hours: 1,
        persons: 1,
        paymentStatus: 'Unpaid',
        paymentOption: 'GPay'
      });
      fetchAllData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleConfirmExtension = async (e) => {
    e.preventDefault();
    if (!extensionModal) return;

    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: extensionModal._id,
          action: 'extend',
          extraHours: Number(extensionForm.extraHours),
          paymentOption: extensionForm.paymentOption,
          paymentStatus: extensionForm.paymentStatus
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      addToast(data.message);
      setExtensionModal(null);
      setExtensionForm({ extraHours: 1, paymentOption: 'GPay', paymentStatus: 'Unpaid' });
      fetchAllData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleConfirmCheckout = async (e) => {
    e.preventDefault();
    if (!checkoutModal) return;

    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: checkoutModal._id,
          action: 'checkout',
          paymentOption: checkoutModal.paymentOption
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      addToast(data.message);
      setCheckoutModal(null);
      fetchAllData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleEndEarly = async (bookingId) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          action: 'end_early'
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      addToast(data.message);
      fetchAllData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Admin whitelist panel passcode logic (uses keypad mock on mobile)
  const handleAdminPasscodeKeypad = (val) => {
    if (val === 'back') {
      setAdminPasscodeDots((prev) => prev.slice(0, -1));
    } else if (val === 'clear') {
      setAdminPasscodeDots('');
    } else {
      if (adminPasscodeDots.length < 4) {
        const nextDots = adminPasscodeDots + val;
        setAdminPasscodeDots(nextDots);

        if (nextDots.length === 4) {
          if (nextDots === 'admin123' || nextDots === '0000') {
            setAdminPasscodeModal(false);
            setAdminPasscodeDots('');
            setActiveTab('admin');
            addToast('Administrative Access Authorized.');
          } else {
            setAdminPasscodeDots('');
            addToast('Invalid Administrative Passcode.', 'error');
          }
        }
      }
    }
  };

  // --- Filtering Helper for KPIs ---
  const getFilteredMetrics = () => {
    if (!reports) return { monthlyEarnings: 0, dailyEarnings: 0 };
    if (paymentFilter === 'All') {
      return {
        monthlyEarnings: reports.kpis?.monthlyEarnings || 0,
        dailyEarnings: reports.kpis?.dailyEarnings || 0
      };
    }
    const targetOption = paymentFilter;
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7);

    const paidMatchingBookings = bookings.filter(b => b.paymentStatus === 'Paid' && b.paymentOption === targetOption);
    const dailyEarnings = paidMatchingBookings
      .filter(b => b.date === todayStr)
      .reduce((sum, b) => sum + b.totalCost, 0);

    const monthlyEarnings = paidMatchingBookings
      .filter(b => b.date.startsWith(currentMonthPrefix))
      .reduce((sum, b) => sum + b.totalCost, 0);

    return { monthlyEarnings, dailyEarnings };
  };

  const { monthlyEarnings, dailyEarnings } = getFilteredMetrics();

  const getConsoleIcon = (console) => {
    switch (console) {
      case 'PS5': return <Tv className="w-4 h-4 text-blue-400" />;
      case 'Xbox Series X': return <Gamepad2 className="w-4 h-4 text-emerald-400" />;
      default: return <Clock className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="app-layout">
      <div className="background-grid"></div>


      {/* Slide-in Toast Notification Engine */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="toast-icon w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="toast-icon w-4 h-4 flex-shrink-0" />
              )}
              <div className="toast-message">{toast.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ACCESS DENIED OVERLAY MODAL */}
      <AnimatePresence>
        {accessDeniedModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content glass-panel restricted-overlay"
            >
              <ShieldAlert className="restricted-icon w-12 h-12 text-rose-500" />
              <h2 className="auth-title" style={{ color: 'var(--accent-danger)' }}>Access Restriction</h2>
              <p className="auth-subtitle" style={{ margin: '8px 0 16px 0' }}>
                The email <strong>{accessDeniedEmail}</strong> is not listed on the authorized operator whitelist. Whitelisted credentials are required to sign in.
              </p>
              
              <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-slate)', padding: '14px', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'left', width: '100%' }}>
                <strong>Authorized Access ONLY:</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.4' }}>
                  Please ask an administrator to add your email to the Whitelist registry via the switcher in the bottom-left corner of the portal.
                </p>
              </div>
              
              <button 
                onClick={() => setAccessDeniedModal(false)}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '14px' }}
              >
                Close Gateway
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN PASSCODE CHALLENGE (Numeric keypad overlay for Android feel) */}
      <AnimatePresence>
        {adminPasscodeModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content glass-panel"
              style={{ maxWidth: '340px' }}
            >
              <div className="modal-header">
                <h3 className="section-title">
                  <Lock className="w-4 h-4 text-amber-500" /> Admin Lock
                </h3>
                <button onClick={() => { setAdminPasscodeModal(false); setAdminPasscodeDots(''); }} className="modal-close-btn">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <span className="form-label">Enter Admin Passcode (0000)</span>
                
                {/* 4 dots */}
                <div className="passcode-dots-container" style={{ margin: '12px 0 20px 0' }}>
                  {[0, 1, 2, 3].map((dotIndex) => (
                    <div 
                      key={dotIndex} 
                      className={`passcode-dot ${adminPasscodeDots.length > dotIndex ? 'filled' : ''}`}
                    ></div>
                  ))}
                </div>

                {/* Keypad */}
                <div className="keypad-grid" style={{ gap: '10px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div 
                      key={num} 
                      onClick={() => handleAdminPasscodeKeypad(String(num))}
                      className="keypad-key"
                      style={{ width: '56px', height: '56px', fontSize: '20px' }}
                    >
                      {num}
                    </div>
                  ))}
                  <div onClick={() => handleAdminPasscodeKeypad('clear')} className="keypad-key" style={{ width: '56px', height: '56px', fontSize: '13px' }}>C</div>
                  <div onClick={() => handleAdminPasscodeKeypad('0')} className="keypad-key" style={{ width: '56px', height: '56px', fontSize: '20px' }}>0</div>
                  <div onClick={() => handleAdminPasscodeKeypad('back')} className="keypad-key" style={{ width: '56px', height: '56px' }}>
                    <Delete className="w-4.5 h-4.5 text-secondary" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- RENDER VIEW 1: AUTHENTICATION PORTAL GATEWAY --- */}
      <AnimatePresence mode="wait">
        {!operator ? (
          <motion.div 
            key="auth-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="auth-page-container"
          >
            <div className="auth-card glass-panel">
              <div className="auth-header">
                <img src="/logo.png" alt="Console Corner" style={{ width: '64px', height: '64px', margin: '0 auto 8px auto', borderRadius: '12px', objectFit: 'contain' }} />
                <h1 className="auth-title">Console Corner</h1>
                <p className="auth-subtitle">Gaming Center Management</p>
              </div>

              {/* Tab Selector */}
              <div className="auth-tab-buttons">
                <button 
                  onClick={() => { setAuthMode('signin'); setAuthStep(1); setPasscode(''); }}
                  className={`auth-tab-btn ${authMode === 'signin' ? 'active' : ''}`}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => { setAuthMode('signup'); setAuthStep(1); setPasscode(''); }}
                  className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
                >
                  Sign Up
                </button>
              </div>

              {/* Step 1: Input Name & Whitelisted Email */}
              {authStep === 1 ? (
                <form onSubmit={handleEmailStepSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {authMode === 'signup' && (
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="John Doe"
                        required
                        value={authForm.name}
                        onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                        className="form-input" 
                      />
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label className="form-label">Username or Email Address</label>
                    <input 
                      type="text" 
                      placeholder="operator@consolecorner.com"
                      required
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      className="form-input" 
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                    Continue
                  </button>
                </form>
              ) : (
                /* Step 2: 🔢 Passcode Keypad Grid Entry (Android Lock Screen experience) */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span className="form-label" style={{ fontSize: '12.5px' }}>
                      {authMode === 'signin' ? 'Enter Passcode for:' : 'Set 4-Digit Passcode for:'}
                    </span>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '14.5px', marginTop: '2px' }}>{authForm.email}</div>
                  </div>

                  {/* 4 dots */}
                  <div className="passcode-dots-container">
                    {[0, 1, 2, 3].map((dotIndex) => (
                      <div 
                        key={dotIndex} 
                        className={`passcode-dot ${passcode.length > dotIndex ? 'filled' : ''}`}
                      ></div>
                    ))}
                  </div>

                  {/* On-screen numeric keypad */}
                  <div className="keypad-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <div 
                        key={num} 
                        onClick={() => handleKeypadPress(String(num))}
                        className="keypad-key"
                      >
                        {num}
                      </div>
                    ))}
                    <div onClick={() => handleKeypadPress('clear')} className="keypad-key" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>C</div>
                    <div onClick={() => handleKeypadPress('0')} className="keypad-key">0</div>
                    <div onClick={() => handleKeypadPress('back')} className="keypad-key">
                      <Delete className="w-5 h-5 text-secondary" />
                    </div>
                  </div>

                  <button 
                    onClick={() => { setAuthStep(1); setPasscode(''); }}
                    className="btn btn-secondary" 
                    style={{ width: '100%', marginTop: '20px', padding: '10px' }}
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* --- RENDER VIEW 2: LOGGED-IN Android layout with Bottom Navigation --- */
          <motion.div 
            key="dashboard-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="app-layout"
          >
            {/* Android-style Floating Action Button (FAB) for touch slot booking */}
            {activeTab === 'dashboard' && (
              <button 
                onClick={() => setNewBookingModal(true)}
                className="fab-btn"
                title="Book New Slot"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}

            {/* Android bottom nav bar */}
            <header className="navbar">
              <nav className="nav-links">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                >
                  <div className="nav-link-icon-container">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <span>Dashboard</span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('checkout')}
                  className={`nav-link ${activeTab === 'checkout' ? 'active' : ''}`}
                >
                  <div className="nav-link-icon-container" style={{ position: 'relative' }}>
                    <Coins className="w-5 h-5" />
                    {bookings.filter((b) => b.paymentStatus === 'Unpaid').length > 0 && (
                      <span style={{ position: 'absolute', top: '1px', right: '8px', background: 'var(--accent-warning)', color: '#030712', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '800' }}>
                        {bookings.filter((b) => b.paymentStatus === 'Unpaid').length}
                      </span>
                    )}
                  </div>
                  <span>Checkout</span>
                </button>

                <button 
                  onClick={() => setActiveTab('reports')}
                  className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
                >
                  <div className="nav-link-icon-container">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span>Reports</span>
                </button>

                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                >
                  <div className="nav-link-icon-container">
                    <Settings className="w-5 h-5" />
                  </div>
                  <span>Settings</span>
                </button>

                <button 
                  onClick={() => handleLogout()}
                  className="nav-link"
                  style={{ color: 'var(--accent-danger)' }}
                >
                  <div className="nav-link-icon-container">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span>Logout</span>
                </button>
              </nav>
            </header>

            {/* Dashboard Container body */}
            <main className="dashboard-container">
              
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="tab-dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Financial KPIs Metrics */}
                    <div className="kpi-row">
                      <div className="kpi-card kpi-earnings">
                        <div className="kpi-header">
                          <span>Monthly Income</span>
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <div className="kpi-value mono-font">{formatCurrency(monthlyEarnings)}</div>
                        <div className="kpi-footer">{paymentFilter}</div>
                      </div>

                      <div className="kpi-card kpi-earnings">
                        <div className="kpi-header">
                          <span>Daily Income</span>
                          <Coins className="w-3.5 h-3.5" />
                        </div>
                        <div className="kpi-value mono-font">{formatCurrency(dailyEarnings)}</div>
                        <div className="kpi-footer">Settled today</div>
                      </div>

                      <div className="kpi-card kpi-expenses">
                        <div className="kpi-header">
                          <span>Monthly Expenses</span>
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="kpi-value mono-font">{formatCurrency(reports?.kpis?.monthlyExpenses || 0)}</div>
                        <div className="kpi-footer">Overheads</div>
                      </div>

                      <div className="kpi-card kpi-expenses">
                        <div className="kpi-header">
                          <span>Daily Expenses</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                        <div className="kpi-value mono-font">{formatCurrency(reports?.kpis?.dailyExpenses || 0)}</div>
                        <div className="kpi-footer">Today's bills</div>
                      </div>
                    </div>

                    {/* Filter and booking button row */}
                    <div className="filter-row">
                      <div className="filter-pills">
                        {['All', 'GPay', 'Cash'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => {
                              setPaymentFilter(filter);
                              addToast(`Filter updated to: ${filter}`);
                            }}
                            className={`filter-pill ${paymentFilter === filter ? 'active' : ''}`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Main Panels Grids */}
                    <div className="dashboard-grid">
                      
                      {/* Left: Active slots */}
                      <div className="grid-main-section">
                        <div className="section-header" style={{ marginBottom: '8px' }}>
                          <h3 className="section-title">
                            <Flame className="w-4 h-4 text-orange-500 animate-pulse" /> Active Sessions
                          </h3>
                        </div>

                        {bookings.filter((b) => b.activeStatus === 'Active').length === 0 ? (
                          <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            <Gamepad2 className="w-10 h-10 text-muted" style={{ margin: '0 auto 10px auto', opacity: '0.3' }} />
                            <p style={{ fontWeight: '500', fontSize: '14px' }}>No active console sessions.</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Tap the floating (+) button to start a slot!</p>
                          </div>
                        ) : (
                          <div className="slots-grid">
                            {bookings.filter((b) => b.activeStatus === 'Active').map((booking) => {
                              const timer = timers[booking._id] || { timeStr: '--:--:--', percentage: 0, expiring: false };
                              
                              let consoleClass = 'slot-ps5';
                              if (booking.consoleType.includes('Xbox')) consoleClass = 'slot-xbox';
                              if (booking.consoleType.includes('PC')) consoleClass = 'slot-pc';
                              if (booking.consoleType.includes('Switch')) consoleClass = 'slot-switch';

                              return (
                                <div 
                                  key={booking._id} 
                                  className={`slot-card ${consoleClass} ${timer.expiring ? 'pulse-expiring' : ''}`}
                                >
                                  <div className="slot-card-header">
                                    <div>
                                      <span className="console-tag">{booking.consoleType}</span>
                                      <h4 className="customer-name">{booking.customerName}</h4>
                                      <div className="session-meta">
                                        <Users className="w-3 h-3" /> <span>{booking.persons} Player{booking.persons > 1 ? 's' : ''}</span>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <div className={`time-remaining mono-font ${timer.timeStr.includes('+') ? 'text-red-500' : 'text-green-500'}`}>{timer.timeStr}</div>
                                      <div className="time-label">{timer.timeStr.includes('+') ? 'OVERTIME' : 'REMAINING'}</div>
                                    </div>
                                  </div>

                                  <div className="progress-container">
                                    <div className="progress-bar-bg">
                                      <div 
                                        className="progress-bar-fill" 
                                        style={{ width: `${timer.percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>

                                  <div className="session-meta" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span>Start: {booking.startTime} | Duration: {booking.hours}h</span>
                                    <span style={{ fontWeight: '600', color: booking.paymentStatus === 'Paid' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                                      {booking.paymentStatus === 'Paid' ? 'PAID' : 'POST-PAID'}
                                    </span>
                                  </div>

                                  <div className="slot-actions">
                                    <button 
                                      onClick={() => {
                                        setExtensionModal(booking);
                                        setExtensionForm({ extraHours: 1, paymentOption: booking.paymentOption, paymentStatus: booking.paymentStatus });
                                      }}
                                      className="btn btn-secondary slot-btn"
                                    >
                                      Extend
                                    </button>
                                    
                                    <button 
                                      onClick={() => {
                                        if (booking.paymentStatus === 'Paid') {
                                          handleEndEarly(booking._id);
                                        } else {
                                          setCheckoutModal(booking);
                                        }
                                      }}
                                      className="btn btn-danger slot-btn"
                                    >
                                      End Session
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right: Upcoming slots */}
                      <div>
                        <div className="section-header">
                          <h3 className="section-title">
                            <Calendar className="w-4.5 h-4.5 text-indigo-500" /> Upcoming Reminders
                          </h3>
                        </div>

                        {bookings.filter((b) => b.activeStatus === 'Upcoming').length === 0 ? (
                          <div className="glass-panel" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                            <Clock className="w-7 h-7 text-muted" style={{ margin: '0 auto 8px auto', opacity: '0.3' }} />
                            <p style={{ fontSize: '13px', fontWeight: '500' }}>No reservations today.</p>
                          </div>
                        ) : (
                          <div className="upcoming-list">
                            {bookings.filter((b) => b.activeStatus === 'Upcoming').map((booking) => (
                              <div key={booking._id} className="upcoming-card">
                                <div className="upcoming-info">
                                  <span className="upcoming-time">{booking.startTime} ({booking.hours}h)</span>
                                  <span style={{ fontWeight: '600', color: '#fff', fontSize: '14px' }}>{booking.customerName}</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {booking.consoleType} | {booking.persons} Players
                                  </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-primary)', display: 'block', marginBottom: '4px' }}>
                                    {formatCurrency(booking.totalCost)}
                                  </span>
                                  <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 4px', borderRadius: '3px', background: booking.paymentStatus === 'Paid' ? 'var(--accent-success-bg)' : 'var(--accent-warning-bg)', color: booking.paymentStatus === 'Paid' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                                    {booking.paymentStatus === 'Paid' ? 'PAID' : 'COUNTER'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* --- RENDER TAB 3: CHECKOUT DESK --- */}
                {activeTab === 'checkout' && (
                  <motion.div
                    key="tab-checkout"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="checkout-panel"
                  >
                    <div className="section-header">
                      <h3 className="section-title">
                        <Coins className="w-5 h-5 text-indigo-500" /> Counter Settlements
                      </h3>
                    </div>

                    {bookings.filter((b) => b.paymentStatus === 'Unpaid').length === 0 ? (
                      <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" style={{ margin: '0 auto 10px auto', color: 'var(--accent-success)' }} />
                        <h4 style={{ fontSize: '16px', fontWeight: '600' }}>No Pending Invoices</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>All finished slots have been settled.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {bookings.filter((b) => b.paymentStatus === 'Unpaid').map((booking) => (
                          <div key={booking._id} className="checkout-card glass-panel">
                            <div className="checkout-details">
                              <div className="checkout-badge">
                                <AlertTriangle className="w-3 h-3" /> AWAITING SETTLEMENT
                              </div>
                              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>{booking.customerName}</h4>
                              <div className="session-meta" style={{ marginTop: '2px' }}>
                                <Phone className="w-3 h-3" /> <span>{booking.phoneNumber || 'No phone'}</span>
                                <span style={{ color: 'var(--text-muted)' }}>|</span>
                                <span>{booking.consoleType}</span>
                                <span style={{ color: 'var(--text-muted)' }}>|</span>
                                <span>{booking.hours}h ({booking.persons} players)</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>DUE</span>
                                <span className="mono-font" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-warning)' }}>
                                  {formatCurrency(booking.totalCost)}
                                </span>
                              </div>

                              <button 
                                onClick={() => setCheckoutModal(booking)}
                                className="btn btn-amber"
                                style={{ padding: '8px 14px', fontSize: '13px' }}
                              >
                                Settle
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* --- RENDER TAB 4: REPORTS --- */}
                {activeTab === 'reports' && (
                  <motion.div
                    key="tab-reports"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="section-header" style={{ marginBottom: '16px' }}>
                      <h3 className="section-title">
                        <TrendingUp className="w-5 h-5 text-indigo-500" /> Center Profit & Loss
                      </h3>
                    </div>

                    <div className="reports-dashboard-grid">
                      {/* Left: Financial Statement */}
                      <div className="reports-summary-ledger">
                        <div className="profit-summary-card">
                          <div className="profit-summary-line">
                            <span>Income (Paid)</span>
                            <span style={{ color: 'var(--accent-success)', fontWeight: '600' }}>
                              {formatCurrency(reports?.summary?.totalIncome || 0)}
                            </span>
                          </div>
                          
                          <div className="profit-summary-line">
                            <span>Expenses</span>
                            <span style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>
                              -{formatCurrency(reports?.summary?.totalExpenses || 0)}
                            </span>
                          </div>

                          <div className="profit-summary-line divider">
                            <span>Net Profit</span>
                            <span className={(reports?.summary?.netProfit || 0) >= 0 ? 'profit-glow-positive' : 'profit-glow-negative'}>
                              {formatCurrency(reports?.summary?.netProfit || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Payment Options ratios */}
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
                          <h5 style={{ fontSize: '12.5px', fontWeight: '600' }}>Payment Channel Ratios</h5>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                <span>GPay ({formatCurrency(reports?.paymentOptionBreakdown?.gpay || 0)})</span>
                                <span>
                                  {Math.round(((reports?.paymentOptionBreakdown?.gpay || 0) / (reports?.summary?.totalIncome || 1)) * 100)}%
                                </span>
                              </div>
                              <div className="console-share-bar-bg">
                                <div className="console-share-bar-fill" style={{ width: `${((reports?.paymentOptionBreakdown?.gpay || 0) / (reports?.summary?.totalIncome || 1)) * 100}%`, background: 'var(--accent-primary)' }}></div>
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                <span>Cash ({formatCurrency(reports?.paymentOptionBreakdown?.cash || 0)})</span>
                                <span>
                                  {Math.round(((reports?.paymentOptionBreakdown?.cash || 0) / (reports?.summary?.totalIncome || 1)) * 100)}%
                                </span>
                              </div>
                              <div className="console-share-bar-bg">
                                <div className="console-share-bar-fill" style={{ width: `${((reports?.paymentOptionBreakdown?.cash || 0) / (reports?.summary?.totalIncome || 1)) * 100}%`, background: 'var(--accent-success)' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Console share */}
                      <div className="console-share-card glass-panel">
                        <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>Console Performance</h5>
                        
                        {Object.entries(reports?.consoleRevenue || {}).map(([console, revenue]) => {
                          const total = reports?.summary?.totalIncome || 1;
                          const sharePct = Math.round((revenue / total) * 100);
                          
                          let color = 'var(--accent-primary)';
                          if (console.includes('Xbox')) color = '#10b981';
                          if (console.includes('PC')) color = '#ef4444';
                          if (console.includes('Switch')) color = '#f43f5e';

                          return (
                            <div key={console} className="console-share-row">
                              <div className="console-share-header">
                                <span>{console}</span>
                                <span>{formatCurrency(revenue)} ({sharePct}%)</span>
                              </div>
                              <div className="console-share-bar-bg">
                                <div 
                                  className="console-share-bar-fill" 
                                  style={{ width: `${sharePct}%`, backgroundColor: color }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expense logger */}
                    <div className="reports-dashboard-grid">
                      <div className="glass-panel">
                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>Log Expense</h4>
                        <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div className="form-group" style={{ marginBottom: '6px' }}>
                            <label className="form-label">Expense Title</label>
                            <input 
                              type="text" 
                              placeholder="Electricity Bill" 
                              required
                              value={expenseForm.name}
                              onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                              className="form-input" 
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div className="form-group" style={{ marginBottom: '6px' }}>
                              <label className="form-label">Category</label>
                              <select 
                                value={expenseForm.category}
                                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                className="form-input"
                                style={{ background: 'rgba(255,255,255,0.015)', color: '#fff' }}
                              >
                                <option value="Utility" style={{ background: '#111' }}>Utility</option>
                                <option value="Maintenance" style={{ background: '#111' }}>Maintenance</option>
                                <option value="Games" style={{ background: '#111' }}>Games</option>
                                <option value="Rent" style={{ background: '#111' }}>Rent</option>
                                <option value="Other" style={{ background: '#111' }}>Other</option>
                              </select>
                            </div>
                            
                            <div className="form-group" style={{ marginBottom: '6px' }}>
                              <label className="form-label">Amount (₹)</label>
                              <input 
                                type="number" 
                                placeholder="Amount" 
                                min="1"
                                required
                                value={expenseForm.amount}
                                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                className="form-input" 
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">Date</label>
                            <input 
                              type="date" 
                              required
                              value={expenseForm.date}
                              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                              className="form-input" 
                            />
                          </div>

                          <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'var(--accent-danger)', color: '#fff' }}>
                            Log
                          </button>
                        </form>
                      </div>

                      <div className="expense-logger-card glass-panel" style={{ marginTop: '0' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>Expenses Ledger</h4>
                        
                        {expenses.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            No expenses logged.
                          </div>
                        ) : (
                          <div className="expense-ledger-list">
                            {expenses.map((expense) => (
                              <div key={expense._id} className="expense-ledger-item">
                                <div className="expense-item-info">
                                  <span className="expense-item-name">{expense.name}</span>
                                  <span className="expense-item-meta">{expense.category} | {expense.date}</span>
                                </div>
                                <span className="expense-item-amount">-{formatCurrency(expense.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* --- RENDER TAB 5: RATES & WHITELIST SETTINGS --- */}
                {activeTab === 'settings' && (
                  <motion.div
                    key="tab-settings"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                  >
                    <div>
                      <div className="section-header">
                        <h3 className="section-title">
                          <Settings className="w-5 h-5 text-indigo-500" /> Hourly Rates Configuration
                        </h3>
                      </div>

                      {!pricingSettings ? (
                        <div className="glass-panel" style={{ textAlign: 'center', padding: '30px' }}>Loading...</div>
                      ) : (
                        <form onSubmit={handleSavePricing} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="settings-grid">
                            {[1, 2, 3, 4].map((personNum) => {
                              const personStr = String(personNum);
                              return (
                                <div key={personNum} className="price-input-row">
                                  <div className="price-label">
                                    <Users className="w-4 h-4 text-indigo-400" />
                                    <span>{personNum} Player{personNum > 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="price-field-container">
                                    <span className="currency-symbol">₹</span>
                                    <input 
                                      type="number" 
                                      required
                                      min="1"
                                      value={pricingSettings.rates[personStr] || ''}
                                      onChange={(e) => {
                                        const updatedRates = { ...pricingSettings.rates, [personStr]: Number(e.target.value) };
                                        setPricingSettings({ ...pricingSettings, rates: updatedRates });
                                      }}
                                      className="form-input" 
                                      style={{ padding: '6px 10px' }}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/hr</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                            Save Pricing Settings
                          </button>
                        </form>
                      )}
                    </div>

                    <div>
                      <div className="section-header">
                        <h3 className="section-title">
                          <ShieldAlert className="w-5 h-5 text-indigo-500" /> Whitelist Access Gatekeeper
                        </h3>
                      </div>

                      <div className="reports-dashboard-grid">
                        <div className="glass-panel">
                          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>Authorize Email</h4>
                          <form onSubmit={handleAddWhitelist} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="form-group">
                              <label className="form-label">Email Address</label>
                              <input 
                                type="email" 
                                placeholder="name@gmail.com" 
                                required
                                value={whitelistInput}
                                onChange={(e) => setWhitelistInput(e.target.value)}
                                className="form-input" 
                              />
                            </div>
                            
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                              Add to Whitelist
                            </button>
                          </form>
                        </div>

                        <div className="glass-panel">
                          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>Authorized Whitelist</h4>
                          
                          <div className="expense-ledger-list">
                            {whitelist.map((item) => (
                              <div key={item._id} className="expense-ledger-item">
                                <span style={{ fontSize: '13px', fontWeight: '500', color: '#fff' }}>{item.email}</span>
                                
                                {item.email !== 'admin@portal.com' ? (
                                  <button 
                                    onClick={() => handleRemoveWhitelist(item.email)}
                                    className="btn btn-danger"
                                    style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--accent-primary)', padding: '2px 4px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '3px' }}>
                                    ADMINISTRATOR
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL DRAWER VIEWS
          ======================================================== */}

      {/* 1. NEW BOOKING MODAL */}
      <AnimatePresence>
        {newBookingModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="modal-content glass-panel"
            >
              <div className="modal-header">
                <h3 className="section-title">
                  <Gamepad2 className="w-4.5 h-4.5 text-indigo-400" /> Book Console Slot
                </h3>
                <button onClick={() => setNewBookingModal(false)} className="modal-close-btn">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Customer Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rohith Prasad" 
                      required
                      value={newBookingForm.customerName}
                      onChange={(e) => setNewBookingForm({ ...newBookingForm, customerName: e.target.value })}
                      className="form-input" 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Phone (Optional)</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 9876543210" 
                      value={newBookingForm.phoneNumber}
                      onChange={(e) => setNewBookingForm({ ...newBookingForm, phoneNumber: e.target.value })}
                      className="form-input" 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Date</label>
                    <input 
                      type="date" 
                      required
                      value={newBookingForm.date}
                      onChange={(e) => setNewBookingForm({ ...newBookingForm, date: e.target.value })}
                      className="form-input" 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Starting Time</label>
                    <select
                      required
                      value={newBookingForm.startTime}
                      onChange={(e) => setNewBookingForm({ ...newBookingForm, startTime: e.target.value })}
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.015)', color: '#fff' }}
                    >
                      {Array.from({ length: 48 }).map((_, i) => {
                        const hours = Math.floor(i / 2);
                        const minutes = (i % 2) * 30;
                        const period = hours < 12 ? 'AM' : 'PM';
                        const displayHour = hours % 12 === 0 ? 12 : hours % 12;
                        const timeStr = `${displayHour}:${minutes === 0 ? '00' : '30'} ${period}`;
                        const valueStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                        return <option key={valueStr} value={valueStr} style={{ background: '#111' }}>{timeStr}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Console Type</label>
                    <select 
                      value={newBookingForm.consoleType}
                      onChange={(e) => setNewBookingForm({ ...newBookingForm, consoleType: e.target.value })}
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.015)', color: '#fff' }}
                    >
                      <option value="PS5" style={{ background: '#111' }}>PS5 (PlayStation 5)</option>
                      <option value="Xbox Series X" style={{ background: '#111' }}>Xbox Series X</option>
                      <option value="Nintendo Switch" style={{ background: '#111' }}>Nintendo Switch</option>
                      <option value="High-End PC" style={{ background: '#111' }}>High-End PC</option>
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Hours</label>
                    <input 
                      type="number" 
                      required
                      min="1" 
                      max="12"
                      value={newBookingForm.hours}
                      onChange={(e) => setNewBookingForm({ ...newBookingForm, hours: Number(e.target.value) })}
                      className="form-input" 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Players</label>
                    <select 
                      value={newBookingForm.persons}
                      onChange={(e) => setNewBookingForm({ ...newBookingForm, persons: Number(e.target.value) })}
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.015)', color: '#fff' }}
                    >
                      <option value="1" style={{ background: '#111' }}>1 Player</option>
                      <option value="2" style={{ background: '#111' }}>2 Players</option>
                      <option value="3" style={{ background: '#111' }}>3 Players</option>
                      <option value="4" style={{ background: '#111' }}>4 Players</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Billing Flow</label>
                    <div className="visual-toggle-row">
                      <div 
                        onClick={() => setNewBookingForm({ ...newBookingForm, paymentStatus: 'Paid' })}
                        className={`visual-toggle-card ${newBookingForm.paymentStatus === 'Paid' ? 'active' : ''}`}
                      >
                        Paid
                      </div>
                      <div 
                        onClick={() => setNewBookingForm({ ...newBookingForm, paymentStatus: 'Unpaid' })}
                        className={`visual-toggle-card ${newBookingForm.paymentStatus === 'Unpaid' ? 'active' : ''}`}
                      >
                        Counter
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Payment Channel</label>
                    <div className="visual-toggle-row">
                      <div 
                        onClick={() => setNewBookingForm({ ...newBookingForm, paymentOption: 'GPay' })}
                        className={`visual-toggle-card ${newBookingForm.paymentOption === 'GPay' ? 'active' : ''}`}
                      >
                        GPay
                      </div>
                      <div 
                        onClick={() => setNewBookingForm({ ...newBookingForm, paymentOption: 'Cash' })}
                        className={`visual-toggle-card ${newBookingForm.paymentOption === 'Cash' ? 'active' : ''}`}
                      >
                        Cash
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-total-calculator">
                  <div className="calc-total">
                    {formatCurrency(calculatePrice(newBookingForm.persons, newBookingForm.hours))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Create Booking
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. EXTEND SESSION MODAL */}
      <AnimatePresence>
        {extensionModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="modal-content glass-panel"
              style={{ maxWidth: '380px' }}
            >
              <div className="modal-header">
                <h3 className="section-title">
                  <Clock className="w-4.5 h-4.5 text-indigo-400" /> Extend Active Session
                </h3>
                <button onClick={() => setExtensionModal(null)} className="modal-close-btn">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmExtension} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.015)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-slate)' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Session for:</span>
                  <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#fff', marginTop: '1px' }}>{extensionModal.customerName} ({extensionModal.consoleType})</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Add Hours</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="6" 
                      required
                      value={extensionForm.extraHours}
                      onChange={(e) => setExtensionForm({ ...extensionForm, extraHours: Number(e.target.value) })}
                      className="form-input" 
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Payment Method</label>
                    <select 
                      value={extensionForm.paymentOption}
                      onChange={(e) => setExtensionForm({ ...extensionForm, paymentOption: e.target.value })}
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.015)', color: '#fff' }}
                    >
                      <option value="GPay" style={{ background: '#111' }}>GPay</option>
                      <option value="Cash" style={{ background: '#111' }}>Cash</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label">Billing Stream</label>
                  <div className="visual-toggle-row">
                    <div 
                      onClick={() => setExtensionForm({ ...extensionForm, paymentStatus: 'Paid' })}
                      className={`visual-toggle-card ${extensionForm.paymentStatus === 'Paid' ? 'active' : ''}`}
                    >
                      Paid Upfront
                    </div>
                    <div 
                      onClick={() => setExtensionForm({ ...extensionForm, paymentStatus: 'Unpaid' })}
                      className={`visual-toggle-card ${extensionForm.paymentStatus === 'Unpaid' ? 'active' : ''}`}
                    >
                      Add to Counter
                    </div>
                  </div>
                </div>

                <div className="modal-total-calculator">
                  <div className="calc-breakdown">
                    <strong>Extension Charge</strong>
                    <div>₹{calculatePrice(extensionModal.persons, 1) / extensionModal.hours}/hr × {extensionForm.extraHours}h</div>
                  </div>
                  <div className="calc-total">
                    {formatCurrency(calculatePrice(extensionModal.persons, extensionForm.extraHours))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Extend Session
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. COLLECT PAYMENT MODAL RECEIPT */}
      <AnimatePresence>
        {checkoutModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content glass-panel"
              style={{ maxWidth: '400px' }}
            >
              <div className="modal-header">
                <h3 className="section-title">
                  <Coins className="w-4.5 h-4.5 text-amber-500" /> Settle Counter Bill
                </h3>
                <button onClick={() => setCheckoutModal(null)} className="modal-close-btn">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-slate)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>Customer Name</span>
                    <strong style={{ color: '#fff' }}>{checkoutModal.customerName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>Console Rented</span>
                    <strong style={{ color: '#fff' }}>{checkoutModal.consoleType}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>Duration & Players</span>
                    <strong style={{ color: '#fff' }}>{checkoutModal.hours} Hours ({checkoutModal.persons} Players)</strong>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label">Settle Via</label>
                  <div className="visual-toggle-row">
                    <div 
                      onClick={() => setCheckoutModal({ ...checkoutModal, paymentOption: 'GPay' })}
                      className={`visual-toggle-card ${checkoutModal.paymentOption === 'GPay' ? 'active' : ''}`}
                    >
                      GPay
                    </div>
                    <div 
                      onClick={() => setCheckoutModal({ ...checkoutModal, paymentOption: 'Cash' })}
                      className={`visual-toggle-card ${checkoutModal.paymentOption === 'Cash' ? 'active' : ''}`}
                    >
                      Cash
                    </div>
                  </div>
                </div>

                <div className="modal-total-calculator" style={{ background: 'var(--accent-warning-bg)', borderColor: 'rgba(245,158,11,0.2)' }}>
                  <div className="calc-breakdown">
                    <strong style={{ color: 'var(--accent-warning)' }}>COLLECT & CONFIRM</strong>
                    <div>Settle counter tab to finalize slot</div>
                  </div>
                  <div className="calc-total" style={{ color: 'var(--accent-warning)' }}>
                    {formatCurrency(checkoutModal.totalCost)}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', background: 'var(--accent-warning)', color: '#030712', fontWeight: '600' }}
                >
                  Mark as Paid
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
