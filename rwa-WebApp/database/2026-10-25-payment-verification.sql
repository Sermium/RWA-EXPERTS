-- database/2026-10-25-payment-verification.sql
-- Payment verification (branch fix/payment-verification).
--
-- 1. A `payments` table the Stripe webhook writes every PaymentIntent outcome to.
-- 2. Unique indexes so one transaction / PaymentIntent can be credited once,
--    even when two requests race.
-- 3. An atomic increment for crowdfunding_applications.funded_amount.
--
-- Safe to re-run. Run the duplicate checks in step 0 first: a unique index
-- cannot be built while duplicates exist, and any duplicate found there is a
-- payment that was already counted twice and needs a human look.

-- ============================================================================
-- 0. DUPLICATE CHECKS (each must return no rows before step 2)
-- ============================================================================
-- SELECT chain_id, lower(tx_hash), count(*) FROM exchange_deposits GROUP BY 1, 2 HAVING count(*) > 1;
-- SELECT lower(tx_hash), count(*) FROM investments WHERE tx_hash IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- SELECT payment_intent_id, count(*) FROM investments WHERE payment_intent_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- SELECT lower(tx_hash), count(*) FROM fundraising_investments WHERE tx_hash IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- SELECT stripe_payment_intent_id, count(*) FROM fundraising_investments WHERE stripe_payment_intent_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- SELECT lower(payment_tx_hash), count(*) FROM tokenization_applications WHERE payment_tx_hash IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- SELECT lower(fee_payment_id), count(*) FROM crowdfunding_applications WHERE fee_payment_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;

-- ============================================================================
-- 1. PAYMENTS (Stripe webhook)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'stripe',
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  type TEXT,                                        -- PaymentIntent metadata.type
  status TEXT NOT NULL,                             -- Stripe outcome: succeeded | failed
  processing_status TEXT NOT NULL DEFAULT 'pending',-- pending | processed | needs_manual_processing | failed
  amount_cents BIGINT,
  currency TEXT,
  wallet_address TEXT,
  project_id TEXT,
  application_id TEXT,
  investment_id TEXT,
  chain_id INTEGER,
  onchain_tx_hash TEXT,                             -- e.g. recordOffChainInvestment tx
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_application ON payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_investment ON payments(investment_id);
CREATE INDEX IF NOT EXISTS idx_payments_processing ON payments(processing_status);

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;  -- service role only

-- ============================================================================
-- 2. ONE CREDIT PER PAYMENT
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_exchange_deposits_chain_tx
  ON exchange_deposits (chain_id, lower(tx_hash));

CREATE UNIQUE INDEX IF NOT EXISTS uq_investments_tx_hash
  ON investments (lower(tx_hash)) WHERE tx_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_investments_payment_intent
  ON investments (payment_intent_id) WHERE payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fundraising_investments_tx_hash
  ON fundraising_investments (lower(tx_hash)) WHERE tx_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fundraising_investments_payment_intent
  ON fundraising_investments (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tokenization_applications_payment
  ON tokenization_applications (lower(payment_tx_hash)) WHERE payment_tx_hash IS NOT NULL;

ALTER TABLE crowdfunding_applications ADD COLUMN IF NOT EXISTS fee_payment_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_crowdfunding_applications_fee_payment
  ON crowdfunding_applications (lower(fee_payment_id)) WHERE fee_payment_id IS NOT NULL;

-- ============================================================================
-- 3. ATOMIC FUNDED AMOUNT
-- ============================================================================
-- Used by investments/record and the webhook (lib/payment-records.ts). If it
-- is missing the code falls back to read-then-write, which can lose an
-- update under concurrency.

CREATE OR REPLACE FUNCTION increment_funded_amount(p_project_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE crowdfunding_applications
     SET funded_amount = COALESCE(funded_amount, 0) + p_amount,
         updated_at = now()
   WHERE id = p_project_id;
$$;
