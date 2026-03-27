import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { applicationId, walletAddress } = await request.json();

    if (!applicationId || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify application exists and belongs to wallet
    const { data: application, error: appError } = await supabase
      .from('tokenization_applications')
      .select('id, status, fee_amount')
      .eq('id', applicationId)
      .eq('user_address', walletAddress.toLowerCase())
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'draft') {
      return NextResponse.json({ error: 'Payment already completed' }, { status: 400 });
    }

    const feeAmount = application.fee_amount || 500;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: feeAmount * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        applicationId,
        walletAddress: walletAddress.toLowerCase(),
        type: 'crowdfunding_submission_fee',
      },
      description: `Crowdfunding Submission Fee - Application ${applicationId}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: feeAmount,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
