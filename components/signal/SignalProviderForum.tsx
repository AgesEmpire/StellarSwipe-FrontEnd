"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  ThumbsUp,
  Reply,
  Search,
  Pin,
  Shield,
  Star,
  ChevronDown,
  ChevronUp,
  Send,
  MoreHorizontal,
  Flag,
  Clock,
  Hash,
  Users,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface ForumUser {
  id: string;
  name: string;
  avatar?: string;
  reputation: number;
  isAdmin: boolean;
  helpfulCount: number;
}

interface ForumPost {
  id: string;
  threadId: string;
  author: ForumUser;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  likedByMe: boolean;
  replies: ForumPost[];
  isPinned?: boolean;
}

interface ForumThread {
  id: string;
  title: string;
  providerId: string;
  providerName: string;
  posts: ForumPost[];
  createdAt: string;
  lastActivity: string;
  views: number;
  isPinned: boolean;
}

interface ForumProps {
  providerId?: string;
  providerName?: string;
}

// Mock data
const MOCK_USERS: ForumUser[] = [
  { id: "u1", name: "CryptoTrader", reputation: 1250, isAdmin: false, helpfulCount: 45 },
  { id: "u2", name: "SignalHunter", reputation: 890, isAdmin: false, helpfulCount: 28 },
  { id: "u3", name: "Admin", reputation: 5000, isAdmin: true, helpfulCount: 200 },
  { id: "u4", name: "DeFiQueen", reputation: 2100, isAdmin: false, helpfulCount: 89 },
  { id: "u5", name: "AlphaSeeker", reputation: 450, isAdmin: false, helpfulCount: 12 },
];

const CURRENT_USER = MOCK_USERS[0];

const generateMockThreads = (): ForumThread[] => [
  {
    id: "t1",
    title: "AlphaWave signals accuracy discussion - June 2026",
    providerId: "alphawave",
    providerName: "AlphaWave",
    createdAt: "2026-06-15T10:00:00Z",
    lastActivity: "2026-06-22T14:30:00Z",
    views: 342,
    isPinned: true,
    posts: [
      {
        id: "p1",
        threadId: "t1",
        author: MOCK_USERS[1],
        content:
          "Has anyone been tracking AlphaWave's BTC/USD signals this month? I've been following them and the accuracy seems to have improved significantly. The momentum-based entries have been particularly good.",
        createdAt: "2026-06-15T10:00:00Z",
        likes: 12,
        likedByMe: false,
        replies: [
          {
            id: "p1r1",
            threadId: "t1",
            author: MOCK_USERS[3],
            content:
              "Agreed! I've been using their signals for about 3 months now. The win rate has been around 68% which is solid. The key is to wait for confirmation before entering.",
            createdAt: "2026-06-15T11:30:00Z",
            likes: 8,
            likedByMe: true,
            replies: [],
          },
          {
            id: "p1r2",
            threadId: "t1",
            author: MOCK_USERS[4],
            content:
              "I've had mixed results. Some signals are great but the SOL/USD ones have been off. Anyone else experiencing this?",
            createdAt: "2026-06-16T09:15:00Z",
            likes: 3,
            likedByMe: false,
            replies: [],
          },
        ],
      },
    ],
  },
  {
    id: "t2",
    title: "Best risk management strategies for following signals?",
    providerId: "alphawave",
    providerName: "AlphaWave",
    createdAt: "2026-06-20T08:00:00Z",
    lastActivity: "2026-06-22T12:00:00Z",
    views: 189,
    isPinned: false,
    posts: [
      {
        id: "p2",
        threadId: "t2",
        author: MOCK_USERS[4],
        content:
          "What's everyone's approach to risk management when following signals? I've been using 2% risk per trade but wondering if there are better approaches for volatile markets.",
        createdAt: "2026-06-20T08:00:00Z",
        likes: 15,
        likedByMe: true,
        replies: [
          {
            id: "p2r1",
            threadId: "t2",
            author: MOCK_USERS[2],
            content:
              "Great question! Here are some best practices:\n\n1. Never risk more than 1-2% per trade\n2. Always use stop losses\n3. Consider position sizing based on volatility\n4. Don't chase entries - wait for the right setup\n5. Keep a trading journal to track performance",
            createdAt: "2026-06-20T09:00:00Z",
            likes: 24,
            likedByMe: false,
            replies: [],
            isPinned: true,
          },
        ],
      },
    ],
  },
  {
    id: "t3",
    title: "OrionSignals vs AlphaWave - which is better for day trading?",
    providerId: "orionsignals",
    providerName: "OrionSignals",
    createdAt: "2026-06-18T14:00:00Z",
    lastActivity: "2026-06-21T16:45:00Z",
    views: 256,
    isPinned: false,
    posts: [
      {
        id: "p3",
        threadId: "t3",
        author: MOCK_USERS[3],
        content:
          "I've been using both providers for the past month. OrionSignals seems better for quick scalps while AlphaWave is better for swing trades. Thoughts?",
        createdAt: "2026-06-18T14:00:00Z",
        likes: 9,
        likedByMe: false,
        replies: [],
      },
    ],
  },
];

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getReputationBadge(reputation: number): { label: string; color: string } {
  if (reputation >= 2000) return { label: "Expert", color: "bg-purple-100 text-purple-700" };
  if (reputation >= 1000) return { label: "Advanced", color: "bg-blue-100 text-blue-700" };
  if (reputation >= 500) return { label: "Intermediate", color: "bg-green-100 text-green-700" };
  return { label: "New", color: "bg-gray-100 text-gray-600" };
}

// Post Component
function ForumPostComponent({
  post,
  depth = 0,
  onLike,
  onReply,
}: {
  post: ForumPost;
  depth?: number;
  onLike: (postId: string) => void;
  onReply: (postId: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(depth < 2);
  const badge = getReputationBadge(post.author.reputation);

  return (
    <div className={cn("group", depth > 0 && "ml-4 sm:ml-8 pl-4 border-l-2 border-border")}>
      <div className="p-4 rounded-lg hover:bg-muted/30 transition-colors">
        {/* Post Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            {post.author.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{post.author.name}</span>
              {post.author.isAdmin && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              )}
              <span className={cn("px-1.5 py-0.5 text-xs rounded", badge.color)}>
                {badge.label}
              </span>
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                  <Pin className="w-3 h-3" />
                  Pinned
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {post.author.reputation.toLocaleString()}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {post.author.helpfulCount} helpful
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="text-sm text-foreground/90 whitespace-pre-wrap mb-3">
          {post.content}
        </div>

        {/* Post Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onLike(post.id)}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              post.likedByMe
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <ThumbsUp className={cn("w-3.5 h-3.5", post.likedByMe && "fill-current")} />
            <span>{post.likes}</span>
          </button>
          <button
            onClick={() => onReply(post.id)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto opacity-0 group-hover:opacity-100">
            <Flag className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* Replies */}
      {post.replies.length > 0 && (
        <div className="mt-1">
          {post.replies.length > 1 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-xs text-primary hover:underline mb-2 ml-4"
            >
              {showReplies ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Hide {post.replies.length} replies
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show {post.replies.length} replies
                </>
              )}
            </button>
          )}
          {showReplies &&
            post.replies.map((reply) => (
              <ForumPostComponent
                key={reply.id}
                post={reply}
                depth={depth + 1}
                onLike={onLike}
                onReply={onReply}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// Main Forum Component
export function SignalProviderForum({ providerId, providerName }: ForumProps) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "views">("recent");

  useEffect(() => {
    // Load threads - in production this would be an API call
    setThreads(generateMockThreads());
  }, [providerId]);

  const filteredThreads = threads
    .filter(
      (t) =>
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.posts.some((p) =>
          p.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      switch (sortBy) {
        case "popular":
          return b.posts.reduce((sum, p) => sum + p.likes, 0) - a.posts.reduce((sum, p) => sum + p.likes, 0);
        case "views":
          return b.views - a.views;
        default:
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      }
    });

  const handleLike = useCallback((postId: string) => {
    setThreads((prev) =>
      prev.map((t) => ({
        ...t,
        posts: t.posts.map((p) =>
          p.id === postId
            ? { ...p, likes: p.likedByMe ? p.likes - 1 : p.likes + 1, likedByMe: !p.likedByMe }
            : p
        ),
      }))
    );
  }, []);

  const handleReply = useCallback((postId: string) => {
    setReplyingTo(postId);
    setReplyContent("");
  }, []);

  const submitReply = useCallback(() => {
    if (!replyContent.trim() || !replyingTo) return;

    const newReply: ForumPost = {
      id: `reply-${Date.now()}`,
      threadId: replyingTo,
      author: CURRENT_USER,
      content: replyContent,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
      replies: [],
    };

    setThreads((prev) =>
      prev.map((t) => ({
        ...t,
        posts: t.posts.map((p) =>
          p.id === replyingTo
            ? { ...p, replies: [...p.replies, newReply] }
            : p
        ),
        lastActivity: new Date().toISOString(),
      }))
    );

    setReplyingTo(null);
    setReplyContent("");
  }, [replyContent, replyingTo]);

  const submitNewThread = useCallback(() => {
    if (!newThreadTitle.trim() || !newPostContent.trim()) return;

    const newThread: ForumThread = {
      id: `thread-${Date.now()}`,
      title: newThreadTitle,
      providerId: providerId || "general",
      providerName: providerName || "General",
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      views: 0,
      isPinned: false,
      posts: [
        {
          id: `post-${Date.now()}`,
          threadId: `thread-${Date.now()}`,
          author: CURRENT_USER,
          content: newPostContent,
          createdAt: new Date().toISOString(),
          likes: 0,
          likedByMe: false,
          replies: [],
        },
      ],
    };

    setThreads((prev) => [newThread, ...prev]);
    setNewThreadTitle("");
    setNewPostContent("");
    setShowNewThread(false);
    setExpandedThread(newThread.id);
  }, [newThreadTitle, newPostContent, providerId, providerName]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Community Forum
          </h2>
          <p className="text-muted-foreground">
            Discuss signals, ask questions, and share insights
            {providerName && (
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-sm">
                <Hash className="w-3 h-3" />
                {providerName}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowNewThread(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          New Discussion
        </button>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {(["recent", "popular", "views"] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={cn(
                "px-3 py-2 text-sm rounded-lg transition-colors capitalize",
                sortBy === sort
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {sort}
            </button>
          ))}
        </div>
      </div>

      {/* New Thread Form */}
      {showNewThread && (
        <div className="p-4 border border-border rounded-lg bg-card">
          <h3 className="text-lg font-medium mb-3">Start a New Discussion</h3>
          <input
            type="text"
            placeholder="Discussion title..."
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg text-sm bg-background mb-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <textarea
            placeholder="Write your post... (supports rich text)"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setShowNewThread(false);
                setNewThreadTitle("");
                setNewPostContent("");
              }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitNewThread}
              disabled={!newThreadTitle.trim() || !newPostContent.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post
            </button>
          </div>
        </div>
      )}

      {/* Threads List */}
      <div className="space-y-4">
        {filteredThreads.map((thread) => {
          const isExpanded = expandedThread === thread.id;
          const totalReplies = thread.posts.reduce((sum, p) => sum + p.replies.length, 0);

          return (
            <div
              key={thread.id}
              className={cn(
                "border border-border rounded-lg overflow-hidden transition-shadow",
                thread.isPinned && "border-primary/30 bg-primary/5"
              )}
            >
              {/* Thread Header */}
              <button
                onClick={() => setExpandedThread(isExpanded ? null : thread.id)}
                className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {thread.isPinned && (
                        <Pin className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <h3 className="text-sm font-medium">{thread.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {thread.posts.length + totalReplies} posts
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {thread.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(thread.lastActivity)}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              </button>

              {/* Thread Posts */}
              {isExpanded && (
                <div className="border-t border-border">
                  <div className="divide-y divide-border">
                    {thread.posts.map((post) => (
                      <div key={post.id}>
                        <ForumPostComponent
                          post={post}
                          onLike={handleLike}
                          onReply={handleReply}
                        />

                        {/* Reply Input */}
                        {replyingTo === post.id && (
                          <div className="p-4 bg-muted/20">
                            <textarea
                              placeholder="Write a reply..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent("");
                                }}
                                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={submitReply}
                                disabled={!replyContent.trim()}
                                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Reply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Reply to Thread */}
                  {!replyingTo && (
                    <div className="p-4 border-t border-border">
                      <button
                        onClick={() => handleReply(thread.posts[0]?.id || thread.id)}
                        className="w-full px-4 py-3 text-left text-sm text-muted-foreground border border-dashed border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
                      >
                        Reply to this discussion...
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredThreads.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No discussions found</h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : "Be the first to start a discussion!"}
          </p>
        </div>
      )}
    </div>
  );
}
