'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface FoldableHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  id: string;
  children: React.ReactNode;
  className?: string;
  onToggle?: (isFolded: boolean) => void;
}

const FoldableHeading: React.FC<FoldableHeadingProps> = ({
  level,
  id,
  children,
  className = '',
  onToggle
}) => {
  const [isFolded, setIsFolded] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Check if this heading has content below it (not just another heading of same or higher level)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!headingRef.current) return;

      const heading = headingRef.current;
      const nextElement = heading.nextElementSibling;
      
      if (nextElement) {
        // Check if the next element is a heading of same or higher level
        const nextHeadingLevel = parseInt(nextElement.tagName.charAt(1));
        if (nextHeadingLevel <= level) {
          setHasContent(false);
          return;
        }
        
        // Check if there's any content between this heading and the next heading of same or higher level
        let currentElement: Element | null = nextElement;
        let hasContentBetween = false;
        
        while (currentElement && currentElement.tagName) {
          const currentHeadingLevel = parseInt(currentElement.tagName.charAt(1));
          if (currentHeadingLevel <= level && currentElement.tagName.startsWith('H')) {
            break;
          }
          if (currentElement.tagName !== 'H1' && currentElement.tagName !== 'H2' && 
              currentElement.tagName !== 'H3' && currentElement.tagName !== 'H4' && 
              currentElement.tagName !== 'H5' && currentElement.tagName !== 'H6') {
            hasContentBetween = true;
            break;
          }
          currentElement = currentElement.nextElementSibling;
        }
        
        setHasContent(hasContentBetween);
      } else {
        setHasContent(false);
      }
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [level, children]);

  // Reset fold state when content changes
  useEffect(() => {
    setIsFolded(false);
  }, [children]);

  const handleToggle = () => {
    if (!hasContent) return;
    
    const newFoldedState = !isFolded;
    setIsFolded(newFoldedState);
    onToggle?.(newFoldedState);

    // Hide/show content between this heading and the next heading of same or higher level
    if (headingRef.current) {
      const heading = headingRef.current;
      let currentElement: Element | null = heading.nextElementSibling;
      
      while (currentElement && currentElement.tagName) {
        const currentHeadingLevel = parseInt(currentElement.tagName.charAt(1));
        if (currentHeadingLevel <= level && currentElement.tagName.startsWith('H')) {
          break;
        }
        
        if (currentElement instanceof HTMLElement) {
          if (newFoldedState) {
            currentElement.style.display = 'none';
          } else {
            currentElement.style.removeProperty('display');
          }
        }
        
        currentElement = currentElement.nextElementSibling;
      }
    }
  };

  const iconSize = level <= 2 ? 16 : 14;

  const renderHeading = () => {
    const props = {
      ref: headingRef,
      id,
      className: `relative group cursor-pointer hover:bg-gray-900/40 hover:bg-opacity-20 rounded px-1 -mx-1 transition-all duration-200 ${className}`,
      onClick: handleToggle
    };

    switch (level) {
      case 1:
        return <h1 {...props}>{renderContent()}</h1>;
      case 2:
        return <h2 {...props}>{renderContent()}</h2>;
      case 3:
        return <h3 {...props}>{renderContent()}</h3>;
      case 4:
        return <h4 {...props}>{renderContent()}</h4>;
      case 5:
        return <h5 {...props}>{renderContent()}</h5>;
      case 6:
        return <h6 {...props}>{renderContent()}</h6>;
      default:
        return <h1 {...props}>{renderContent()}</h1>;
    }
  };

  const renderContent = () => (
    <>
      {/* {hasContent && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100 transition-all duration-200 ease-in-out">
          {isFolded ? (
            <ChevronRight size={iconSize} className="text-gray-400 transform transition-transform duration-200" />
          ) : (
            <ChevronDown size={iconSize} className="text-gray-400 transform transition-transform duration-200" />
          )}
        </span>
      )} */}
      <span className="block">
        {children}
      </span>
    </>
  );

  return renderHeading();
};

export default FoldableHeading; 