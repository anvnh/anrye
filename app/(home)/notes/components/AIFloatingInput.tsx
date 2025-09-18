'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AIFloatingInputProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onInsertText: (text: string, replacePosition?: { from: number; to: number }) => void;
  noteContent: string;
  aiTriggerPosition?: { from: number; to: number };
  selectedText?: string; // Text that is currently selected in the editor
  selectedTextPosition?: { from: number; to: number }; // Position of selected text
  onSelectionChange?: () => void; // Callback to detect new text selection
  onRestoreCursor?: () => void; // Callback to restore cursor position and focus editor
}

// AI Service for making requests
class AIService {
  static async requestCompletion(prompt: string, context: string, selectedText?: string, explainMode?: boolean): Promise<string> {
    try {
      // If there's selected text, focus only on that instead of the full context
      let enhancedContext = context;
      if (selectedText && selectedText.trim()) {
        // Only use selected text as context, not the full note
        enhancedContext = `Selected text to work with: "${selectedText}"`;
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context: enhancedContext,
          selectedText: selectedText || null,
          explainMode: explainMode || false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('AI API error:', errorData);
        throw new Error(errorData.error || 'AI request failed');
      }

      const data = await response.json();
      return data.completion || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('AI request error:', error);
      // Return a fallback response instead of throwing
      return 'Sorry, I encountered an error. Please check your internet connection and try again.';
    }
  }
}

export const AIFloatingInput: React.FC<AIFloatingInputProps> = ({
  isVisible,
  position,
  onClose,
  onInsertText,
  noteContent,
  aiTriggerPosition,
  selectedText,
  selectedTextPosition,
  onSelectionChange,
  onRestoreCursor
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [positionAbove, setPositionAbove] = useState(false);
  const [isExplainMode, setIsExplainMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate preview text for selected text
  const getSelectedTextPreview = useCallback(() => {
    if (!selectedText) return '';
    const maxLength = 50;
    if (selectedText.length <= maxLength) return selectedText;
    return selectedText.slice(0, maxLength) + '...';
  }, [selectedText]);

  // Collision detection for positioning
  const checkCollision = useCallback(() => {
    if (!isVisible || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate available space below and above
    const spaceBelow = viewportHeight - position.y;
    const spaceAbove = position.y;
    
    // AIFloatingInput height (approximate)
    const inputHeight = selectedText ? 100 : 60; // Height includes selected text preview
    const margin = 16; // Margin from viewport edge
    
    // Check if there's enough space below
    const hasSpaceBelow = spaceBelow >= (inputHeight + margin);
    const hasSpaceAbove = spaceAbove >= (inputHeight + margin);
    
    // Position above if no space below but space above, or if above has more space
    const shouldPositionAbove = !hasSpaceBelow && hasSpaceAbove;
    
    setPositionAbove(shouldPositionAbove);
  }, [isVisible, position, selectedText]);

  useEffect(() => {
    if (isVisible) {
      setPrompt('');
      // Check collision after a brief delay to ensure container is rendered
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
        checkCollision();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isVisible, checkCollision]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isVisible) return;
      if (!containerRef.current) return;
      
      // Check if click is inside the editor (not just outside the floating input)
      const target = e.target as Element;
      const isEditorClick = target.closest('.cm-editor') || target.closest('.raw-content');
      
      // Only close if click is outside both floating input AND editor
      if (!containerRef.current.contains(target) && !isEditorClick) {
        onClose();
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [isVisible, onClose]);

  // Recalculate position on window resize
  useEffect(() => {
    if (!isVisible) return;
    
    const handleResize = () => {
      checkCollision();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, checkCollision]);

  // Listen for selection changes when floating input is open
  useEffect(() => {
    if (!isVisible || !onSelectionChange) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const handleSelectionChange = () => {
      // Clear previous timeout
      clearTimeout(timeoutId);
      
      // Debounce selection change by 300ms
      timeoutId = setTimeout(() => {
        onSelectionChange();
      }, 300);
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      clearTimeout(timeoutId);
    };
  }, [isVisible, onSelectionChange]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = async (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      
      // Remove "/ai" trigger if it exists
      if (aiTriggerPosition) {
        onInsertText('', aiTriggerPosition);
      }
      
      // Restore cursor position and focus editor before closing
      if (onRestoreCursor) {
        onRestoreCursor();
      }
      onClose();
      return;
    }
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      if (!prompt.trim()) return;
      await handleAIRequest(false); // false = replace mode
    }
  };

  const handleAIRequest = async (explainMode: boolean) => {
    try {
      setLoading(true);
      const result = await AIService.requestCompletion(prompt.trim(), noteContent, selectedText, explainMode);
      
      if (explainMode) {
        // In explain mode, replace "/ai" trigger with explanation
        if (aiTriggerPosition) {
          onInsertText(result, aiTriggerPosition);
        } else {
          onInsertText(`\n\n${result}\n`);
        }
      } else {
        // In replace mode, replace the selected text and remove "/ai" trigger
        if (selectedText && selectedTextPosition) {
          // Calculate the range that includes both selected text and "/ai" trigger
          let startPos = selectedTextPosition.from;
          let endPos = selectedTextPosition.to;
          
          if (aiTriggerPosition) {
            // Include "/ai" trigger in the replacement range
            startPos = Math.min(startPos, aiTriggerPosition.from);
            endPos = Math.max(endPos, aiTriggerPosition.to);
          }
          
          // Replace the entire range with just the result
          onInsertText(result, { from: startPos, to: endPos });
        } else if (aiTriggerPosition) {
          onInsertText(result, aiTriggerPosition);
        } else {
          onInsertText(`\n\n${result}\n`);
        }
      }
      onClose();
    } catch (error) {
      console.error('AI request failed:', error);
      const errorMessage = 'Sorry, I encountered an error. Please try again.';
      onInsertText(`\n\n${errorMessage}\n`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (loading || !prompt.trim()) return;
    await handleAIRequest(false); // false = replace mode
  };

  const handleExplain = async () => {
    if (loading || !prompt.trim()) return;
    await handleAIRequest(true); // true = explain mode
  };

  if (!isVisible) return null;

  // Calculate position based on collision detection
  const inputHeight = selectedText ? 100 : 60;
  const margin = 16;
  const topPosition = positionAbove 
    ? Math.max(margin, position.y - inputHeight - 80) // Position above with some spacing
    : Math.max(margin, position.y - 65); // Position below with some spacing

  const style: React.CSSProperties = {
    position: 'fixed', // Use fixed positioning for better collision detection
    left: Math.max(margin, Math.min(position.x - 410, window.innerWidth - 420 - margin)), // Center around trigger, keep within viewport
    top: topPosition,
    zIndex: 50,
    width: 420,
  } as React.CSSProperties;

  return (
    <TooltipProvider>
      <div ref={containerRef} style={style} className="rounded-md border-none bg-main shadow-xl">
        {/* Selected text preview */}
        {selectedText && (
          <div className="px-3 py-2 border-b border-gray-500 bg-secondary rounded-t-md">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Selected:</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-gray-200 truncate max-w-[300px] cursor-help">
                    {getSelectedTextPreview()}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md mb-2 bg-secondary">
                  <p className="text-sm break-words">{selectedText}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
        
        {/* Main input area */}
        <div className="p-2 flex items-center gap-2">
          <Input
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedText ? `Ask AI about selected text... (Enter to replace, Esc to close)` : "Ask AI... (Enter to send, Esc to close)"}
            disabled={loading}
            className="h-9 border-none"
          />
          {selectedText && (
            <Button
              size="sm"
              variant="outline"
              disabled={loading || !prompt.trim()}
              onClick={handleExplain}
              className="text-xs"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Explain'}
            </Button>
          )}
          <Button
            size="sm"
            disabled={loading || !prompt.trim()}
            onClick={handleSend}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedText ? 'Replace' : 'Send'}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AIFloatingInput;
