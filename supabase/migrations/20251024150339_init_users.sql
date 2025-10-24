-- ============================================
-- USERS TABLE
-- Purpose: Store user profile and authentication data
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique user identifier
  email VARCHAR(255) UNIQUE NOT NULL,            -- User login email
  password_hash VARCHAR(255) NOT NULL,           -- Hashed password (handled by Supabase Auth)
  full_name VARCHAR(255),                        -- User's full name
  phone VARCHAR(20),                             -- Contact number
  profile_image_url TEXT,                        -- Profile picture link
  bio TEXT,                                      -- Short description or bio
  location VARCHAR(255),                         -- City or area
  rating DECIMAL(3,2) DEFAULT 0.00,              -- Average rating (0–5 scale)
  total_reviews INTEGER DEFAULT 0,               -- Number of reviews received
  is_verified BOOLEAN DEFAULT FALSE,             -- Whether email/phone is verified
  created_at TIMESTAMP DEFAULT NOW(),            -- Account creation time
  updated_at TIMESTAMP DEFAULT NOW()             -- Last profile update
);

-- Indexes for performance
CREATE INDEX idx_users_created_at ON users(created_at);