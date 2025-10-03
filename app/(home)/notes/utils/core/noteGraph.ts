import type { Note } from "../../components/types";

export type GraphNode = {
  id: string;
  title: string;
  path?: string;
  isSelected?: boolean;
};

export type GraphLink = {
  source: string;
  target: string;
};

const extractWikilinks = (content: string): { title: string; id?: string }[] => {
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  const unique = new Map<string, { title: string; id?: string }>();
  let match: RegExpExecArray | null;

  while ((match = wikilinkRegex.exec(content)) !== null) {
    const inner = (match[1] || '').trim();
    if (!inner) continue;
    const idMatch = inner.match(/#id:([A-Za-z0-9_-]+)/i);
    const titleOnly = inner.replace(/#id:[A-Za-z0-9_-]+/i, '').trim();
    const key = (titleOnly + '|' + (idMatch?.[1] || '')).toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, { title: titleOnly, id: idMatch?.[1] });
    }
  }

  return Array.from(unique.values());
};

export function getNoteGraph(notes: Note[], selectedId?: string): { nodes: GraphNode[]; links: GraphLink[] } {
  const titleToIds = new Map<string, string[]>();
  for (const note of notes) {
    const key = (note.title || "").toLowerCase();
    const arr = titleToIds.get(key) || [];
    arr.push(note.id);
    titleToIds.set(key, arr);
  }

  const nodes: GraphNode[] = notes.map(note => ({
    id: note.id,
    title: note.title,
    path: note.path,
    isSelected: note.id === selectedId,
  }));

  const links: GraphLink[] = [];
  for (const note of notes) {
    const outgoing = extractWikilinks(note.content || "");
    for (const entry of outgoing) {
      if (entry.id) {
        if (entry.id !== note.id && notes.some(n => n.id === entry.id)) {
          links.push({ source: note.id, target: entry.id });
        }
        continue;
      }
      const candidates = titleToIds.get((entry.title || '').toLowerCase()) || [];
      if (candidates.length === 1) {
        const targetId = candidates[0];
        if (targetId && targetId !== note.id) {
          links.push({ source: note.id, target: targetId });
        }
      }
      // If ambiguous (>=2), skip until ID is specified to avoid random linking
    }
  }

  return { nodes, links };
}
