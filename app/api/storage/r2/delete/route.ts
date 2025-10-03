import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Force Node.js runtime for AWS SDK
export const runtime = 'nodejs';

export async function DELETE(request: NextRequest) {
  try {
    const bucket = request.headers.get('X-R2-Bucket');
    const key = request.headers.get('X-R2-Key');
    const accessKeyId = request.headers.get('X-R2-Access-Key-ID');
    const secretAccessKey = request.headers.get('X-R2-Secret-Access-Key');
    const accountId = request.headers.get('X-R2-Account-Id');

    if (!bucket || !key) {
      return NextResponse.json(
        { error: 'Missing R2 configuration headers' },
        { status: 400 }
      );
    }

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: 'Missing R2 credentials' },
        { status: 400 }
      );
    }

    // Configure R2 endpoint
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

    // Delete object from R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(deleteCommand);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error: any) {
    let errorMessage = 'Failed to delete from R2';
    
    if (error?.name === 'NoSuchKey') {
      errorMessage = 'File not found';
    } else if (error?.name === 'AccessDenied') {
      errorMessage = 'Access denied - check credentials';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
