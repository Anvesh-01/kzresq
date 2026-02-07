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

// Mock hospital data as fallback
function getMockHospitals(latitude: number, longitude: number) {
  const mockHospitals = [
    { id: "mock-1", name: "City General Hospital", latitude: latitude + 0.01, longitude: longitude + 0.01, phone: "+91-495-1234567", address: "Medical College Road" },
    { id: "mock-2", name: "Medical Trust Hospital", latitude: latitude + 0.02, longitude: longitude - 0.01, phone: "+91-495-7654321", address: "Beach Road" },
    { id: "mock-3", name: "Sunrise Medical Center", latitude: latitude - 0.01, longitude: longitude + 0.02, phone: "+91-495-9876543", address: "SM Street" },
    { id: "mock-4", name: "St. Mary's Hospital", latitude: latitude + 0.015, longitude: longitude + 0.015, phone: "+91-495-5555555", address: "Railway Station Road" },
    { id: "mock-5", name: "Beach Hospital", latitude: latitude - 0.02, longitude: longitude - 0.01, phone: "+91-495-4444444", address: "Beypore Beach" },
    { id: "mock-6", name: "Central Hospital", latitude: latitude + 0.025, longitude: longitude - 0.02, phone: "+91-495-3333333", address: "Central Business District" },
    { id: "mock-7", name: "Emergency Care Center", latitude: latitude - 0.015, longitude: longitude + 0.025, phone: "+91-495-2222222", address: "Mavoor Road" },
    { id: "mock-8", name: "Apollo Specialty Hospital", latitude: latitude + 0.03, longitude: longitude + 0.01, phone: "+91-495-1111111", address: "Bypass Road" },
  ];

  return mockHospitals.map((hospital) => ({
    ...hospital,
    distance: calculateDistance(latitude, longitude, hospital.latitude, hospital.longitude),
  })).sort((a, b) => a.distance - b.distance);
}

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 });
    }

    // Return mock data immediately if Supabase is not configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn("Supabase not configured, returning mock hospital data");
      return NextResponse.json(getMockHospitals(latitude, longitude));
    }

    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Calculate bounding box for initial filtering (approx. 50km radius)
      const radiusKm = 50;
      const latDelta = radiusKm / 111;
      const lonDelta = radiusKm / (111 * Math.cos(latitude * (Math.PI / 180)));

      const minLat = latitude - latDelta;
      const maxLat = latitude + latDelta;
      const minLon = longitude - lonDelta;
      const maxLon = longitude + lonDelta;

      // Set a timeout for the database query
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Database query timeout")), 15000);
      });

      const queryPromise = supabaseAdmin
        .from("hospitals")
        .select("id, name, latitude, longitude, phone, address")
        .eq("is_active", true)
        .gte("latitude", minLat)
        .lte("latitude", maxLat)
        .gte("longitude", minLon)
        .lte("longitude", maxLon);

      // Race between query and timeout
      const { data: hospitals, error } = await Promise.race([
        queryPromise,
        timeoutPromise.then(() => ({ data: null, error: new Error("timeout") }))
      ]) as { data: any[] | null, error: any };

      if (error || !hospitals || hospitals.length === 0) {
        if (error) {
          console.warn("Database error, returning mock data:", error.message || error);
        } else {
          console.warn("No hospitals found in database, returning mock data");
        }
        return NextResponse.json(getMockHospitals(latitude, longitude));
      }

      // Calculate exact distance and sort
      const hospitalsWithDistance = hospitals
        .map((hospital) => ({
          ...hospital,
          distance: calculateDistance(latitude, longitude, hospital.latitude, hospital.longitude),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 50);

      return NextResponse.json(hospitalsWithDistance);
    } catch (dbError) {
      console.warn("Database connection failed, returning mock data:", dbError);
      return NextResponse.json(getMockHospitals(latitude, longitude));
    }
  } catch (error) {
    console.error("Unexpected error in hospitals API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}