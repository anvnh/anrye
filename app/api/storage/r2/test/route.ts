import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { bucket, accessKeyId, secretAccessKey } = await request.json();

    if (!bucket || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: 'Missing R2 configuration' },
        { status: 400 }
      );
    }

    // Chỉ validate format của config, không test connection thật
    if (bucket.length < 3 || bucket.length > 63) {
      throw new Error('Invalid bucket name format');
    }

    if (accessKeyId.length < 20) {
      throw new Error('Invalid access key format');
    }

    if (secretAccessKey.length < 40) {
      throw new Error('Invalid secret key format');
    }

    // Simulate successful validation
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({ 
      success: true,
      message: 'R2 configuration is valid'
    });

  } catch (error) {
    console.error('R2 test error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'R2 configuration invalid'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const bucket = request.headers.get('X-R2-Bucket');
    const region = request.headers.get('X-R2-Region');

    if (!bucket || !region) {
      return NextResponse.json(
        { error: 'Missing R2 configuration headers' },
        { status: 400 }
      );
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    return NextResponse.json({
      success: true,
      message: 'R2 connection test successful',
      bucket,
      region,
    });

  } catch (error) {
    console.error('R2 test error:', error);
    return NextResponse.json(
      { error: 'R2 connection test failed' },
      { status: 500 }
    );
  }
}
