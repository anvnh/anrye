import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Force Node.js runtime to ensure AWS SDK works correctly
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const bucket = request.headers.get('X-R2-Bucket');
    const region = request.headers.get('X-R2-Region');
    const key = request.headers.get('X-R2-Key');
    const accessKeyId = request.headers.get('X-R2-Access-Key-ID');
    const secretAccessKey = request.headers.get('X-R2-Secret-Access-Key');
    const accountIdHeader = request.headers.get('X-R2-Account-Id');

    if (!bucket || !region || !key || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: 'Missing R2 configuration headers' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Configure S3 client for Cloudflare R2 per docs
    // Endpoint must be https://<account-id>.r2.cloudflarestorage.com
    let accountId = accountIdHeader || process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';
    if (!accountId) {
      // Attempt to infer from Access Key (not guaranteed). Prefer explicit header/env.
      if (accessKeyId.includes('_')) accountId = accessKeyId.split('_')[0];
    }
    if (!accountId) {
      return NextResponse.json({ error: 'Missing R2 account id' }, { status: 400 });
    }
    
    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Per docs, virtual-hosted-style works. If you see auth errors, switch to path style.
      forcePathStyle: false,
    });

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to R2
    const uploadParams = {
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: buffer.length,
    };

    const command = new PutObjectCommand(uploadParams);
    let result;
    try {
      result = await s3Client.send(command);
    } catch (err: any) {
      return NextResponse.json({ error: 'Failed to upload to R2', details: err?.message || String(err) }, { status: 500 });
    }

    // Return the file key and public URL (two variants)
    // Path-style (matches Cloudflare dashboard S3 endpoint): https://<account-id>.r2.cloudflarestorage.com/<bucket>/<key>
    const pathUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
    // Virtual-hosted fallback: https://<bucket>.<account-id>.r2.cloudflarestorage.com/<key>
    const vhUrl = `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`;
    
    return NextResponse.json({
      success: true,
      fileId: key, // Use the key as fileId for R2
      url: pathUrl,
      altUrl: vhUrl,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upload to R2' },
      { status: 500 }
    );
  }
}
