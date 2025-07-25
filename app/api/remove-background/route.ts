import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Call Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'remove_bg.py');
    
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [scriptPath, '--stdin']);
      
      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(NextResponse.json({ 
            success: true, 
            image: output.trim() 
          }));
        } else {
          console.error('Python script error:', error);
          resolve(NextResponse.json({ 
            error: 'Failed to process image',
            details: error 
          }, { status: 500 }));
        }
      });

      // Send base64 data to Python script
      pythonProcess.stdin.write(dataUrl);
      pythonProcess.stdin.end();
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
