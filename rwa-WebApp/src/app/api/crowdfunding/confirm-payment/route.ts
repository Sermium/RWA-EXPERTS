import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { applicationId, paymentIntentId } = await request.json();

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    // If paymentIntentId provided, verify with Stripe
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
      }

      // Verify metadata matches
      if (paymentIntent.metadata.applicationId !== applicationId) {
        return NextResponse.json({ error: 'Payment mismatch' }, { status: 400 });
      }
    }

    // Update application status
    const { error } = await supabase
      .from('tokenization_applications')
      .update({
        status: 'pending_review',
        fee_paid_at: new Date().toISOString(),
        payment_tx_hash: paymentIntentId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .eq('status', 'draft');

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
