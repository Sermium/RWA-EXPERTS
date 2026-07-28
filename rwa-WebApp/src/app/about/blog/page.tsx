// src/app/about/blog/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarIcon, ClockIcon, ArrowRightIcon, Loader2, Image as ImageIcon, FileText } from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover_image_url?: string;
  read_time: string;
  featured: boolean;
  published_at: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ status: 'published' });
      if (selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/blog?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch posts');
      }

      setPosts(data.posts || []);
      if (data.categories) {
        setCategories(['All', ...data.categories]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const featuredPost = posts.find(post => post.featured);
  const regularPosts = posts.filter(post => !post.featured);

  return (
    <div className="min-h-screen bg-surface-sunken py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-medium text-ink mb-4">
            RWA <span className="text-gold">Blog</span>
          </h1>
          <p className="text-ink-muted text-lg max-w-2xl mx-auto">
            Insights, updates, and educational content about tokenization, blockchain, and real-world asset investing.
          </p>
        </div>

          {/* Submit Article CTA */}
          <Link
            href="/about/blog/submit"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gold hover:bg-gold-light text-surface-sunken font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Write an Article
          </Link>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-gold text-surface-sunken'
                  : 'bg-surface text-ink-muted hover:bg-surface-overlay'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-danger mb-4">{error}</p>
            <button
              onClick={fetchPosts}
              className="px-4 py-2 bg-gold hover:bg-gold-light text-surface-sunken rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* No Posts */}
        {!isLoading && !error && posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-ink-muted">No articles found.</p>
          </div>
        )}

        {/* Featured Post */}
        {!isLoading && featuredPost && (
          <div className="mb-16">
            <Link href={`/about/blog/${featuredPost.slug}`}>
              <div className="bg-gold/5 rounded-xl overflow-hidden border border-gold/20 hover:border-gold/40 transition-all">
                <div className="grid md:grid-cols-2 gap-8 p-8">
                  <div className="relative h-64 md:h-full min-h-[280px] rounded-lg overflow-hidden bg-gold/10 flex items-center justify-center">
                    {featuredPost.cover_image_url ? (
                      <img
                        src={featuredPost.cover_image_url}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gold/15 rounded-full flex items-center justify-center mx-auto mb-4">
                          <ImageIcon className="w-10 h-10 text-gold" />
                        </div>
                        <span className="text-gold-light text-sm">Featured Article</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-gold text-sm font-medium bg-gold/10 px-3 py-1 rounded-full">
                        {featuredPost.category}
                      </span>
                      <span className="text-gold-light text-sm font-medium">Featured</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-semibold text-ink mb-4">
                      {featuredPost.title}
                    </h2>
                    <p className="text-ink-muted mb-6 line-clamp-3">{featuredPost.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-ink-muted mb-6">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {formatDate(featuredPost.published_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {featuredPost.read_time}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-2 text-gold hover:text-gold-light font-medium group">
                      Read Article
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Blog Grid */}
        {!isLoading && regularPosts.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regularPosts.map((post) => (
              <Link key={post.id} href={`/about/blog/${post.slug}`}>
                <article className="bg-surface/50 rounded-xl border border-border/50 overflow-hidden hover:border-gold/50 transition-all group h-full">
                  <div className="relative h-48 bg-surface-overlay flex items-center justify-center">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-border-strong/50 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-ink-faint" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <span className="text-gold text-xs font-medium uppercase tracking-wider">
                      {post.category}
                    </span>
                    <h3 className="text-lg font-semibold text-ink mt-2 mb-3 group-hover:text-gold-light transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-ink-muted text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-sm text-ink-faint">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {formatDate(post.published_at)}
                      </span>
                      <span>{post.read_time}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* Newsletter CTA */}
        <div className="mt-16 text-center bg-surface/50 rounded-xl p-8 border border-border/50">
          <h2 className="text-2xl sm:text-3xl font-display font-medium text-ink mb-4">Stay Updated</h2>
          <p className="text-ink-muted mb-6 max-w-md mx-auto">
            Subscribe to our newsletter for the latest insights on tokenization and RWA investing.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink placeholder-ink-faint focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gold hover:bg-gold-light text-surface-sunken font-medium rounded-lg transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}