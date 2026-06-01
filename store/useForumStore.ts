import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorReputation: number;
  providerId?: string;
  providerName?: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  commentCount: number;
  isPinned: boolean;
  tags: string[];
  likedByUser?: boolean;
}

export interface ForumComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorReputation: number;
  createdAt: string;
  likes: number;
  likedByUser?: boolean;
  parentCommentId?: string;
  replies?: ForumComment[];
}

export interface ForumState {
  posts: ForumPost[];
  activePostId: string | null;
  searchQuery: string;
  selectedProviderId: string | null;
  setPosts: (posts: ForumPost[]) => void;
  setActivePost: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setSelectedProvider: (id: string | null) => void;
  toggleLikePost: (postId: string) => void;
  pinPost: (postId: string) => void;
}

export const useForumStore = create<ForumState>()(
  persist(
    (set, get) => ({
      posts: [],
      activePostId: null,
      searchQuery: "",
      selectedProviderId: null,
      setPosts: (posts) => set({ posts }),
      setActivePost: (id) => set({ activePostId: id }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setSelectedProvider: (id) => set({ selectedProviderId: id }),
      toggleLikePost: (postId) => {
        const posts = get().posts.map((p) =>
          p.id === postId
            ? { ...p, likes: p.likedByUser ? p.likes - 1 : p.likes + 1, likedByUser: !p.likedByUser }
            : p
        );
        set({ posts });
      },
      pinPost: (postId) => {
        const posts = get().posts.map((p) =>
          p.id === postId ? { ...p, isPinned: !p.isPinned } : p
        );
        set({ posts });
      },
    }),
    { name: "forum-store" }
  )
);
