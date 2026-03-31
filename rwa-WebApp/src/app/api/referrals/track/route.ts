import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { 
      referralCode, 
      visitorWallet, 
      source, 
      page,
      action // 'visit', 'connect', 'invest'
    } = body;

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code required' }, { status: 400 });
    }

    // Log the referral activity
    const { error } = await supabase
      .from('referral_activity')
      .insert({
        referral_code: referralCode.toUpperCase(),
        visitor_wallet: visitorWallet?.toLowerCase() || null,
        source: source || 'direct',
        page: page || '/raise',
        action: action || 'visit',
        user_agent: request.headers.get('user-agent') || null,
        ip_hash: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
      });

    if (error) {
      console.error('Error tracking referral:', error);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error tracking referral:', error);
    return NextResponse.json({ error: 'Failed to track referral' }, { status: 500 });
  }
}