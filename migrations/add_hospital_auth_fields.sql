-- Add password_hash field to hospitals table for authentication
-- This field will store the bcrypt hashed password for hospital login

ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add username field if it doesn't exist (for login)
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add is_active field to enable/disable hospital accounts
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add last_login field to track login activity
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_hospitals_username ON hospitals(username) WHERE username IS NOT NULL;

-- Update existing hospitals to have usernames based on their names (if not already set)
-- This is a one-time update for existing data
-- You may want to customize this based on your needs
UPDATE hospitals 
SET username = LOWER(REPLACE(REPLACE(name, ' ', ''), '''', ''))
WHERE username IS NULL;
