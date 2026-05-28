import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Whitelist, User, Booking, Expense, Setting } from '../models/Schemas';

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGO_URI environment variable inside .env.local');
}

// Next.js hot-reload database connection caching pattern
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('Successfully connected to MongoDB Atlas');
      // Execute seeding inside initial connection asynchronously
      seedDatabase().catch((err) => console.error('Database seeding failed:', err));
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Seeding engine to make the dashboard functional out of the box
async function seedDatabase() {
  // 1. Seed Whitelist
  const whitelistCount = await Whitelist.countDocuments();
  if (whitelistCount === 0) {
    console.log('Seeding Whitelist collection...');
    await Whitelist.insertMany([
      { email: 'admin@portal.com' },
      { email: 'user@portal.com' },
      { email: 'tester@gmail.com' },
      { email: 'gaming@center.com' }
    ]);
  }

  // 2. Seed Default Users (Operator & App Owner)
  const appOwner = await User.findOne({ email: 'appowner' });
  if (!appOwner) {
    console.log('Seeding default appowner user...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('0000', salt);
    await User.create({
      name: 'App Owner',
      email: 'appowner',
      passwordHash: passwordHash
    });
  }

  const defaultAdmin = await User.findOne({ email: 'admin@portal.com' });
  if (!defaultAdmin) {
    console.log('Seeding default admin/operator user...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('0000', salt);
    await User.create({
      name: 'Default Operator',
      email: 'admin@portal.com',
      passwordHash: passwordHash
    });
  }

  const settingsCount = await Setting.countDocuments();
  if (settingsCount === 0) {
    console.log('Seeding default hourly player-capacity pricing...');
    await Setting.create({
      key: 'pricing',
      rates: {
        '1': 100,
        '2': 180,
        '3': 220,
        '4': 250
      }
    });
  }

  // 4. Seed Expenses
  const expenseCount = await Expense.countDocuments();
  if (expenseCount === 0) {
    console.log('Seeding initial mock operational expenses...');
    const todayStr = new Date().toISOString().split('T')[0];
    await Expense.insertMany([
      { name: 'Monthly Fiber Broadband', category: 'Utility', amount: 999, date: todayStr },
      { name: 'DualSense PS5 Controller Repairs', category: 'Maintenance', amount: 1500, date: todayStr },
      { name: 'New Game Purchase (GTA VI Pre-order)', category: 'Games', amount: 4999, date: todayStr }
    ]);
  }

  // 5. Seed Bookings
  const bookingCount = await Booking.countDocuments();
  if (bookingCount === 0) {
    console.log('Seeding mock bookings (active, upcoming, unpaid checkout, and archives)...');
    const now = new Date();
    
    // Formats dates & times dynamically so they are relative to current moment
    const todayStr = now.toISOString().split('T')[0];
    
    // Helper to add/subtract hours to/from current time
    const getRelativeTime = (hoursOffset) => {
      const d = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${mins}`;
    };

    // Session 1: Active Session (PS5) - Started 30 mins ago, 2 hours total, 2 players, Paid upfront.
    const activeStart = new Date(now.getTime() - 0.5 * 60 * 60 * 1000);
    const activeEnd = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
    
    // Session 2: Unpaid Pending Checkout Session (Xbox) - Ended 15 mins ago, 3 hours total, 1 player, Pay-at-counter.
    const unpaidStart = new Date(now.getTime() - 3.25 * 60 * 60 * 1000);
    const unpaidEnd = new Date(now.getTime() - 0.25 * 60 * 60 * 1000);

    // Session 3: Upcoming Session (Nintendo Switch) - Starts in 2 hours, 1 hour total, 3 players.
    const upcomingStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const upcomingEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    // Session 4 & 5: Completed Archived Sessions (Historical, to feed reports).
    const archivedEnd1 = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const archivedEnd2 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await Booking.insertMany([
      {
        customerName: 'Rohith Prasad',
        phoneNumber: '9876543210',
        date: todayStr,
        startTime: getRelativeTime(-0.5),
        consoleType: 'PS5',
        hours: 2,
        persons: 2,
        paymentStatus: 'Paid',
        paymentOption: 'GPay',
        totalCost: 360, // 180/hr * 2
        endedAt: activeEnd,
        activeStatus: 'Active'
      },
      {
        customerName: 'Sam Billings',
        phoneNumber: '8123456789',
        date: todayStr,
        startTime: getRelativeTime(-3.25),
        consoleType: 'Xbox Series X',
        hours: 3,
        persons: 1,
        paymentStatus: 'Unpaid',
        paymentOption: 'Cash',
        totalCost: 300, // 100/hr * 3
        endedAt: unpaidEnd,
        activeStatus: 'Completed' // Automatically ready for checkout since endedAt is in past
      },
      {
        customerName: 'Nisha Sen',
        phoneNumber: '',
        date: todayStr,
        startTime: getRelativeTime(2),
        consoleType: 'Nintendo Switch',
        hours: 1,
        persons: 3,
        paymentStatus: 'Unpaid',
        paymentOption: 'GPay',
        totalCost: 220, // 220/hr * 1
        endedAt: upcomingEnd,
        activeStatus: 'Upcoming'
      },
      {
        customerName: 'Vikas Kumar',
        phoneNumber: '9988776655',
        date: todayStr,
        startTime: '08:00',
        consoleType: 'High-End PC',
        hours: 2,
        persons: 4,
        paymentStatus: 'Paid',
        paymentOption: 'Cash',
        totalCost: 500, // 250/hr * 2
        endedAt: archivedEnd1,
        activeStatus: 'Completed'
      },
      {
        customerName: 'Aiden Pierce',
        phoneNumber: '',
        date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startTime: '14:00',
        consoleType: 'PS5',
        hours: 4,
        persons: 2,
        paymentStatus: 'Paid',
        paymentOption: 'GPay',
        totalCost: 720, // 180/hr * 4
        endedAt: archivedEnd2,
        activeStatus: 'Completed'
      }
    ]);
  }
}
