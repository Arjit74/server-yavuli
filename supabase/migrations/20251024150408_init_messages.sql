-- ============================================
-- MESSAGES TABLE
-- Purpose: Store chat messages between buyers and sellers
-- ============================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique message identifier
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,   -- Who sent the message
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Who received the message
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE, -- Related listing (optional)
  content TEXT NOT NULL,                         -- Message text
  is_read BOOLEAN DEFAULT FALSE,                 -- Read status
  created_at TIMESTAMP DEFAULT NOW()             -- Message send time
);

-- Indexes for faster lookups
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_listing_id ON messages(listing_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);