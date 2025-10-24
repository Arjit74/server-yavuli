-- ============================================
-- LISTINGS TABLE
-- Purpose: Store marketplace items/services for sale
-- ============================================

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique listing identifier
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Seller/owner of listing
  title VARCHAR(255) NOT NULL,                   -- Item name
  description TEXT,                              -- Detailed description
  category VARCHAR(100),                         -- Category (e.g., Electronics, Furniture)
  price DECIMAL(10,2) NOT NULL,                  -- Item price
  condition VARCHAR(50),                         -- Condition (new, like-new, good, fair)
  status VARCHAR(50) DEFAULT 'active',           -- Listing status (active, sold, archived)
  location VARCHAR(255),                         -- Pickup/delivery location
  images TEXT[],                                 -- Array of image URLs
  views INTEGER DEFAULT 0,                       -- View count
  created_at TIMESTAMP DEFAULT NOW(),            -- Listing creation time
  updated_at TIMESTAMP DEFAULT NOW()             -- Last edit time
);

-- Indexes for common queries
CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_created_at ON listings(created_at);