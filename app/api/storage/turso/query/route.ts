import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function POST(request: NextRequest) {
  try {
    const url = request.headers.get('X-Turso-URL');
    const token = request.headers.get('X-Turso-Token');

    if (!url || !token) {
      return NextResponse.json(
        { error: 'Missing Turso configuration headers' },
        { status: 400 }
      );
    }

    const { query, params = [] } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const client = createClient({ url, authToken: token });

    // Support multi-statement queries (e.g., CREATE TABLE ...; CREATE INDEX ...;)
    const statements = query
      .split(';')
      .map((s: string) => s.trim())
      .filter(Boolean);

    let lastResult: any = null;
    if (statements.length > 1) {
      for (const stmt of statements) {
        // No positional params across multiple statements; run each directly
        lastResult = await client.execute(stmt);
      }
    } else {
      lastResult = await client.execute({ sql: query, args: params });
    }

    // Normalize response
    const rows = (lastResult as any)?.rows ?? [];
    const columns = (lastResult as any)?.columns ?? [];
    const rowsAffected = (lastResult as any)?.rowsAffected ?? 0;

    return NextResponse.json({ success: true, rows, columns, rowsAffected });

  } catch (error) {
    console.error('Turso query error:', error);
    return NextResponse.json(
      { error: 'Failed to execute Turso query' },
      { status: 500 }
    );
  }
}
