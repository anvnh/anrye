import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ExecuteRequest {
    code: string;
    language: string;
    filename?: string;
    input?: string; // Add input field for user input
}

// Map languages to file extensions
const getFileExtension = (language: string): string => {
    const extensions: Record<string, string> = {
        'cpp': 'cpp',
        'c++': 'cpp', 
        'c': 'c',
        'python': 'py',
        'javascript': 'js'
    };
    return extensions[language] || 'txt';
};

export async function POST(request: NextRequest) {
    try {
        const { code, language, filename, input }: ExecuteRequest = await request.json();

        if (!code || !language) {
            return NextResponse.json(
                { error: 'Code and language are required' },
                { status: 400 }
            );
        }

        // Generate filename if not provided
        const timestamp = Date.now();
        const ext = getFileExtension(language);
        const codeFilename = filename || `code_${timestamp}.${ext}`;

        try {
            // Create file inside container
            const createFileCmd = `docker exec anrye-code-runner sh -c 'cat > /app/temp/${codeFilename} << "EOF"
${code}
EOF'`;
            
            await execAsync(createFileCmd, { timeout: 5000 });

            // Create input file if input is provided
            if (input && input.trim()) {
                const inputCmd = `docker exec anrye-code-runner sh -c 'cat > /app/temp/input.txt << "EOF"
${input}
EOF'`;
                await execAsync(inputCmd, { timeout: 5000 });
            }

            // Execute code in Docker container
            const dockerCommand = input && input.trim() 
                ? `docker exec anrye-code-runner bash -c '/tmp/code-runner.sh ${language} ${codeFilename} < /app/temp/input.txt'`
                : `docker exec anrye-code-runner /tmp/code-runner.sh ${language} ${codeFilename}`;
            
            console.log('Executing:', dockerCommand);
            const { stdout, stderr } = await execAsync(dockerCommand, {
                timeout: 15000 // 15 second timeout
            });

            // Get output directly from stdout since we're not using volume mounts
            let output = stdout || 'Code executed successfully (no output)';
            
            if (stderr) {
                output += `\n\nErrors:\n${stderr}`;
            }

            // Clean up temporary files
            try {
                await execAsync(`docker exec anrye-code-runner rm -f /app/temp/${codeFilename} /app/temp/input.txt`, { timeout: 2000 });
            } catch (cleanupError) {
                console.warn('Could not cleanup temp files:', cleanupError);
            }

            // For C++ code, combine stdout and stderr to show debug info properly
            let finalOutput = output;
            let finalStderr = stderr;
            if (language === 'cpp' || language === 'c++' || language === 'c') {
                // Debug output (stderr) should be shown as part of the output, not as error
                if (stderr && stderr.includes('Total Time:')) {
                    finalOutput = output + '\n--- Debug Info ---\n' + stderr;
                    finalStderr = ''; // Clear stderr so it's not shown as error
                }
            }

            return NextResponse.json({
                success: true,
                output: finalOutput,
                stderr: finalStderr || undefined
            });

        } catch (execError: unknown) {
            console.error('Execution error:', execError);
            
            let errorMessage = 'Execution failed';
            const err = execError as { code?: string; message?: string; stdout?: string; stderr?: string };
            
            if (err.code === 'TIMEOUT') {
                errorMessage = 'Code execution timed out (15 seconds limit)';
            } else if (err.message?.includes('docker')) {
                errorMessage = 'Docker container not available. Please start the code-runner container.';
            } else {
                errorMessage = err.message || 'Unknown execution error';
            }

            return NextResponse.json({
                success: false,
                error: errorMessage,
                output: err.stdout || '',
                stderr: err.stderr || ''
            });
        }

    } catch (error: unknown) {
        console.error('API error:', error);
        const err = error as { message?: string };
        return NextResponse.json(
            { 
                success: false, 
                error: 'Internal server error: ' + (err.message || 'Unknown error')
            },
            { status: 500 }
        );
    }
}

// Health check endpoint
export async function GET() {
    try {
        // Check if Docker container is running
        const { stdout } = await execAsync('docker ps --filter "name=anrye-code-runner" --format "{{.Names}}"');
        const isRunning = stdout.trim() === 'anrye-code-runner';

        return NextResponse.json({
            status: 'ok',
            dockerContainer: isRunning ? 'running' : 'not running',
            timestamp: new Date().toISOString()
        });
    } catch {
        return NextResponse.json({
            status: 'error',
            dockerContainer: 'not available',
            error: 'Could not check Docker status'
        });
    }
}
