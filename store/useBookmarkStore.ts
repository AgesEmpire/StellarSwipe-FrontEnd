import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BookmarkFolder {
  id: string;
  name: string;
  signalIds: string[];
}

interface BookmarkState {
  bookmarks: string[];
  folders: BookmarkFolder[];
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  hasBookmark: (id: string) => boolean;
  addBookmark: (id: string) => void;
  removeBookmark: (id: string) => void;
  toggleBookmark: (id: string) => void;
  setBookmarks: (ids: string[]) => void;
  clearBookmarks: () => void;
  createFolder: (name: string) => string;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  assignSignalToFolder: (signalId: string, folderId: string) => void;
  removeSignalFromFolder: (signalId: string, folderId: string) => void;
  getSignalsByFolder: (folderId: string) => string[];
  getFoldersForSignal: (signalId: string) => BookmarkFolder[];
}

let folderCounter = 0;

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      folders: [],
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      hasBookmark: (id: string) => get().bookmarks.includes(id),
      addBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(id)
            ? state.bookmarks
            : [...state.bookmarks, id],
        })),
      removeBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((bookmark) => bookmark !== id),
          folders: state.folders.map((f) => ({
            ...f,
            signalIds: f.signalIds.filter((sid) => sid !== id),
          })),
        })),
      toggleBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(id)
            ? state.bookmarks.filter((bookmark) => bookmark !== id)
            : [...state.bookmarks, id],
        })),
      setBookmarks: (ids: string[]) => set({ bookmarks: [...new Set(ids)] }),
      clearBookmarks: () => set({ bookmarks: [], folders: [] }),
      createFolder: (name: string) => {
        const id = `folder-${++folderCounter}-${Date.now()}`;
        set((state) => ({
          folders: [...state.folders, { id, name, signalIds: [] }],
        }));
        return id;
      },
      renameFolder: (folderId: string, name: string) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId ? { ...f, name } : f
          ),
        })),
      deleteFolder: (folderId: string) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== folderId),
        })),
      assignSignalToFolder: (signalId: string, folderId: string) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId && !f.signalIds.includes(signalId)
              ? { ...f, signalIds: [...f.signalIds, signalId] }
              : f
          ),
        })),
      removeSignalFromFolder: (signalId: string, folderId: string) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId
              ? {
                  ...f,
                  signalIds: f.signalIds.filter((sid) => sid !== signalId),
                }
              : f
          ),
        })),
      getSignalsByFolder: (folderId: string) => {
        const folder = get().folders.find((f) => f.id === folderId);
        return folder ? folder.signalIds : [];
      },
      getFoldersForSignal: (signalId: string) =>
        get().folders.filter((f) => f.signalIds.includes(signalId)),
    }),
    {
      name: "signal-bookmarks",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** Returns `true` once localStorage has been read and state is stable. */
export const useBookmarkHydrated = () =>
  useBookmarkStore((s) => s._hasHydrated);
