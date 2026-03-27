// src/app/api/investments/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    return null;
  }
  
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing wallet parameter' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    
    if (!supabase) {
      // Return empty array if Supabase not configured
      console.warn('Supabase not configured, returning empty investments');
      return NextResponse.json({ investments: [], total: 0 });
    }

    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('investor_address', wallet.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      // Handle table not found gracefully
      if (error.message.includes('not found') || error.code === '42P01') {
        console.warn('Investments table not found, returning empty array');
        return NextResponse.json({ investments: [], total: 0 });
      }
      throw error;
    }

    return NextResponse.json({
      investments: data || [],
      total: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Fetch user investments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}
