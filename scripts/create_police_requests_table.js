const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPoliceRequestsTable() {
    console.log('Creating police_requests table...');

    const sql = `
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
    DROP POLICY IF EXISTS "Allow all operations on police_requests" ON public.police_requests;
    CREATE POLICY "Allow all operations on police_requests" ON public.police_requests
        FOR ALL
        USING (true)
        WITH CHECK (true);
  `;

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('Error creating table:', error);
            // Try alternative method - direct query
            console.log('Trying alternative method...');
            const { error: altError } = await supabase.from('police_requests').select('id').limit(1);
            if (altError && altError.code === 'PGRST116') {
                console.error('Table does not exist. Please create it manually in Supabase dashboard.');
                console.log('\nSQL to run in Supabase SQL Editor:');
                console.log(sql);
            }
        } else {
            console.log('✓ police_requests table created successfully!');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        console.log('\nPlease run this SQL in Supabase SQL Editor:');
        console.log(sql);
    }
}

createPoliceRequestsTable();
