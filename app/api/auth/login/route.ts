import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Hardcoded credentials (in production, use environment variables)
const ADMIN_USERNAME = 'anrye';
const ADMIN_PASSWORD_HASH = '$2a$12$LnMp4YZmBk.7vY5ZqGzGZezGzGZezGzGZezGzGZezGzGZezGzG'; // We'll update this
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Rate limiting storage (in production, use Redis or similar)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Hash the password on first run
const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 12);
};

// Check rate limiting
const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  
  if (!attempts) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Reset counter if 15 minutes have passed
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Block if more than 5 attempts in 15 minutes
  if (attempts.count >= 5) {
    return false;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
};

export async function POST(request: NextRequest) {
  try {
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check rate limiting
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const { username, password } = await request.json();
    
    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Check username
    if (username !== ADMIN_USERNAME) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // For first time setup, hash the password
    const actualPasswordHash = await hashPassword('hoangan011020052');
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, actualPasswordHash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Reset rate limiting on successful login
    loginAttempts.delete(clientIP);
    
    // Create JWT token with 24 hour expiration
    const token = jwt.sign(
      { 
        username: ADMIN_USERNAME,
        loginTime: Date.now(),
        ip: clientIP
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Create response with secure cookie
    const response = NextResponse.json({ success: true, message: 'Login successful' });
    
    // Set secure HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false, // Set to false for localhost development
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
