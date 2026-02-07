import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { X, Ambulance, MapPin, Navigation } from "lucide-react";

// Dynamically import map to avoid SSR issues
const AmbulanceMap = dynamic(() => import("./AmbulanceMap"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading Map...</div>
});

type Props = {
    isOpen: boolean;
    onClose: () => void;
    emergency: any;
    ambulances: any[];
    onAssign: (ambulanceId: string) => void;
    assigningAmbulanceId: string | null;
};


export default function AmbulanceAssignmentMap({
    isOpen,
    onClose,
    emergency,
    ambulances,
    onAssign,
    assigningAmbulanceId,
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

            // Sort by distance (push unknown distances to bottom)
            setSortedAmbulances(withDist.sort((a, b) => {
                if (a.distanceToUser === null) return 1;
                if (b.distanceToUser === null) return -1;
                return a.distanceToUser - b.distanceToUser;
            }));
        }
    }, [emergency, ambulances]);

    if (!isOpen || !emergency) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden shadow-2xl animate-scale-up">

                {/* SIDEBAR: LIST */}
                <div className="w-1/3 min-w-[320px] border-r border-gray-200 flex flex-col bg-gray-50">
                    <div className="p-4 border-b border-gray-200 bg-white">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-lg text-gray-900">Select Ambulance</h3>
                            <button
                                onClick={onClose}
                                className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500">Sorted by proximity to patient</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {sortedAmbulances.length > 0 ? (
                            sortedAmbulances.map((amb) => (
                                <div
                                    key={amb.id}
                                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${amb.is_available
                                        ? "border-white bg-white hover:border-blue-300"
                                        : "border-gray-200 bg-gray-50 border-orange-200 hover:border-orange-300"
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
                                            {amb.distanceToUser !== null
                                                ? `${amb.distanceToUser.toFixed(1)} km away`
                                                : "Location unknown"}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => onAssign(amb.id)}
                                        disabled={assigningAmbulanceId !== null || !amb.is_available}
                                        className={`w-full text-sm font-bold py-2 rounded-lg transition-colors ${!amb.is_available
                                                ? "bg-gray-400 cursor-not-allowed text-white"
                                                : assigningAmbulanceId !== null
                                                    ? "bg-gray-300 cursor-not-allowed text-gray-500"
                                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                            }`}
                                    >
                                        {assigningAmbulanceId === amb.id
                                            ? "Assigning..."
                                            : !amb.is_available
                                                ? "Currently Busy"
                                                : "Assign This Ambulance"}
                                    </button>

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
                <div className="w-2/3 relative flex flex-col bg-slate-100">
                    <div className="absolute top-4 right-4 z-[400] hidden lg:block">
                        <button
                            onClick={onClose}
                            className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>

                    <div className="flex-1 relative z-0">
                        <AmbulanceMap
                            patientLocation={{ lat: emergency.latitude, lng: emergency.longitude }}
                            ambulances={ambulances}
                            onAssign={onAssign}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Haversine helper
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null; // Return null instead of 0 for missing data

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
