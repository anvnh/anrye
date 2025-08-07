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
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key.toLowerCase() === 'r' && (e.shiftKey || e.metaKey)) setRotation((r) => (r - 90 + 360) % 360);
      else if (e.key.toLowerCase() === 'r') setRotation((r) => (r + 90) % 360);
      if (e.key === '+') setScale((s) => clamp(Number((s + 0.2).toFixed(2)), 1, 4));
      if (e.key === '-') setScale((s) => clamp(Number((s - 0.2).toFixed(2)), 1, 4));
      if (e.key.toLowerCase() === '0') reset();
      if (e.key.toLowerCase() === 'e') onEdit?.();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose, onEdit]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => clamp(Number((s + delta).toFixed(2)), 1, 4));
  }, []);

  const startDrag = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset.x, offset.y, scale]);

  const onDrag = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    setOffset({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  }, [isDragging]);

  const endDrag = useCallback(() => setIsDragging(false), []);

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  const zoomIn = () => setScale((s) => clamp(Number((s + 0.2).toFixed(2)), 1, 4));
  const zoomOut = () => setScale((s) => clamp(Number((s - 0.2).toFixed(2)), 1, 4));
  const toggleZoom = () => setScale((s) => (s === 1 ? 2 : 1));

  const content = (
    <div className="fixed inset-0 z-[9998]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Image container */}
      <div className="absolute inset-0 flex items-center justify-center select-none">
        <img
          src={src}
          alt={alt || 'Image'}
          className="max-w-none rounded-md shadow-2xl"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`, transition: isDragging ? 'none' : 'transform 0.08s ease-out' }}
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
        <button onClick={reset} className="px-3 py-2 rounded-md bg-gray-800/70 hover:bg-gray-700 text-white" title="Reset">
          {Math.round(scale * 100)}%
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