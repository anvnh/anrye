'use client';

import { useCallback, useState } from 'react';
import { CMEditorApi } from '../../components/editor/core/CMEditor';

export interface AIPosition {
  x: number;
  y: number;
}

export function useAIFloating(
  cmRef: React.RefObject<CMEditorApi | undefined>,
  editContent: string,
  setEditContent: (content: string) => void,
) {
  const [aiFloatingOpen, setAiFloatingOpen] = useState(false);
  const [aiFloatingPosition, setAiFloatingPosition] = useState<AIPosition>({ x: 0, y: 0 });
  const [aiTriggerPosition, setAiTriggerPosition] = useState<{ from: number; to: number } | undefined>(undefined);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedTextPosition, setSelectedTextPosition] = useState<{ from: number; to: number } | undefined>(undefined);

  const handleTextSelection = useCallback(() => {
    const api = cmRef.current;
    if (!api) return;
    const selection = api.getSelectionOffsets();
    if (selection.from !== selection.to) {
      const selected = editContent.slice(selection.from, selection.to);
      setSelectedText(selected);
      setSelectedTextPosition(selection);
    } else {
      setSelectedText('');
      setSelectedTextPosition(undefined);
    }
  }, [cmRef, editContent]);

  const handleAITextInsert = useCallback(
    (text: string, replacePosition?: { from: number; to: number }) => {
      const api = cmRef.current;
      if (api) {
        if (replacePosition) {
          api.setSelection(replacePosition.from, replacePosition.to);
          api.insertTextAtSelection(text);
        } else {
          api.insertTextAtSelection(text);
        }
      } else {
        if (replacePosition) {
          const before = editContent.slice(0, replacePosition.from);
          const after = editContent.slice(replacePosition.to);
          setEditContent(before + text + after);
        } else {
          setEditContent(editContent + text);
        }
      }
    },
    [cmRef, editContent, setEditContent]
  );

  const onAITrigger = useCallback((pos: AIPosition, triggerPosition?: { from: number; to: number }) => {
    handleTextSelection();
    setAiFloatingPosition(pos);
    setAiTriggerPosition(triggerPosition);
    setAiFloatingOpen(true);
  }, [handleTextSelection]);

  const onRestoreCursor = useCallback(() => {
    const api = cmRef.current;
    if (api) api.focus();
  }, [cmRef]);

  return {
    aiFloatingOpen,
    setAiFloatingOpen,
    aiFloatingPosition,
    setAiFloatingPosition,
    aiTriggerPosition,
    setAiTriggerPosition,
    selectedText,
    selectedTextPosition,
    handleTextSelection,
    handleAITextInsert,
    onAITrigger,
    onRestoreCursor,
  } as const;
}


