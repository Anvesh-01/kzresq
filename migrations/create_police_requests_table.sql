-- Create police_requests table for tracking police assistance requests from hospitals
CREATE TABLE IF NOT EXISTS public.police_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_id UUID NOT NULL REFERENCES public.sos_emergencies(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
    traffic_notes TEXT,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_emergency_request UNIQUE (emergency_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_police_requests_status ON public.police_requests(status);
CREATE INDEX IF NOT EXISTS idx_police_requests_emergency_id ON public.police_requests(emergency_id);
CREATE INDEX IF NOT EXISTS idx_police_requests_hospital_id ON public.police_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_police_requests_requested_at ON public.police_requests(requested_at DESC);

-- Enable Row Level Security
ALTER TABLE public.police_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (can be restricted later)
CREATE POLICY "Allow all operations on police_requests" ON public.police_requests
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.police_requests IS 'Stores police assistance requests from hospitals for critical emergencies requiring traffic clearance';
