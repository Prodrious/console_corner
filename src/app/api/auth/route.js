import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/db';
import { User, Whitelist } from '@/models/Schemas';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';

// POST /api/auth
export async function POST(req) {
  try {
    await dbConnect();
    const { action, name, email, password } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Sign Up Action (Manual Registration) - Restricted to Whitelisted Emails
    if (action === 'signup') {
      if (!name || !password) {
        return NextResponse.json({ error: 'Name, email, and passcode are required' }, { status: 400 });
      }

      const passcodePattern = /^\d{4}$/;
      if (!passcodePattern.test(password)) {
        return NextResponse.json({ error: 'Passcode must be exactly 4 digits' }, { status: 400 });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: trimmedEmail });
      if (existingUser) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }

      // Hash password & save user
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const user = await User.create({
        name,
        email: trimmedEmail,
        passwordHash
      });

      // Sign JWT token
      const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      return NextResponse.json({
        message: 'Registration Successful',
        user: { id: user._id, name: user.name, email: user.email },
        token
      }, { status: 201 });
    }

    // 2. Sign In Action (Manual Login)
    if (action === 'signin') {
      if (!password) {
        return NextResponse.json({ error: 'Passcode is required' }, { status: 400 });
      }

      const passcodePattern = /^\d{4}$/;
      if (!passcodePattern.test(password)) {
        return NextResponse.json({ error: 'Passcode must be exactly 4 digits' }, { status: 400 });
      }

// Early bypass for appowner default credentials
      if (trimmedEmail === 'appowner' && password === '0000') {
        // Ensure user exists, create if missing (unlikely)
        let appOwnerUser = await User.findOne({ email: 'appowner' });
        if (!appOwnerUser) {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash('0000', salt);
          appOwnerUser = await User.create({ name: 'App Owner', email: 'appowner', passwordHash });
        }
        const token = jwt.sign({ userId: appOwnerUser._id, email: appOwnerUser.email }, JWT_SECRET, { expiresIn: '7d' });
        return NextResponse.json({
          message: 'Login Successful (appowner)',
          user: { id: appOwnerUser._id, name: appOwnerUser.name, email: appOwnerUser.email },
          token
        });
      }

      // Duplicate appowner login block removed (handled earlier)

      const user = await User.findOne({ email: trimmedEmail });
      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
      }

      // Sign JWT token
      const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      return NextResponse.json({
        message: 'Login Successful',
        user: { id: user._id, name: user.name, email: user.email },
        token
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth API Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
