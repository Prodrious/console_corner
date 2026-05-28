import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Setting } from '@/models/Schemas';

// GET /api/settings - Fetch custom pricing configurations
export async function GET() {
  try {
    await dbConnect();
    let settings = await Setting.findOne({ key: 'pricing' });
    
    // Create default settings if not found
    if (!settings) {
      settings = await Setting.create({
        key: 'pricing',
        rates: {
          '1': 100,
          '2': 180,
          '3': 220,
          '4': 250
        }
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/settings - Save/Update pricing settings
export async function POST(req) {
  try {
    await dbConnect();
    const { rates } = await req.json();

    if (!rates) {
      return NextResponse.json({ error: 'Rates are required' }, { status: 400 });
    }

    // Find and update or create pricing structure
    let settings = await Setting.findOne({ key: 'pricing' });
    if (settings) {
      settings.rates = rates;
      await settings.save();
    } else {
      settings = await Setting.create({
        key: 'pricing',
        rates
      });
    }

    return NextResponse.json({ 
      message: 'Pricing settings updated successfully', 
      settings 
    });
  } catch (error) {
    console.error('Settings POST Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
