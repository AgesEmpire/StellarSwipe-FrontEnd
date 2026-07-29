"use client";

import { GripVertical } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DragDropListProps<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, props: { dragging: boolean }) => React.ReactNode;
}

export function DragDropList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: DragDropListProps<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent, id: string) => {
      setDraggingId(id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      dragOverId.current = id;
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === targetId) return;

      const sourceIdx = items.findIndex((i) => i.id === sourceId);
      const targetIdx = items.findIndex((i) => i.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return;

      const next = [...items];
      const [moved] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, moved);
      onReorder(next);
      setDraggingId(null);
    },
    [items, onReorder]
  );

  const handleDragEnd = useCallback(() => setDraggingId(null), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      const next = [...items];
      if (e.key === "ArrowUp" && idx > 0) {
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        onReorder(next);
      } else if (e.key === "ArrowDown" && idx < items.length - 1) {
        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
        onReorder(next);
      }
    },
    [items, onReorder]
  );

  return (
    <ul className="flex flex-col gap-1" role="list" aria-label="Reorderable list">
      {items.map((item, idx) => (
        <li
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDrop={(e) => handleDrop(e, item.id)}
          onDragEnd={handleDragEnd}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          aria-grabbed={draggingId === item.id}
          aria-dropeffect="move"
          tabIndex={0}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
            "hover:bg-surface-high/10 cursor-grab active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            draggingId === item.id && "opacity-50 bg-surface-high/10"
          )}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-foreground-muted" aria-hidden="true" />
          {renderItem(item, { dragging: draggingId === item.id })}
        </li>
      ))}
    </ul>
  );
}
