'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Clock, ImageIcon, Code, Copy, Check } from 'lucide-react';

export default function UtilsPage() {
  const [codeInput, setCodeInput] = useState('');
  const [formattedCode, setFormattedCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('png');
  const [copied, setCopied] = useState(false);

  // Simple code formatter (basic implementation)
  const formatCode = () => {
    if (!codeInput.trim()) return;
    
    let formatted = codeInput;
    
    if (selectedLanguage === 'javascript' || selectedLanguage === 'typescript') {
      formatted = formatted
        .replace(/;/g, ';\n')
        .replace(/\{/g, ' {\n')
        .replace(/\}/g, '\n}')
        .replace(/,/g, ',\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    }
    
    setFormattedCode(formatted);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const convertImage = () => {
    if (!imageFile) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const quality = targetFormat === 'jpeg' ? 0.9 : undefined;
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `converted.${targetFormat}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, `image/${targetFormat}`, quality);
    };
    
    img.src = URL.createObjectURL(imageFile);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#222831' }}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Utils</h1>
          <p className="text-gray-300">Useful tools and utilities</p>
        </div>

        <div className="grid lg:grid-cols-1 gap-8">
          {/* Image Converter */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: '#31363F' }}>
            <div className="flex items-center space-x-3 mb-4">
              <ImageIcon style={{ color: '#EEEEEE' }} size={24} />
              <h2 className="text-xl font-semibold text-white">Image Converter</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:text-white hover:file:bg-opacity-80"
                  style={{ backgroundColor: '#222831' }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Format
                </label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 text-white"
                  style={{ 
                    backgroundColor: '#222831',
                    borderColor: '#31363F'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#EEEEEE'}
                  onBlur={(e) => e.target.style.borderColor = '#31363F'}
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              
              <button
                onClick={convertImage}
                disabled={!imageFile}
                className="w-full text-white py-2 px-4 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors hover:opacity-80"
                style={{ backgroundColor: '#222831' }}
              >
                Convert & Download
              </button>
            </div>
          </div>

          {/* Code Formatter */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: '#31363F' }}>
            <div className="flex items-center space-x-3 mb-4">
              <Code style={{ color: '#EEEEEE' }} size={24} />
              <h2 className="text-xl font-semibold text-white">Code Formatter</h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#222831' }}
                    onFocus={(e) => e.target.style.borderColor = '#EEEEEE'}
                    onBlur={(e) => e.target.style.borderColor = '#31363F'}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Input Code
                  </label>
                  <textarea
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="Paste your code here..."
                    className="w-full h-64 px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 font-mono text-sm text-white placeholder-gray-400"
                    style={{ backgroundColor: '#222831' }}
                    onFocus={(e) => e.target.style.borderColor = '#EEEEEE'}
                    onBlur={(e) => e.target.style.borderColor = '#31363F'}
                  />
                </div>
                
                <button
                  onClick={formatCode}
                  className="w-full text-white py-2 px-4 rounded-md transition-colors hover:opacity-80"
                  style={{ backgroundColor: '#222831' }}
                >
                  Format Code
                </button>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Formatted Code
                  </label>
                  {formattedCode && (
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center space-x-1 transition-colors text-gray-300 hover:text-white"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  )}
                </div>
                <div className="w-full h-64 px-3 py-2 border border-gray-600 rounded-md font-mono text-sm overflow-auto" style={{ backgroundColor: '#222831' }}>
                  <pre className="whitespace-pre-wrap text-gray-300">{formattedCode || 'Formatted code will appear here...'}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}