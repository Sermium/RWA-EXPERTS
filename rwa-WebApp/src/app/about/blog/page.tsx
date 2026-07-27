// src/app/about/blog/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarIcon, ClockIcon, ArrowRightIcon, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-b from-surface-sunken via-surface to-surface-sunken py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4">
            RWA <span className="text-gold-400">Blog</span>
          </h1>
          <p className="text-ink-muted text-lg max-w-2xl mx-auto">
            Insights, updates, and educational content about tokenization, blockchain, and real-world asset investing.
          </p>
        </div>
          
          {/* Submit Article CTA */}
          <Link
            href="/about/blog/submit"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-ink font-medium rounded-lg transition-colors"
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
                  ? 'bg-gold-600 text-ink'
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
            <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchPosts}
              className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-ink rounded-lg transition-colors"
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
              <div className="bg-gradient-to-r from-gold/10 to-gold/10 rounded-2xl overflow-hidden border border-gold/20 hover:border-gold/40 transition-all">
                <div className="grid md:grid-cols-2 gap-8 p-8">
                  <div className="relative h-64 md:h-full min-h-[280px] rounded-xl overflow-hidden bg-gradient-to-br from-gold/20 to-gold-light/20 flex items-center justify-center">
                    {featuredPost.cover_image_url ? (
                      <img
                        src={featuredPost.cover_image_url}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-10 h-10 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="text-gold-300 text-sm">Featured Article</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-gold-400 text-sm font-medium bg-gold-400/10 px-3 py-1 rounded-full">
                        {featuredPost.category}
                      </span>
                      <span className="text-yellow-400 text-sm font-medium">Featured</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-ink mb-4">
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
                    <span className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 font-medium group">
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
                <article className="bg-surface/50 rounded-xl border border-border/50 overflow-hidden hover:border-gold-500/50 transition-all group h-full">
                  <div className="relative h-48 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-border-strong/50 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <span className="text-gold-400 text-xs font-medium uppercase tracking-wider">
                      {post.category}
                    </span>
                    <h3 className="text-lg font-bold text-ink mt-2 mb-3 group-hover:text-gold-300 transition-colors line-clamp-2">
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
        <div className="mt-16 text-center bg-surface/50 rounded-2xl p-8 border border-border/50">
          <h2 className="text-2xl font-bold text-ink mb-4">Stay Updated</h2>
          <p className="text-ink-muted mb-6 max-w-md mx-auto">
            Subscribe to our newsletter for the latest insights on tokenization and RWA investing.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink placeholder-ink-faint focus:border-gold-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gold-600 hover:bg-gold-700 text-ink font-medium rounded-lg transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}