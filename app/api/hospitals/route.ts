import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper function to calculate distance (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Calculate bounding box for initial filtering (approx. 50km radius)
    // 1 deg lat ~= 111km
    // 1 deg lon ~= 111km * cos(lat)
    const radiusKm = 50;
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(latitude * (Math.PI / 180)));

    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLon = longitude - lonDelta;
    const maxLon = longitude + lonDelta;

    // Fetch active hospitals from Supabase within the bounding box
    const { data: hospitals, error } = await supabaseAdmin
      .from("hospitals")
      .select("id, name, latitude, longitude, phone, address")
      .eq("is_active", true)
      .gte("latitude", minLat)
      .lte("latitude", maxLat)
      .gte("longitude", minLon)
      .lte("longitude", maxLon);

    if (error) {
      console.error("Database error fetching hospitals:", error);
      return NextResponse.json({ error: `Failed to fetch hospitals: ${error.message}` }, { status: 500 });
    }

    if (!hospitals || hospitals.length === 0) {
      return NextResponse.json([]);
    }

    // Calculate exact distance and sort
    const hospitalsWithDistance = hospitals
      .map((hospital) => ({
        ...hospital,
        distance: calculateDistance(latitude, longitude, hospital.latitude, hospital.longitude),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 50); // Limit to closest 50

    return NextResponse.json(hospitalsWithDistance);
  } catch (error) {
    console.error("Unexpected error in hospitals API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
