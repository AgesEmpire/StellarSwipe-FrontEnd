"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  ThumbsUp,
  Pin,
  Search,
  Plus,
  X,
  ChevronRight,
  Tag,
  User,
  Clock,
  Loader2,
  ArrowLeft,
  Send,
  Shield,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useForum, useForumPost } from "@/hooks/useForum";
import { useForumStore, type ForumPost, type ForumComment } from "@/store/useForumStore";
import { useWalletStore } from "@/store/useWalletStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Create post modal ─────────────────────────────────────────────────────────

function CreatePostModal({
  onClose,
  onSubmit,
  isSubmitting,
}: {
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; tags: string[] }) => void;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    onSubmit({ title: title.trim(), content: content.trim(), tags });
  }

  return (
    <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Create new post">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-lg rounded-2xl bg-[hsl(var(--surface))] border border-border shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">New Discussion</h2>
          <button onClick={onClose} className="rounded-md p-1 text-foreground-muted hover:text-foreground transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="post-title" className="text-xs text-foreground-muted mb-1 block">Title</label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={120}
              className="w-full rounded-lg border border-border bg-surface-high px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              required
            />
          </div>
          <div>
            <label htmlFor="post-content" className="text-xs text-foreground-muted mb-1 block">Content</label>
            <textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your analysis, question, or insight…"
              rows={5}
              className="w-full rounded-lg border border-border bg-surface-high px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none"
              required
            />
          </div>
          <div>
            <label htmlFor="post-tags" className="text-xs text-foreground-muted mb-1 block">Tags (optional, max 5)</label>
            <div className="flex gap-2">
              <input
                id="post-tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="e.g. XLM, strategy"
                className="flex-1 rounded-lg border border-border bg-surface-high px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <Button type="button" size="sm" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-full bg-[hsl(var(--accent-primary)/0.15)] text-[hsl(var(--accent-primary))] text-xs px-2 py-0.5">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} aria-label={`Remove tag ${t}`}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {isSubmitting ? "Posting…" : "Post"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Comment component ─────────────────────────────────────────────────────────

function CommentItem({ comment, onLike }: { comment: ForumComment; onLike: (id: string) => void }) {
  return (
    <div className="flex gap-3">
      <div className="h-7 w-7 rounded-full bg-[hsl(var(--accent-primary)/0.2)] flex items-center justify-center text-xs font-bold text-[hsl(var(--accent-primary))] shrink-0 mt-0.5">
        {comment.authorName[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">{comment.authorName}</span>
          {comment.authorReputation > 100 && (
            <span className="text-[10px] bg-[hsl(var(--accent-primary)/0.15)] text-[hsl(var(--accent-primary))] px-1.5 py-0.5 rounded-full">
              Rep {comment.authorReputation}
            </span>
          )}
          <span className="text-[10px] text-foreground-subtle">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
        <button
          onClick={() => onLike(comment.id)}
          className={cn(
            "flex items-center gap-1 mt-1.5 text-xs transition-colors",
            comment.likedByUser ? "text-[hsl(var(--accent-primary))]" : "text-foreground-muted hover:text-foreground"
          )}
          aria-label={`Like comment by ${comment.authorName}`}
        >
          <ThumbsUp size={11} />
          {comment.likes}
        </button>
      </div>
    </div>
  );
}

// ── Post detail view ──────────────────────────────────────────────────────────

function PostDetail({ postId, onBack }: { postId: string; onBack: () => void }) {
  const { post, comments, isLoading } = useForumPost(postId);
  const { createComment, isCreatingComment } = useForum();
  const store = useForumStore();
  const [commentText, setCommentText] = useState("");
  const [localComments, setLocalComments] = useState<ForumComment[]>([]);

  const allComments = [...comments, ...localComments];

  function handleLikeComment(id: string) {
    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, likes: c.likedByUser ? c.likes - 1 : c.likes + 1, likedByUser: !c.likedByUser } : c
      )
    );
  }

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newComment: ForumComment = {
      id: `local-${Date.now()}`,
      postId,
      content: commentText.trim(),
      authorId: "me",
      authorName: "You",
      authorReputation: 0,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByUser: false,
    };
    setLocalComments((prev) => [...prev, newComment]);
    setCommentText("");
    toast.success("Comment posted");
  }

  if (!post) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
        aria-label="Back to forum"
      >
        <ArrowLeft size={16} /> Back to Forum
      </button>

      <Card>
        <CardContent className="pt-5 pb-4 px-5 space-y-4">
          {post.isPinned && (
            <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--accent-warning))]">
              <Pin size={12} /> Pinned discussion
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground leading-snug">{post.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-foreground-muted">
              <span className="flex items-center gap-1"><User size={11} />{post.authorName}</span>
              <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(post.createdAt)}</span>
              {post.providerName && (
                <span className="flex items-center gap-1 text-[hsl(var(--accent-sky))]">
                  <Zap size={11} />{post.providerName}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-surface-high text-foreground-muted text-xs px-2 py-0.5">
                  <Tag size={10} />{t}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            <button
              onClick={() => store.toggleLikePost(post.id)}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                post.likedByUser ? "text-[hsl(var(--accent-primary))]" : "text-foreground-muted hover:text-foreground"
              )}
              aria-label="Like post"
            >
              <ThumbsUp size={14} /> {post.likes}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-foreground-muted">
              <MessageSquare size={14} /> {allComments.length} comments
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">Comments</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
            </div>
          ) : allComments.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-6">No comments yet. Be the first!</p>
          ) : (
            allComments.map((c) => (
              <CommentItem key={c.id} comment={c} onLike={handleLikeComment} />
            ))
          )}

          {/* Comment form */}
          <form onSubmit={handleSubmitComment} className="flex gap-2 pt-2 border-t border-border">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 rounded-lg border border-border bg-surface-high px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              aria-label="Write a comment"
            />
            <Button type="submit" size="sm" disabled={!commentText.trim() || isCreatingComment} aria-label="Post comment">
              {isCreatingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ post, onClick, onLike, onPin, isAdmin }: {
  post: ForumPost;
  onClick: () => void;
  onLike: () => void;
  onPin: () => void;
  isAdmin: boolean;
}) {
  return (
    <Card className={cn("cursor-pointer hover:border-[hsl(var(--border-strong))] transition-colors", post.isPinned && "border-[hsl(var(--accent-warning)/0.4)]")}>
      <CardContent className="pt-4 pb-3 px-4">
        {post.isPinned && (
          <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--accent-warning))] mb-2">
            <Pin size={10} /> Pinned
          </div>
        )}
        <div onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick()} aria-label={`Open post: ${post.title}`}>
          <h3 className="text-sm font-semibold text-foreground leading-snug hover:text-[hsl(var(--accent-primary))] transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-xs text-foreground-muted mt-1 line-clamp-2 leading-relaxed">{post.content}</p>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-surface-high text-foreground-subtle text-[10px] px-2 py-0.5">{t}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-foreground-muted">
            <span className="flex items-center gap-1"><User size={11} />{post.authorName}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(post.createdAt)}</span>
            {post.providerName && (
              <span className="text-[hsl(var(--accent-sky))] hidden sm:flex items-center gap-1">
                <Zap size={11} />{post.providerName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                post.likedByUser ? "text-[hsl(var(--accent-primary))]" : "text-foreground-muted hover:text-foreground"
              )}
              aria-label="Like post"
            >
              <ThumbsUp size={12} /> {post.likes}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
              aria-label="View comments"
            >
              <MessageSquare size={12} /> {post.commentCount}
            </button>
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onPin(); }}
                className={cn("text-xs transition-colors", post.isPinned ? "text-[hsl(var(--accent-warning))]" : "text-foreground-muted hover:text-foreground")}
                aria-label={post.isPinned ? "Unpin post" : "Pin post"}
                title={post.isPinned ? "Unpin" : "Pin"}
              >
                <Pin size={12} />
              </button>
            )}
            <ChevronRight size={14} className="text-foreground-subtle" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Zap icon (inline to avoid import issues) ──────────────────────────────────
function Zap({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ForumPage() {
  const { posts, isLoading, createPost, isCreatingPost } = useForum();
  const store = useForumStore();
  const { publicKey } = useWalletStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // Simulate admin check (in production: check role from API)
  const isAdmin = false;

  function handleCreatePost(data: { title: string; content: string; tags: string[] }) {
    createPost(data, {
      onSuccess: () => setShowCreateModal(false),
    } as any);
  }

  if (activePostId) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-[hsl(var(--background))] pb-16">
          <div className="mx-auto max-w-3xl px-4 py-8">
            <PostDetail postId={activePostId} onBack={() => setActivePostId(null)} />
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[hsl(var(--background))] pb-16">
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare size={24} className="text-[hsl(var(--accent-primary))]" />
                Community Forum
              </h1>
              <p className="text-sm text-foreground-muted mt-1">
                Discuss signals, share insights, and learn from the community.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!publicKey) { toast.error("Connect your wallet to post."); return; }
                setShowCreateModal(true);
              }}
              className="gap-1.5 shrink-0"
              aria-label="Create new post"
            >
              <Plus size={14} /> New Post
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
            <input
              type="search"
              value={store.searchQuery}
              onChange={(e) => store.setSearchQuery(e.target.value)}
              placeholder="Search discussions…"
              className="w-full rounded-lg border border-border bg-surface-high pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              aria-label="Search forum posts"
            />
          </div>

          {/* Admin notice */}
          {isAdmin && (
            <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--accent-warning)/0.3)] bg-[hsl(var(--accent-warning)/0.08)] px-4 py-2 text-xs text-[hsl(var(--accent-warning))]">
              <Shield size={14} /> Admin mode — you can pin and moderate posts.
            </div>
          )}

          {/* Posts list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <MessageSquare size={40} className="mx-auto text-foreground-subtle" />
              <p className="text-foreground-muted">
                {store.searchQuery ? "No posts match your search." : "No discussions yet. Start the conversation!"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => setActivePostId(post.id)}
                  onLike={() => store.toggleLikePost(post.id)}
                  onPin={() => store.pinPost(post.id)}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showCreateModal && (
          <CreatePostModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreatePost}
            isSubmitting={isCreatingPost}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
