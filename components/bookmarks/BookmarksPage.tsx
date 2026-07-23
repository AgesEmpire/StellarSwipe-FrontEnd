"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookmarkX,
  Folder as FolderIcon,
  FolderPlus,
  Pencil,
  Trash2,
  RefreshCw,
  Plus,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SignalCard } from "@/components/SignalCard";
import {
  useBookmarkStore,
  useBookmarkHydrated,
  type BookmarkFolder,
} from "@/store/useBookmarkStore";
import { useBookmarkActions } from "@/hooks/useBookmarkActions";
import { usePortfolio } from "@/hooks/usePortfolio";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/signals";

interface BookmarksPageProps {
  initialSignals: Signal[];
}

function BookmarksEmptyState() {
  return (
    <EmptyState
      ariaLabel="No bookmarked signals yet"
      title="No bookmarks yet"
      description="Save signals from the main feed to build a short list here. You can organize them into folders for different strategies."
      className="bg-slate-950/80 py-16"
      icon={<BookmarkX className="h-8 w-8 text-sky-400/80" />}
      action={
        <Button asChild size="sm" className="gap-2">
          <Link href="/app">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Browse feed
          </Link>
        </Button>
      }
      secondaryAction={
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link href="/providers">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Explore providers
          </Link>
        </Button>
      }
    />
  );
}

function BookmarksSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading bookmarks">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-32 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
        />
      ))}
    </div>
  );
}

function CreateFolderForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setName("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Folder name"
        className="flex h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-sky-400"
        maxLength={40}
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-400 hover:bg-white/10 disabled:opacity-40"
        aria-label="Create folder"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-white/10"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}

function RenameFolderForm({
  initialName,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== initialName) {
      onSubmit(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Folder name"
        className="flex h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-sky-400"
        maxLength={40}
      />
      <button
        type="submit"
        disabled={!name.trim() || name.trim() === initialName}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-400 hover:bg-white/10 disabled:opacity-40"
        aria-label="Save name"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-white/10"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  );
}

function FolderList({
  folders,
  selectedFolderId,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreateFolder,
}: {
  folders: BookmarkFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onCreateFolder: (name: string) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs uppercase tracking-wider text-foreground-muted">
          Folders
        </span>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-foreground-muted hover:bg-white/10 hover:text-foreground"
          aria-label="Create folder"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </div>

      {isCreating && (
        <div className="px-1 pb-1">
          <CreateFolderForm
            onSubmit={(name) => {
              onCreateFolder(name);
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}

      <button
        onClick={() => onSelectFolder(null)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
          selectedFolderId === null
            ? "bg-sky-400/10 text-sky-400"
            : "text-foreground-muted hover:bg-white/5 hover:text-foreground"
        )}
      >
        <FolderIcon className="h-4 w-4 shrink-0" />
        <span>All bookmarks</span>
      </button>

      {folders.map((folder) => (
        <div key={folder.id} className="group relative">
          {renamingId === folder.id ? (
            <div className="px-1">
              <RenameFolderForm
                initialName={folder.name}
                onSubmit={(name) => {
                  onRenameFolder(folder.id, name);
                  setRenamingId(null);
                }}
                onCancel={() => setRenamingId(null)}
              />
            </div>
          ) : (
            <button
              onClick={() => onSelectFolder(folder.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                selectedFolderId === folder.id
                  ? "bg-sky-400/10 text-sky-400"
                  : "text-foreground-muted hover:bg-white/5 hover:text-foreground"
              )}
            >
              <FolderIcon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{folder.name}</span>
              <span className="text-xs text-foreground-muted">
                {folder.signalIds.length}
              </span>
              <div className="hidden gap-0.5 group-hover:flex">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(folder.id);
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-foreground-muted hover:text-foreground"
                  aria-label={`Rename ${folder.name}`}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder.id);
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-foreground-muted hover:text-red-400"
                  aria-label={`Delete ${folder.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function BookmarksPage({ initialSignals }: BookmarksPageProps) {
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const folders = useBookmarkStore((state) => state.folders);
  const isHydrated = useBookmarkHydrated();
  const { assets } = usePortfolio();
  const {
    createFolder,
    renameFolder,
    deleteFolder,
    assignSignalToFolder,
    removeSignalFromFolder,
  } = useBookmarkActions();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const selectedFolder = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId) ?? null
    : null;

  let filteredSignalIds: string[];
  if (selectedFolder) {
    filteredSignalIds = selectedFolder.signalIds.filter((id) =>
      bookmarks.includes(id)
    );
  } else {
    filteredSignalIds = bookmarks;
  }

  const bookmarkedSignals = initialSignals.filter((signal) =>
    filteredSignalIds.includes(signal.id)
  );

  const portfolioBalance = assets.reduce((sum, asset) => sum + asset.value, 0);

  const handleCreateFolder = (name: string) => {
    createFolder(name);
  };

  const handleRenameFolder = (folderId: string, name: string) => {
    renameFolder(folderId, name);
  };

  const handleDeleteFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    deleteFolder(folderId, folder?.name ?? "Unknown");
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-400/90">
              Bookmarks
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Saved signals
            </h1>
            <p className="max-w-2xl text-sm text-foreground-muted">
              Signals you save from the main feed appear here. Organize them
              into folders to track different strategies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground-muted">
              {isHydrated ? `${bookmarkedSignals.length} saved` : "—"}
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/app">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to feed
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="w-full shrink-0 lg:w-64">
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
              <FolderList
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onCreateFolder={handleCreateFolder}
              />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {!isHydrated ? (
              <BookmarksSkeleton />
            ) : bookmarkedSignals.length === 0 ? (
              <BookmarksEmptyState />
            ) : (
              <div className="space-y-4">
                {bookmarkedSignals.map((signal) => {
                  const signalFolders = folders.filter((f) =>
                    f.signalIds.includes(signal.id)
                  );

                  return (
                    <div key={signal.id}>
                      <SignalCard
                        signalId={signal.id}
                        pair={`${signal.ticker}/USDC`}
                        action={signal.action}
                        confidence={signal.confidence}
                        analysis={signal.details}
                        providerName={signal.provider}
                        timestamp={new Date(signal.timestamp)}
                        showPassAction={false}
                        portfolioBalance={portfolioBalance}
                      />
                      {folders.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5 px-1">
                          {signalFolders.map((f) => (
                            <button
                              key={f.id}
                              onClick={() =>
                                removeSignalFromFolder(signal.id, f.id, f.name)
                              }
                              className="inline-flex items-center gap-1 rounded-full bg-sky-400/10 px-2.5 py-0.5 text-xs text-sky-400 hover:bg-sky-400/20"
                              aria-label={`Remove from ${f.name}`}
                            >
                              <FolderIcon className="h-3 w-3" />
                              {f.name}
                              <X className="h-3 w-3" />
                            </button>
                          ))}
                          {signalFolders.length < folders.length && (
                            <div className="relative inline-flex">
                              <select
                                onChange={(e) => {
                                  const folderId = e.target.value;
                                  if (folderId) {
                                    const folder = folders.find(
                                      (f) => f.id === folderId
                                    );
                                    if (folder) {
                                      assignSignalToFolder(
                                        signal.id,
                                        folderId,
                                        folder.name
                                      );
                                    }
                                  }
                                  e.target.value = "";
                                }}
                                value=""
                                className="appearance-none rounded-full bg-white/5 px-2.5 py-0.5 pr-6 text-xs text-foreground-muted hover:bg-white/10 focus:outline-none"
                                aria-label="Assign to folder"
                              >
                                <option value="">+ Folder</option>
                                {folders
                                  .filter(
                                    (f) => !f.signalIds.includes(signal.id)
                                  )
                                  .map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.name}
                                    </option>
                                  ))}
                              </select>
                              <Plus className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground-muted" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
