import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if token is still valid (24 hours)
    const now = Date.now();
    const tokenAge = now - decoded.loginTime;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (tokenAge > maxAge) {
      return NextResponse.json({ authenticated: false, error: 'Session expired' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      authenticated: true, 
      username: decoded.username,
      loginTime: decoded.loginTime
    });
    
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
