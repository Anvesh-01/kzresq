-- Enable required extensions for geospatial queries
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Add AI scoring fields to hospitals table
ALTER TABLE hospitals
ADD COLUMN IF NOT EXISTS total_beds INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS occupied_beds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS traffic_data JSONB DEFAULT '{}';

-- Create an index on location for faster geospatial queries (optional but good for performance)
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals USING gist (ll_to_earth(latitude, longitude));

-- Example update to seed some data (optional, can be removed in prod)
UPDATE hospitals SET specializations = '{"General", "Trauma"}' WHERE specializations IS NULL OR specializations = '{}';
