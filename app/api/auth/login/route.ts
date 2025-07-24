import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// Mock database - trong thực tế bạn sẽ dùng database thật
const users = [
  {
    id: '1',
    username: 'admin1',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin' as const,
    createdAt: new Date().toISOString(),
    expiresAt: null
  },
  {
    id: '2',
    username: 'admin2',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin' as const,
    createdAt: new Date().toISOString(),
    expiresAt: null
  }
];

// Guest users sẽ được tạo động bởi admin
let guestUsers: Array<{
  id: string;
  username: string;
  password: string;
  role: 'guest';
  createdAt: string;
  expiresAt: string;
}> = [];

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Tìm user trong admin users
    let user = users.find(u => u.username === username);
    
    // Nếu không tìm thấy trong admin users, tìm trong guest users
    if (!user) {
      user = guestUsers.find(u => u.username === username);
      
      // Kiểm tra xem guest user có hết hạn không
      if (user && user.expiresAt && new Date() > new Date(user.expiresAt)) {
        return NextResponse.json(
          { message: 'Guest account has expired' },
          { status: 401 }
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Return user info (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      message: 'Login successful',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// API để admin tạo guest user
export async function PUT(request: NextRequest) {
  try {
    const { adminUser, guestUsername, guestPassword, expirationHours } = await request.json();

    // Verify admin user
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { message: 'Only admin can create guest users' },
        { status: 403 }
      );
    }

    // Create guest user
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expirationHours || 24));

    const hashedPassword = await bcrypt.hash(guestPassword, 10);

    const guestUser = {
      id: Date.now().toString(),
      username: guestUsername,
      password: hashedPassword,
      role: 'guest' as const,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    guestUsers.push(guestUser);

    const { password: _, ...guestUserWithoutPassword } = guestUser;

    return NextResponse.json({
      message: 'Guest user created successfully',
      user: guestUserWithoutPassword
    });

  } catch (error) {
    console.error('Create guest user error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}