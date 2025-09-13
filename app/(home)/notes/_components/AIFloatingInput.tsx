'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface AIFloatingInputProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onInsertText: (text: string, replacePosition?: { from: number; to: number }) => void;
  noteContent: string;
  aiTriggerPosition?: { from: number; to: number };
  onRestoreCursor?: () => void; // Callback to restore cursor position and focus editor
}

// AI Service for making requests
class AIService {
  static async requestCompletion(prompt: string, context: string): Promise<string> {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context,
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
  onRestoreCursor
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [positionAbove, setPositionAbove] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const inputHeight = 60; // Height of the input container
    const margin = 16; // Margin from viewport edge
    
    // Check if there's enough space below
    const hasSpaceBelow = spaceBelow >= (inputHeight + margin);
    const hasSpaceAbove = spaceAbove >= (inputHeight + margin);
    
    // Position above if no space below but space above, or if above has more space
    const shouldPositionAbove = !hasSpaceBelow && hasSpaceAbove;
    
    setPositionAbove(shouldPositionAbove);
  }, [isVisible, position]);

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
      if (!containerRef.current.contains(e.target as Node)) onClose();
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

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = async (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
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
      try {
        setLoading(true);
        const result = await AIService.requestCompletion(prompt.trim(), noteContent);
        // If we have a trigger position, replace the "/ai " text, otherwise append
        if (aiTriggerPosition) {
          onInsertText(result, aiTriggerPosition);
        } else {
          onInsertText(`\n\n${result}\n`);
        }
        onClose();
      } catch (error) {
        console.error('AI request failed:', error);
        // Show error message to user
        const errorMessage = 'Sorry, I encountered an error. Please try again.';
        if (aiTriggerPosition) {
          onInsertText(errorMessage, aiTriggerPosition);
        } else {
          onInsertText(`\n\n${errorMessage}\n`);
        }
        onClose();
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSend = async () => {
    if (loading || !prompt.trim()) return;
    try {
      setLoading(true);
      const result = await AIService.requestCompletion(prompt.trim(), noteContent);
      if (aiTriggerPosition) {
        onInsertText(result, aiTriggerPosition);
      } else {
        onInsertText(`\n\n${result}\n`);
      }
      onClose();
    } catch (error) {
      console.error('AI request failed:', error);
      // Show error message to user
      const errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (aiTriggerPosition) {
        onInsertText(errorMessage, aiTriggerPosition);
      } else {
        onInsertText(`\n\n${errorMessage}\n`);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  // Calculate position based on collision detection
  const inputHeight = 60;
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
    <div ref={containerRef} style={style} className="rounded-xl border border-gray-700 bg-main shadow-xl p-2 flex items-center gap-2">
      <Input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask AI... (Enter to send, Esc to close)"
        disabled={loading}
        className="h-9 border-none"
      />
      <Button
        size="sm"
        disabled={loading || !prompt.trim()}
        onClick={handleSend}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
      </Button>
    </div>
  );
};

export default AIFloatingInput;
