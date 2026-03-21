// src/app/api/admin/trade/disputes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET - Fetch trade disputes with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('trade_disputes')
      .select(`
        *,
        trades (
          id,
          reference,
          title,
          buyer_company,
          seller_company,
          amount,
          currency
        )
      `, { count: 'exact' });

    // Apply status filter
    if (status && status !== 'all') {
      if (status === 'resolved') {
        query = query.like('status', 'resolved%');
      } else {
        query = query.eq('status', status);
      }
    }

    // Apply search filter
    if (search) {
      query = query.or(`id.ilike.%${search}%,description.ilike.%${search}%,reason.ilike.%${search}%`);
    }

    // Execute query with pagination
    const { data: disputes, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Trade Disputes API] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch disputes', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      disputes: disputes || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('[Trade Disputes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new dispute
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const { trade_id, user_id, reason, description } = body;

    if (!trade_id || !reason) {
      return NextResponse.json(
        { error: 'trade_id and reason are required' },
        { status: 400 }
      );
    }

    const { data: dispute, error } = await supabase
      .from('trade_disputes')
      .insert({
        trade_id,
        user_id,
        reason,
        description,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Trade Disputes API] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create dispute', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ dispute }, { status: 201 });

  } catch (error) {
    console.error('[Trade Disputes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update dispute status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const { id, status, resolution, resolved_by } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Dispute id is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (resolution) updateData.resolution = resolution;
    if (resolved_by) updateData.resolved_by = resolved_by;

    if (status === 'resolved' || status === 'rejected') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: dispute, error } = await supabase
      .from('trade_disputes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Trade Disputes API] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update dispute', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ dispute });

  } catch (error) {
    console.error('[Trade Disputes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
