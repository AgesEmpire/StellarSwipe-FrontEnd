"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { buildSignalPage } from "@/lib/signals";
import { BookmarksPage } from "@/components/bookmarks/BookmarksPage";

type Annotation = {
  note: string;
  tags: string[];
};

const STORAGE_KEY = "bookmark-annotations";

function annotationKey(userId: string, signalId: string) {
  return `${userId}:${signalId}`;
}

function loadAnnotations(): Record<string, Annotation> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function BookmarksContent() {
  const initialSignals = useMemo(() => buildSignalPage(1, 50).items, []);
  const [annotations, setAnnotations] = useState<Record<string, Annotation>>({});
  const [userId, setUserId] = useState<string>("local");

  useEffect(() => {
    setAnnotations(loadAnnotations());
  }, []);

  const persist = useCallback((next: Record<string, Annotation>) => {
    setAnnotations(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  }, []);

  const getAnnotation = useCallback(
    (signalId: string): Annotation =>
      annotations[annotationKey(userId, signalId)] ?? { note: "", tags: [] },
    [annotations, userId],
  );

  const saveNote = useCallback(
    (signalId: string, note: string) => {
      const key = annotationKey(userId, signalId);
      const current = annotations[key] ?? { note: "", tags: [] };
      persist({ ...annotations, [key]: { ...current, note } });
    },
    [annotations, persist, userId],
  );

  const addTag = useCallback(
    (signalId: string, tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      const key = annotationKey(userId, signalId);
      const current = annotations[key] ?? { note: "", tags: [] };
      if (current.tags.includes(trimmed)) return;
      persist({ ...annotations, [key]: { ...current, tags: [...current.tags, trimmed] } });
    },
    [annotations, persist, userId],
  );

  const removeTag = useCallback(
    (signalId: string, tag: string) => {
      const key = annotationKey(userId, signalId);
      const current = annotations[key] ?? { note: "", tags: [] };
      persist({
        ...annotations,
        [key]: { ...current, tags: current.tags.filter((t) => t !== tag) },
      });
    },
    [annotations, persist, userId],
  );

  return (
    <BookmarksPage
      initialSignals={initialSignals}
      annotations={annotations}
      userId={userId}
      onUserIdChange={setUserId}
      getAnnotation={getAnnotation}
      onSaveNote={saveNote}
      onAddTag={addTag}
      onRemoveTag={removeTag}
    />
  );
}

export default function BookmarksRoute() {
  return (
    <Suspense fallback={null}>
      <BookmarksContent />
    </Suspense>
  );
}
