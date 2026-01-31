-- Make password_hash nullable as it is managed by Supabase Auth
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;