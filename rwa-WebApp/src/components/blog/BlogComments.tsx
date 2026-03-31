'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  MessageCircle, 
  Heart, 
  Reply, 
  Trash2, 
  Send,
  Loader2,
  AlertCircle,
  User
} from 'lucide-react';

interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_wallet: string;
  author_name: string;
  content: string;
  likes_count: number;
  userLiked: boolean;
  created_at: string;
  replies: Comment[];
}

interface BlogCommentsProps {
  postId: string;
}

export default function BlogComments({ postId }: BlogCommentsProps) {
  const { address, isConnected } = useAccount();
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [postId, address]);

  const fetchComments = async () => {
    try {
      const params = new URLSearchParams({ postId });
      if (address) params.append('wallet', address);
      
      const response = await fetch(`/api/blog/comments?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setComments(data.comments || []);
        setTotalComments(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    
    if (!content.trim() || !address) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          parentId: parentId || null,
          authorWallet: address,
          content: content.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      // Reset and refresh
      if (parentId) {
        setReplyContent('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }
      fetchComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!address) return;

    try {
      const response = await fetch('/api/blog/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, wallet: address })
      });

      if (response.ok) {
        fetchComments();
      }
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!address || !confirm('Delete this comment?')) return;

    try {
      const response = await fetch(
        `/api/blog/comments?id=${commentId}&wallet=${address}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        fetchComments();
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const isAuthor = address?.toLowerCase() === comment.author_wallet.toLowerCase();
    const maxDepth = 3;

    return (
      <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-700 pl-4' : ''}`}>
        <div className="bg-gray-800/50 rounded-lg p-4 mb-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-white font-medium text-sm">{comment.author_name}</span>
                <span className="text-gray-500 text-xs ml-2">{formatDate(comment.created_at)}</span>
              </div>
            </div>
            {isAuthor && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Content */}
          <p className="text-gray-300 text-sm whitespace-pre-wrap mb-3">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleLike(comment.id)}
              disabled={!isConnected}
              className={`flex items-center gap-1 text-sm transition-colors ${
                comment.userLiked 
                  ? 'text-red-400' 
                  : 'text-gray-500 hover:text-red-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Heart className={`w-4 h-4 ${comment.userLiked ? 'fill-current' : ''}`} />
              <span>{comment.likes_count}</span>
            </button>

            {depth < maxDepth && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                disabled={!isConnected}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Reply className="w-4 h-4" />
                <span>Reply</span>
              </button>
            )}
          </div>

          {/* Reply form */}
          {replyingTo === comment.id && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmitComment(comment.id)}
                  disabled={!replyContent.trim() || isSubmitting}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                >
                  {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Reply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nested replies */}
        {comment.replies?.map((reply) => (
          <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <section className="mt-12 pt-8 border-t border-gray-800">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <MessageCircle className="w-6 h-6 text-emerald-400" />
        Discussion ({totalComments})
      </h2>

      {/* New comment form */}
      <div className="mb-8">
        {isConnected ? (
          <div className="bg-gray-800/50 rounded-xl p-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              maxLength={2000}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500">{newComment.length}/2000</span>
              <button
                onClick={() => handleSubmitComment()}
                disabled={!newComment.trim() || isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Post Comment
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800/50 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-gray-400">Connect your wallet to join the discussion</p>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </section>
  );
}
