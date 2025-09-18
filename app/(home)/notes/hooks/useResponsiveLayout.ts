import { useEffect } from 'react';

export const useResponsiveLayout = (
  isSplitMode: boolean,
  setIsSplitMode: (split: boolean) => void
) => {
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 1024 && isSplitMode) {
        setIsSplitMode(false);
      }
    };

    // Check on mount
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isSplitMode, setIsSplitMode]);
}; 