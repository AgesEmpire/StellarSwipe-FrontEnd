import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForumStore, ForumPost, ForumComment } from "@/store/useForumStore";
import { useWalletStore } from "@/store/useWalletStore";
import { toast } from "sonner";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_POSTS: ForumPost[] = [
  {
    id: "post-1",
    title: "AlphaTrader's XLM signal was spot on — 21% gain in 7 days",
    content: "Just closed my XLM position following AlphaTrader's signal from April 1st. Entry at $0.42, exit at $0.51. The technical analysis was solid — the breakout above the 50-day MA was the key trigger. Anyone else riding this one?",
    authorId: "user-1",
    authorName: "CryptoAce",
    authorReputation: 142,
    providerId: "provider-1",
    providerName: "AlphaTrader",
    createdAt: "2026-04-09T10:00:00Z",
    updatedAt: "2026-04-09T10:00:00Z",
    likes: 34,
    commentCount: 12,
    isPinned: true,
    tags: ["XLM", "success", "technical-analysis"],
  },
  {
    id: "post-2",
    title: "Question: How do you evaluate signal confidence scores?",
    content: "I've been using StellarSwipe for a few weeks and I'm trying to understand how to interpret the confidence scores. Is 75% confidence significantly better than 65%? What's your threshold for acting on a signal?",
    authorId: "user-2",
    authorName: "StarTrader",
    authorReputation: 58,
    createdAt: "2026-04-15T14:00:00Z",
    updatedAt: "2026-04-15T14:00:00Z",
    likes: 21,
    commentCount: 8,
    isPinned: false,
    tags: ["question", "confidence", "strategy"],
  },
  {
    id: "post-3",
    title: "SignalMaster BTC call — missed the reversal, here's what I learned",
    content: "Took a loss on the BTC long from April 10th. Looking back, the macro environment was clearly bearish and I should have waited for confirmation. Sharing my post-mortem so others can learn from my mistake.",
    authorId: "user-3",
    authorName: "LunarHodler",
    authorReputation: 89,
    providerId: "provider-2",
    providerName: "SignalMaster",
    createdAt: "2026-04-16T09:00:00Z",
    updatedAt: "2026-04-16T09:00:00Z",
    likes: 47,
    commentCount: 19,
    isPinned: false,
    tags: ["BTC", "loss", "lesson", "post-mortem"],
  },
  {
    id: "post-4",
    title: "TrendFollower SOL signal — 15.9% in 7 days, here's my analysis",
    content: "TrendFollower called the SOL breakout perfectly. The signal came in at $145 and I exited at $168. The key was the volume confirmation on the breakout candle. Sharing my chart analysis below.",
    authorId: "user-4",
    authorName: "XLMWhale",
    authorReputation: 203,
    providerId: "provider-3",
    providerName: "TrendFollower",
    createdAt: "2026-04-26T11:00:00Z",
    updatedAt: "2026-04-26T11:00:00Z",
    likes: 62,
    commentCount: 24,
    isPinned: false,
    tags: ["SOL", "success", "volume-analysis"],
  },
  {
    id: "post-5",
    title: "Best practices for combining multiple provider signals?",
    content: "I'm subscribed to 3 providers and sometimes they give conflicting signals on the same asset. How do you handle this? Do you weight by win rate, confidence, or something else?",
    authorId: "user-5",
    authorName: "DeFiDave",
    authorReputation: 76,
    createdAt: "2026-05-02T08:00:00Z",
    updatedAt: "2026-05-02T08:00:00Z",
    likes: 38,
    commentCount: 15,
    isPinned: false,
    tags: ["strategy", "multiple-providers", "question"],
  },
  {
    id: "post-6",
    title: "Monthly performance review — May 2026",
    content: "Sharing my May performance: 6.8% return, 7 wins out of 10 trades. Best trade was MATIC (+26.4%), worst was DOT (-9.7%). Overall happy with the results. What did everyone else achieve this month?",
    authorId: "user-6",
    authorName: "AstroAlice",
    authorReputation: 115,
    createdAt: "2026-05-31T20:00:00Z",
    updatedAt: "2026-05-31T20:00:00Z",
    likes: 29,
    commentCount: 11,
    isPinned: false,
    tags: ["monthly-review", "performance", "community"],
  },
];

const MOCK_COMMENTS: Record<string, ForumComment[]> = {
  "post-1": [
    { id: "c1", postId: "post-1", content: "Great trade! I was in this one too. The volume breakout was the key signal.", authorId: "u2", authorName: "StarTrader", authorReputation: 58, createdAt: "2026-04-09T11:00:00Z", likes: 8, likedByUser: false },
    { id: "c2", postId: "post-1", content: "AlphaTrader has been consistently good on XLM. Their track record speaks for itself.", authorId: "u3", authorName: "LunarHodler", authorReputation: 89, createdAt: "2026-04-09T12:30:00Z", likes: 12, likedByUser: false },
    { id: "c3", postId: "post-1", content: "What was your position size? I only put in 5% of my portfolio.", authorId: "u4", authorName: "XLMWhale", authorReputation: 203, createdAt: "2026-04-09T14:00:00Z", likes: 3, likedByUser: false },
  ],
  "post-2": [
    { id: "c4", postId: "post-2", content: "I personally only act on signals above 80% confidence. Below that I wait for additional confirmation.", authorId: "u1", authorName: "CryptoAce", authorReputation: 142, createdAt: "2026-04-15T15:00:00Z", likes: 15, likedByUser: false },
    { id: "c5", postId: "post-2", content: "Confidence score is just one factor. Always check the provider's historical win rate for that specific asset.", authorId: "u5", authorName: "DeFiDave", authorReputation: 76, createdAt: "2026-04-15T16:30:00Z", likes: 22, likedByUser: false },
  ],
  "post-3": [
    { id: "c6", postId: "post-3", content: "Thanks for sharing this. The macro context is often overlooked when following signals.", authorId: "u1", authorName: "CryptoAce", authorReputation: 142, createdAt: "2026-04-16T10:00:00Z", likes: 18, likedByUser: false },
    { id: "c7", postId: "post-3", content: "I had the same trade and same result. The lesson I took: always check the weekly chart before entering.", authorId: "u6", authorName: "AstroAlice", authorReputation: 115, createdAt: "2026-04-16T11:00:00Z", likes: 14, likedByUser: false },
  ],
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useForum(providerId?: string) {
  const { publicKey } = useWalletStore();
  const store = useForumStore();
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["forum-posts", providerId],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      const filtered = providerId
        ? MOCK_POSTS.filter((p) => p.providerId === providerId)
        : MOCK_POSTS;
      return filtered;
    },
    staleTime: 30_000,
    onSuccess: (data: ForumPost[]) => store.setPosts(data),
  } as any);

  const createPostMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string; providerId?: string; tags: string[] }) => {
      await new Promise((r) => setTimeout(r, 800));
      const newPost: ForumPost = {
        id: `post-${Date.now()}`,
        title: payload.title,
        content: payload.content,
        authorId: publicKey ?? "anonymous",
        authorName: publicKey ? `${publicKey.slice(0, 6)}...` : "Anonymous",
        authorReputation: 0,
        providerId: payload.providerId,
        providerName: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        likes: 0,
        commentCount: 0,
        isPinned: false,
        tags: payload.tags,
      };
      return newPost;
    },
    onSuccess: (newPost) => {
      queryClient.setQueryData(["forum-posts", providerId], (old: ForumPost[] | undefined) =>
        old ? [newPost, ...old] : [newPost]
      );
      toast.success("Post created", { description: "Your post is now live." });
    },
    onError: () => toast.error("Failed to create post"),
  });

  const createCommentMutation = useMutation({
    mutationFn: async (payload: { postId: string; content: string; parentCommentId?: string }) => {
      await new Promise((r) => setTimeout(r, 500));
      const comment: ForumComment = {
        id: `comment-${Date.now()}`,
        postId: payload.postId,
        content: payload.content,
        authorId: publicKey ?? "anonymous",
        authorName: publicKey ? `${publicKey.slice(0, 6)}...` : "Anonymous",
        authorReputation: 0,
        createdAt: new Date().toISOString(),
        likes: 0,
        likedByUser: false,
        parentCommentId: payload.parentCommentId,
      };
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-comments"] });
      toast.success("Comment posted");
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const filteredPosts = (posts ?? store.posts).filter((p) => {
    const q = store.searchQuery.toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    posts: sortedPosts,
    isLoading,
    createPost: createPostMutation.mutate,
    isCreatingPost: createPostMutation.isPending,
    createComment: createCommentMutation.mutate,
    isCreatingComment: createCommentMutation.isPending,
    mockComments: MOCK_COMMENTS,
  };
}

export function useForumPost(postId: string) {
  const store = useForumStore();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["forum-comments", postId],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_COMMENTS[postId] ?? [];
    },
    staleTime: 30_000,
  });

  const post = store.posts.find((p) => p.id === postId);

  return { post, comments: comments ?? [], isLoading };
}
