"use client";

import { useEffect, useState } from "react";
import { X, Ambulance, MapPin, Navigation } from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    emergency: any;
    ambulances: any[];
    onAssign: (ambulanceId: string) => void;
    isAssigning: boolean;
};

export default function AmbulanceAssignmentMap({
    isOpen,
    onClose,
    emergency,
    ambulances,
    onAssign,
    isAssigning,
}: Props) {
    const [sortedAmbulances, setSortedAmbulances] = useState<any[]>([]);

    useEffect(() => {
        if (emergency && ambulances.length > 0) {
            // Calculate distance for each ambulance to the EMERGENCY location (User)
            const withDist = ambulances.map((amb) => {
                const dist = calculateDistance(
                    emergency.latitude,
                    emergency.longitude,
                    amb.latitude,
                    amb.longitude
                );
                return { ...amb, distanceToUser: dist };
            });

            // Sort by distance
            setSortedAmbulances(withDist.sort((a, b) => a.distanceToUser - b.distanceToUser));
        }
    }, [emergency, ambulances]);

    if (!isOpen || !emergency) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden shadow-2xl animate-scale-up">

                {/* SIDEBAR: LIST */}
                <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50">
                    <div className="p-4 border-b border-gray-200 bg-white">
                        <h3 className="font-bold text-lg text-gray-900">Select Ambulance</h3>
                        <p className="text-sm text-gray-500">Sorted by proximity to patient</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {sortedAmbulances.length > 0 ? (
                            sortedAmbulances.map((amb) => (
                                <div
                                    key={amb.id}
                                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${amb.is_available
                                            ? "border-white bg-white hover:border-blue-300"
                                            : "border-gray-200 bg-gray-100 opacity-60 pointer-events-none"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-gray-900">{amb.vehicle_number}</p>
                                            <p className="text-xs text-gray-500">{amb.driver_name}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${amb.is_available
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                            }`}>
                                            {amb.is_available ? "Available" : "Busy"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                                        <Navigation className="w-3 h-3" />
                                        <span className="font-mono font-bold">
                                            {amb.distanceToUser ? amb.distanceToUser.toFixed(1) : "?"} km away
                                        </span>
                                    </div>

                                    {amb.is_available && (
                                        <button
                                            onClick={() => onAssign(amb.id)}
                                            disabled={isAssigning}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                                        >
                                            {isAssigning ? "Assigning..." : "Assign This Ambulance"}
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                <Ambulance className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>No ambulances found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* MAIN: MAP */}
                <div className="w-2/3 relative flex flex-col">
                    <div className="absolute top-4 right-4 z-10">
                        <button
                            onClick={onClose}
                            className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>

                    {/* Map Header Overlay */}
                    <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-md border border-gray-200">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="font-bold text-sm text-gray-900">Patient Location</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">
                            {emergency.latitude.toFixed(4)}, {emergency.longitude.toFixed(4)}
                        </p>
                    </div>

                    {/* IFRAME MAP (Simulated for now, ideally Leaflet/Google Maps API) */}
                    {/* We construct a URL that shows the destination. Markers for ambulances are harder with simple embed. */}
                    {/* For a real app we'd use Leaflet. Here let's show the PATIENT location clearly. */}
                    <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight={0}
                        marginWidth={0}
                        src={`https://maps.google.com/maps?q=${emergency.latitude},${emergency.longitude}&z=13&output=embed`}
                        className="flex-1 bg-gray-100"
                    ></iframe>

                    <div className="bg-yellow-50 p-2 text-center text-xs text-yellow-800 border-t border-yellow-200">
                        ⚠️ Map shows patient location. Use the list to select the nearest ambulance.
                    </div>
                </div>
            </div>
        </div>
    );
}

// Haversine helper
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
