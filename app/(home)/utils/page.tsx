'use client';

import { useState, Suspense } from 'react';
import AuthenticatedLayout from '../../components/AuthenticatedLayout';
import { ImageIcon } from 'lucide-react';

// Loading component
const LoadingSpinner = () => (
  <div className="h-full flex items-center justify-center bg-main">
    <div className="text-center">
      <ImageIcon className="text-primary animate-pulse mx-auto mb-4" size={48} />
      <p className="text-white">Loading utilities...</p>
    </div>
  </div>
);

export default function UtilsPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('png');

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
    <AuthenticatedLayout>
      <div className="h-full p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">Utils</h1>
            <p className="text-gray-300">Useful tools and utilities</p>
          </div>

          <div className="grid lg:grid-cols-1 gap-8">
          {/* Image Converter */}
          <div className="rounded-xl shadow-sm p-6 bg-secondary">
            <div className="flex items-center space-x-3 mb-4">
              <ImageIcon className="text-primary" size={24} />
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
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:text-white hover:file:bg-opacity-80 bg-main"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Format
                </label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 text-white bg-main focus:border-white"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              
              <button
                onClick={convertImage}
                disabled={!imageFile}
                className="w-full text-white py-2 px-4 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors hover:opacity-80 bg-main"
              >
                Convert & Download
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}