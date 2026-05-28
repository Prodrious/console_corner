import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Booking, Expense } from '@/models/Schemas';

export async function GET() {
  try {
    await dbConnect();

    // 1. Get dates for comparison
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    // 2. Fetch all paid bookings and all expenses
    const paidBookings = await Booking.find({ paymentStatus: 'Paid' });
    const expenses = await Expense.find({});

    // 3. Compute Totals (All Time)
    const totalIncome = paidBookings.reduce((sum, b) => sum + b.totalCost, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    // 4. Compute Daily KPI Metrics (Today)
    const dailyEarnings = paidBookings
      .filter((b) => b.date === todayStr)
      .reduce((sum, b) => sum + b.totalCost, 0);

    const dailyExpenses = expenses
      .filter((e) => e.date === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);

    // 5. Compute Monthly KPI Metrics (Current Month)
    const monthlyEarnings = paidBookings
      .filter((b) => b.date.startsWith(currentMonthPrefix))
      .reduce((sum, b) => sum + b.totalCost, 0);

    const monthlyExpenses = expenses
      .filter((e) => e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);

    // 6. Compute Console Revenue Share (Paid only)
    const consoleRevenue = {
      'PS5': 0,
      'Xbox Series X': 0,
      'High-End PC': 0,
      'Nintendo Switch': 0
    };

    paidBookings.forEach((b) => {
      // Safely aggregate or initialize key
      const type = b.consoleType;
      if (consoleRevenue[type] !== undefined) {
        consoleRevenue[type] += b.totalCost;
      } else {
        consoleRevenue[type] = b.totalCost;
      }
    });

    // 7. Compute Payment Options Ratio (Paid only)
    let gpayEarnings = 0;
    let cashEarnings = 0;

    paidBookings.forEach((b) => {
      if (b.paymentOption === 'GPay') {
        gpayEarnings += b.totalCost;
      } else if (b.paymentOption === 'Cash') {
        cashEarnings += b.totalCost;
      }
    });

    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpenses,
        netProfit
      },
      kpis: {
        dailyEarnings,
        dailyExpenses,
        monthlyEarnings,
        monthlyExpenses
      },
      consoleRevenue,
      paymentOptionBreakdown: {
        gpay: gpayEarnings,
        cash: cashEarnings
      }
    });
  } catch (error) {
    console.error('Reports GET Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
