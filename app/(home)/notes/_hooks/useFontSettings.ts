import { useState, useEffect } from 'react';

export const useFontSettings = () => {
  const [fontFamily, setFontFamily] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('note-font-family') || 'inherit';
    }
    return 'inherit';
  });

  const [fontSize, setFontSize] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('note-font-size') || '16px';
    }
    return '16px';
  });

  const [previewFontSize, setPreviewFontSize] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('note-preview-font-size') || '16px';
    }
    return '16px';
  });

  // Save font settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('note-font-family', fontFamily);
    }
  }, [fontFamily]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('note-font-size', fontSize);
    }
  }, [fontSize]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('note-preview-font-size', previewFontSize);
    }
  }, [previewFontSize]);

  return {
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    previewFontSize,
    setPreviewFontSize,
  };
}; 