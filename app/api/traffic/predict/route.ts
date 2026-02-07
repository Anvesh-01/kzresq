import { NextRequest, NextResponse } from "next/server";

// Types
type Coordinate = [number, number]; // [lat, lng]

interface TrafficHotspot {
    lat: number;
    lng: number;
    risk_score: number; // 0-100
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    reason: string;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { route } = body;

        if (!route || !Array.isArray(route) || route.length === 0) {
            return NextResponse.json({ error: "Invalid route data" }, { status: 400 });
        }

        const hotspots: TrafficHotspot[] = [];
        const now = new Date();
        const hour = now.getHours();

        // 1. Time of Day Factor
        let timeRisk = 0;
        let timeReason = "";

        const isMorningPeak = hour >= 8 && hour <= 10;
        const isEveningPeak = hour >= 17 && hour <= 20;

        if (isMorningPeak) {
            timeRisk = 30;
            timeReason = "Morning Peak Traffic";
        } else if (isEveningPeak) {
            timeRisk = 40; // Evening usually worse
            timeReason = "Evening Rush Hour";
        }

        // 2. Analyze Route Segments
        // We don't want to spam hotspots, so we'll check every N-th point or specific segments
        // For a real app, we'd query a traffic DB. Here, we simulate based on "zones".

        // Process every 20th point to simulate distinct "zones" along the route
        const step = Math.max(1, Math.floor(route.length / 10));

        for (let i = 0; i < route.length; i += step) {
            const point = route[i];
            const lat = point[0];
            const lng = point[1];

            // Deterministic Randomness based on coordinates
            // This ensures the same location always gets the same "static" risk (like a toll booth)
            const locHash = Math.abs(Math.sin(lat * 1000 + lng * 1000));

            let segmentRisk = 0;
            let reasons: string[] = [];

            // A. Static High Risk Zones (Simulated Tolls/Intersections)
            // If hash > 0.9, we say there's a toll booth or major intersection
            if (locHash > 0.9) {
                segmentRisk += 30;
                reasons.push("Toll Plaza / Major Junction");
            }

            // B. Road Type Simulation
            // If hash is between 0.4 and 0.6, maybe it's a "Narrow Market Road"
            if (locHash > 0.4 && locHash < 0.6) {
                segmentRisk += 20;
                reasons.push("Narrow Market Area");
            }

            // C. Combined Risk
            let totalRisk = segmentRisk + timeRisk;

            // Add some random "Live Accident" probability (very low)
            if (Math.random() > 0.95) {
                totalRisk += 50;
                reasons.push("Reported Accident Ahead");
            }

            // Cap at 100
            totalRisk = Math.min(100, totalRisk);

            // Determine Level
            let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
            if (totalRisk > 70) level = 'HIGH';
            else if (totalRisk > 40) level = 'MEDIUM';

            // Only add if there is some notable risk
            if (totalRisk > 40) {
                if (timeReason && !reasons.includes(timeReason)) {
                    // Only add time reason if it contributes to a high/medium risk
                    reasons.push(timeReason);
                }

                hotspots.push({
                    lat,
                    lng,
                    risk_score: Math.round(totalRisk),
                    risk_level: level,
                    reason: reasons.join(" + ") || "High Volume Traffic"
                });
            }
        }

        return NextResponse.json({ hotspots });

    } catch (error) {
        console.error("Traffic prediction error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
