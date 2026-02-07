// ... existing imports ...
import { MapContainer, TileLayer, Marker, useMap, Polyline, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

// Fix Leaflet marker icons
const ambulanceIcon = L.divIcon({
    html: '<div style="font-size: 30px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🚑</div>',
    className: 'custom-ambulance-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

const destinationIcon = L.divIcon({
    html: '<div style="font-size: 30px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">📍</div>',
    className: 'custom-dest-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

const hospitalIcon = L.divIcon({
    html: '<div style="font-size: 30px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🏥</div>',
    className: 'custom-hospital-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        const currentZoom = map.getZoom();
        map.setView([lat, lng], currentZoom, {
            animate: true,
            duration: 1.5
        });
    }, [lat, lng, map]);
    return null;
}

interface TrafficHotspot {
    lat: number;
    lng: number;
    risk_score: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    reason: string;
}

interface LiveTrackingMapProps {
    latitude: number;
    longitude: number;
    destLat?: number;
    destLng?: number;
    isHospital?: boolean;
}

export default function LiveTrackingMap({ latitude, longitude, destLat, destLng, isHospital }: LiveTrackingMapProps) {
    const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
    const [hotspots, setHotspots] = useState<TrafficHotspot[]>([]);

    useEffect(() => {
        if (destLat && destLng) {
            const fetchRouteAndTraffic = async () => {
                try {
                    // 1. Fetch Route from OSRM
                    const response = await fetch(
                        `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${destLng},${destLat}?overview=full&geometries=geojson`
                    );
                    const data = await response.json();

                    if (data.routes && data.routes.length > 0) {
                        const coords = data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
                        setRoutePoints(coords);

                        // 2. Fetch Traffic Prediction
                        try {
                            const trafficRes = await fetch('/api/traffic/predict', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ route: coords })
                            });
                            const trafficData = await trafficRes.json();
                            if (trafficData.hotspots) {
                                setHotspots(trafficData.hotspots);
                            }
                        } catch (tError) {
                            console.error("Traffic API Error:", tError);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching route/traffic:', error);
                }
            };
            fetchRouteAndTraffic();
        } else {
            setRoutePoints([]);
            setHotspots([]);
        }
    }, [latitude, longitude, destLat, destLng]);

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-green-100 shadow-lg bg-gray-50">
            <MapContainer
                center={[latitude, longitude]}
                zoom={14}
                style={{ height: '100%', width: '100%', minHeight: '400px' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={[latitude, longitude]} icon={ambulanceIcon} />

                {destLat && destLng && (
                    <Marker position={[destLat, destLng]} icon={isHospital ? hospitalIcon : destinationIcon} />
                )}

                {routePoints.length > 0 && (
                    <Polyline positions={routePoints} color="#3b82f6" weight={5} opacity={0.7} />
                )}

                {/* Traffic Hotspots Overlay */}
                {hotspots.map((spot, idx) => (
                    <CircleMarker
                        key={idx}
                        center={[spot.lat, spot.lng]}
                        radius={spot.risk_level === 'HIGH' ? 12 : 8}
                        pathOptions={{
                            color: spot.risk_level === 'HIGH' ? '#ef4444' : '#eab308', // Red or Yellow
                            fillColor: spot.risk_level === 'HIGH' ? '#ef4444' : '#eab308',
                            fillOpacity: 0.6,
                            weight: 2
                        }}
                    >
                        <Popup>
                            <div className="p-1 text-center">
                                <p className="font-bold text-xs uppercase mb-1" style={{ color: spot.risk_level === 'HIGH' ? '#dc2626' : '#b45309' }}>
                                    {spot.risk_level} TRAFFIC RISK
                                </p>
                                <p className="text-sm font-bold text-gray-800">{spot.reason}</p>
                                <p className="text-xs text-gray-500">Score: {spot.risk_score}</p>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}

                <RecenterMap lat={latitude} lng={longitude} />
            </MapContainer>
        </div>
    );
}
