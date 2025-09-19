import type { CMEditorApi } from '../components/editor/CMEditor';

export const tableOperations = {
  /**
   * Insert a new table row above or below the current row.
   * - Preserves header and delimiter rows (inserts into body only)
   * - Uses the delimiter/header column count to build a blank row
   */
  insertRow: (api: CMEditorApi, direction: 'above' | 'below') => {
    const currentLine = api.getSelectionLine();
    const totalLines = api.getDocLineCount();
    const getLine = (ln: number) => api.getLineText(ln) || '';
    const lines: string[] = [];
    for (let i = 0; i < totalLines; i++) lines.push(getLine(i));

    // Find table boundaries (contiguous lines that include '|')
    let tableStart = currentLine;
    let tableEnd = currentLine;
    while (tableStart > 0 && lines[tableStart].includes('|')) tableStart--;
    if (!lines[tableStart].includes('|')) tableStart++;
    while (tableEnd < lines.length - 1 && lines[tableEnd].includes('|')) tableEnd++;
    if (!lines[tableEnd].includes('|')) tableEnd--;

    if (tableStart >= tableEnd) return;

    // Validate separator (delimiter) line at tableStart + 1 when possible
    const delimiterIndex = tableStart + 1;
    const delimiter = lines[delimiterIndex] || '';
  const isDelimiter = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(delimiter);
    if (!isDelimiter) return; // Not a valid markdown table block

    // Determine the insertion target within the body (after delimiter)
    const bodyStart = delimiterIndex + 1;
    if (bodyStart > tableEnd) {
      // Table has no body rows yet; we'll insert the first body row
    }
    let target = currentLine;
    if (currentLine <= delimiterIndex) {
      // If cursor in header or delimiter, insert at start of body
      target = bodyStart;
    }
    if (direction === 'below') target = Math.max(target, bodyStart) + 1;
    else target = Math.max(target, bodyStart);
    // Clamp within table block (can insert after last body row)
    target = Math.min(Math.max(bodyStart, target), tableEnd + 1);

    // Decide column count based on delimiter (preferred) or header
    const headerParts = (lines[tableStart] || '').split('|');
    const delimiterParts = (lines[delimiterIndex] || '').split('|');
    const colCount = Math.max(headerParts.length, delimiterParts.length);

    // Preserve leading/trailing empty segments pattern from header if present
    const leading = headerParts[0] === '' || delimiterParts[0] === '' ? '' : ' ';
    const trailing = headerParts[colCount - 1] === '' || delimiterParts[colCount - 1] === '' ? '' : ' ';
    const newParts = new Array(colCount).fill(' ');
    newParts[0] = leading;
    newParts[colCount - 1] = trailing;
    const newRow = newParts.join('|');

    lines.splice(target, 0, newRow);

    // Restore caret to same visual column in the new row if inserting
    const { from: cursorPos } = api.getSelectionOffsets();
    const lineStart = api.getLineStartOffset(currentLine);
    const relativePos = Math.max(0, cursorPos - lineStart);

    const newDoc = lines.join('\n');
    // Selection goes to start of inserted row + previous relative column
    const newLineStart = newDoc.split('\n').slice(0, target).join('\n').length + (target > 0 ? 1 : 0);
    api.setDocText(newDoc);
    api.setSelection(newLineStart + relativePos);
  },

  /**
   * Delete the current body row.
   * - Never deletes header or delimiter rows.
   * - If cursor is on header/delimiter, deletes the first body row.
   */
  deleteRow: (api: CMEditorApi) => {
    const currentLine = api.getSelectionLine();
    const totalLines = api.getDocLineCount();
    const getLine = (ln: number) => api.getLineText(ln) || '';
    const lines: string[] = [];
    for (let i = 0; i < totalLines; i++) lines.push(getLine(i));

    // Find table boundaries (contiguous lines that include '|')
    let tableStart = currentLine;
    let tableEnd = currentLine;
    while (tableStart > 0 && lines[tableStart].includes('|')) tableStart--;
    if (!lines[tableStart].includes('|')) tableStart++;
    while (tableEnd < lines.length - 1 && lines[tableEnd].includes('|')) tableEnd++;
    if (!lines[tableEnd].includes('|')) tableEnd--;

    if (tableStart >= tableEnd) return;

    // Validate separator line
    const delimiterIndex = tableStart + 1;
    const delimiter = lines[delimiterIndex] || '';
  const isDelimiter = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(delimiter);
    if (!isDelimiter) return;

    const bodyStart = delimiterIndex + 1;
    if (bodyStart > tableEnd) return; // no body rows to delete

    // Choose row to delete: current if in body; else first body row
    const deleteIndex = currentLine >= bodyStart ? currentLine : bodyStart;

    lines.splice(deleteIndex, 1);

    const newDoc = lines.join('\n');
    // Place caret on the same line number (or previous if at EOF of block)
    const newLine = Math.min(deleteIndex, newDoc.split('\n').length - 1);
    const newLineStart = newDoc.split('\n').slice(0, newLine).join('\n').length + (newLine > 0 ? 1 : 0);
    api.setDocText(newDoc);
    api.setSelection(newLineStart);
  },
  insertColumn: (api: CMEditorApi, direction: 'left' | 'right') => {
    const currentLine = api.getSelectionLine();
    const totalLines = api.getDocLineCount();
    const getLine = (ln: number) => api.getLineText(ln) || '';
    const lines: string[] = [];
    for (let i = 0; i < totalLines; i++) lines.push(getLine(i));
    
    // Find table boundaries
    let tableStart = currentLine;
    let tableEnd = currentLine;
    
    while (tableStart > 0 && lines[tableStart].includes('|')) {
      tableStart--;
    }
    if (!lines[tableStart].includes('|')) tableStart++;
    
    while (tableEnd < lines.length - 1 && lines[tableEnd].includes('|')) {
      tableEnd++;
    }
    if (!lines[tableEnd].includes('|')) tableEnd--;
    
    // Find current column position
    const currentLineText = lines[currentLine];
    const { from: cursorPos } = api.getSelectionOffsets();
    const lineStart = api.getLineStartOffset(currentLine);
    const relativePos = Math.max(0, cursorPos - lineStart);
    
    // Find column index by counting pipes before the caret position
    let columnIndex = 0;
    for (let i = 0; i < currentLineText.length; i++) {
      if (currentLineText[i] === '|') {
        if (i >= relativePos) break;
        columnIndex++;
      }
    }
    
    // Insert column in all table rows
    const delimiterIndex = tableStart + 1;
    for (let i = tableStart; i <= tableEnd; i++) {
      if (!lines[i].includes('|')) continue;
      const parts = lines[i].split('|');

      // Determine insertion slot within data cells [1 .. parts.length - 2]
      let insertIndex = direction === 'left' ? columnIndex : columnIndex + 1;
      insertIndex = Math.max(1, Math.min(insertIndex, parts.length - 1));

      // For the delimiter line, insert a default separator segment
      if (i === delimiterIndex) {
        parts.splice(insertIndex, 0, '---');
      } else {
        // For header/body, insert a blank cell
        parts.splice(insertIndex, 0, ' ');
      }
      lines[i] = parts.join('|');
    }
    
    // Update entire document and restore caret to same logical column
    const newDoc = lines.join('\n');
    const newLineStart = newDoc.split('\n').slice(0, currentLine).join('\n').length + (currentLine > 0 ? 1 : 0);
    api.setDocText(newDoc);
    api.setSelection(newLineStart + relativePos);
  },

  deleteColumn: (api: CMEditorApi) => {
    const currentLine = api.getSelectionLine();
    const totalLines = api.getDocLineCount();
    const getLine = (ln: number) => api.getLineText(ln) || '';
    const lines: string[] = [];
    for (let i = 0; i < totalLines; i++) lines.push(getLine(i));
    
    // Find table boundaries
    let tableStart = currentLine;
    let tableEnd = currentLine;
    
    while (tableStart > 0 && lines[tableStart].includes('|')) {
      tableStart--;
    }
    if (!lines[tableStart].includes('|')) tableStart++;
    
    while (tableEnd < lines.length - 1 && lines[tableEnd].includes('|')) {
      tableEnd++;
    }
    if (!lines[tableEnd].includes('|')) tableEnd--;
    
    // Determine logical content column under the caret, independent of boundary pipes
    const currentLineText = lines[currentLine];
    const { from: cursorPos } = api.getSelectionOffsets();
    const lineStart = api.getLineStartOffset(currentLine);
    const relativePos = Math.max(0, cursorPos - lineStart);

    const getSegmentIndexAtPos = (text: string, pos: number) => {
      // Build positions of all pipes
      const pipes: number[] = [];
      for (let i = 0; i < text.length; i++) if (text[i] === '|') pipes.push(i);
      // If caret sits exactly on a pipe, treat it as selecting the cell to the right
      const onPipe = pipes.includes(pos);
      // There are pipes.length + 1 segments
      // Segment 0: [0, pipes[0]-1]
      // Segment k (1..pipes.length-1): [pipes[k-1]+1, pipes[k]-1]
      // Last segment: [pipes[last]+1, text.length-1]
      if (pipes.length === 0) return 0;
      if (pos < pipes[0]) return 0;
      for (let k = 0; k < pipes.length - 1; k++) {
        const start = pipes[k] + 1;
        const end = pipes[k + 1] - 1;
        if (pos >= start && pos <= end) return k + 1;
      }
      if (pos > pipes[pipes.length - 1] || onPipe) return pipes.length; // last segment or on pipe → right side
      return pipes.length - 1; // fallback
    };

    const getContentRange = (line: string) => {
      const parts = line.split('|');
      const hasLeading = /^\s*\|/.test(line);
      const hasTrailing = /\|\s*$/.test(line);
      const start = hasLeading ? 1 : 0;
      const endExclusive = parts.length - (hasTrailing ? 1 : 0);
      return { parts, start, endExclusive };
    };

    // Use delimiter (preferred) or header to establish total content columns in the table
    const delimiterIndex = tableStart + 1;
    const { start: dStart, endExclusive: dEnd } = getContentRange(lines[delimiterIndex] || '');
    const { start: hStart, endExclusive: hEnd } = getContentRange(lines[tableStart] || '');
    const tableContentCols = Math.max(dEnd - dStart, hEnd - hStart);
    if (tableContentCols <= 1) return;

    // Compute the content column index under caret for the current line
  const { start: curStart, endExclusive: curEnd } = getContentRange(currentLineText);
  const segIndex = getSegmentIndexAtPos(currentLineText, relativePos);
  const curContentCols = Math.max(0, curEnd - curStart);
  let targetContentIdx = Math.max(0, Math.min(segIndex - curStart, Math.max(0, curContentCols - 1)));

    // Delete that logical content column across all table rows robustly by reconstructing the line
    for (let i = tableStart; i <= tableEnd; i++) {
      const line = lines[i];
      if (!line.includes('|')) continue;
      const parts = line.split('|');
      const hasLeading = /^\s*\|/.test(line);
      const hasTrailing = /\|\s*$/.test(line);
      const start = hasLeading ? 1 : 0;
      const endExclusive = parts.length - (hasTrailing ? 1 : 0);
      let contents = parts.slice(start, endExclusive);

      // Normalize row width using tableContentCols from header/delimiter
      if (contents.length < tableContentCols) {
        contents = contents.concat(new Array(tableContentCols - contents.length).fill(''));
      }
      const idx = Math.max(0, Math.min(targetContentIdx, contents.length - 1));
      contents.splice(idx, 1);

      // Rebuild line with original boundaries
      const rebuilt = (hasLeading ? '|' : '') + contents.join('|') + (hasTrailing ? '|' : '');
      lines[i] = rebuilt;
    }
    
    const newDoc = lines.join('\n');
    const newLineStart = newDoc.split('\n').slice(0, currentLine).join('\n').length + (currentLine > 0 ? 1 : 0);
  api.setDocText(newDoc);
  // Keep caret near the same visual position; nudge left by one char at most
  api.setSelection(newLineStart + Math.max(0, relativePos - 1));
  },

  moveColumn: (api: CMEditorApi, direction: 'left' | 'right') => {
    const currentLine = api.getSelectionLine();
    const totalLines = api.getDocLineCount();
    const getLine = (ln: number) => api.getLineText(ln) || '';
    const lines: string[] = [];
    for (let i = 0; i < totalLines; i++) lines.push(getLine(i));
    
    // Find table boundaries
    let tableStart = currentLine;
    let tableEnd = currentLine;
    
    while (tableStart > 0 && lines[tableStart].includes('|')) {
      tableStart--;
    }
    if (!lines[tableStart].includes('|')) tableStart++;
    
    while (tableEnd < lines.length - 1 && lines[tableEnd].includes('|')) {
      tableEnd++;
    }
    if (!lines[tableEnd].includes('|')) tableEnd--;
    
    // Find current column position
    const currentLineText = lines[currentLine];
    const { from: cursorPos } = api.getSelectionOffsets();
    const lineStart = api.getLineStartOffset(currentLine);
    const relativePos = Math.max(0, cursorPos - lineStart);
    
    // Find column index (count pipes before caret)
    let columnIndex = 0;
    for (let i = 0; i < currentLineText.length; i++) {
      if (currentLineText[i] === '|') {
        if (i >= relativePos) break;
        columnIndex++;
      }
    }
    
    // Check if move is possible
    const headerParts = lines[tableStart].split('|');
    if (direction === 'left' && columnIndex <= 1) return;
    if (direction === 'right' && columnIndex >= headerParts.length - 1) return;
    
    // Move column in all table rows
    for (let i = tableStart; i <= tableEnd; i++) {
      if (lines[i].includes('|')) {
        const parts = lines[i].split('|');
        if (direction === 'left' && columnIndex > 1 && columnIndex < parts.length) {
          const temp = parts[columnIndex];
          parts[columnIndex] = parts[columnIndex - 1];
          parts[columnIndex - 1] = temp;
        } else if (direction === 'right' && columnIndex > 0 && columnIndex < parts.length - 1) {
          const temp = parts[columnIndex];
          parts[columnIndex] = parts[columnIndex + 1];
          parts[columnIndex + 1] = temp;
        }
        lines[i] = parts.join('|');
      }
    }
    
    const newDoc = lines.join('\n');
    const newLineStart = newDoc.split('\n').slice(0, currentLine).join('\n').length + (currentLine > 0 ? 1 : 0);
    api.setDocText(newDoc);
    api.setSelection(newLineStart + relativePos);
  },

  alignColumn: (api: CMEditorApi, alignment: 'left' | 'center' | 'right' | 'none') => {
    const currentLine = api.getSelectionLine();
    const totalLines = api.getDocLineCount();
    const getLine = (ln: number) => api.getLineText(ln) || '';
    const lines: string[] = [];
    for (let i = 0; i < totalLines; i++) lines.push(getLine(i));

    // Find table boundaries
    let tableStart = currentLine;
    let tableEnd = currentLine;
    while (tableStart > 0 && lines[tableStart].includes('|')) tableStart--;
    if (!lines[tableStart].includes('|')) tableStart++;
    while (tableEnd < lines.length - 1 && lines[tableEnd].includes('|')) tableEnd++;
    if (!lines[tableEnd].includes('|')) tableEnd--;

    // Determine caret position relative to the current line
    const currentLineText = lines[currentLine];
    const { from: cursorPos } = api.getSelectionOffsets();
    const lineStart = api.getLineStartOffset(currentLine);
    const relativePos = Math.max(0, cursorPos - lineStart);

    // Utilities to map caret to content column and to rebuild lines
    const getSegmentIndexAtPos = (text: string, pos: number) => {
      const pipes: number[] = [];
      for (let i = 0; i < text.length; i++) if (text[i] === '|') pipes.push(i);
      const onPipe = pipes.includes(pos);
      if (pipes.length === 0) return 0;
      if (pos < pipes[0]) return 0;
      for (let k = 0; k < pipes.length - 1; k++) {
        const start = pipes[k] + 1;
        const end = pipes[k + 1] - 1;
        if (pos >= start && pos <= end) return k + 1;
      }
      if (pos > pipes[pipes.length - 1] || onPipe) return pipes.length;
      return pipes.length - 1;
    };

    const getContentRange = (line: string) => {
      const parts = line.split('|');
      const hasLeading = /^\s*\|/.test(line);
      const hasTrailing = /\|\s*$/.test(line);
      const start = hasLeading ? 1 : 0;
      const endExclusive = parts.length - (hasTrailing ? 1 : 0);
      return { parts, start, endExclusive, hasLeading, hasTrailing };
    };

    // Apply alignment to the delimiter (separator) line directly
    const separatorLineIndex = tableStart + 1;
    if (separatorLineIndex <= tableEnd) {
      const sepLine = lines[separatorLineIndex] || '';
      if (sepLine.includes('|')) {
        const { parts, start, endExclusive, hasLeading, hasTrailing } = getContentRange(sepLine);
        const contents = parts.slice(start, endExclusive);
        if (contents.length > 0) {
          // Map caret position to content column index in the current line
          const segIndex = getSegmentIndexAtPos(currentLineText, relativePos);
          const curLineRange = getContentRange(currentLineText);
          const curStart = curLineRange.start;
          const targetIdx = Math.max(0, Math.min(segIndex - curStart, contents.length - 1));

          // Build alignment token
          let token = '---';
          switch (alignment) {
            case 'left': token = ':---'; break;
            case 'center': token = ':---:'; break;
            case 'right': token = '---:'; break;
            case 'none': token = '---'; break;
          }

          contents[targetIdx] = token;
          const rebuilt = (hasLeading ? '|' : '') + contents.join('|') + (hasTrailing ? '|' : '');
          lines[separatorLineIndex] = rebuilt;
        }
      }
    }

    const newDoc = lines.join('\n');
    const newLineStart = newDoc.split('\n').slice(0, currentLine).join('\n').length + (currentLine > 0 ? 1 : 0);
    api.setDocText(newDoc);
    api.setSelection(newLineStart + relativePos);
  }
};
