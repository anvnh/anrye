'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus, RotateCcw, RotateCw, Edit3 } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose?: () => void;
  onEdit?: () => void;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, onClose, onEdit }) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [fitToViewport, setFitToViewport] = useState(true);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Calculate scale to fit viewport
  const calculateFitScale = useCallback(() => {
    if (!imageSize) return 1;
    const viewportWidth = window.innerWidth - 100; // Account for padding
    const viewportHeight = window.innerHeight - 100;
    const scaleX = viewportWidth / imageSize.width;
    const scaleY = viewportHeight / imageSize.height;
    return Math.min(scaleX, scaleY, 1); // Don't scale up smaller images
  }, [imageSize]);

  // Handle image load to get actual dimensions
  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      const newImageSize = { width: naturalWidth, height: naturalHeight };
      setImageSize(newImageSize);
      
      // Calculate fit scale directly with the new dimensions
      const viewportWidth = window.innerWidth - 100; // Account for padding
      const viewportHeight = window.innerHeight - 100;
      const scaleX = viewportWidth / newImageSize.width;
      const scaleY = viewportHeight / newImageSize.height;
      const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up smaller images
      
      // Set initial scale to fit viewport
      setScale(fitScale);
    }
  }, []);

  // Toggle between fit-to-viewport and actual size (100%)
  const toggleActualSize = useCallback(() => {
    if (!imageSize) return;
    
    if (fitToViewport) {
      // Switch to actual size (100%)
      setScale(1);
      setFitToViewport(false);
      setOffset({ x: 0, y: 0 }); // Reset offset when switching to actual size
    } else {
      // Switch back to fit viewport
      const fitScale = calculateFitScale();
      setScale(fitScale);
      setFitToViewport(true);
      setOffset({ x: 0, y: 0 });
    }
  }, [imageSize, fitToViewport, calculateFitScale]);

  // Handle window resize to recalculate fit scale
  useEffect(() => {
    const handleResize = () => {
      if (fitToViewport && imageSize) {
        const fitScale = calculateFitScale();
        setScale(fitScale);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToViewport, imageSize, calculateFitScale]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key.toLowerCase() === 'r' && (e.shiftKey || e.metaKey)) setRotation((r) => (r - 90 + 360) % 360);
      else if (e.key.toLowerCase() === 'r') setRotation((r) => (r + 90) % 360);
      if (e.key === '+') {
        setFitToViewport(false);
        setScale((s) => clamp(Number((s + 0.2).toFixed(2)), 0.1, 4));
      }
      if (e.key === '-') {
        setFitToViewport(false);
        setScale((s) => clamp(Number((s - 0.2).toFixed(2)), 0.1, 4));
      }
      if (e.key.toLowerCase() === '0') reset();
      if (e.key.toLowerCase() === '1') toggleActualSize();
      if (e.key.toLowerCase() === 'e') onEdit?.();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose, onEdit, toggleActualSize]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setFitToViewport(false);
    setScale((s) => clamp(Number((s + delta).toFixed(2)), 0.1, 4));
  }, []);

  const startDrag = useCallback((e: React.MouseEvent) => {
    // Allow dragging if scale > fit scale or if we're at actual size and image is larger than viewport
    const minDragScale = fitToViewport ? calculateFitScale() : 0.5;
    if (scale <= minDragScale) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset.x, offset.y, scale, fitToViewport, calculateFitScale]);

  const onDrag = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    setOffset({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  }, [isDragging]);

  const endDrag = useCallback(() => setIsDragging(false), []);

  const reset = () => {
    if (imageSize) {
      const fitScale = calculateFitScale();
      setScale(fitScale);
      setFitToViewport(true);
    } else {
      setScale(1);
    }
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  const zoomIn = () => {
    setFitToViewport(false);
    setScale((s) => clamp(Number((s + 0.2).toFixed(2)), 0.1, 4));
  };
  
  const zoomOut = () => {
    setFitToViewport(false);
    setScale((s) => clamp(Number((s - 0.2).toFixed(2)), 0.1, 4));
  };
  
  const toggleZoom = () => {
    if (fitToViewport) {
      // If currently fit to viewport, go to actual size
      setScale(1);
      setFitToViewport(false);
    } else {
      // If not fit to viewport, toggle between current scale and 2x
      setScale((s) => (s === 1 ? 2 : 1));
    }
  };

  const content = (
    <div className="fixed inset-0 z-[9998]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Image container */}
      <div className="absolute inset-0 flex items-center justify-center select-none">
        <img
          ref={imgRef}
          src={src}
          alt={alt || 'Image'}
          className="max-w-none rounded-md shadow-2xl"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`, transition: isDragging ? 'none' : 'transform 0.08s ease-out' }}
          onLoad={handleImageLoad}
          onWheel={handleWheel}
          onMouseDown={startDrag}
          onMouseMove={onDrag}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onDoubleClick={toggleZoom}
          draggable={false}
        />
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        {onEdit && (
          <button onClick={onEdit} className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white" title="Edit image">
            <Edit3 size={18} />
          </button>
        )}
        <button onClick={onClose} className="p-2 rounded-md bg-gray-800/70 hover:bg-gray-700 text-white">
          <X size={18} />
        </button>
      </div>
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button onClick={() => setRotation((r) => (r - 90 + 360) % 360)} className="p-2 rounded-md bg-gray-800/70 hover:bg-gray-700 text-white" title="Rotate left">
          <RotateCcw size={18} />
        </button>
        <button onClick={zoomOut} className="p-2 rounded-md bg-gray-800/70 hover:bg-gray-700 text-white" title="Zoom out">
          <Minus size={18} />
        </button>
        <button 
          onClick={toggleActualSize} 
          className={`px-3 py-2 rounded-md text-white transition-colors ${
            !fitToViewport && scale === 1 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-800/70 hover:bg-gray-700'
          }`} 
          title={fitToViewport ? "Show actual size (100%)" : scale === 1 ? "Fit to viewport" : "Actual size"}
        >
          {fitToViewport ? 'Fit' : scale === 1 ? '100%' : `${Math.round(scale * 100)}%`}
        </button>
        <button onClick={reset} className="px-2 py-2 rounded-md bg-gray-800/70 hover:bg-gray-700 text-white text-sm" title="Reset to fit">
          Reset
        </button>
        <button onClick={zoomIn} className="p-2 rounded-md bg-gray-800/70 hover:bg-gray-700 text-white" title="Zoom in">
          <Plus size={18} />
        </button>
        <button onClick={() => setRotation((r) => (r + 90) % 360)} className="p-2 rounded-md bg-gray-800/70 hover:bg-gray-700 text-white" title="Rotate right">
          <RotateCw size={18} />
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default ImageLightbox;