import mongoose from 'mongoose';

// 1. Whitelist Schema (Allowed Emails)
const WhitelistSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  }
}, { timestamps: true });

// 2. User Schema (Registered Operators)
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  }
}, { timestamps: true });

// 3. Booking Schema (Gaming Sessions)
const BookingSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  date: {
    type: String, // YYYY-MM-DD format
    required: true
  },
  startTime: {
    type: String, // HH:MM format
    required: true
  },
  consoleType: {
    type: String, // PS5, Xbox, PC, Switch
    required: true
  },
  hours: {
    type: Number,
    required: true
  },
  persons: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  },
  paymentOption: {
    type: String,
    enum: ['Cash', 'GPay'],
    default: 'Cash'
  },
  totalCost: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date, // Scheduled end time
    required: true
  },
  activeStatus: {
    type: String,
    enum: ['Upcoming', 'Active', 'Completed'],
    default: 'Upcoming'
  }
}, { timestamps: true });

// 4. Expense Schema (Business Operating Expenses)
const ExpenseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String, // Utility, Maintenance, Games, Rent, Other
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  }
}, { timestamps: true });

// 5. Pricing Settings Schema (Dynamic Hourly Capacity Pricing)
const SettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'pricing'
  },
  rates: {
    type: Map,
    of: Number,
    default: {
      '1': 100,
      '2': 180,
      '3': 220,
      '4': 250
    }
  }
}, { timestamps: true });

// Compile models or fetch already compiled models to avoid model compilation errors on hot-reloading
export const Whitelist = mongoose.models.Whitelist || mongoose.model('Whitelist', WhitelistSchema);
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
export const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
export const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
