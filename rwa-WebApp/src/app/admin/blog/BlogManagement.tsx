'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Check, 
  X, 
  Star, 
  StarOff,
  Trash2, 
  Eye,
  Clock,
  Loader2,
  Search,
  Filter,
  ExternalLink,
  User,
  Calendar
} from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  status: string;
  featured: boolean;
  author_name: string;
  author_wallet: string;
  author_email: string | null;
  rejection_reason: string | null;
  read_time: number;
  view_count: number;
  submitted_at: string;
  published_at: string | null;
}

interface StatusCounts {
  all: number;
  pending_review: number;
  published: number;
  rejected: number;
  draft: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending_review: { label: 'Pending Review', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  published: { label: 'Published', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/20' },
  draft: { label: 'Draft', color: 'text-ink-muted', bg: 'bg-gray-500/20' },
  archived: { label: 'Archived', color: 'text-ink-faint', bg: 'bg-border-strong/20' }
};

export default function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({ all: 0, pending_review: 0, published: 0, rejected: 0, draft: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/blog?status=${filter}`);
      const data = await response.json();
      setPosts(data.posts || []);
      if (data.counts) setCounts(data.counts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, action: string, reason?: string) => {
    setActionLoading(id);
    try {
      const response = await fetch('/api/admin/blog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, rejection_reason: reason })
      });
      
      if (response.ok) {
        fetchPosts();
        setSelectedPost(null);
        setRejectionReason('');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    setActionLoading(id);
    try {
      const response = await fetch(`/api/admin/blog?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(search.toLowerCase()) ||
    post.author_name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Blog Management</h2>
          <p className="text-ink-muted mt-1">Review and manage blog submissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: 'all', label: 'Total', icon: FileText },
          { key: 'pending_review', label: 'Pending', icon: Clock },
          { key: 'published', label: 'Published', icon: Check },
          { key: 'rejected', label: 'Rejected', icon: X },
          { key: 'draft', label: 'Drafts', icon: FileText }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`p-4 rounded-xl border transition-all ${
              filter === key 
                ? 'bg-emerald-500/20 border-emerald-500/50' 
                : 'bg-surface/50 border-border hover:border-border-strong'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${filter === key ? 'text-emerald-400' : 'text-ink-muted'}`} />
              <div className="text-left">
                <p className="text-2xl font-bold text-ink">{counts[key as keyof StatusCounts]}</p>
                <p className="text-sm text-ink-muted">{label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts by title or author..."
          className="w-full pl-12 pr-4 py-3 bg-surface border border-border rounded-lg text-ink placeholder-ink-faint focus:border-emerald-500"
        />
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-ink-muted">
          No posts found
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-surface/50 border border-border rounded-xl p-6 hover:border-border-strong transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig[post.status]?.bg} ${statusConfig[post.status]?.color}`}>
                      {statusConfig[post.status]?.label}
                    </span>
                    <span className="text-ink-faint text-sm">{post.category}</span>
                    {post.featured && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                        Featured
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-ink mb-2 truncate">{post.title}</h3>
                  <p className="text-ink-muted text-sm mb-3 line-clamp-2">{post.excerpt}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-ink-faint">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {post.author_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(post.submitted_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {post.read_time} min read
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {post.view_count} views
                    </span>
                  </div>

                  {post.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm">
                        <strong>Rejection reason:</strong> {post.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {post.status === 'pending_review' && (
                    <>
                      <button
                        onClick={() => handleAction(post.id, 'approve')}
                        disabled={actionLoading === post.id}
                        className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
                        title="Approve"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setSelectedPost(post)}
                        disabled={actionLoading === post.id}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  
                  {post.status === 'published' && (
                    <>
                      <a
                        href={`/about/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-surface-overlay hover:bg-border-strong text-ink-muted rounded-lg transition-colors"
                        title="View"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => handleAction(post.id, post.featured ? 'unfeature' : 'feature')}
                        disabled={actionLoading === post.id}
                        className={`p-2 rounded-lg transition-colors ${
                          post.featured 
                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                            : 'bg-surface-overlay text-ink-muted hover:bg-border-strong'
                        }`}
                        title={post.featured ? 'Remove from featured' : 'Feature'}
                      >
                        {post.featured ? <StarOff className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={actionLoading === post.id}
                    className="p-2 bg-surface-overlay hover:bg-red-500/20 text-ink-muted hover:text-red-400 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-surface-sunken/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-sunken border border-border rounded-xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold text-ink mb-4">Reject Article</h3>
            <p className="text-ink-muted mb-4">
              Rejecting: <strong className="text-ink">{selectedPost.title}</strong>
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
              rows={4}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-ink placeholder-ink-faint focus:border-red-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedPost(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-surface-overlay hover:bg-border-strong text-ink rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(selectedPost.id, 'reject', rejectionReason)}
                disabled={actionLoading === selectedPost.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-ink rounded-lg transition-colors flex items-center gap-2"
              >
                {actionLoading === selectedPost.id && <Loader2 className="w-4 h-4 animate-spin" />}
                Reject Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
