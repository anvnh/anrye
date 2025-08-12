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

  const [codeBlockFontSize, setCodeBlockFontSize] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('note-codeblock-font-size') || '14px';
    }
    return '14px';
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('note-codeblock-font-size', codeBlockFontSize);
    }
  }, [codeBlockFontSize]);

  return {
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    previewFontSize,
    setPreviewFontSize,
    codeBlockFontSize,
    setCodeBlockFontSize,
  };
}; 