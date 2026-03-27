// src/app/api/kyc/link/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const wallet = searchParams.get('wallet');

  if (!code || !wallet) {
    return NextResponse.json({ 
      valid: false, 
      error: 'Missing code or wallet parameter' 
    });
  }

  try {
    const { data, error } = await supabase
      .from("wallet_link_codes")
      .select("used, used_at, used_by, expires_at")
      .eq("code", code.toUpperCase())
      .eq("source_wallet", wallet.toLowerCase())
      .single();

    if (error || !data) {
      return NextResponse.json({ 
        valid: false, 
        notFound: true 
      });
    }

    // Check if used
    if (data.used || data.used_at) {
      return NextResponse.json({ 
        valid: false, 
        used: true,
        usedBy: data.used_by,
        usedAt: data.used_at
      });
    }

    // Check if expired
    const now = Date.now();
    const expiresAt = new Date(data.expires_at).getTime();
    
    if (expiresAt < now) {
      return NextResponse.json({ 
        valid: false, 
        expired: true 
      });
    }

    return NextResponse.json({ 
      valid: true, 
      used: false 
    });
  } catch (error) {
    console.error("[Link Code Check] Error:", error);
    return NextResponse.json({ 
      valid: false, 
      error: "Server error" 
    });
  }
}
