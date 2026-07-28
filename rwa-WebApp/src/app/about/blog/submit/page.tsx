'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  FileText,
  Image as ImageIcon,
  Tag,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const CATEGORIES = [
  'Tokenization',
  'Blockchain',
  'Investment',
  'Regulation',
  'Technology',
  'Market Analysis',
  'Tutorial',
  'News'
];

export default function SubmitArticlePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    tags: '',
    cover_image_url: '',
    author_email: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!isConnected || !address) {
      setError('Please connect your wallet to submit an article');
      return;
    }

    if (!formData.title || !formData.content || !formData.category) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/blog/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          author_wallet: address
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit article');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit article');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface-sunken flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-4">Article Submitted!</h1>
          <p className="text-ink-muted mb-8">
            Your article has been submitted for review. Our team will review it and notify you once it is published.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/about/blog"
              className="px-6 py-3 bg-surface hover:bg-surface-overlay text-ink rounded-lg transition-colors"
            >
              Back to Blog
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  title: '',
                  excerpt: '',
                  content: '',
                  category: '',
                  tags: '',
                  cover_image_url: '',
                  author_email: ''
                });
              }}
              className="px-6 py-3 bg-gold hover:bg-gold-light text-surface-sunken rounded-lg transition-colors"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken text-ink py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link 
            href="/about/blog"
            className="inline-flex items-center gap-2 text-ink-muted hover:text-ink mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
          <h1 className="text-3xl font-bold mb-2">Submit an Article</h1>
          <p className="text-ink-muted">
            Share your knowledge with the RWA community. Articles are reviewed before publication.
          </p>
        </div>

        {!isConnected && (
          <div className="bg-warning-muted border border-warning/30 rounded-lg p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-warning font-medium">Wallet not connected</p>
              <p className="text-warning/70 text-sm">Please connect your wallet to submit an article.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter your article title"
              className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink placeholder-ink-faint focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
              required
            >
              <option value="">Select a category</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Excerpt / Summary
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="A brief summary of your article (1-2 sentences)"
              rows={2}
              className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink placeholder-ink-faint focus:border-gold focus:ring-1 focus:ring-gold transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Content <span className="text-red-400">*</span>
            </label>
            <p className="text-ink-faint text-sm mb-2">
              You can use Markdown for formatting (headers, bold, lists, links, etc.)
            </p>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Write your article content here..."
              rows={15}
              className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink placeholder-ink-faint focus:border-gold focus:ring-1 focus:ring-gold transition-colors font-mono text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              <ImageIcon className="w-4 h-4 inline mr-1" />
              Cover Image URL
            </label>
            <input
              type="url"
              name="cover_image_url"
              value={formData.cover_image_url}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink placeholder-ink-faint focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
            />
            <p className="text-ink-faint text-sm mt-1">Optional. Use a direct image URL.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="blockchain, tokenization, real-estate"
              className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink placeholder-ink-faint focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
            />
            <p className="text-ink-faint text-sm mt-1">Separate tags with commas</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Email (for notifications)
            </label>
            <input
              type="email"
              name="author_email"
              value={formData.author_email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-surface-sunken border border-border rounded-lg text-ink placeholder-ink-faint focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
            />
            <p className="text-ink-faint text-sm mt-1">We will notify you when your article is reviewed</p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !isConnected}
              className="w-full py-4 bg-gold hover:bg-gold-light disabled:bg-surface-overlay disabled:cursor-not-allowed text-surface-sunken font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit for Review
                </>
              )}
            </button>
          </div>

          <div className="bg-surface-sunken/50 border border-border rounded-lg p-6 mt-8">
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-success" />
              Submission Guidelines
            </h3>
            <ul className="text-ink-muted text-sm space-y-2">
              <li>• Articles should be original content not published elsewhere</li>
              <li>• Focus on topics related to RWA, tokenization, blockchain, or investing</li>
              <li>• Minimum 500 words recommended for publication</li>
              <li>• Include sources and references where applicable</li>
              <li>• Avoid promotional content or spam</li>
              <li>• Review typically takes 1-3 business days</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
