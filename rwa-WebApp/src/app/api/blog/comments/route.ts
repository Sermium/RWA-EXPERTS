import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get comments for a post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const wallet = searchParams.get('wallet');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    // Get comments with nested replies
    const { data: comments, error } = await supabase
      .from('blog_comments')
      .select('*')
      .eq('post_id', postId)
      .eq('status', 'visible')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Get user's likes if wallet provided
    let userLikes: string[] = [];
    if (wallet) {
      const { data: likes } = await supabase
        .from('blog_comment_likes')
        .select('comment_id')
        .eq('wallet_address', wallet);
      userLikes = likes?.map(l => l.comment_id) || [];
    }

    // Organize into tree structure
    const commentMap = new Map();
    const rootComments: any[] = [];

    comments?.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [], userLiked: userLikes.includes(comment.id) });
    });

    comments?.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id);
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return NextResponse.json({ 
      comments: rootComments,
      total: comments?.length || 0
    });
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, parentId, authorWallet, content } = body;

    if (!postId || !authorWallet || !content) {
      return NextResponse.json(
        { error: 'Post ID, wallet, and content are required' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    const authorName = `${authorWallet.slice(0, 6)}...${authorWallet.slice(-4)}`;

    const { data: comment, error } = await supabase
      .from('blog_comments')
      .insert({
        post_id: postId,
        parent_id: parentId || null,
        author_wallet: authorWallet,
        author_name: authorName,
        content: content.trim(),
        status: 'visible'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Comments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a comment (only by author)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');
    const wallet = searchParams.get('wallet');

    if (!commentId || !wallet) {
      return NextResponse.json({ error: 'Comment ID and wallet required' }, { status: 400 });
    }

    // Verify ownership
    const { data: comment } = await supabase
      .from('blog_comments')
      .select('author_wallet')
      .eq('id', commentId)
      .single();

    if (!comment || comment.author_wallet.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('blog_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Comments DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
