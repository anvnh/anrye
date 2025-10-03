'use client';

import { useMemo, useRef, useState, useCallback } from 'react';
import { Note } from '../../components/types';
import { CMEditorApi } from '../../components/editor/core/CMEditor';

export interface WikilinkCtx {
  open: boolean;
  query: string;
  pos: { from: number; to: number };
  coords: { x: number; y: number };
}

interface UseCMWikilinkPopupParams {
  editContent: string;
  setEditContent: (content: string) => void;
  cmRef: React.RefObject<CMEditorApi | undefined>;
  yOffset?: number;
}

export function useCMWikilinkPopup({
  editContent,
  setEditContent,
  cmRef,
  yOffset = 18,
}: UseCMWikilinkPopupParams) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wikilinkCtx, setWikilinkCtx] = useState<WikilinkCtx>({
    open: false,
    query: '',
    pos: { from: 0, to: 0 },
    coords: { x: 0, y: 0 },
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const relativePopupPos = useMemo(() => {
    if (!wikilinkCtx.open) return null as { top: number; left: number } | null;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { top: wikilinkCtx.coords.y, left: wikilinkCtx.coords.x };
    return {
      top: wikilinkCtx.coords.y - rect.top,
      left: wikilinkCtx.coords.x - rect.left,
    };
  }, [wikilinkCtx]);

  const onWikilinkContextChange = useCallback((ctx: WikilinkCtx) => {
    if (ctx.open) {
      setWikilinkCtx({
        open: true,
        query: ctx.query,
        pos: { from: ctx.pos.from, to: ctx.pos.to },
        coords: { x: ctx.coords.x, y: ctx.coords.y + yOffset },
      });
      setSelectedIndex(0);
    } else {
      setWikilinkCtx((prev) => ({ ...prev, open: false }));
    }
  }, [yOffset]);

  const handleWikilinkSelect = useCallback((note: Note) => {
    try {
      const replacement = `[[${note.title}#id:${note.id}]]`;
      const before = editContent.slice(0, wikilinkCtx.pos.from);
      const after = editContent.slice(wikilinkCtx.pos.to);
      const newContent = before + replacement + after;
      setEditContent(newContent);
      const api = cmRef.current;
      if (api) {
        // Place cursor just before closing brackets so Ctrl+Space can reopen popup
        const cursorInside = Math.max(wikilinkCtx.pos.from, wikilinkCtx.pos.from + replacement.length - 2);
        api.setSelection(cursorInside, cursorInside);
        api.focus();
      }
      setWikilinkCtx((prev) => ({ ...prev, open: false }));
    } catch {
      // noop
    }
  }, [editContent, setEditContent, cmRef, wikilinkCtx.pos]);

  const closeWikilinkPopup = useCallback(() => {
    setWikilinkCtx((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    containerRef,
    wikilinkCtx,
    relativePopupPos,
    onWikilinkContextChange,
    handleWikilinkSelect,
    closeWikilinkPopup,
    selectedIndex,
    setSelectedIndex,
  } as const;
}