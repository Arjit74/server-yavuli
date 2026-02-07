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

