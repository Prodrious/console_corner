import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Booking, Setting } from '@/models/Schemas';

// GET /api/bookings - List all bookings
// Automatically checks and completes active slots whose timers have expired
export async function GET() {
  try {
    await dbConnect();
    const now = new Date();

    // 1. Reactive Timer Guard: Automatically complete active bookings whose end times have passed
    const expiredActiveBookings = await Booking.find({
      activeStatus: 'Active',
      endedAt: { $lte: now }
    });

    if (expiredActiveBookings.length > 0) {
      for (const booking of expiredActiveBookings) {
        booking.activeStatus = 'Completed';
        await booking.save();
      }
      console.log(`Reactively completed ${expiredActiveBookings.length} expired active sessions.`);
    }

    // 2. Fetch all bookings
    const bookings = await Booking.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Bookings GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/bookings - Create a new booking
export async function POST(req) {
  try {
    await dbConnect();
    const { 
      customerName, 
      phoneNumber, 
      date, 
      startTime, 
      consoleType, 
      hours, 
      persons, 
      paymentStatus, // 'Paid' (Upfront) or 'Unpaid' (Post-paid/Counter)
      paymentOption // 'Cash' or 'GPay'
    } = await req.json();

    if (!customerName || !date || !startTime || !consoleType || !hours || !persons) {
      return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
    }

    // 1. Fetch dynamic pricing from settings depending on person count
    const pricingSettings = await Setting.findOne({ key: 'pricing' });
    let ratePerHour = 100; // default for 1 person

    if (pricingSettings && pricingSettings.rates) {
      const personStr = String(persons);
      // Fallback: if capacity > 4, use 4-person rate
      const capacityKey = pricingSettings.rates.has(personStr) ? personStr : '4';
      ratePerHour = pricingSettings.rates.get(capacityKey) || 100;
    } else {
      // Hardcoded fallback if settings model fails
      const fallbackRates = { 1: 100, 2: 180, 3: 220, 4: 250 };
      ratePerHour = fallbackRates[persons] || 250;
    }

    // Calculate total cost
    const totalCost = ratePerHour * hours;

    // 2. Calculate the end date/time
    // Combine date and startTime to create a starting Date object
    // Expects date format: YYYY-MM-DD, startTime format: HH:MM
    const [year, month, day] = date.split('-').map(Number);
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startDateTime = new Date(year, month - 1, day, startHour, startMin);
    const endedAt = new Date(startDateTime.getTime() + hours * 60 * 60 * 1000);

    // 3. Determine initial activeStatus
    // If the booking is for today and starting time is in the past/present, set as Active.
    // Otherwise, set as Upcoming (or Completed if both start/end are in the past).
    const now = new Date();
    let activeStatus = 'Upcoming';
    
    if (endedAt <= now) {
      activeStatus = 'Completed';
    } else if (startDateTime <= now) {
      activeStatus = 'Active';
    }

    const booking = await Booking.create({
      customerName,
      phoneNumber: phoneNumber || '',
      date,
      startTime,
      consoleType,
      hours,
      persons,
      paymentStatus,
      paymentOption,
      totalCost,
      endedAt,
      activeStatus
    });

    return NextResponse.json({ 
      message: 'Booking created successfully', 
      booking 
    }, { status: 201 });
  } catch (error) {
    console.error('Bookings POST Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// PUT /api/bookings - Update booking (Extend Session or Collect Settle Payment)
export async function PUT(req) {
  try {
    await dbConnect();
    const { bookingId, action, extraHours, paymentOption, paymentStatus } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 1. EXTEND SESSION FLOW
    if (action === 'extend') {
      if (!extraHours) {
        return NextResponse.json({ error: 'Extra hours are required' }, { status: 400 });
      }

      // Fetch active pricing from settings
      const pricingSettings = await Setting.findOne({ key: 'pricing' });
      let ratePerHour = 100;
      if (pricingSettings && pricingSettings.rates) {
        const capacityKey = pricingSettings.rates.has(String(booking.persons)) ? String(booking.persons) : '4';
        ratePerHour = pricingSettings.rates.get(capacityKey) || 100;
      }

      const extraCost = ratePerHour * extraHours;

      // Adjust timings
      const currentEndedAt = new Date(booking.endedAt);
      const newEndedAt = new Date(currentEndedAt.getTime() + extraHours * 60 * 60 * 1000);

      // Add metrics
      booking.hours += extraHours;
      booking.totalCost += extraCost;
      booking.endedAt = newEndedAt;

      // If they paid this extension upfront, we create a secondary completed paid ticket OR just add it to this booking.
      // To keep KPIs simple: if this booking was ALREADY paid upfront, the extension is marked paid.
      // If the booking is postpaid (unpaid), the extension accumulates to the unpaid total and they pay at checkout!
      // If the operator explicitly marks the extension as paid upfront right now:
      if (paymentStatus === 'Paid') {
        // If the booking itself was Unpaid, it's safer to create a separate paid transaction for accounting,
        // or just mark this booking as paid (if it's ending).
        // Best approach: if booking was Paid, keep it Paid. If it was Unpaid but they pay for extension upfront,
        // we can adjust paymentStatus or allow checking out the entire session.
        // Let's simply merge it: if the extension is paid now, we update booking option.
        // But to keep it cleanest: if booking is postpaid, extension is added to postpaid total.
        // Let's support updating paymentOption if provided.
        if (paymentOption) {
          booking.paymentOption = paymentOption;
        }
      }

      // Reactive state check (if it was completed, make it active again since time is added!)
      if (newEndedAt > new Date()) {
        booking.activeStatus = 'Active';
      }

      await booking.save();
      return NextResponse.json({ 
        message: `Session extended successfully by ${extraHours} hour(s)`, 
        booking 
      });
    }

    // 2. CHECKOUT SETTLEMENT FLOW (MARK AS PAID)
    if (action === 'checkout') {
      booking.paymentStatus = 'Paid';
      if (paymentOption) {
        booking.paymentOption = paymentOption;
      }
      booking.activeStatus = 'Completed'; // Fully ended and settled
      
      // If checked out early, adjust the endedAt to current time
      const now = new Date();
      if (booking.endedAt > now) {
        booking.endedAt = now;
      }

      await booking.save();
      return NextResponse.json({ 
        message: 'Payment settled and checked out successfully', 
        booking 
      });
    }

    // 3. FORCE END SESSION EARLY
    if (action === 'end_early') {
      booking.activeStatus = 'Completed';
      booking.endedAt = new Date();
      await booking.save();
      return NextResponse.json({ message: 'Session ended early successfully', booking });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Bookings PUT Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
