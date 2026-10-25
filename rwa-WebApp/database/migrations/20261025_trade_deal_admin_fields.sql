-- Fields the admin trade screen reads and its deal routes write
-- (api/admin/trade/deals/[id], .../flag, .../kyc). Safe to run twice.
ALTER TABLE trade_deals ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE trade_deals ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE trade_deals ADD COLUMN IF NOT EXISTS buyer_kyc_level VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE trade_deals ADD COLUMN IF NOT EXISTS seller_kyc_level VARCHAR(20) NOT NULL DEFAULT 'none';
-- No score until something computes one; the screen shows "n/a" meanwhile.
ALTER TABLE trade_deals ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100);
