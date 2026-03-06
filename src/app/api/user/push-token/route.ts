// src/app/api/user/push-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const { token, platform } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Push token required' }, { status: 400 });
    }

    // Upsert push token
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        token,
        platform: platform || 'unknown',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'wallet_address,token',
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Push Token] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
