'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCw, RotateCcw, Save } from 'lucide-react';
import ColorPicker from '../../ui/ColorPicker';
import { driveService } from '@/app/(home)/notes/services/googleDrive';

interface ImageEditorProps {
  src: string; // original image URL (can be blob or web URL)
  driveFileId?: string; // if provided, allow saving back to Drive
  onClose: () => void;
  onSaved?: (newBlobUrl: string) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ src, driveFileId, onClose, onSaved }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<'move' | 'draw' | 'eraser' | 'rect' | 'text' | 'crop' | 'none'>('draw');
  const [brushColor, setBrushColor] = useState('#ff4757');

  const [strokeSizes, setStrokeSizes] = useState<{ draw: number; eraser: number }>({
    draw: 90,      // brush mặc định 90
    eraser: 100,   // eraser mặc định 100
  });
  const strokeSize = tool === 'eraser' ? strokeSizes.eraser : strokeSizes.draw;

  const [scale, setScale] = useState(1);
  const [textValue, setTextValue] = useState<string>('Text');
  const [textSize, setTextSize] = useState<number>(28);
  const rectStart = useRef<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panOriginRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastMidRef = useRef<{ x: number; y: number } | null>(null);
  const prevToolRef = useRef<typeof tool | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [activeText, setActiveText] = useState<{ x: number; y: number } | null>(null);
  const textDragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el as HTMLElement)?.isContentEditable === true
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { onClose(); return; }
      if (k === 'm') { setTool('move'); }
      if (k === 'b') { setTool('draw'); }
      if (k === 'e') { setTool('eraser'); }
      if (k === 't') { setTool('text'); }
      if (k === 'c') { setTool('crop'); }
      if (k === '[') { setRotation(r => (r - 90 + 360) % 360); }
      if (k === ']') { setRotation(r => (r + 90) % 360); }
      if (k === '+' || k === '=') { setScale(s => Math.min(16, Number((s + 0.1).toFixed(2)))); }
      if (k === '-') { setScale(s => Math.max(0.1, Number((s - 0.1).toFixed(2)))); }
      if (k === '0') { setScale(1); setPanOffset({ x: 0, y: 0 }); }
      if (k === ' ') {
        // Space: temporary move while held
        if (prevToolRef.current === null) {
          prevToolRef.current = tool;
          setTool('move');
        }
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && prevToolRef.current !== null) {
        // restore
        setTool(prevToolRef.current);
        prevToolRef.current = null;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [onClose, tool]);

  // Initialize canvas once image loads
  const onImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    // Don't set default crop - only crop when user explicitly chooses to
    if (overlayRef.current) {
      overlayRef.current.width = img.naturalWidth;
      overlayRef.current.height = img.naturalHeight;
    }
  };

  const drawToCanvas = async (): Promise<Blob> => {
    const img = imgRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');

    // Only apply crop if user has explicitly set one
    const shouldCrop = crop && tool === 'crop';
    const c = shouldCrop ? crop! : { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };

    // Determine output canvas size considering rotation (90/270 swaps width/height)
    const rot = ((rotation % 360) + 360) % 360;
    const swap = rot === 90 || rot === 270;
    const outW = swap ? c.h : c.w;
    const outH = swap ? c.w : c.h;

    canvas.width = Math.max(1, Math.floor(outW));
    canvas.height = Math.max(1, Math.floor(outH));

    ctx.save();
    // Move to center, apply rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    // Draw the image (cropped or full)
    ctx.drawImage(
      img,
      c.x, c.y, c.w, c.h,
      -c.w / 2, -c.h / 2, c.w, c.h
    );
    // Composite overlay annotations (only the cropped region if cropping)
    if (overlayRef.current) {
      ctx.drawImage(
        overlayRef.current,
        c.x, c.y, c.w, c.h,
        -c.w / 2, -c.h / 2, c.w, c.h
      );
    }
    ctx.restore();

    return await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/png', 0.92));
  };

  const save = async () => {
    if (!imgRef.current || isSaving) return;

    setIsSaving(true);

    try {
      const blob = await drawToCanvas();

      // Update Drive if driveFileId present
      if (driveFileId) {
        try {
          await driveService.updateImageFile(driveFileId, blob, 'image/png');
        } catch (e) {
          console.error('Failed updating Drive image', e);
        }
      }

      const url = URL.createObjectURL(blob);
      onSaved?.(url);
      onClose();
    } catch (error) {
      console.error('Failed to save image:', error);
      // You could add a toast notification here
    } finally {
      setIsSaving(false);
    }
  };

  const toNatural = (clientX: number, clientY: number, container: HTMLDivElement) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // screen delta from center
    let dx = clientX - cx;
    let dy = clientY - cy;
    // undo pan (applied before scale)
    dx -= panOffset.x;
    dy -= panOffset.y;
    // undo scale
    dx /= scale;
    dy /= scale;
    // undo rotation
    const th = (rotation * Math.PI) / 180;
    const cos = Math.cos(-th);
    const sin = Math.sin(-th);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    // map to natural coordinates (center-based)
    const nx = rx + imgRef.current.naturalWidth / 2;
    const ny = ry + imgRef.current.naturalHeight / 2;
    return {
      x: Math.max(0, Math.min(nx, imgRef.current.naturalWidth)),
      y: Math.max(0, Math.min(ny, imgRef.current.naturalHeight))
    };
  };

  const startCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const container = e.currentTarget as HTMLDivElement;
    if (tool === 'move') {
      setIsDragging(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOriginRef.current = { ...panOffset };
      return;
    }
    if (tool === 'text') {
      const pt = toNatural(e.clientX, e.clientY, container);
      const ctx = (overlayRef.current as HTMLCanvasElement).getContext('2d')!;
      ctx.font = `${textSize}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial`;
      const metrics = ctx.measureText(textValue || 'Text');
      const w = metrics.width; const h = textSize;
      if (activeText) {
        const inside = pt.x >= activeText.x && pt.x <= activeText.x + w && pt.y >= activeText.y && pt.y <= activeText.y + h;
        if (inside) {
          textDragOffsetRef.current = { dx: pt.x - activeText.x, dy: pt.y - activeText.y };
          setIsDraggingText(true);
          return;
        }
        // Commit current text then clear selection if click outside
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = brushColor;
        ctx.textBaseline = 'top';
        ctx.fillText(textValue || 'Text', activeText.x, activeText.y);
        setActiveText(null);
        setIsDraggingText(false);
        textDragOffsetRef.current = null;
        return;
      }
      // Start new text placement and allow dragging before committing
      setActiveText({ x: pt.x, y: pt.y });
      textDragOffsetRef.current = { dx: 0, dy: 0 };
      setIsDraggingText(true);
      return;
    }
    if (tool === 'draw' || tool === 'eraser') {
      const pt = toNatural(e.clientX, e.clientY, container);
      const ctx = (overlayRef.current as HTMLCanvasElement).getContext('2d')!;
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = strokeSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Start stroke at the clicked point
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + 0.01, pt.y); // small line to start stroke
      ctx.stroke();

      lastPointRef.current = pt;
      lastMidRef.current = pt;
      setIsDragging(true);
      return;
    }
    if (tool === 'rect') {
      rectStart.current = toNatural(e.clientX, e.clientY, container);
      setIsDragging(true);
      return;
    }
    // Handle crop tool
    if (tool === 'crop') {
      const rect = container.getBoundingClientRect();
      setIsDragging(true);
      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      return;
    }
  };

  const moveCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const container = e.currentTarget as HTMLDivElement;
    if (tool === 'text') {
      if (!activeText || !isDraggingText) return;
      const pt = toNatural(e.clientX, e.clientY, container);
      const off = textDragOffsetRef.current || { dx: 0, dy: 0 };
      setActiveText({ x: pt.x - off.dx, y: pt.y - off.dy });
      return;
    }
    if (tool === 'move') {
      if (!isDragging || !panStartRef.current || !panOriginRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanOffset({ x: panOriginRef.current.x + dx, y: panOriginRef.current.y + dy });
      return;
    }
    if (tool === 'draw' || tool === 'eraser') {
      if (!isDragging) return;
      const pt = toNatural(e.clientX, e.clientY, container);
      const ctx = (overlayRef.current as HTMLCanvasElement).getContext('2d')!;
      // Smooth stroke using quadratic curve between midpoints
      const last = lastPointRef.current || pt;
      const lastMid = lastMidRef.current || last;
      const mid = { x: (last.x + pt.x) / 2, y: (last.y + pt.y) / 2 };
      ctx.beginPath();
      ctx.moveTo(lastMid.x, lastMid.y);
      ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
      ctx.stroke();
      lastPointRef.current = pt;
      lastMidRef.current = mid;
      return;
    }
    if (tool === 'rect') {
      if (!isDragging || !rectStart.current) return;
      const now = toNatural(e.clientX, e.clientY, container);
      const prevCtx = (overlayRef.current as HTMLCanvasElement).getContext('2d')!;
      // temporary rectangle: clear last and draw outline on top of overlay snapshot by redrawing later
      // For simplicity we just draw guide on top of overlay using XOR-style approach
      // Here we skip a live guide to keep implementation light
      return;
    }
    if (!isDragging || !dragStart) return;

    // Only handle crop tool
    if (tool !== 'crop') return;

    const rect = container.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);

    // Calculate crop area based on drag start and current position
    const startX = Math.min(dragStart.x, x);
    const startY = Math.min(dragStart.y, y);
    const endX = Math.max(dragStart.x, x);
    const endY = Math.max(dragStart.y, y);

    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;

    setCrop({
      x: Math.floor(startX * scaleX),
      y: Math.floor(startY * scaleY),
      w: Math.floor((endX - startX) * scaleX),
      h: Math.floor((endY - startY) * scaleY)
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div
          className="relative w-[92vw] h-[78vh] overflow-hidden"
          style={{ cursor: tool === 'eraser' ? 'none' : 'default' }}
          onWheel={(e) => { e.preventDefault(); const d = e.deltaY > 0 ? -0.1 : 0.1; setScale(s => Math.max(0.1, Math.min(16, Number((s + d).toFixed(2))))); }}
          onMouseMove={(e) => {
            if (tool !== 'eraser') { if (cursor.visible) setCursor(c => ({ ...c, visible: false })); return; }
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
          }}
          onMouseLeave={() => setCursor(c => ({ ...c, visible: false }))}
        >
          <div style={{ transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px)) scale(${scale}) rotate(${rotation}deg)`, top: '50%', left: '50%', position: 'absolute' }}>
            <img ref={imgRef} src={src} onLoad={onImageLoad} alt="edit" className="max-w-none rounded block" />
            <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            {/* Live text preview while placing/moving */}
            {tool === 'text' && activeText && (
              <div
                className="absolute pointer-events-none select-none"
                style={{ left: activeText.x, top: activeText.y, color: brushColor, fontSize: textSize, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, \"Helvetica Neue\", Arial' }}
              >
                {textValue || 'Text'}
              </div>
            )}
            {/* Crop overlay */}
            {tool === 'crop' && crop && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.w,
                  height: crop.h
                }}
              />
            )}
            <div className="absolute inset-0" onMouseDown={startCrop} onMouseMove={moveCrop} onMouseUp={() => { setIsDragging(false); setIsDraggingText(false); }} />
          </div>

          {/* Eraser cursor overlay (scaled with zoom) */}
          {tool === 'eraser' && cursor.visible && (
            <div
              className="absolute rounded-full border border-white/80 shadow pointer-events-none"
              style={{
                left: cursor.x - (strokeSize * scale) / 2,
                top: cursor.y - (strokeSize * scale) / 2,
                width: strokeSize * scale,
                height: strokeSize * scale,
              }}
            />
          )}
        </div>

        {/* Bottom toolbar overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex gap-2 items-center flex-wrap justify-center bg-black/60 backdrop-blur px-3 py-2 rounded-lg shadow-lg">
            {tool === 'crop' && (
              <div className="text-xs text-white/80 bg-blue-600/50 px-2 py-1 rounded">
                Drag to select crop area
              </div>
            )}
            <label className="text-xs text-white/80">Tool:</label>
            <select value={tool} onChange={(e) => setTool(e.target.value as any)} className="px-2 py-1 rounded bg-gray-800/70 text-white">
              <option value="move">Move</option>
              <option value="draw">Brush</option>
              <option value="eraser">Eraser</option>
              <option value="rect">Rectangle</option>
              <option value="text">Text</option>
              <option value="crop">Crop</option>
              <option value="none">None</option>
            </select>
            <ColorPicker color={brushColor} onChange={setBrushColor} />

            {(tool === 'draw' || tool === 'eraser') && (
              <>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={strokeSize}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setStrokeSizes(s =>
                      tool === 'eraser' ? { ...s, eraser: v } : { ...s, draw: v }
                    );
                  }}
                />
                <span className="text-xs text-white/80 tabular-nums w-10 text-right">
                  {strokeSize}px
                </span>
              </>
            )}


            {tool === 'text' && (
              <>
                <input value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="Type text" className="px-2 py-1 rounded bg-gray-800/70 text-white w-40" />
                <input type="range" min={10} max={120} value={textSize} onChange={(e) => setTextSize(parseInt(e.target.value))} />
              </>
            )}
            <span className="text-xs text-white/60">Zoom: {Math.round(scale * 100)}%</span>
            <button onClick={() => setRotation((r) => (r - 90 + 360) % 360)} className="px-3 py-2 rounded bg-gray-800/70 hover:bg-gray-700 text-white flex items-center gap-2">
              <RotateCcw size={16} /> Left
            </button>
            <button onClick={() => setRotation((r) => (r + 90) % 360)} className="px-3 py-2 rounded bg-gray-800/70 hover:bg-gray-700 text-white flex items-center gap-2">
              <RotateCw size={16} /> Right
            </button>
            {tool === 'crop' && crop && (
              <button onClick={() => setCrop(null)} className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
                Clear Crop
              </button>
            )}
            <button
              onClick={save}
              disabled={isSaving}
              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save
                </>
              )}
            </button>
            <button onClick={onClose} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2">
              <X size={16} /> Cancel
            </button>
          </div>
        </div>

        {/* Hidden canvas for export */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>,
    document.body
  );
};

export default ImageEditor;
