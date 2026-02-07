-- Police Requests Table
-- Run this SQL in your Supabase SQL Editor to create the police_requests table

CREATE TABLE IF NOT EXISTS police_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id UUID REFERENCES emergencies(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  requested_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'route_cleared', 'resolved')),
  traffic_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_police_requests_emergency_id ON police_requests(emergency_id);
CREATE INDEX IF NOT EXISTS idx_police_requests_hospital_id ON police_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_police_requests_status ON police_requests(status);
CREATE INDEX IF NOT EXISTS idx_police_requests_requested_at ON police_requests(requested_at DESC);

-- Enable Row Level Security
ALTER TABLE police_requests ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Allow all operations for authenticated users" ON police_requests
  FOR ALL USING (true);

COMMENT ON TABLE police_requests IS 'Tracks police assistance requests for critical emergencies';
COMMENT ON COLUMN police_requests.status IS 'Request status: pending, acknowledged, route_cleared, resolved';
