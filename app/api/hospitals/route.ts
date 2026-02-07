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
      .select("id, name, latitude, longitude, phone, address, total_beds, occupied_beds, specializations")
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

    // Filter out non-emergency facilities (Dental, Eye, Skin, etc.)
    // Unless they explicitly list "Emergency" or "Trauma" in specializations
    const filteredHospitals = hospitals.filter(h => {
      const name = h.name.toLowerCase();
      const specs = (h.specializations || []).map((s: string) => s.toLowerCase());

      const isEmergencyCapable = specs.includes('emergency') || specs.includes('trauma');
      if (isEmergencyCapable) return true;

      const userExcludedKeywords = [
        'dental', 'dentist', 'clinic', 'eye', 'vision', 'skin', 'derma',
        'hair', 'physio', 'homeo', 'ayurveda', 'wellness', 'cosmetic'
      ];

      // If name contains any excluded keyword, filter it out
      const hasExcludedKeyword = userExcludedKeywords.some(keyword => name.includes(keyword));

      return !hasExcludedKeyword;
    });

    if (filteredHospitals.length === 0) {
      return NextResponse.json([]);
    }


    if (!hospitals || hospitals.length === 0) {
      return NextResponse.json([]);
    }

    // Default weights for scoring
    const W_DISTANCE = 0.4;
    const W_LOAD = 0.3;
    const W_SPECIALIZATION = 0.3;

    // Calculate scores
    // Calculate scores
    const scoredHospitals = filteredHospitals.map((hospital) => {
      const distance = calculateDistance(latitude, longitude, hospital.latitude, hospital.longitude);

      // 1. Distance Score (Inverse: Closer is better)
      // Cap max distance impact at ~50km for normalization
      const distanceScore = Math.max(0, 100 - (distance * 2));

      // 2. Load Score (More available beds is better)
      const totalBeds = hospital.total_beds || 50; // Default if null
      const occupiedBeds = hospital.occupied_beds || 0;
      const loadRatio = Math.min(1, occupiedBeds / totalBeds);
      const loadScore = (1 - loadRatio) * 100;

      // 3. Specialization Score (Match is better)
      // For now, checks if hospital has ANY specialization listed, assuming basic match. 
      // Ideally, match against user's specific condition passed in req body.
      const hasSpecialization = hospital.specializations && hospital.specializations.length > 0;
      const specializationScore = hasSpecialization ? 100 : 50; // Base 50 for general

      // Weighted Total Score
      const aiScore = (distanceScore * W_DISTANCE) + (loadScore * W_LOAD) + (specializationScore * W_SPECIALIZATION);

      return {
        ...hospital,
        distance,
        ai_score: Math.round(aiScore),
        availability: {
          total: totalBeds,
          occupied: occupiedBeds,
          load_percentage: Math.round(loadRatio * 100)
        }
      };
    });

    // Sort by AI Score descending
    scoredHospitals.sort((a, b) => b.ai_score - a.ai_score);

    return NextResponse.json(scoredHospitals.slice(0, 50));
  } catch (error) {
    console.error("Unexpected error in hospitals API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}