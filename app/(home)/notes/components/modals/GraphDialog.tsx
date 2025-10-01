'use client';

import dynamic from "next/dynamic";
import { useMemo, useRef, useEffect } from "react";
import type { Note } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getNoteGraph } from "../../utils/core/noteGraph";

const ForceGraph2D: any = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);

export default function GraphDialog({
  isOpen,
  onClose,
  notes,
  selectedNoteId,
  onSelectNote,
  title = "Knowledge Graph",
}: {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  selectedNoteId?: string;
  onSelectNote: (noteId: string) => void;
  title?: string;
}) {
  const data = useMemo(() => getNoteGraph(notes, selectedNoteId), [notes, selectedNoteId]);
  const ref = useRef<any>(null);
  const hasInitialZoom = useRef(false);

  // Only zoom to fit once when the dialog opens and graph is ready
  useEffect(() => {
    if (isOpen && ref.current && !hasInitialZoom.current) {
      const timer = setTimeout(() => {
        if (ref.current?.zoomToFit) {
          ref.current.zoomToFit(400, 50);
          hasInitialZoom.current = true;
        }
      }, 1000); // Wait for the graph to stabilize
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset zoom flag when dialog closes
  useEffect(() => {
    if (!isOpen) {
      hasInitialZoom.current = false;
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] !max-w-7xl w-full bg-secondary border-gray-700 [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-white">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="w-full h-[70vh] rounded-lg overflow-hidden">
          <ForceGraph2D
            ref={ref}
            graphData={data as any}
            nodeId="id"
            linkSource="source"
            linkTarget="target"
            cooldownTicks={100}
            linkWidth={2}
            linkColor="#64748b"
            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            nodeLabel={(n: any) => n.title}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
              const radius = node.isSelected ? 8 : 6;
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.isSelected ? '#60a5fa' : '#94a3b8';
              ctx.fill();

              // Add border for selected nodes
              if (node.isSelected) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.stroke();
              }

              const label: string = node.title || '';
              ctx.font = `${Math.max(10, 12 / scale)}px sans-serif`;
              ctx.fillStyle = '#e5e7eb';
              ctx.fillText(label, node.x + radius + 2, node.y + radius + 2);
            }}
            linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, scale: number) => {
              const source = link.source;
              const target = link.target;

              // Draw thicker, more visible links
              ctx.strokeStyle = '#64748b';
              ctx.lineWidth = Math.max(1, 2 / scale);
              ctx.beginPath();
              ctx.moveTo(source.x, source.y);
              ctx.lineTo(target.x, target.y);
              ctx.stroke();
            }}
            linkDirectionalArrowLength={0}
            linkDirectionalArrowRelPos={1}
            onNodeClick={(node: any) => onSelectNote(node.id)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}


