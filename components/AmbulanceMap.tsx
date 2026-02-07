"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default icon issue
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const ambulanceIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/2893/2893043.png", // Ambulance icon
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
});

const patientIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // Red Map Marker
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35],
});

// Component to update map center when props change
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 13);
    }, [center, map]);
    return null;
}

type Props = {
    patientLocation: { lat: number; lng: number };
    ambulances: {
        id: string;
        vehicle_number: string;
        latitude: number;
        longitude: number;
        is_available: boolean;
    }[];
    onAssign?: (id: string) => void;
};

export default function AmbulanceMap({ patientLocation, ambulances, onAssign }: Props) {
    // Safe center fallback
    const center: [number, number] =
        patientLocation.lat && patientLocation.lng
            ? [patientLocation.lat, patientLocation.lng]
            : [0, 0];

    if (!patientLocation.lat || !patientLocation.lng) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                Map Unavailable (Missing Patient Location)
            </div>
        )
    }

    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater center={center} />

            {/* Patient Marker */}
            <Marker position={center} icon={patientIcon}>
                <Popup>
                    <div className="text-center">
                        <h3 className="font-bold text-red-600">Patient Location</h3>
                        <p className="text-xs">Waiting for help</p>
                    </div>
                </Popup>
            </Marker>

            {/* Ambulance Markers */}
            {ambulances.map((amb) => {
                if (!amb.latitude || !amb.longitude) return null;

                return (
                    <Marker
                        key={amb.id}
                        position={[amb.latitude, amb.longitude]}
                        icon={ambulanceIcon}
                    >
                        <Popup>
                            <div className="text-center p-1">
                                <h3 className="font-bold">{amb.vehicle_number}</h3>
                                <div className={`text-xs font-bold px-2 py-1 rounded mt-1 ${amb.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    }`}>
                                    {amb.is_available ? "AVAILABLE" : "BUSY"}
                                </div>
                                {amb.is_available && onAssign && (
                                    <button
                                        onClick={() => onAssign(amb.id)}
                                        className="mt-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 w-full"
                                    >
                                        Assign
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
