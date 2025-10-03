import { NextRequest, NextResponse } from 'next/server';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

// Force Node.js runtime for AWS SDK
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { bucket, accessKeyId, secretAccessKey, accountId } = await request.json();

    if (!bucket || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: 'Missing R2 configuration' },
        { status: 400 }
      );
    }

    // Validate format first
    if (bucket.length < 3 || bucket.length > 63) {
      throw new Error('Invalid bucket name format');
    }

    if (accessKeyId.length < 20) {
      throw new Error('Invalid access key format');
    }

    if (secretAccessKey.length < 40) {
      throw new Error('Invalid secret key format');
    }

    // Test R2 connection
    let r2Endpoint;
    if (accountId) {
      r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    } else {
      // Try to infer from access key
      const inferredAccountId = accessKeyId.includes('_') ? accessKeyId.split('_')[0] : accessKeyId.substring(0, 32);
      r2Endpoint = `https://${inferredAccountId}.r2.cloudflarestorage.com`;
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false,
    });

    // Test connection by checking if bucket exists and is accessible
    const headBucketCommand = new HeadBucketCommand({ Bucket: bucket });
    await s3Client.send(headBucketCommand);

    return NextResponse.json({ 
      success: true,
      message: 'R2 connection successful'
    });

  } catch (error: any) {
    let errorMessage = 'R2 connection failed';
    
    if (error?.name === 'NoSuchBucket') {
      errorMessage = 'Bucket does not exist';
    } else if (error?.name === 'AccessDenied') {
      errorMessage = 'Access denied - check credentials';
    } else if (error?.name === 'InvalidAccessKeyId') {
      errorMessage = 'Invalid access key ID';
    } else if (error?.name === 'SignatureDoesNotMatch') {
      errorMessage = 'Invalid secret access key';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

