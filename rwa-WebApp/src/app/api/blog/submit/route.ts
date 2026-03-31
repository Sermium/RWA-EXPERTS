import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      excerpt, 
      content, 
      category, 
      tags, 
      cover_image_url, 
      author_wallet,
      author_email 
    } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' },
        { status: 400 }
      );
    }

    if (!author_wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const wordCount = content.split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    const slug = generateSlug(title);

    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title,
        excerpt: excerpt || title.substring(0, 160),
        content,
        category,
        tags: tags || [],
        cover_image_url: cover_image_url || null,
        author_wallet,
        author_email: author_email || null,
        author_name: `${author_wallet.slice(0, 6)}...${author_wallet.slice(-4)}`,
        read_time: readTime,
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
        featured: false,
        view_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return NextResponse.json(
        { error: 'Failed to submit article' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      post,
      message: 'Article submitted for review'
    });

  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, category, status, rejection_reason, submitted_at, published_at, view_count')
      .eq('author_wallet', wallet)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ posts: posts || [] });

  } catch (error) {
    console.error('GET submissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
