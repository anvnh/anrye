import { Note } from '../../components/types';

export interface BacklinkInfo {
  note: Note;
  occurrences: Array<{
    line: number;
    context: string;
    position: number;
  }>;
}

/**
 * Find all notes that contain wikilinks referencing the given note
 */
export const findBacklinks = (targetNote: Note, allNotes: Note[]): BacklinkInfo[] => {
  const backlinks: BacklinkInfo[] = [];
  const targetId = targetNote.id;
  const targetTitleLower = (targetNote.title || '').toLowerCase();

  allNotes.forEach((note) => {
    if (note.id === targetNote.id) return; // Skip self-references

    const occurrences: Array<{ line: number; context: string; position: number }> = [];
    const lines = (note.content || '').split('\n');

    lines.forEach((line, lineIndex) => {
      const linkRegex = /\[\[([^\]]+)\]\]/g;
      let match: RegExpExecArray | null;
      while ((match = linkRegex.exec(line)) !== null) {
        const inner = (match[1] || '').trim();
        if (!inner) continue;

        const idMatch = inner.match(/#id:([A-Za-z0-9_-]+)/i);
        const titleOnly = inner.replace(/#id:[A-Za-z0-9_-]+/i, '').trim();

        const isTarget = idMatch
          ? idMatch[1] === targetId
          : titleOnly.toLowerCase() === targetTitleLower;

        if (!isTarget) continue;

        // Extract context around the match (up to 100 characters before and after)
        const start = Math.max(0, match.index - 50);
        const end = Math.min(line.length, match.index + match[0].length + 50);
        const context = line.slice(start, end);

        const isDuplicate = occurrences.some(
          (existing) => existing.line === lineIndex + 1 && existing.position === match!.index
        );
        if (!isDuplicate) {
          occurrences.push({ line: lineIndex + 1, context: context.trim(), position: match.index });
        }
      }
    });

    if (occurrences.length > 0) {
      backlinks.push({ note, occurrences });
    }
  });

  return backlinks;
};

/**
 * Extract all wikilinks from a note's content
 */
// Extract wikilinks, supporting optional #id: suffix. Returns array of { title, id? } encoded as "title#id:<id>" when id present.
export const extractWikilinks = (content: string): string[] => {
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = wikilinkRegex.exec(content)) !== null) {
    const inner = (match[1] || '').trim();
    if (!inner) continue;
    const idMatch = inner.match(/#id:([A-Za-z0-9_-]+)/i);
    const titleOnly = inner.replace(/#id:[A-Za-z0-9_-]+/i, '').trim();
    const encoded = idMatch ? `${titleOnly}#id:${idMatch[1]}` : titleOnly;
    if (!links.includes(encoded)) links.push(encoded);
  }

  return links;
};

/**
 * Find all notes that the given note links to
 */
export const findOutgoingLinks = (sourceNote: Note, allNotes: Note[]): Note[] => {
  const wikilinks = extractWikilinks(sourceNote.content);
  const linkedNotes: Note[] = [];

  wikilinks.forEach(link => {
    const idSuffix = link.match(/#id:([A-Za-z0-9_-]+)/i);
    const titleOnly = link.replace(/#id:[A-Za-z0-9_-]+/i, '').trim();
    let target: Note | undefined;

    if (idSuffix) {
      target = allNotes.find(n => n.id === idSuffix[1]);
    } else {
      const sameTitle = allNotes.filter(n => (n.title || '').toLowerCase() === titleOnly.toLowerCase());
      if (sameTitle.length === 1) target = sameTitle[0];
      // If ambiguous by title, do not assume; leave unresolved until ID is added
    }

    if (target && !linkedNotes.some(n => n.id === target!.id)) {
      linkedNotes.push(target);
    }
  });

  return linkedNotes;
};

/**
 * Get a graph of all note connections
 */
export const getNoteGraph = (allNotes: Note[]) => {
  const nodes = allNotes.map(note => ({
    id: note.id,
    title: note.title,
    path: note.path
  }));
  
  const edges: Array<{ source: string; target: string; type: 'wikilink' }> = [];
  
  allNotes.forEach(sourceNote => {
    const outgoingLinks = findOutgoingLinks(sourceNote, allNotes);
    outgoingLinks.forEach(targetNote => {
      edges.push({
        source: sourceNote.id,
        target: targetNote.id,
        type: 'wikilink'
      });
    });
  });
  
  return { nodes, edges };
};

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Suggest note titles for autocomplete while typing [[
 */
export const suggestNoteLinks = (
  query: string, 
  allNotes: Note[], 
  maxSuggestions: number = 10
): Note[] => {
  if (!query.trim()) return allNotes.slice(0, maxSuggestions);
  
  const lowerQuery = query.toLowerCase();
  
  // Sort by relevance: exact match first, then starts with, then contains
  const scored = allNotes.map(note => {
    const title = note.title.toLowerCase();
    let score = 0;
    
    if (title === lowerQuery) score = 1000;
    else if (title.startsWith(lowerQuery)) score = 100;
    else if (title.includes(lowerQuery)) score = 10;
    else return null;
    
    return { note, score };
  }).filter(Boolean) as Array<{ note: Note; score: number }>;
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .map(item => item.note);
};
