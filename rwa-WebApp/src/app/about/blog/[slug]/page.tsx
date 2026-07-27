'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Eye, 
  Share2, 
  Bookmark,
  Tag,
  User,
  ChevronRight
} from 'lucide-react';
import BlogComments from '@/components/blog/BlogComments';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  cover_image_url: string | null;
  author_name: string;
  author_avatar_url: string | null;
  read_time: number;
  tags: string[] | null;
  view_count: number;
  published_at: string;
  created_at: string;
}

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover_image_url: string | null;
  read_time: number;
  published_at: string;
}

export default function BlogArticlePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blog/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Article not found');
          } else {
            throw new Error('Failed to fetch article');
          }
          return;
        }
        const data = await res.json();
        setPost(data.post);
        setRelatedPosts(data.relatedPosts || []);
      } catch (err) {
        setError('Failed to load article');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-surface-sunken flex flex-col items-center justify-center text-ink">
        <h1 className="text-2xl font-bold mb-4">{error || 'Article not found'}</h1>
        <Link 
          href="/about/blog"
          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken text-ink">
      {/* Header */}
      <div className="bg-gradient-to-b from-surface-sunken to-surface-sunken border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-ink-muted mb-6">
            <Link href="/" className="hover:text-ink">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/about/blog" className="hover:text-ink">Blog</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-emerald-400">{post.category}</span>
          </nav>

          {/* Back button */}
          <Link 
            href="/about/blog"
            className="inline-flex items-center gap-2 text-ink-muted hover:text-ink mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          {/* Category */}
          <div className="mb-4">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
              {post.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-6 text-ink-muted">
            <div className="flex items-center gap-2">
              {post.author_avatar_url ? (
                <Image 
                  src={post.author_avatar_url} 
                  alt={post.author_name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              <span className="text-ink">{post.author_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.published_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{post.read_time} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{post.view_count} views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      {post.cover_image_url && (
        <div className="max-w-5xl mx-auto px-4 -mt-4">
          <div className="relative aspect-video rounded-xl overflow-hidden">
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Action buttons */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-overlay rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-overlay rounded-lg transition-colors">
            <Bookmark className="w-4 h-4" />
            Save
          </button>
        </div>

        {/* Article content */}
        <div 
          className="prose prose-invert prose-lg max-w-none
            prose-headings:text-ink prose-headings:font-bold
            prose-p:text-ink-muted prose-p:leading-relaxed
            prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-ink
            prose-code:text-emerald-400 prose-code:bg-surface prose-code:px-2 prose-code:py-1 prose-code:rounded
            prose-pre:bg-surface-sunken prose-pre:border prose-pre:border-border
            prose-blockquote:border-l-emerald-500 prose-blockquote:text-ink-muted
            prose-li:text-ink-muted"
          dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-ink-muted" />
              <span className="text-ink-muted">Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span 
                  key={tag}
                  className="px-3 py-1 bg-surface text-ink-muted text-sm rounded-full hover:bg-surface-overlay transition-colors cursor-pointer"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Comments Section */}
      <div className="max-w-4xl mx-auto px-4">
        <BlogComments postId={post.id} />
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-surface-sunken/50 py-16 mt-12">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={`/about/blog/${relatedPost.slug}`}
                  className="group bg-surface/50 rounded-xl overflow-hidden hover:bg-surface transition-all duration-300"
                >
                  {relatedPost.cover_image_url && (
                    <div className="relative aspect-video">
                      <Image
                        src={relatedPost.cover_image_url}
                        alt={relatedPost.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <span className="text-xs text-emerald-400 mb-2 block">
                      {relatedPost.category}
                    </span>
                    <h3 className="font-semibold text-ink group-hover:text-emerald-400 transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-ink-muted mt-2 line-clamp-2">
                      {relatedPost.excerpt}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-ink-faint">
                      <span>{formatDate(relatedPost.published_at)}</span>
                      <span>{relatedPost.read_time} min read</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
          <p className="text-ink-muted mb-6">
            Subscribe to our newsletter for the latest insights on RWA tokenization and blockchain technology.
          </p>
          <div className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:border-emerald-500 text-ink"
            />
            <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}