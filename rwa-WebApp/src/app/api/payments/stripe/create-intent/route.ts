// src/app/api/payments/stripe/create-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PROJECT_LIMITS } from '@/config/deployments';
import { getDefaultChain, isValidChainId, getChainById, type SupportedChainId } from '@/config/chains';

const SUBMISSION_FEE_USD = 500;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover",
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await request.json();
    const { type } = body;

    // Handle submission fee payments
    if (type === 'submission_fee') {
      return handleSubmissionFee(stripe, body);
    }

    // Handle investment payments (existing logic)
    return handleInvestment(stripe, body);
  } catch (error: unknown) {
    console.error('Stripe create-intent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

async function handleSubmissionFee(stripe: Stripe, body: Record<string, unknown>) {
  const { applicationId, walletAddress, email, projectName } = body;

  if (!applicationId || !walletAddress) {
    return NextResponse.json(
      { error: 'Missing required fields: applicationId, walletAddress' },
      { status: 400 }
    );
  }

  const amountCents = Math.round(SUBMISSION_FEE_USD * 100);

  let customerId: string | undefined;
  if (email && typeof email === 'string') {
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      await stripe.customers.update(customerId, {
        metadata: { walletAddress: walletAddress as string },
      });
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { walletAddress: walletAddress as string },
      });
      customerId = customer.id;
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customerId,
    metadata: {
      type: 'crowdfunding_submission_fee',
      applicationId: String(applicationId),
      walletAddress: String(walletAddress),
      projectName: String(projectName || ''),
    },
    description: `Crowdfunding Project Submission Fee${projectName ? ` - ${projectName}` : ''}`,
    receipt_email: typeof email === 'string' ? email : undefined,
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: SUBMISSION_FEE_USD,
  });
}

async function handleInvestment(stripe: Stripe, body: Record<string, unknown>) {
  const { projectId, amountUSD, investorAddress, investorEmail, chainId } = body;

  if (!projectId || !amountUSD || !investorAddress) {
    return NextResponse.json(
      { error: 'Missing required fields: projectId, amountUSD, investorAddress' },
      { status: 400 }
    );
  }

  if (typeof amountUSD !== 'number' || amountUSD < PROJECT_LIMITS.MIN_INVESTMENT) {
    return NextResponse.json(
      { error: `Minimum investment is $${PROJECT_LIMITS.MIN_INVESTMENT}` },
      { status: 400 }
    );
  }

  const resolvedChainId: SupportedChainId = chainId && isValidChainId(chainId as number)
    ? (chainId as SupportedChainId)
    : getDefaultChain().id;

  const chainInfo = getChainById(resolvedChainId);
  if (!chainInfo) {
    return NextResponse.json(
      { error: `Unsupported chain: ${chainId}` },
      { status: 400 }
    );
  }

  const amountCents = Math.round((amountUSD as number) * 100);
  
  // Validate email type
  const validEmail = typeof investorEmail === 'string' ? investorEmail : undefined;

  let customerId: string | undefined;
  if (validEmail) {
    const customers = await stripe.customers.list({ email: validEmail, limit: 1 });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      await stripe.customers.update(customerId, {
        metadata: { walletAddress: investorAddress as string },
      });
    } else {
      const customer = await stripe.customers.create({
        email: validEmail,
        metadata: { walletAddress: investorAddress as string },
      });
      customerId = customer.id;
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customerId,
    metadata: {
      type: 'crowdfunding_investment',
      projectId: String(projectId),
      investorAddress: String(investorAddress),
      amountUSD: String(amountUSD),
      chainId: String(resolvedChainId),
      chainName: chainInfo.name,
    },
    description: `Investment in Project #${projectId} on ${chainInfo.name}`,
    receipt_email: validEmail,  // Now correctly typed as string | undefined
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    chainId: resolvedChainId,
    chainName: chainInfo.name,
  });
}
