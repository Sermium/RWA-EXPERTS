import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Toggle like on a comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, wallet } = body;

    if (!commentId || !wallet) {
      return NextResponse.json(
        { error: 'Comment ID and wallet required' },
        { status: 400 }
      );
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('blog_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('wallet_address', wallet)
      .single();

    if (existingLike) {
      // Unlike
      await supabase
        .from('blog_comment_likes')
        .delete()
        .eq('id', existingLike.id);

      return NextResponse.json({ liked: false });
    } else {
      // Like
      await supabase
        .from('blog_comment_likes')
        .insert({
          comment_id: commentId,
          wallet_address: wallet
        });

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error('Like toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
