import { useState, useEffect } from 'react';

export const useThemeSettings = () => {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'latte';
    }
    return 'latte';
  });

  const [tabSize, setTabSize] = useState(2);

  // Theme list
  const themeOptions = [
    { value: 'latte', label: 'Catppuccin Latte' },
    { value: 'macchiato', label: 'Catppuccin Macchiato' },
    { value: 'frappe', label: 'Catppuccin Frappe' },
    { value: 'mocha', label: 'Catppuccin Mocha' },
  ];

  // Load and save theme to localStorage and update syntax highlighter only on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', currentTheme);
      // Remove old syntax highlighter link if exists
      const oldLink = document.querySelector('link[href*="/syntax-highlighter/"]');
      if (oldLink) {
        oldLink.parentNode?.removeChild(oldLink);
      }
      // Add new syntax highlighter link
      const newLink = document.createElement('link');
      newLink.rel = 'stylesheet';
      newLink.href = `/syntax-highlighter/${currentTheme}.css`;
      document.head.appendChild(newLink);
    }
  }, [currentTheme]);

  return {
    currentTheme,
    setCurrentTheme,
    tabSize,
    setTabSize,
    themeOptions,
  };
}; 