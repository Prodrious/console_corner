import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Whitelist } from '@/models/Schemas';

// GET /api/whitelist - Retrieve all whitelisted emails
export async function GET() {
  try {
    await dbConnect();
    const emails = await Whitelist.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Whitelist GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/whitelist - Add new email to the whitelist
export async function POST(req) {
  try {
    await dbConnect();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if already whitelisted
    const existing = await Whitelist.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json({ error: 'Email is already in the whitelist' }, { status: 400 });
    }

    const newWhitelist = await Whitelist.create({ email: cleanEmail });
    return NextResponse.json({ 
      message: 'Email added to whitelist successfully', 
      whitelist: newWhitelist 
    }, { status: 201 });
  } catch (error) {
    console.error('Whitelist POST Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// DELETE /api/whitelist - Remove an email from the whitelist
export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Do not allow deleting the seed admin email to avoid locking the system
    if (cleanEmail === 'admin@portal.com') {
      return NextResponse.json({ error: 'Cannot remove the primary administrator account from the whitelist' }, { status: 400 });
    }

    const result = await Whitelist.findOneAndDelete({ email: cleanEmail });
    if (!result) {
      return NextResponse.json({ error: 'Email not found in whitelist' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Email successfully removed from whitelist' });
  } catch (error) {
    console.error('Whitelist DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
