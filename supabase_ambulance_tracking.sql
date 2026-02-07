-- Run this in your Supabase SQL Editor to enable ambulance tracking

-- Add tracking columns to the ambulances table
ALTER TABLE ambulances 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create an index for faster geospatial queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_ambulances_location ON ambulances(latitude, longitude);

-- Grant access to authenticated users (if RLS is enabled)
-- ALTER POLICY "Enable read access for all users" ON ambulances USING (true);
