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

const extractWikilinks = (content: string): string[] => {
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  const uniqueTitles = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = wikilinkRegex.exec(content)) !== null) {
    const linkText = match[1].trim();
    if (linkText) {
      uniqueTitles.add(linkText.toLowerCase());
    }
  }

  return Array.from(uniqueTitles);
};

export function getNoteGraph(notes: Note[], selectedId?: string): { nodes: GraphNode[]; links: GraphLink[] } {
  const titleToId = new Map<string, string>();
  for (const note of notes) {
    titleToId.set((note.title || "").toLowerCase(), note.id);
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
    for (const linkTitle of outgoing) {
      const targetId = titleToId.get(linkTitle);
      if (targetId && targetId !== note.id) {
        links.push({ source: note.id, target: targetId });
      }
    }
  }

  return { nodes, links };
}
