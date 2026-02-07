import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { emergency_id, hospital_id, notes } = body;

        if (!emergency_id || !hospital_id) {
            return NextResponse.json(
                { error: 'Missing required fields: emergency_id, hospital_id' },
                { status: 400 }
            );
        }

        // Create police request
        const { data, error } = await supabase
            .from('police_requests')
            .insert({
                emergency_id,
                hospital_id,
                status: 'pending',
                traffic_notes: notes || null,
            })
            .select()
            .single();

        if (error) {
            console.error('Database error creating police request:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/police-requests:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        let query = supabase
            .from('police_requests')
            .select('*')
            .order('requested_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: requests, error: requestsError } = await query;

        if (requestsError) {
            console.error('Database error fetching police requests:', requestsError);
            return NextResponse.json({ error: requestsError.message }, { status: 500 });
        }

        if (!requests || requests.length === 0) {
            return NextResponse.json({ data: [] }, { status: 200 });
        }

        // Fetch related emergencies
        const emergencyIds = requests.map(r => r.emergency_id);
        const { data: emergencies, error: emergenciesError } = await supabase
            .from('sos_emergencies')
            .select('*')
            .in('id', emergencyIds);

        if (emergenciesError) {
            console.error('Database error fetching emergencies:', emergenciesError);
            // Return requests without emergency details if this fails, or handle as 500
            return NextResponse.json({ error: emergenciesError.message }, { status: 500 });
        }

        // Fetch related hospitals
        const hospitalIds = requests.map(r => r.hospital_id).filter(id => id !== null);
        let hospitals: any[] = [];
        if (hospitalIds.length > 0) {
            const { data: hops, error: hospitalsError } = await supabase
                .from('hospitals')
                .select('id, name, address, phone, latitude, longitude')
                .in('id', hospitalIds);

            if (hospitalsError) {
                console.error('Database error fetching hospitals:', hospitalsError);
            } else {
                hospitals = hops || [];
            }
        }

        // Manual Join
        const enrichedData = requests.map(request => {
            const emergency = emergencies?.find(e => e.id === request.emergency_id);
            const hospital = hospitals.find(h => h.id === request.hospital_id);

            return {
                ...request,
                emergency: emergency || null,
                hospital: hospital || null
            };
        });

        return NextResponse.json({ data: enrichedData }, { status: 200 });
    } catch (error) {
        console.error('Error in GET /api/police-requests:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status, traffic_notes } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Missing required field: id' },
                { status: 400 }
            );
        }

        const updateData: any = {};

        if (status) {
            updateData.status = status;
            if (status === 'acknowledged' && !updateData.acknowledged_at) {
                updateData.acknowledged_at = new Date().toISOString();
            }
        }

        if (traffic_notes !== undefined) {
            updateData.traffic_notes = traffic_notes;
        }

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('police_requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Database error updating police request:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        console.error('Error in PATCH /api/police-requests:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
