-- ============================================
-- TRANSACTIONS TABLE
-- Purpose: Record completed or pending sales
-- ============================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique transaction identifier
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE, -- Item purchased
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,      -- Buyer
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,     -- Seller
  amount DECIMAL(10,2) NOT NULL,                 -- Final transaction amount
  status VARCHAR(50) DEFAULT 'pending',          -- Transaction status (pending, completed, cancelled, refunded)
  payment_method VARCHAR(100),                   -- Payment method (cash, UPI, card, wallet)
  transaction_date TIMESTAMP DEFAULT NOW(),      -- When payment occurred
  created_at TIMESTAMP DEFAULT NOW()             -- Record creation time
);

-- Indexes for history and status queries
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX idx_transactions_status ON transactions(status);

-- Add new columns to transactions table for payout tracking
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payout_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS payout_reference VARCHAR(255);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_transactions_payout_status ON transactions(payout_status);

-- Add comments for clarity
COMMENT ON COLUMN transactions.platform_fee IS '5% fee kept by Yavuli platform';
COMMENT ON COLUMN transactions.seller_amount IS '95% amount to be paid to seller';
COMMENT ON COLUMN transactions.payout_status IS 'pending, processing, completed, failed';
COMMENT ON COLUMN transactions.payout_reference IS 'Bank transfer reference or Razorpay payout ID';
