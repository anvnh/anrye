"use client";

import { useDragLayer } from "react-dnd";

import type { IEvent } from "../../interfaces";
import { useCalendar } from "../../contexts/calendar-context";

interface IDragItem {
  event: IEvent;
  children: React.ReactNode;
  width: number;
  height: number;
}

function getPreviewClasses(color: IEvent["color"], badgeVariant: any) {
  const dotMode = badgeVariant === "dot" || badgeVariant === "mixed";
  const base = "flex select-none flex-col gap-0.5 truncate whitespace-nowrap rounded-md border px-2 py-1.5 text-xs";
  const map: Record<string, string> = dotMode
    ? {
        blue: "bg-neutral-50 dark:bg-neutral-900",
        green: "bg-neutral-50 dark:bg-neutral-900",
        red: "bg-neutral-50 dark:bg-neutral-900",
        yellow: "bg-neutral-50 dark:bg-neutral-900",
        purple: "bg-neutral-50 dark:bg-neutral-900",
        orange: "bg-neutral-50 dark:bg-neutral-900",
        gray: "bg-neutral-50 dark:bg-neutral-900",
      }
    : {
        blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
        green: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
        red: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
        yellow: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
        purple: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
        orange: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
        gray: "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
      };
  return `${base} ${map[color] || map.blue}`;
}

export function CustomDragLayer() {
  const { badgeVariant } = useCalendar();
  const { isDragging, item, currentOffset, initialOffset, initialClientOffset } = useDragLayer(monitor => ({
    item: monitor.getItem() as IDragItem | null,
    itemType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getClientOffset(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    initialClientOffset: monitor.getInitialClientOffset(),
  }));

  if (!isDragging || !item || !currentOffset || !initialOffset || !initialClientOffset) {
    return null;
  }

  const offsetX = initialClientOffset.x - initialOffset.x;
  const offsetY = initialClientOffset.y - initialOffset.y;

  const layerStyles: React.CSSProperties = {
    position: "fixed",
    pointerEvents: "none",
    zIndex: 100,
    left: currentOffset.x - offsetX,
    top: currentOffset.y - offsetY,
  };

  const previewClasses = getPreviewClasses(item.event.color, badgeVariant);

  return (
    <div style={layerStyles}>
      <div
        className={previewClasses}
        style={{ width: item.width, height: item.height }}
      >
        <div className="flex items-center gap-1.5 truncate">
          <p className="truncate font-semibold">{item.event.title}</p>
        </div>
      </div>
    </div>
  );
}
