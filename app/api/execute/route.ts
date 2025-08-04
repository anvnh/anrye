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

// Execute code locally without Docker
const executeCodeLocal = async (language: string, filePath: string, input?: string): Promise<{ stdout: string; stderr: string }> => {
    const fileName = path.basename(filePath);
    const fileBaseName = path.basename(filePath, path.extname(filePath));
    const tempDir = path.dirname(filePath);

    let command: string;

    switch (language.toLowerCase()) {
        case 'python':
            command = input ? `echo "${input}" | python3 "${filePath}"` : `python3 "${filePath}"`;
            break;
        case 'javascript':
            command = input ? `echo "${input}" | node "${filePath}"` : `node "${filePath}"`;
            break;
        case 'cpp':
        case 'c++':
            const cppExecutable = path.join(tempDir, fileBaseName);
            command = `g++ -o "${cppExecutable}" "${filePath}" && `;
            command += input ? `echo "${input}" | "${cppExecutable}"` : `"${cppExecutable}"`;
            break;
        case 'c':
            const cExecutable = path.join(tempDir, fileBaseName);
            command = `gcc -o "${cExecutable}" "${filePath}" && `;
            command += input ? `echo "${input}" | "${cExecutable}"` : `"${cExecutable}"`;
            break;
        case 'java':
            const className = fileBaseName;
            command = `cd "${tempDir}" && javac "${fileName}" && `;
            command += input ? `echo "${input}" | java "${className}"` : `java "${className}"`;
            break;
        default:
            throw new Error(`Unsupported language: ${language}`);
    }

    return execAsync(command, { timeout: 15000 });
};

// Execute code in Cloud Run environment
const executeCodeCloudRun = async (language: string, filePath: string, input?: string): Promise<{ stdout: string; stderr: string }> => {
    const fileName = path.basename(filePath);
    const fileBaseName = path.basename(filePath, path.extname(filePath));
    const tempDir = path.dirname(filePath);

    let command: string;

    switch (language.toLowerCase()) {
        case 'python':
            command = input ? `echo "${input}" | timeout 15 python3 "${filePath}"` : `timeout 15 python3 "${filePath}"`;
            break;
        case 'javascript':
            command = input ? `echo "${input}" | timeout 15 node "${filePath}"` : `timeout 15 node "${filePath}"`;
            break;
        case 'cpp':
        case 'c++':
            const cppExecutable = path.join(tempDir, fileBaseName);
            command = `timeout 15 g++ -o "${cppExecutable}" "${filePath}" && `;
            command += input ? `echo "${input}" | timeout 15 "${cppExecutable}"` : `timeout 15 "${cppExecutable}"`;
            break;
        case 'c':
            const cExecutable = path.join(tempDir, fileBaseName);
            command = `timeout 15 gcc -o "${cExecutable}" "${filePath}" && `;
            command += input ? `echo "${input}" | timeout 15 "${cExecutable}"` : `timeout 15 "${cExecutable}"`;
            break;
        case 'java':
            const className = fileBaseName;
            command = `cd "${tempDir}" && timeout 15 javac "${fileName}" && `;
            command += input ? `echo "${input}" | timeout 15 java "${className}"` : `timeout 15 java "${className}"`;
            break;
        default:
            throw new Error(`Unsupported language: ${language}`);
    }

    return execAsync(command, { timeout: 15000 });
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

            let output: string;
            let stderr: string;

            // Execute code based on environment
            if (isCloudRun) {
                const result = await executeCodeCloudRun(language, filePath, input);
                output = result.stdout;
                stderr = result.stderr;
            } else {
                const result = await executeCodeLocal(language, filePath, input);
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
                await unlink(filePath);
                // Clean up compiled files for C/C++/Java
                const fileBaseName = path.basename(filePath, path.extname(filePath));
                if (language === 'cpp' || language === 'c++' || language === 'c') {
                    const executablePath = path.join(tempDir, fileBaseName);
                    try {
                        await unlink(executablePath);
                    } catch {
                        // Ignore if executable doesn't exist
                    }
                } else if (language === 'java') {
                    const classPath = path.join(tempDir, `${fileBaseName}.class`);
                    try {
                        await unlink(classPath);
                    } catch {
                        // Ignore if class file doesn't exist
                    }
                }
            } catch (cleanupError) {
                // Cleanup failed, but continue
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
                errorMessage = 'Compiler not found. Please install required compilers.';
            } else {
                errorMessage = err.message || 'Unknown execution error';
            }

            // Clean up on error
            try {
                await unlink(filePath);
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
        // Check available compilers/interpreters
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
            environment: isCloudRun ? 'cloud-run' : 'local',
            compilers: compilers,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check error:', error);
        return NextResponse.json({
            status: 'error',
            environment: isCloudRun ? 'cloud-run' : 'local',
            error: 'Could not check system status'
        });
    }
}
