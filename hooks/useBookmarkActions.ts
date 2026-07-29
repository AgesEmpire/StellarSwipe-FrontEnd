"use client";

import { useCallback } from "react";
import { toast } from "@/lib/toast";
import { useBookmarkStore } from "@/store/useBookmarkStore";

function showUndoToast({
  title,
  description,
  undoLabel = "Undo",
  onUndo,
}: {
  title: string;
  description: string;
  undoLabel?: string;
  onUndo: () => void;
}) {
  let toastId = "";

  toastId = toast.info(title, {
    description,
    duration: 4500,
    action: {
      label: undoLabel,
      onClick: onUndo,
    },
  });

  return toastId;
}

export function useBookmarkActions() {
  const addBookmark = useBookmarkStore((state) => state.addBookmark);
  const restoreBookmark = useBookmarkStore((state) => state.addBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);
  const toggleBookmark = useBookmarkStore((state) => state.toggleBookmark);
  const hasBookmark = useBookmarkStore((state) => state.hasBookmark);
  const createFolder = useBookmarkStore((state) => state.createFolder);
  const renameFolder = useBookmarkStore((state) => state.renameFolder);
  const deleteFolder = useBookmarkStore((state) => state.deleteFolder);
  const assignSignalToFolder = useBookmarkStore(
    (state) => state.assignSignalToFolder
  );
  const removeSignalFromFolder = useBookmarkStore(
    (state) => state.removeSignalFromFolder
  );

  const bookmark = useCallback(
    (id: string) => {
      addBookmark(id);
      toast.success("Bookmarked", {
        description: "Saved to your bookmark list.",
        duration: 2500,
      });
    },
    [addBookmark]
  );

  const unbookmark = useCallback(
    (id: string, label: string) => {
      removeBookmark(id);
      const toastId = showUndoToast({
        title: "Bookmark removed",
        description: `${label} was removed from your saved signals.`,
        onUndo: () => restoreBookmark(id),
      });

      return toastId;
    },
    [removeBookmark, restoreBookmark]
  );

  const toggleBookmarkWithUndo = useCallback(
    (id: string, label: string) => {
      if (hasBookmark(id)) {
        return unbookmark(id, label);
      }
      bookmark(id);
      return null;
    },
    [bookmark, hasBookmark, unbookmark]
  );

  const handleCreateFolder = useCallback(
    (name: string) => {
      const id = createFolder(name);
      toast.success("Folder created", {
        description: `"${name}" folder created.`,
        duration: 2500,
      });
      return id;
    },
    [createFolder]
  );

  const handleRenameFolder = useCallback(
    (folderId: string, name: string) => {
      renameFolder(folderId, name);
      toast.success("Folder renamed", {
        description: `Renamed to "${name}".`,
        duration: 2500,
      });
    },
    [renameFolder]
  );

  const handleDeleteFolder = useCallback(
    (folderId: string, folderName: string) => {
      deleteFolder(folderId);
      toast.info("Folder deleted", {
        description: `"${folderName}" and its assignments were removed.`,
        duration: 3500,
      });
    },
    [deleteFolder]
  );

  const handleAssignToFolder = useCallback(
    (signalId: string, folderId: string, folderName: string) => {
      assignSignalToFolder(signalId, folderId);
      toast.success("Assigned", {
        description: `Signal added to "${folderName}".`,
        duration: 2000,
      });
    },
    [assignSignalToFolder]
  );

  const handleRemoveFromFolder = useCallback(
    (signalId: string, folderId: string, folderName: string) => {
      removeSignalFromFolder(signalId, folderId);
      toast.info("Removed", {
        description: `Signal removed from "${folderName}".`,
        duration: 2000,
      });
    },
    [removeSignalFromFolder]
  );

  return {
    addBookmark: bookmark,
    removeBookmark: unbookmark,
    toggleBookmark: (id: string, label: string) =>
      toggleBookmarkWithUndo(id, label),
    hasBookmark,
    directToggleBookmark: toggleBookmark,
    createFolder: handleCreateFolder,
    renameFolder: handleRenameFolder,
    deleteFolder: handleDeleteFolder,
    assignSignalToFolder: handleAssignToFolder,
    removeSignalFromFolder: handleRemoveFromFolder,
  };
}
