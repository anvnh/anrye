'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ColorPickerProps {
  color: string; // hex like #ff0000
  onChange: (hex: string) => void;
}

// Utilities
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string) {
  const m = hex.replace('#','');
  const r = parseInt(m.substring(0,2), 16);
  const g = parseInt(m.substring(2,4), 16);
  const b = parseInt(m.substring(4,6), 16);
  return { r, g, b };
}

function rgbToHsv(r: number, g: number, b: number) {
  const r1 = r / 255, g1 = g / 255, b1 = b / 255;
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
  const d = max - min;
  let h = 0;
  if (d === 0) h = 0;
  else if (max === r1) h = 60 * (((g1 - b1) / d) % 6);
  else if (max === g1) h = 60 * (((b1 - r1) / d) + 2);
  else h = 60 * (((r1 - g1) / d) + 4);
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const initial = useMemo(() => {
    const { r, g, b } = hexToRgb(color || '#ff4757');
    return rgbToHsv(r, g, b);
  }, [color]);

  const [hue, setHue] = useState(initial.h);
  const [sat, setSat] = useState(initial.s);
  const [val, setVal] = useState(initial.v);

  useEffect(() => {
    // sync external color updates
    const { r, g, b } = hexToRgb(color || '#ff4757');
    const { h, s, v } = rgbToHsv(r, g, b);
    setHue(h); setSat(s); setVal(v);
  }, [color]);

  useEffect(() => {
    const { r, g, b } = hsvToRgb(hue, sat, val);
    onChange(rgbToHex(r, g, b));
  }, [hue, sat, val]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!open) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const baseHex = useMemo(() => {
    const { r, g, b } = hsvToRgb(hue, 1, 1);
    return rgbToHex(r, g, b);
  }, [hue]);

  const handleSvPointer = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);
    setSat(x / rect.width);
    setVal(1 - y / rect.height);
  };

  const handleHuePointer = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    setHue((x / rect.width) * 360);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded border border-gray-600"
        style={{ backgroundColor: color }}
        title="Pick color"
      />
      {open && (
        <div className="absolute bottom-10 left-0 z-[10000] p-3 rounded-lg bg-[#1f2430] border border-gray-700 shadow-xl w-64 select-none">
          {/* SV panel */}
          <div
            onMouseDown={(e) => {
              handleSvPointer(e);
              const move = (ev: MouseEvent) => handleSvPointer(ev as unknown as React.MouseEvent<HTMLDivElement>);
              const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
              document.addEventListener('mousemove', move);
              document.addEventListener('mouseup', up);
            }}
            className="relative h-40 rounded mb-3 cursor-crosshair"
            style={{
              background: `linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent), ${baseHex}`,
            }}
          >
            <div
              className="absolute w-3 h-3 rounded-full border border-white shadow -translate-x-1.5 -translate-y-1.5"
              style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%` }}
            />
          </div>

          {/* Hue slider */}
          <div
            onMouseDown={(e) => {
              handleHuePointer(e);
              const move = (ev: MouseEvent) => handleHuePointer(ev as unknown as React.MouseEvent<HTMLDivElement>);
              const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
              document.addEventListener('mousemove', move);
              document.addEventListener('mouseup', up);
            }}
            className="relative h-3 rounded cursor-ew-resize"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
            }}
          >
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-sm bg-white shadow"
              style={{ left: `${(hue / 360) * 100}%` }}
            />
          </div>

          {/* Hex display */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-300">{color.toUpperCase()}</span>
            <button className="text-xs px-2 py-1 rounded bg-gray-700 text-white hover:bg-gray-600" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;

