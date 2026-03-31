import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get all posts for admin (including pending)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Get counts by status
    const { data: counts } = await supabase
      .from('blog_posts')
      .select('status')
      .then(({ data }) => {
        const statusCounts = {
          all: data?.length || 0,
          pending_review: 0,
          published: 0,
          rejected: 0,
          draft: 0
        };
        data?.forEach(p => {
          if (p.status in statusCounts) {
            statusCounts[p.status as keyof typeof statusCounts]++;
          }
        });
        return { data: statusCounts };
      });

    return NextResponse.json({ posts: posts || [], counts });
  } catch (error) {
    console.error('Admin blog GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Approve or reject a post
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, rejection_reason } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: 'Post ID and action are required' },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (action === 'approve') {
      updateData.status = 'published';
      updateData.published_at = new Date().toISOString();
      updateData.rejection_reason = null;
    } else if (action === 'reject') {
      updateData.status = 'rejected';
      updateData.rejection_reason = rejection_reason || 'Does not meet publication guidelines';
    } else if (action === 'feature') {
      updateData.featured = true;
    } else if (action === 'unfeature') {
      updateData.featured = false;
    } else if (action === 'archive') {
      updateData.status = 'archived';
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating post:', error);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('Admin blog PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a post
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting post:', error);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin blog DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
