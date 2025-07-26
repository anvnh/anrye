'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/NavBar';
import {
    Play,
    Save,
    Download,
    Upload,
    Settings,
    Code2,
    FileText,
    FolderOpen,
    Plus,
    X,
    ChevronRight,
    ChevronDown,
    Terminal
} from 'lucide-react';

// CodeMirror imports
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { cpp } from '@codemirror/lang-cpp';

// Pyodide import
declare global {
    interface Window {
        loadPyodide: any;
        pyodide: any;
    }
}

interface CodeFile {
    id: string;
    name: string;
    content: string;
    language: string;
    path: string;
}

interface EditorSettings {
    theme: 'dark' | 'light';
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    showLineNumbers: boolean;
    autoComplete: boolean;
}

export default function EditorPage() {
    // Editor state
    const [files, setFiles] = useState<CodeFile[]>([
        {
            id: '1',
            name: 'main.js',
            content: `// Welcome to the Code Editor!
console.log("Hello, World!");

function greet(name) {
    return \`Hello, \${name}!\`;
}

// Try editing this code
const message = greet("Developer");
console.log(message);

// You can run JavaScript code here!
`,
            language: 'javascript',
            path: 'main.js'
        }
    ]);

    const [activeFileId, setActiveFileId] = useState<string>('1');
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [isResizing, setIsResizing] = useState(false);
    const [output, setOutput] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showNewFileModal, setShowNewFileModal] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [newFileLanguage, setNewFileLanguage] = useState('javascript');

    // Editor settings
    const [settings, setSettings] = useState<EditorSettings>({
        theme: 'dark',
        fontSize: 14,
        tabSize: 2,
        wordWrap: true,
        showLineNumbers: true,
        autoComplete: true
    });

    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const outputRef = useRef<HTMLDivElement>(null);

    // Pyodide state
    const [pyodideReady, setPyodideReady] = useState(false);
    const [pyodideLoading, setPyodideLoading] = useState(false);

    // Get language extension for CodeMirror
    const getLanguageExtension = (language: string) => {
        switch (language) {
            case 'javascript':
            case 'typescript':
                return javascript();
            case 'html':
                return html();
            case 'css':
                return css();
            case 'json':
                return json();
            case 'python':
                return python();
            case 'markdown':
                return markdown();
            case 'cpp':
            case 'c':
                return cpp();
            default:
                return [];
        }
    };

    // Language configurations
    const languages = [
        { id: 'javascript', name: 'JavaScript', ext: 'js' },
        { id: 'typescript', name: 'TypeScript', ext: 'ts' },
        { id: 'html', name: 'HTML', ext: 'html' },
        { id: 'css', name: 'CSS', ext: 'css' },
        { id: 'python', name: 'Python', ext: 'py' },
        { id: 'cpp', name: 'C++', ext: 'cpp' },
        { id: 'c', name: 'C', ext: 'c' },
        { id: 'json', name: 'JSON', ext: 'json' },
        { id: 'markdown', name: 'Markdown', ext: 'md' }
    ];

    // Load Pyodide on component mount
    useEffect(() => {
        const loadPyodideAsync = async () => {
            if (typeof window !== 'undefined' && !window.pyodide && !pyodideLoading) {
                setPyodideLoading(true);
                try {
                    // Load Pyodide script
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
                    script.onload = async () => {
                        try {
                            window.pyodide = await window.loadPyodide({
                                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
                            });
                            setPyodideReady(true);
                            console.log('Pyodide loaded successfully');
                        } catch (error) {
                            console.error('Failed to load Pyodide:', error);
                        } finally {
                            setPyodideLoading(false);
                        }
                    };
                    script.onerror = () => {
                        console.error('Failed to load Pyodide script');
                        setPyodideLoading(false);
                    };
                    document.head.appendChild(script);
                } catch (error) {
                    console.error('Error loading Pyodide:', error);
                    setPyodideLoading(false);
                }
            }
        };

        loadPyodideAsync();
    }, [pyodideLoading]);

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem('editor-settings');
        const savedFiles = localStorage.getItem('editor-files');

        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }

        if (savedFiles) {
            setFiles(JSON.parse(savedFiles));
        }
    }, []);

    // Save settings and files to localStorage
    useEffect(() => {
        localStorage.setItem('editor-settings', JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('editor-files', JSON.stringify(files));
    }, [files]);

    // Handle sidebar resize
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth >= 200 && newWidth <= 500) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    // Get active file
    const activeFile = files.find(f => f.id === activeFileId);

    // Initialize CodeMirror
    useEffect(() => {
        if (!editorRef.current || !activeFile) return;

        // Clean up previous editor
        if (editorViewRef.current) {
            editorViewRef.current.destroy();
        }

        const startState = EditorState.create({
            doc: activeFile.content,
            extensions: [
                basicSetup,
                settings.theme === 'dark' ? oneDark : [],
                getLanguageExtension(activeFile.language),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        const content = update.state.doc.toString();
                        updateFileContent(content);
                    }
                }),
                EditorView.theme({
                    '&': { fontSize: `${settings.fontSize}px` },
                    '.cm-editor': {
                        height: '100%',
                        backgroundColor: settings.theme === 'dark' ? '#222831' : '#ffffff'
                    },
                    '.cm-scroller': { fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }
                })
            ]
        });

        const view = new EditorView({
            state: startState,
            parent: editorRef.current
        });

        editorViewRef.current = view;

        return () => {
            if (editorViewRef.current) {
                editorViewRef.current.destroy();
            }
        };
    }, [activeFile?.id, settings.theme, settings.fontSize, activeFile?.language]);

    // Update editor content when activeFile changes
    useEffect(() => {
        if (editorViewRef.current && activeFile) {
            const currentContent = editorViewRef.current.state.doc.toString();
            if (currentContent !== activeFile.content) {
                editorViewRef.current.dispatch({
                    changes: {
                        from: 0,
                        to: editorViewRef.current.state.doc.length,
                        insert: activeFile.content
                    }
                });
            }
        }
    }, [activeFile?.content]);

    // Update file content
    const updateFileContent = (content: string) => {
        if (!activeFile) return;

        setFiles(prev => prev.map(file =>
            file.id === activeFileId
                ? { ...file, content }
                : file
        ));
    };

    // Create new file
    const createNewFile = () => {
        if (!newFileName.trim()) return;

        const language = languages.find(l => l.id === newFileLanguage);
        const fileName = newFileName.includes('.')
            ? newFileName
            : `${newFileName}.${language?.ext || 'txt'}`;

        const newFile: CodeFile = {
            id: Date.now().toString(),
            name: fileName,
            content: getTemplateForLanguage(newFileLanguage),
            language: newFileLanguage,
            path: fileName
        };

        setFiles(prev => [...prev, newFile]);
        setActiveFileId(newFile.id);
        setNewFileName('');
        setShowNewFileModal(false);
    };

    // Get template content for language
    const getTemplateForLanguage = (lang: string): string => {
        const templates: Record<string, string> = {
            javascript: `// JavaScript file
console.log("Hello from JavaScript!");

function example() {
    // Your code here
    return "Hello World";
}

example();`,
            typescript: `// TypeScript file
interface User {
    name: string;
    age: number;
}

const user: User = {
    name: "Developer",
    age: 25
};

console.log(user);`,
            html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Welcome to HTML!</p>
</body>
</html>`,
            css: `/* CSS Styles */
body {
    font-family: 'Arial', sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}`,
            python: `# Python file - Input Demo
def greet(name):
    return f"Hello, {name}!"

def calculate_sum(numbers):
    return sum(numbers)

def main():
    # Input examples (will use sample data in browser)
    print("=== Input Demo ===")
    
    # Method 1: Using input() - will use predefined sample data
    print("Enter your name:")
    name = input("Name: ")
    
    print("Enter your age:")
    age = input("Age: ")
    
    print(f"Hello {name}, you are {age} years old!")
    
    print("\n=== Alternative: Predefined Variables ===")
    # Method 2: For reliable browser execution, use predefined variables
    user_name = "Alice"
    user_age = 30
    
    print(f"User: {user_name}")
    print(f"Age: {user_age}")
    
    # List example
    numbers = [1, 2, 3, 4, 5]
    print(f"Numbers: {numbers}")
    
    # Function calls
    greeting = greet(user_name)
    print(greeting)
    
    total = calculate_sum(numbers)
    print(f"Sum of numbers: {total}")
    
    # Loop example
    print("Squared numbers:")
    for num in numbers:
        print(f"{num}^2 = {num**2}")
    
    print("\n💡 Browser Python Tips:")
    print("• input() uses predefined sample values")
    print("• For reliable testing, use predefined variables")
    print("• Sample inputs: ['John', '25', 'Python', 'Hello World', '42', '3.14', 'True']")

if __name__ == "__main__":
    main()`,
            cpp: `// C++ file
#include <iostream>
#include <string>
#include <vector>

using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    
    // Basic variables
    string name = "Developer";
    int age = 25;
    
    cout << "Name: " << name << endl;
    cout << "Age: " << age << endl;
    
    // Vector example
    vector<int> numbers = {1, 2, 3, 4, 5};
    cout << "Numbers: ";
    for (int num : numbers) {
        cout << num << " ";
    }
    cout << endl;
    
    // Simple calculation
    int sum = 0;
    for (int num : numbers) {
        sum += num;
    }
    cout << "Sum: " << sum << endl;
    
    return 0;
}`,
            c: `// C file
#include <stdio.h>
#include <string.h>

void greet(const char* name) {
    printf("Hello, %s!\\n", name);
}

int main() {
    greet("World");
    
    // Example of common C features
    int numbers[] = {1, 2, 3, 4, 5};
    int size = sizeof(numbers) / sizeof(numbers[0]);
    
    printf("Numbers: ");
    for (int i = 0; i < size; i++) {
        printf("%d ", numbers[i]);
    }
    printf("\\n");
    
    return 0;
}`,
            json: `{
  "name": "example",
  "version": "1.0.0",
  "description": "Example JSON file",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "keywords": ["example", "json"],
  "author": "Developer",
  "license": "MIT"
}`,
            markdown: `# Markdown Document

Welcome to **Markdown**!

## Features

- Easy to write
- Easy to read
- Supports \`code\`

### Code Example

\`\`\`javascript
console.log("Hello from Markdown!");
\`\`\`

> This is a blockquote

[Link to example](https://example.com)`
        };

        return templates[lang] || '// New file\n';
    };

    // Run code for different languages
    const runCode = async () => {
        if (!activeFile) {
            setOutput('No file selected.');
            return;
        }

        setIsRunning(true);
        setOutput('Running...\n');

        try {
            switch (activeFile.language) {
                case 'javascript':
                    await runJavaScript();
                    break;
                case 'python':
                    await runPython();
                    break;
                case 'cpp':
                    await runCpp();
                    break;
                case 'c':
                    await runCpp();
                    break;
                case 'html':
                    runHTML();
                    break;
                default:
                    setOutput(`Execution not supported for ${activeFile.language} files in this demo.\nSupported languages: JavaScript, Python, C/C++, HTML`);
            }
        } catch (error) {
            setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsRunning(false);
        }
    };

    // Run JavaScript code (existing functionality)
    const runJavaScript = async () => {
        if (!activeFile) return;

        try {
            // Create a safe execution environment
            const originalConsole = console.log;
            const originalError = console.error;
            let outputBuffer = '';

            // Override console methods to capture output
            console.log = (...args) => {
                outputBuffer += args.join(' ') + '\n';
            };
            console.error = (...args) => {
                outputBuffer += 'ERROR: ' + args.join(' ') + '\n';
            };

            // Execute the code
            const func = new Function(activeFile.content);
            func();

            // Restore console methods
            console.log = originalConsole;
            console.error = originalError;

            setOutput(outputBuffer || 'Code executed successfully (no output)');
        } catch (error) {
            setOutput(`JavaScript Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Run Python code using Pyodide (browser-based Python)
    const runPython = async () => {
        if (!activeFile) return;

        try {
            if (!pyodideReady) {
                if (pyodideLoading) {
                    setOutput('Python is loading... Please wait and try again.');
                } else {
                    setOutput('Python (Pyodide) is not loaded. Please refresh the page to load Python support.');
                }
                return;
            }

            setOutput('Running Python code...\n');

            // Setup Python environment with input support
            window.pyodide.runPython(`
import sys
from io import StringIO
import builtins

# Redirect stdout to capture print statements
old_stdout = sys.stdout
sys.stdout = mystdout = StringIO()

# Mock input function for interactive input
input_values = []
input_index = 0

def mock_input(prompt=""):
    global input_index
    if prompt:
        print(prompt, end="")
    
    # In a real scenario, you would collect these inputs beforehand
    # For now, we'll provide some default values or handle gracefully
    if input_index < len(input_values):
        value = input_values[input_index]
        input_index += 1
        print(value)  # Echo the input
        return value
    else:
        # If no more inputs available, return empty string
        print("(no input provided)")
        return ""

# Replace the built-in input function
builtins.input = mock_input
            `);

            try {
                // Check if the code contains input() calls
                const codeContainsInput = activeFile.content.includes('input(');

                if (codeContainsInput) {
                    // For codes with input(), provide some sample inputs
                    window.pyodide.runPython(`
# Provide some sample inputs for testing
input_values = ["John", "25", "Python", "Hello World", "42", "3.14", "True"]
input_index = 0
                    `);
                    setOutput('Running Python code with sample inputs...\n(Note: input() calls will use predefined values)\n\n');
                }

                // Run the user's code
                window.pyodide.runPython(activeFile.content);

                // Get the captured output
                const stdout = window.pyodide.runPython(`
# Get the output and restore stdout
output = mystdout.getvalue()
sys.stdout = old_stdout
output
                `);

                if (stdout) {
                    let finalOutput = 'Python Output:\n' + stdout;

                    if (codeContainsInput) {
                        finalOutput += '\n📝 Note: This code uses input() function.\n';
                        finalOutput += 'Sample inputs were provided: ["John", "25", "Python", "Hello World", "42", "3.14", "True"]\n';
                        finalOutput += '💡 In a browser environment, interactive input is limited.\n';
                        finalOutput += 'Consider using predefined variables instead of input() for testing.';
                    }

                    setOutput(finalOutput);
                } else {
                    setOutput('Python code executed successfully (no output).');
                }
            } catch (pythonError: any) {
                // Restore stdout even if there was an error
                window.pyodide.runPython(`
sys.stdout = old_stdout
builtins.input = input  # Restore original input
                `);

                let errorMessage = pythonError.toString();

                // Provide helpful error messages for common issues
                if (errorMessage.includes('I/O error') || errorMessage.includes('OSError')) {
                    errorMessage += '\n\n💡 Input/Output Error Solutions:\n';
                    errorMessage += '• Replace input() with predefined variables\n';
                    errorMessage += '• Example: Instead of "name = input()" use "name = \'John\'"\n';
                    errorMessage += '• Browser-based Python has limitations with interactive input';
                } else if (errorMessage.includes('input')) {
                    errorMessage += '\n\n💡 Input Function Tips:\n';
                    errorMessage += '• Use predefined variables for testing\n';
                    errorMessage += '• Browser Python environment doesn\'t support real-time input';
                }

                setOutput('Python Error:\n' + errorMessage);
            }

        } catch (error) {
            setOutput(`Python Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Run C/C++ code - Currently disabled due to API reliability issues
    const runCpp = async () => {
        if (!activeFile) return;

        setOutput(`C++ Compilation is temporarily disabled.

⚠️ Reason: External API reliability issues

🔧 Alternative solutions:
1. Use an online compiler like:
   • https://compiler-explorer.godbolt.org/
   • https://www.onlinegdb.com/
   • https://replit.com/

2. Install a local development environment:
   • Install GCC/Clang on your computer
   • Use Visual Studio Code with C++ extension
   • Use Dev Containers for isolated environments

3. For learning C++, try:
   • Local IDEs (Code::Blocks, Dev-C++)
   • Online platforms (Codecademy, LeetCode)

💡 We're working on a better local solution that doesn't rely on external APIs!`);
    };

    // Run HTML code by opening in a new window
    const runHTML = () => {
        if (!activeFile) return;

        try {
            const htmlContent = activeFile.content;
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);

            // Open in new window
            const newWindow = window.open(url, '_blank');
            if (newWindow) {
                setOutput('HTML file opened in new window/tab.\nCheck your browser for the rendered page.');
                // Clean up URL after a delay
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
                setOutput('Failed to open HTML file. Please allow popups for this site.');
            }
        } catch (error) {
            setOutput(`HTML Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Delete file
    const deleteFile = (fileId: string) => {
        if (files.length <= 1) return; // Keep at least one file

        setFiles(prev => prev.filter(f => f.id !== fileId));

        if (activeFileId === fileId) {
            const remainingFiles = files.filter(f => f.id !== fileId);
            setActiveFileId(remainingFiles[0]?.id || '');
        }
    };

    // Download file
    const downloadFile = () => {
        if (!activeFile) return;

        const blob = new Blob([activeFile.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeFile.name;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-screen flex flex-col bg-main">
            <Navbar />

            {/* Main Editor Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* File Explorer Sidebar */}
                <div
                    className="border-r border-gray-600 flex flex-col overflow-hidden relative bg-secondary"
                    style={{
                        width: `${sidebarWidth}px`
                    }}
                >
                    {/* Sidebar Header */}
                    <div className="px-4 py-3 border-b border-gray-600 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-medium text-primary flex items-center">
                                <Code2 size={16} className="mr-2" />
                                Files
                            </h2>
                            <button
                                onClick={() => setShowNewFileModal(true)}
                                className="p-1 hover:bg-gray-700 rounded text-primary"
                                title="New File"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* File List */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {files.map(file => (
                            <div
                                key={file.id}
                                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer group ${activeFileId === file.id ? 'bg-blue-600' : 'hover:bg-gray-700'
                                    }`}
                                onClick={() => setActiveFileId(file.id)}
                            >
                                <div className="flex items-center flex-1">
                                    <FileText size={14} className="text-gray-400 mr-2" />
                                    <span className="text-sm text-primary truncate">{file.name}</span>
                                </div>
                                {files.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteFile(file.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600 rounded text-primary"
                                        title="Delete File"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Resize Handle */}
                    <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 transition-colors"
                        onMouseDown={() => setIsResizing(true)}
                        title="Drag to resize"
                    />
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="border-b border-gray-600 px-4 py-2 flex items-center justify-between bg-secondary">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-primary">
                                {activeFile?.name || 'No file selected'}
                            </span>
                            {activeFile && (
                                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                                    {activeFile.language}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            {activeFile && ['javascript', 'python', 'cpp', 'c', 'html'].includes(activeFile.language) && (
                                <button
                                    onClick={runCode}
                                    disabled={isRunning}
                                    className="flex items-center px-3 py-1 bg-green-600 text-primary rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                                >
                                    <Play size={14} className="mr-1" />
                                    {isRunning ? 'Running...' : 'Run'}
                                </button>
                            )}

                            <button
                                onClick={downloadFile}
                                className="flex items-center px-3 py-1 bg-blue-600 text-primary rounded hover:bg-blue-700 text-sm"
                                title="Download File"
                            >
                                <Download size={14} className="mr-1" />
                                Download
                            </button>

                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="p-2 hover:bg-gray-700 rounded text-primary"
                                title="Settings"
                            >
                                <Settings size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Editor Content */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Code Editor */}
                        <div className="flex-1 flex flex-col">
                            <div className="flex-1 relative overflow-hidden">
                                <div
                                    ref={editorRef}
                                    className="w-full h-full"
                                    style={{
                                        backgroundColor: settings.theme === 'dark' ? '#222831' : '#ffffff'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Output Panel */}
                        {output && (
                            <div className="w-1/3 border-l border-gray-600 flex flex-col bg-secondary">
                                <div className="border-b border-gray-600 px-4 py-2 flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-primary flex items-center">
                                        <Terminal size={14} className="mr-2" />
                                        Output
                                    </h3>
                                    <button
                                        onClick={() => setOutput('')}
                                        className="text-gray-400 hover:text-primary text-xs"
                                        title="Clear Output"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div
                                    ref={outputRef}
                                    className="flex-1 p-4 text-sm text-primary font-mono overflow-y-auto whitespace-pre-wrap bg-main"
                                >
                                    {output}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-secondary border border-gray-600 rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-primary">Editor Settings</h3>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-gray-400 hover:text-primary"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Theme</label>
                                <select
                                    value={settings.theme}
                                    onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as 'dark' | 'light' }))}
                                    className="w-full p-2 bg-main text-primary rounded border border-gray-600"
                                >
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Font Size</label>
                                <input
                                    type="range"
                                    min="10"
                                    max="24"
                                    value={settings.fontSize}
                                    onChange={(e) => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                                    className="w-full"
                                />
                                <span className="text-xs text-gray-400">{settings.fontSize}px</span>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Tab Size</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="8"
                                    value={settings.tabSize}
                                    onChange={(e) => setSettings(prev => ({ ...prev, tabSize: parseInt(e.target.value) }))}
                                    className="w-full p-2 bg-main text-primary rounded border border-gray-600"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.wordWrap}
                                    onChange={(e) => setSettings(prev => ({ ...prev, wordWrap: e.target.checked }))}
                                    className="mr-2"
                                />
                                <label className="text-sm text-gray-300">Word Wrap</label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* New File Modal */}
            {showNewFileModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-secondary border border-gray-600 rounded-lg p-6 w-96">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-primary">Create New File</h3>
                            <button
                                onClick={() => setShowNewFileModal(false)}
                                className="text-gray-400 hover:text-primary"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">File Name</label>
                                <input
                                    type="text"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    placeholder="e.g., script.js"
                                    className="w-full p-2 bg-main text-primary rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Language</label>
                                <select
                                    value={newFileLanguage}
                                    onChange={(e) => setNewFileLanguage(e.target.value)}
                                    className="w-full p-2 bg-main text-primary rounded border border-gray-600"
                                >
                                    {languages.map(lang => (
                                        <option key={lang.id} value={lang.id}>{lang.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-2">
                                <button
                                    onClick={() => setShowNewFileModal(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-primary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createNewFile}
                                    className="px-4 py-2 bg-blue-600 text-primary rounded hover:bg-blue-700"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
