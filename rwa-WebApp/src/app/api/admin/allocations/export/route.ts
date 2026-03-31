import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status') || 'confirmed';
    const format = searchParams.get('format') || 'json';
    const roundId = searchParams.get('roundId');

    let query = supabase
      .from('token_allocations')
      .select(`
        wallet_address,
        tokens_amount,
        tokens_usd_value,
        type,
        status,
        round_id,
        referral_code,
        created_at,
        fundraising_rounds:round_id (
          display_name,
          round_name
        )
      `)
      .eq('status', status)
      .order('wallet_address');

    if (roundId && roundId !== 'all') {
      query = query.eq('round_id', roundId);
    }

    const { data: allocations, error } = await query;

    if (error) throw error;

    // Aggregate by wallet address
    const walletTotals = new Map<string, {
      wallet_address: string;
      total_tokens: number;
      total_value: number;
      purchase_tokens: number;
      bonus_tokens: number;
      rounds: string[];
      allocation_count: number;
    }>();

    allocations?.forEach(alloc => {
      const wallet = alloc.wallet_address.toLowerCase();
      const tokens = parseFloat(alloc.tokens_amount) || 0;
      const value = parseFloat(alloc.tokens_usd_value) || 0;
      
      if (!walletTotals.has(wallet)) {
        walletTotals.set(wallet, {
          wallet_address: alloc.wallet_address,
          total_tokens: 0,
          total_value: 0,
          purchase_tokens: 0,
          bonus_tokens: 0,
          rounds: [],
          allocation_count: 0,
        });
      }
      
      const entry = walletTotals.get(wallet)!;
      entry.total_tokens += tokens;
      entry.total_value += value;
      entry.allocation_count++;
      
      if (alloc.type === 'purchase') {
        entry.purchase_tokens += tokens;
      } else {
        entry.bonus_tokens += tokens;
      }
      
      const roundName = alloc.fundraising_rounds?.[0]?.display_name || alloc.round_id;
      if (roundName && !entry.rounds.includes(roundName)) {
        entry.rounds.push(roundName);
      }
    });

    const aggregatedData = Array.from(walletTotals.values())
      .sort((a, b) => b.total_tokens - a.total_tokens);

    // Calculate totals
    const totals = {
      total_wallets: aggregatedData.length,
      total_tokens: aggregatedData.reduce((sum, w) => sum + w.total_tokens, 0),
      total_value: aggregatedData.reduce((sum, w) => sum + w.total_value, 0),
      total_purchase_tokens: aggregatedData.reduce((sum, w) => sum + w.purchase_tokens, 0),
      total_bonus_tokens: aggregatedData.reduce((sum, w) => sum + w.bonus_tokens, 0),
    };

    if (format === 'csv') {
      // Generate CSV
      const headers = ['wallet_address', 'total_tokens', 'purchase_tokens', 'bonus_tokens', 'total_value_usd', 'rounds'];
      const rows = aggregatedData.map(w => [
        w.wallet_address,
        w.total_tokens.toString(),
        w.purchase_tokens.toString(),
        w.bonus_tokens.toString(),
        w.total_value.toFixed(2),
        w.rounds.join(';'),
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
        '',
        `# Total Wallets: ${totals.total_wallets}`,
        `# Total Tokens: ${totals.total_tokens}`,
        `# Total Value: $${totals.total_value.toFixed(2)}`,
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="token_allocations_${status}_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON format (for airdrop tools)
    if (format === 'airdrop') {
      // Format for common airdrop tools (address, amount)
      const airdropData = aggregatedData.map(w => ({
        address: w.wallet_address,
        amount: w.total_tokens.toString(),
      }));

      return NextResponse.json({
        recipients: airdropData,
        totals,
        generated_at: new Date().toISOString(),
      });
    }

    // Default JSON
    return NextResponse.json({
      allocations: aggregatedData,
      raw_allocations: allocations,
      totals,
      filters: { status, roundId },
      generated_at: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error exporting allocations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
