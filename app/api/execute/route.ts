import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface ExecuteRequest {
    code: string;
    language: string;
    filename?: string;
    input?: string;
}

// Check if running in Cloud Run environment
const isCloudRun = process.env.K_SERVICE || process.env.NODE_ENV === 'production';

// Map languages to file extensions
const getFileExtension = (language: string): string => {
    const extensions: Record<string, string> = {
        'cpp': 'cpp',
        'c++': 'cpp', 
        'c': 'c',
        'python': 'py',
        'javascript': 'js',
        'java': 'java'
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

        // Ensure temp directory exists
        const tempDir = isCloudRun ? '/app/temp' : path.join(process.cwd(), 'temp');
        if (!existsSync(tempDir)) {
            await mkdir(tempDir, { recursive: true });
        }

        const filePath = path.join(tempDir, codeFilename);

        try {
            // Write code to file
            await writeFile(filePath, code, 'utf8');

            // Write input file if provided
            if (input && input.trim()) {
                const inputFilePath = path.join(tempDir, 'input.txt');
                await writeFile(inputFilePath, input, 'utf8');
            }

            let command: string;
            let output: string;
            let stderr: string;

            if (isCloudRun) {
                // Use native code runner on Cloud Run
                const codeRunnerScript = '/usr/local/bin/code-runner.sh';
                command = input && input.trim() 
                    ? `${codeRunnerScript} ${language} ${codeFilename} < ${path.join(tempDir, 'input.txt')}`
                    : `${codeRunnerScript} ${language} ${codeFilename}`;
                
                console.log('Executing (Cloud Run):', command);
                
                const result = await execAsync(command, {
                    timeout: 15000,
                    cwd: '/app/sandbox',
                    env: {
                        ...process.env,
                        PATH: '/usr/local/bin:/usr/bin:/bin'
                    }
                });
                output = result.stdout;
                stderr = result.stderr;
            } else {
                // Use Docker on local development
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
                
                console.log('Executing (Docker):', dockerCommand);
                
                const result = await execAsync(dockerCommand, {
                    timeout: 15000
                });
                output = result.stdout;
                stderr = result.stderr;
            }

            // Get output
            let finalOutput = output || 'Code executed successfully (no output)';
            
            if (stderr) {
                // For C++ code, stderr might contain compilation info that's not an error
                if (language === 'cpp' || language === 'c++' || language === 'c') {
                    if (stderr.includes('error:') || stderr.includes('Error:')) {
                        finalOutput += `\n\nErrors:\n${stderr}`;
                    } else {
                        finalOutput += `\n\nCompilation Info:\n${stderr}`;
                    }
                } else {
                    finalOutput += `\n\nErrors:\n${stderr}`;
                }
            }

            // Clean up temporary files
            try {
                if (isCloudRun) {
                    await unlink(filePath);
                    if (input && input.trim()) {
                        await unlink(path.join(tempDir, 'input.txt'));
                    }
                } else {
                    await execAsync(`docker exec anrye-code-runner rm -f /app/temp/${codeFilename} /app/temp/input.txt`, { timeout: 2000 });
                }
            } catch (cleanupError) {
                console.warn('Could not cleanup temp files:', cleanupError);
            }

            return NextResponse.json({
                success: true,
                output: finalOutput,
                stderr: stderr && stderr.includes('error:') ? stderr : undefined
            });

        } catch (execError: unknown) {
            console.error('Execution error:', execError);
            
            let errorMessage = 'Execution failed';
            const err = execError as { code?: string; message?: string; stdout?: string; stderr?: string };
            
            if (err.code === 'TIMEOUT') {
                errorMessage = 'Code execution timed out (15 seconds limit)';
            } else if (err.message?.includes('timeout')) {
                errorMessage = 'Code execution timed out';
            } else if (err.message?.includes('No such file')) {
                errorMessage = 'Code runner not found. Please check server configuration.';
            } else {
                errorMessage = err.message || 'Unknown execution error';
            }

            // Clean up on error
            try {
                if (isCloudRun) {
                    await unlink(filePath);
                    if (input && input.trim()) {
                        await unlink(path.join(tempDir, 'input.txt'));
                    }
                } else {
                    await execAsync(`docker exec anrye-code-runner rm -f /app/temp/${codeFilename} /app/temp/input.txt`, { timeout: 2000 });
                }
            } catch {
                // Ignore cleanup errors
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
        if (isCloudRun) {
            // Check if code runner script exists and is executable on Cloud Run
            const { stdout } = await execAsync('ls -la /usr/local/bin/code-runner.sh');
            const isExecutable = stdout.includes('-rwx');

            // Check available compilers
            const checks = await Promise.allSettled([
                execAsync('gcc --version'),
                execAsync('g++ --version'),
                execAsync('python3 --version'),
                execAsync('node --version'),
                execAsync('javac -version')
            ]);

            const compilers = {
                gcc: checks[0].status === 'fulfilled',
                gpp: checks[1].status === 'fulfilled',
                python3: checks[2].status === 'fulfilled',
                node: checks[3].status === 'fulfilled',
                java: checks[4].status === 'fulfilled'
            };

            return NextResponse.json({
                status: 'ok',
                environment: 'cloud-run',
                codeRunner: isExecutable ? 'available' : 'not available',
                compilers: compilers,
                timestamp: new Date().toISOString()
            });
        } else {
            // Check if Docker container is running for local development
            const { stdout } = await execAsync('docker ps --filter "name=anrye-code-runner" --format "{{.Names}}"');
            const isRunning = stdout.trim() === 'anrye-code-runner';

            return NextResponse.json({
                status: 'ok',
                environment: 'local-docker',
                dockerContainer: isRunning ? 'running' : 'not running',
                timestamp: new Date().toISOString()
            });
        }
    } catch {
        return NextResponse.json({
            status: 'error',
            environment: isCloudRun ? 'cloud-run' : 'local-docker',
            codeRunner: 'not available',
            error: 'Could not check code runner status'
        });
    }
}
