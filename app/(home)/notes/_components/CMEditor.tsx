'use client';

import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { EditorState, Extension, Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from '@codemirror/commands';
import { markdown, markdownKeymap } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentWithTab } from '@codemirror/commands';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';

export interface CMEditorApi {
  focus: () => void;
  insertTextAtSelection: (text: string) => void;
  setDocText: (text: string) => void;
  wrapSelection: (prefix: string, suffix?: string) => void;
  toggleHeadingAtLine: (level: number) => void;
  undo: () => void;
  redo: () => void;
  getSelectionLine: () => number;
  getSelectionOffsets: () => { from: number; to: number };
  getDocLineCount: () => number;
  getLineText: (lineNumberZeroBased: number) => string;
  getDocText: () => string;
  getLineStartOffset: (lineNumberZeroBased: number) => number;
  setSelection: (anchor: number, head?: number) => void;
  scrollToLine: (lineNumberZeroBased: number, smooth?: boolean) => void;
  scrollDOM: HTMLElement | null;
  contentDOM: HTMLElement | null;
}

type CMEditorProps = {
  value: string;
  onChange: (next: string) => void;
  tabSize?: number;
  fontSize?: string;
  className?: string;
  onReady?: (api: CMEditorApi) => void;
  onPasteImage?: (file: File) => Promise<string | null>;
  onSelectionChange?: (line: number) => void;
  onCursorMove?: () => void;
};

const baseExtensions: Extension[] = [
  history(),
  // Keymap order matters; we will prepend our custom list keymap and markdownKeymap at state creation
  keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...completionKeymap]),
  autocompletion(),
  markdown(),
  oneDark,
  EditorView.lineWrapping
];

function createListKeymap(tabSize: number) {
  const indentSpaces = ' '.repeat(Math.max(1, tabSize));
  const listRegex = /^(\s*)(>[> ]*|[*+-]\s|(\d+)([.)]))/;
  return [
    {
      key: 'Tab',
      run: (view: EditorView) => {
        const { state } = view;
        const ranges = state.selection.ranges;
        const multiple = ranges.length > 1 || ranges.some(r => !r.empty);
        if (multiple) return indentMore(view);
        const pos = state.selection.main.head;
        const line = state.doc.lineAt(pos);
        const text = state.doc.sliceString(line.from, line.to);
        const match = listRegex.exec(text);
        if (match) {
          const currentIndentStr = match[1];
          const currentIndent = currentIndentStr.replace(/\t/g, ' '.repeat(tabSize)).length;
          const delta = tabSize;
          const insertPos = line.from + currentIndentStr.length;
          view.dispatch({ changes: { from: insertPos, to: insertPos, insert: ' '.repeat(delta) } });
          return true;
        }
        return indentMore(view);
      }
    },
    {
      key: 'Shift-Tab',
      run: (view: EditorView) => {
        const { state } = view;
        const ranges = state.selection.ranges;
        const multiple = ranges.length > 1 || ranges.some(r => !r.empty);
        if (multiple) return indentLess(view);
        const pos = state.selection.main.head;
        const line = state.doc.lineAt(pos);
        const text = state.doc.sliceString(line.from, line.to);
        // Remove one tab or up to tabSize spaces from start, but only within indentation
        let removeCount = 0;
        const leading = text.match(/^(\s*)/);
        const leadingStr = leading ? leading[1] : '';
        const currentIndent = leadingStr.replace(/\t/g, ' '.repeat(tabSize)).length;
        if (currentIndent > 0) {
          removeCount = Math.min(tabSize, currentIndent);
        }
        if (removeCount > 0) {
          view.dispatch({ changes: { from: line.from, to: line.from + removeCount } });
          return true;
        }
        return indentLess(view);
      }
    }
  ];
}

export const CMEditor = React.forwardRef<CMEditorApi | undefined, CMEditorProps>(function CMEditor(
  { value, onChange, tabSize = 2, fontSize = '16px', className, onReady, onPasteImage, onSelectionChange, onCursorMove },
  ref
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef<Compartment | null>(null);
  const tabCompartmentRef = useRef<Compartment | null>(null);

  // Memoize tab size and font size style
  const styleExt = useMemo(() => EditorView.theme({
    // Root .cm-editor element
    '&': {
      fontSize,
      height: '100%',
      backgroundColor: 'transparent'
    },
    '.cm-content': {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      backgroundColor: 'transparent'
    },
    // Ensure internal scroller can actually scroll within the fixed height
    '.cm-scroller': {
      overflow: 'auto',
      height: '100%',
      backgroundColor: 'transparent'
    },
    '.cm-gutters': {
      backgroundColor: 'transparent'
    }
  }), [fontSize]);

  const tabExt = useMemo(() => EditorState.tabSize.of(tabSize), [tabSize]);

  useEffect(() => {
    if (!hostRef.current) return;
    if (viewRef.current) return; // already initialized

    // Initialize compartments for dynamic reconfiguration
    themeCompartmentRef.current = new Compartment();
    tabCompartmentRef.current = new Compartment();

    const state = EditorState.create({
      doc: value,
      extensions: [
        // Ensure markdown Enter behavior and our list Tab handlers come first
        keymap.of(createListKeymap(tabSize)),
        keymap.of(markdownKeymap),
        ...baseExtensions,
        themeCompartmentRef.current.of(styleExt),
        tabCompartmentRef.current.of(tabExt),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
          if (update.selectionSet || update.focusChanged) {
            try {
              const line = update.state.doc.lineAt(update.state.selection.main.from).number - 1;
              onSelectionChange?.(line);
              onCursorMove?.();
            } catch { }
          }
        }),
      ]
    });

    const view = new EditorView({
      state,
      parent: hostRef.current
    });
    viewRef.current = view;

    // Paste image handler (optional)
    const contentDOM = (view as any).contentDOM as HTMLElement;
    const handlePaste = async (event: ClipboardEvent) => {
      if (!onPasteImage) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type.startsWith('image/')) {
          event.preventDefault();
          const file = it.getAsFile();
          if (!file) continue;
          try {
            const link = await onPasteImage(file);
            if (link) {
              view.dispatch({
                changes: { from: view.state.selection.main.from, to: view.state.selection.main.to, insert: `\n${link}\n` }
              });
            }
          } catch (_) { }
          break;
        }
      }
    };
    contentDOM.addEventListener('paste', handlePaste);

    // Expose API
    const api: CMEditorApi = {
      focus: () => view.focus(),
      insertTextAtSelection: (text: string) => {
        view.dispatch({ changes: { from: view.state.selection.main.from, to: view.state.selection.main.to, insert: text } });
        view.focus();
      },
      setDocText: (text: string) => {
        const current = view.state.doc.toString();
        view.dispatch({ changes: { from: 0, to: current.length, insert: text } });
        view.focus();
      },
      wrapSelection: (prefix: string, suffix: string = prefix) => {
        const sel = view.state.selection.main;
        const selected = view.state.doc.sliceString(sel.from, sel.to);
        const isWrapped = selected.startsWith(prefix) && selected.endsWith(suffix);
        const replacement = isWrapped ? selected.slice(prefix.length, selected.length - suffix.length) : `${prefix}${selected}${suffix}`;
        view.dispatch({ changes: { from: sel.from, to: sel.to, insert: replacement }, selection: { anchor: sel.from + (isWrapped ? 0 : prefix.length), head: sel.from + (isWrapped ? selected.length : selected.length + prefix.length) } });
        view.focus();
      },
      toggleHeadingAtLine: (level: number) => {
        const { state } = view;
        const line = state.doc.lineAt(state.selection.main.from);
        const heading = '#'.repeat(level) + ' ';
        const current = state.doc.sliceString(line.from, line.to);
        let newLine = '';
        if (current.startsWith(heading)) {
          newLine = current.slice(heading.length);
        } else if (/^#+\s+/.test(current)) {
          newLine = heading + current.replace(/^#+\s+/, '');
        } else {
          newLine = heading + current;
        }
        view.dispatch({ changes: { from: line.from, to: line.to, insert: newLine }, selection: { anchor: Math.min(line.from + newLine.length, state.doc.length) } });
        view.focus();
      },
      undo: () => { (EditorView as any).undo?.() || document.execCommand('undo'); },
      redo: () => { (EditorView as any).redo?.() || document.execCommand('redo'); },
      getSelectionLine: () => {
        const { state } = view;
        const line = state.doc.lineAt(state.selection.main.from);
        return line.number - 1; // zero-based like textarea
      },
      getSelectionOffsets: () => {
        const { state } = view;
        return { from: state.selection.main.from, to: state.selection.main.to };
      },
      getDocLineCount: () => view.state.doc.lines,
      getLineText: (lineNumberZeroBased: number) => {
        const { state } = view;
        // CM uses 1-based line numbering
        const ln = Math.max(1, Math.min(state.doc.lines, lineNumberZeroBased + 1));
        const line = state.doc.line(ln);
        return state.doc.sliceString(line.from, line.to);
      },
      getDocText: () => view.state.doc.toString(),
      getLineStartOffset: (lineNumberZeroBased: number) => {
        const { state } = view;
        const ln = Math.max(1, Math.min(state.doc.lines, lineNumberZeroBased + 1));
        const line = state.doc.line(ln);
        return line.from;
      },
      setSelection: (anchor: number, head?: number) => {
        const sel = { anchor, head: head ?? anchor } as any;
        view.dispatch({ selection: sel });
        view.focus();
      },
      scrollDOM: (view as any).scrollDOM as HTMLElement,
      contentDOM: (view as any).contentDOM as HTMLElement,
    };

    onReady?.(api);

    return () => {
      contentDOM.removeEventListener('paste', handlePaste);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep external value in sync when it changes from outside
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      // Preserve caret/selection by mapping old line/column to the new content
      const sel = view.state.selection.main;
      const currentDoc = view.state.doc;
      const anchorLine = currentDoc.lineAt(sel.anchor);
      const headLine = currentDoc.lineAt(sel.head);
      const anchorCol = sel.anchor - anchorLine.from;
      const headCol = sel.head - headLine.from;

      const lines = value.split('\n');
      const clampLineIndex = (lineNumberOneBased: number) => {
        return Math.max(1, Math.min(lines.length, lineNumberOneBased)) - 1; // zero-based index
      };
      const lineStartOffset = (zeroBasedLineIndex: number) => {
        if (zeroBasedLineIndex <= 0) return 0;
        let sum = 0;
        for (let i = 0; i < zeroBasedLineIndex; i++) sum += lines[i].length + 1;
        return sum;
      };
      const computeOffset = (lineNumberOneBased: number, col: number) => {
        const li = clampLineIndex(lineNumberOneBased);
        const lineText = lines[li] ?? '';
        const newCol = Math.max(0, Math.min(col, lineText.length));
        return lineStartOffset(li) + newCol;
      };

      const newAnchor = computeOffset(anchorLine.number, anchorCol);
      const newHead = computeOffset(headLine.number, headCol);

      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        selection: { anchor: newAnchor, head: newHead }
      });
    }
  }, [value]);

  // Reconfigure theme (font size) live when prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !themeCompartmentRef.current) return;
    view.dispatch({ effects: themeCompartmentRef.current.reconfigure(styleExt) });
  }, [styleExt]);

  // Reconfigure tab size live when prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !tabCompartmentRef.current) return;
    view.dispatch({ effects: tabCompartmentRef.current.reconfigure(tabExt) });
  }, [tabExt]);

  useImperativeHandle(ref, () => {
    const view = viewRef.current;
    if (!view) return undefined as any;
    return {
      focus: () => view.focus(),
      insertTextAtSelection: (text: string) => {
        view.dispatch({ changes: { from: view.state.selection.main.from, to: view.state.selection.main.to, insert: text } });
        view.focus();
      },
      setDocText: (text: string) => {
        const current = view.state.doc.toString();
        view.dispatch({ changes: { from: 0, to: current.length, insert: text } });
        view.focus();
      },
      wrapSelection: (prefix: string, suffix?: string) => {
        const sel = view.state.selection.main;
        const selected = view.state.doc.sliceString(sel.from, sel.to);
        const end = suffix ?? prefix;
        const isWrapped = selected.startsWith(prefix) && selected.endsWith(end);
        const replacement = isWrapped ? selected.slice(prefix.length, selected.length - end.length) : `${prefix}${selected}${end}`;
        view.dispatch({ changes: { from: sel.from, to: sel.to, insert: replacement }, selection: { anchor: sel.from + (isWrapped ? 0 : prefix.length), head: sel.from + (isWrapped ? selected.length : selected.length + prefix.length) } });
        view.focus();
      },
      toggleHeadingAtLine: (level: number) => {
        const { state } = view;
        const line = state.doc.lineAt(state.selection.main.from);
        const heading = '#'.repeat(level) + ' ';
        const current = state.doc.sliceString(line.from, line.to);
        let newLine = '';
        if (current.startsWith(heading)) {
          newLine = current.slice(heading.length);
        } else if (/^#+\s+/.test(current)) {
          newLine = heading + current.replace(/^#+\s+/, '');
        } else {
          newLine = heading + current;
        }
        view.dispatch({ changes: { from: line.from, to: line.to, insert: newLine }, selection: { anchor: Math.min(line.from + newLine.length, state.doc.length) } });
        view.focus();
      },
      undo: () => { (EditorView as any).undo?.() || document.execCommand('undo'); },
      redo: () => { (EditorView as any).redo?.() || document.execCommand('redo'); },
      getSelectionLine: () => {
        const { state } = view;
        const line = state.doc.lineAt(state.selection.main.from);
        return line.number - 1;
      },
      getSelectionOffsets: () => {
        const { state } = view;
        return { from: state.selection.main.from, to: state.selection.main.to };
      },
      getDocLineCount: () => view.state.doc.lines,
      getLineText: (lineNumberZeroBased: number) => {
        const { state } = view;
        const ln = Math.max(1, Math.min(state.doc.lines, lineNumberZeroBased + 1));
        const line = state.doc.line(ln);
        return state.doc.sliceString(line.from, line.to);
      },
      getDocText: () => view.state.doc.toString(),
      getLineStartOffset: (lineNumberZeroBased: number) => {
        const { state } = view;
        const ln = Math.max(1, Math.min(state.doc.lines, lineNumberZeroBased + 1));
        const line = state.doc.line(ln);
        return line.from;
      },
      setSelection: (anchor: number, head?: number) => {
        const sel = { anchor, head: head ?? anchor } as any;
        view.dispatch({ selection: sel });
        view.focus();
      },
      scrollDOM: (view as any).scrollDOM as HTMLElement,
      contentDOM: (view as any).contentDOM as HTMLElement,
      scrollToLine: (lineNumberZeroBased: number, smooth: boolean = false) => {
        const lineNumOneBased = Math.max(1, (lineNumberZeroBased | 0) + 1);
        const line = view.state.doc.line(lineNumOneBased);
        view.dispatch({
          effects: EditorView.scrollIntoView(line.from, { y: 'start' })
        });
        if (smooth) {
          const scroller = (view as any).scrollDOM as HTMLElement;
          scroller?.scrollTo({ top: scroller.scrollTop, behavior: 'smooth' });
        }
      },

    } as CMEditorApi;
  });

  const combinedClass = [className, 'raw-content'].filter(Boolean).join(' ');
  return <div ref={hostRef} className={combinedClass} style={{ height: '100%' }} />;
});

export default CMEditor;
