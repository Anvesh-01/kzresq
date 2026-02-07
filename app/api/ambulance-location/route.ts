import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 📥 POST: Ambulance sends live GPS
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { ambulance_id, latitude, longitude } = body;

        console.log("Updating ambulance location:", ambulance_id, latitude, longitude);

        if (!ambulance_id || latitude == null || longitude == null) {
            return NextResponse.json(
                { success: false, error: 'Missing fields' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Update the ambulance record in the database
        // Assuming 'ambulances' table has latitude and longitude columns
        // If not, we might need a separate 'ambulance_locations' table, 
        // but updating the ambulance record directly is simpler for current vehicle state.
        const { error } = await supabase
            .from('ambulances')
            .update({
                latitude,
                longitude,
                last_updated: new Date().toISOString()
            })
            .eq('id', ambulance_id);

        if (error) {
            console.error("Supabase update error:", JSON.stringify(error, null, 2));
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Location update failed:", error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// 📤 GET: Hospital / Police fetch live GPS
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const ambulanceId = searchParams.get('ambulance_id');

    if (!ambulanceId) {
        return NextResponse.json(
            { success: false, error: 'ambulance_id required' },
            { status: 400 }
        );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('ambulances')
        .select('latitude, longitude, last_updated')
        .eq('id', ambulanceId)
        .single();

    if (error || !data) {
        return NextResponse.json(
            { success: false, error: 'Location not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        data: {
            latitude: data.latitude,
            longitude: data.longitude,
            updated_at: data.last_updated
        },
    });
}
