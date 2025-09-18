import { Note } from '../components/types';

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
  const targetTitle = targetNote.title;
  
  // Create a single case-insensitive pattern to avoid duplicates
  const wikilinkPattern = new RegExp(`\\[\\[${escapeRegExp(targetTitle)}\\]\\]`, 'gi');
  
  allNotes.forEach(note => {
    if (note.id === targetNote.id) return; // Skip self-references
    
    const occurrences: Array<{ line: number; context: string; position: number }> = [];
    const lines = note.content.split('\n');
    
    lines.forEach((line, lineIndex) => {
      wikilinkPattern.lastIndex = 0; // Reset regex state
      let match: RegExpExecArray | null;
      while ((match = wikilinkPattern.exec(line)) !== null) {
        // Extract context around the match (up to 100 characters before and after)
        const start = Math.max(0, match.index - 50);
        const end = Math.min(line.length, match.index + match[0].length + 50);
        const context = line.slice(start, end);
        
        // Check if this exact occurrence already exists (avoid duplicates)
        const isDuplicate = occurrences.some(existing => 
          existing.line === lineIndex + 1 && 
          existing.position === match!.index
        );
        
        if (!isDuplicate) {
          occurrences.push({
            line: lineIndex + 1,
            context: context.trim(),
            position: match.index
          });
        }
        
        // Prevent infinite loop with global regex
        if (wikilinkPattern.lastIndex === match.index) {
          wikilinkPattern.lastIndex++;
        }
      }
    });
    
    if (occurrences.length > 0) {
      backlinks.push({
        note,
        occurrences
      });
    }
  });
  
  return backlinks;
};

/**
 * Extract all wikilinks from a note's content
 */
export const extractWikilinks = (content: string): string[] => {
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  
  while ((match = wikilinkRegex.exec(content)) !== null) {
    const linkText = match[1].trim();
    if (linkText && !links.includes(linkText)) {
      links.push(linkText);
    }
  }
  
  return links;
};

/**
 * Find all notes that the given note links to
 */
export const findOutgoingLinks = (sourceNote: Note, allNotes: Note[]): Note[] => {
  const wikilinks = extractWikilinks(sourceNote.content);
  const linkedNotes: Note[] = [];
  
  wikilinks.forEach(linkText => {
    const targetNote = allNotes.find(note => 
      note.title.toLowerCase() === linkText.toLowerCase()
    );
    if (targetNote) {
      linkedNotes.push(targetNote);
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
