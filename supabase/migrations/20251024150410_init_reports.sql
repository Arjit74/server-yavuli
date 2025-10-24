-- ============================================
-- REPORTS TABLE
-- Purpose: Store user reports for moderation
-- ============================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique report ID
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,     -- Who filed the report
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,-- User being reported (optional)
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,   -- Listing being reported (optional)
  reason VARCHAR(255) NOT NULL,                  -- Reason (spam, scam, inappropriate, etc.)
  description TEXT,                              -- Additional details
  status VARCHAR(50) DEFAULT 'pending',          -- Report status (pending, reviewed, resolved, dismissed)
  created_at TIMESTAMP DEFAULT NOW(),            -- Report submission time
  CONSTRAINT chk_report_target CHECK (
    reported_user_id IS NOT NULL OR listing_id IS NOT NULL
  ) -- Ensure at least one target is provided
);

-- Indexes for moderation workflows
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);