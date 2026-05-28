import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Expense } from '@/models/Schemas';

// GET /api/expenses - List all expenses
export async function GET() {
  try {
    await dbConnect();
    const expenses = await Expense.find({}).sort({ date: -1, createdAt: -1 });
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Expenses GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/expenses - Add a new custom expense
export async function POST(req) {
  try {
    await dbConnect();
    const { name, category, amount, date } = await req.json();

    if (!name || !category || !amount || !date) {
      return NextResponse.json({ error: 'Missing required expense fields' }, { status: 400 });
    }

    const expense = await Expense.create({
      name,
      category,
      amount: Number(amount),
      date
    });

    return NextResponse.json({ 
      message: 'Expense logged successfully', 
      expense 
    }, { status: 201 });
  } catch (error) {
    console.error('Expenses POST Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
