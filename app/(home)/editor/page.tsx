'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import AuthenticatedLayout from '../../components/AuthenticatedLayout';
import {
    Play,
    Download,
    Settings,
    Code2,
    FileText,
    Plus,
    X,
    Terminal
} from 'lucide-react';

// Lazy load CodeMirror
const loadCodeMirror = async () => {
  if (typeof window !== 'undefined') {
    const [
      { EditorView, basicSetup },
      { EditorState },
      { oneDark },
      { javascript },
      { html },
      { css },
      { json },
      { python },
      { markdown },
      { cpp }
    ] = await Promise.all([
      import('codemirror'),
      import('@codemirror/state'),
      import('@codemirror/theme-one-dark'),
      import('@codemirror/lang-javascript'),
      import('@codemirror/lang-html'),
      import('@codemirror/lang-css'),
      import('@codemirror/lang-json'),
      import('@codemirror/lang-python'),
      import('@codemirror/lang-markdown'),
      import('@codemirror/lang-cpp')
    ]);
    
    return {
      EditorView,
      basicSetup,
      EditorState,
      oneDark,
      javascript,
      html,
      css,
      json,
      python,
      markdown,
      cpp
    };
  }
  return null;
};

// Loading component
const LoadingSpinner = () => (
  <div className="h-full flex items-center justify-center bg-main">
    <div className="text-center">
      <Code2 className="text-primary animate-pulse mx-auto mb-4" size={48} />
      <p className="text-white">Loading editor...</p>
    </div>
  </div>
);

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


function greet(name) {
    return \`Hello, \${name}!\`;
}

// Try editing this code
const message = greet("Developer");


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
    const [userInput, setUserInput] = useState(''); // Add user input state

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
    const editorViewRef = useRef<any>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const [isCodeMirrorLoaded, setIsCodeMirrorLoaded] = useState(false);
    const [codeMirrorModule, setCodeMirrorModule] = useState<any>(null);

    // Get language extension for CodeMirror
    const getLanguageExtension = (language: string) => {
        if (!codeMirrorModule) return [];
        
        switch (language) {
            case 'javascript':
            case 'typescript':
                return codeMirrorModule.javascript();
            case 'html':
                return codeMirrorModule.html();
            case 'css':
                return codeMirrorModule.css();
            case 'json':
                return codeMirrorModule.json();
            case 'python':
                return codeMirrorModule.python();
            case 'markdown':
                return codeMirrorModule.markdown();
            case 'cpp':
            case 'c':
                return codeMirrorModule.cpp();
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

    // Load settings from localStorage and CodeMirror
    useEffect(() => {
        const initializeEditor = async () => {
            try {
                const savedSettings = localStorage.getItem('editor-settings');
                const savedFiles = localStorage.getItem('editor-files');

                if (savedSettings) {
                    setSettings(JSON.parse(savedSettings));
                }

                if (savedFiles) {
                    setFiles(JSON.parse(savedFiles));
                }

                // Load CodeMirror asynchronously
                const cmModule = await loadCodeMirror();
                if (cmModule) {
                    setCodeMirrorModule(cmModule);
                    setIsCodeMirrorLoaded(true);
                }
            } catch (error) {
                console.error('Failed to initialize editor:', error);
            }
        };

        initializeEditor();
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
        if (!editorRef.current || !activeFile || !isCodeMirrorLoaded || !codeMirrorModule) return;

        // Clean up previous editor
        if (editorViewRef.current) {
            editorViewRef.current.destroy();
        }

        const startState = codeMirrorModule.EditorState.create({
            doc: activeFile.content,
            extensions: [
                codeMirrorModule.basicSetup,
                settings.theme === 'dark' ? codeMirrorModule.oneDark : [],
                getLanguageExtension(activeFile.language),
                codeMirrorModule.EditorView.updateListener.of((update: any) => {
                    if (update.docChanged) {
                        const content = update.state.doc.toString();
                        updateFileContent(content);
                    }
                }),
                codeMirrorModule.EditorView.theme({
                    '&': { fontSize: `${settings.fontSize}px` },
                    '.cm-editor': {
                        height: '100%',
                        minHeight: '100%',
                        backgroundColor: settings.theme === 'dark' ? '#222831' : '#ffffff'
                    },
                    '.cm-scroller': {
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                        overflow: 'auto'
                    },
                    '.cm-content': {
                        minHeight: '100%',
                        padding: '10px'
                    }
                })
            ]
        });

        const view = new codeMirrorModule.EditorView({
            state: startState,
            parent: editorRef.current
        });

        editorViewRef.current = view;

        return () => {
            if (editorViewRef.current) {
                editorViewRef.current.destroy();
            }
        };
    }, [activeFile?.id, settings.theme, settings.fontSize, activeFile?.language, isCodeMirrorLoaded, codeMirrorModule]);

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

    `,
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
    print("=== Interactive Input Demo ===")
    
    # Get user input
    print("What's your name?")
    name = input()
    print(f"Hello {name}!")
    
    print("What's your age?")
    age = input()
    print(f"You are {age} years old!")
    
    print("Enter a number:")
    num1 = int(input())
    
    print("Enter another number:")
    num2 = int(input())
    
    result = num1 + num2
    print(f"{num1} + {num2} = {result}")
    
    print("\\n=== List Demo ===")
    numbers = [1, 2, 3, 4, 5]
    print(f"Numbers: {numbers}")
    
    total = calculate_sum(numbers)
    print(f"Sum of numbers: {total}")
    
    greeting = greet(name)
    print(greeting)
    
    print("\\n💡 Use the Input panel to provide input for this program!")
    print("Example input:")
    print("Alice")
    print("25") 
    print("10")
    print("20")

if __name__ == "__main__":
    main()`,
            cpp: `/**
    Author: anvnh
    RyeNyn
**/

#include <algorithm>
#include <bits/stdc++.h>
#include <utility>
using namespace std;
#define fastio ios_base::sync_with_stdio(0); cin.tie(0); cout.tie(0);
#define anvnh signed main(void)

template <typename T>
void print(const T& t) {
    for (const auto& element : t) { 
        std::cout << element << " ";
    }
    std::cout << std::endl;
}

#define ll long long
#define pb push_back
#define fi first
#define se second
#define FOR(i, a, b) for(int i = (a), _b = (b); i <= _b; ++i)
#define REP(i, n) for(int i = 0, _n = (n); i < _n; ++i)
#define MASK(i) (1LL << (i))
#define BIT(x, i) (((x) >> (i)) & 1)
#define SET_ON(x, i) ((x) | MASK(i))
#define SET_OFF(x, i) ((x) & ~MASK(i))
#define nl "\\n"
#define sz(x) (int)(x).size()
#define all(x) begin(x), end(x)
#define rall(x) rbegin(x), rend(x)
#define debug(...) fprintf(stderr, __VA_ARGS__), fflush(stderr)
#define INF 0x3f3f3f3f
const ll MOD = 1e9 + 7;

void setIO(string s){
    #ifdef ONLINE_JUDGE
        freopen((s + ".inp").c_str(), "r", stdin);
        freopen((s + ".out").c_str(), "w", stdout);
    #endif
}

void solve()
{
    int n, k; cin >> n >> k;
    vector<int> h(n);
    for(int&v : h) cin >> v;
    vector<int> tmp = h;
    sort(all(tmp));
    auto it = lower_bound(all(tmp), h[k - 1]) - tmp.begin();
    bool check = true;
    for(int i = it; i + 1 < n; i++) {
        if(tmp[i + 1] - tmp[i] > h[k - 1]) {
            check = false;
            break;
        }
    }
    (check) ? cout << "YES" << nl : cout << "NO" << nl;
}

anvnh {
    // Comment out file I/O for online execution
    // #ifndef ONLINE_JUDGE
    //     freopen("input.txt", "r", stdin);
    //     freopen("output.txt", "w", stdout);
    // #endif
    fastio
    int ntest;
    ntest = 1;
    cin >> ntest;
    while (ntest--)
    {
        clock_t z = clock();
        solve();
        debug("Total Time: %.7f\\n", (double)(clock() - z) / CLOCKS_PER_SEC);
    }
    return 0;
}

// Input example for this problem:
// 5
// 5 3
// 3 2 1 4 5
// 3 1
// 1 3 4
// 4 4
// 4 4 4 2
// 6 2
// 2 3 6 9 1 2
// 4 2
// 1 2 5 6`,
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

\`\`\`

> This is a blockquote

[Link to example](https://example.com)`
        };

        return templates[lang] || '// New file\n';
    };

    // Run code using Docker API
    const runCode = async () => {
        if (!activeFile) {
            setOutput('No file selected.');
            return;
        }

        setIsRunning(true);
        setOutput('Preparing to execute...\n');

        try {
            if (activeFile.language === 'html') {
                runHTML();
                return;
            }

            // Use Docker API for supported languages
            if (['javascript', 'python', 'cpp', 'c++', 'c'].includes(activeFile.language)) {
                await runCodeWithDocker();
            } else {
                setOutput(`Execution not supported for ${activeFile.language} files.\nSupported languages: JavaScript, Python, C/C++, HTML`);
            }
        } catch (error) {
            setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsRunning(false);
        }
    };

    // Run code using Docker container
    const runCodeWithDocker = async () => {
        if (!activeFile) return;

        try {
            setOutput('Running...\n');

            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: activeFile.content,
                    language: activeFile.language,
                    filename: activeFile.name,
                    input: userInput // Include user input
                })
            });

            const result = await response.json();

            if (result.success) {
                setOutput(result.output || 'Code executed successfully (no output)');
            } else {
                let errorOutput = `Execution failed: ${result.error}\n`;

                if (result.output) {
                    errorOutput += `\nOutput:\n${result.output}`;
                }

                if (result.stderr) {
                    errorOutput += `\nErrors:\n${result.stderr}`;
                }

                // Add helpful hints for common issues
                if (result.error?.includes('Docker container not available')) {
                    errorOutput += `\n\n💡 Setup Instructions:\n`;
                    errorOutput += `1. Make sure Docker is installed and running\n`;
                    errorOutput += `2. Run: docker-compose up -d code-runner\n`;
                    errorOutput += `3. Wait for the container to start, then try again`;
                }

                setOutput(errorOutput);
            }

        } catch (error) {
            setOutput(`❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease make sure:\n1. Docker container is running\n2. Next.js server is running\n3. No firewall blocking the request`);
        }
    };

    // Run JavaScript code (fallback for browser-only execution)
    // const runJavaScript = async () => {
    //     if (!activeFile) return;

    //     try {
    //         // Create a safe execution environment
    //         const originalConsole = console.log;
    //         const originalError = console.error;
    //         let outputBuffer = '';

    //         // Override console methods to capture output
    //         console.log = (...args) => {
    //             outputBuffer += args.join(' ') + '\n';
    //         };
    //         console.error = (...args) => {
    //             outputBuffer += 'ERROR: ' + args.join(' ') + '\n';
    //         };

    //         // Execute the code
    //         const func = new Function(activeFile.content);
    //         func();

    //         // Restore console methods
    //         console.log = originalConsole;
    //         console.error = originalError;

    //         setOutput(outputBuffer || 'Code executed successfully (no output)');
    //     } catch (error) {
    //         setOutput(`JavaScript Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    //     }
    // };

    // Run C/C++ code - Now uses Docker
    // const runCpp = async () => {
    //     if (!activeFile) return;

    //     // This function is kept for backward compatibility
    //     // but actual execution now happens through runCodeWithDocker
    //     await runCodeWithDocker();
    // };

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

    // Show loading spinner while CodeMirror is loading
    if (!isCodeMirrorLoaded) {
        return (
            <AuthenticatedLayout>
                <LoadingSpinner />
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout>
            <div className="h-full flex flex-col bg-main">
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
                            <div className="flex-1 relative overflow-auto">
                                <div
                                    ref={editorRef}
                                    className="w-full h-full min-h-full"
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

                        {/* Input Panel - Show when no output or when code uses input */}
                        {(!output || activeFile?.content.includes('input(') || activeFile?.content.includes('scanf') || activeFile?.content.includes('cin >>')) && (
                            <div className="w-1/3 border-l border-gray-600 flex flex-col bg-secondary">
                                <div className="border-b border-gray-600 px-4 py-2 flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-primary flex items-center">
                                        <FileText size={14} className="mr-2" />
                                        Input
                                    </h3>
                                    <button
                                        onClick={() => setUserInput('')}
                                        className="text-gray-400 hover:text-primary text-xs"
                                        title="Clear Input"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex-1 p-4 bg-main">
                                    <textarea
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        placeholder="Enter input for your program (each line will be used as input)..."
                                        className="w-full h-full bg-transparent text-primary text-sm font-mono resize-none outline-none placeholder-gray-500"
                                    />
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
        </AuthenticatedLayout>
    );
}
