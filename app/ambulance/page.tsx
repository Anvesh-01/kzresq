'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Ambulance, MapPin, Phone, Navigation, LogOut, CheckCircle, ChevronRight, Map as MapIcon } from 'lucide-react';
import dynamic from 'next/dynamic';

const SimpleAmbulanceMap = dynamic(() => import('@/components/AmbulanceMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading Navigation Map...</div>
});

type AssignedEmergency = {
    id: string;
    latitude: number;
    longitude: number;
    assigned_hospital_lat?: number;
    assigned_hospital_lng?: number;
    name?: string;
    phone_number: string;
    status: string;
    user_address?: string; // Optional: if we reverse geocode
};

export default function AmbulanceDashboard() {
    const router = useRouter();
    const [emergencies, setEmergencies] = useState<AssignedEmergency[]>([]);
    const [selectedEmergencyId, setSelectedEmergencyId] = useState<string | null>(null);
    const [ambulanceId, setAmbulanceId] = useState<string | null>(null);
    const [ambulanceInfo, setAmbulanceInfo] = useState<any>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Check login
    useEffect(() => {
        const id = localStorage.getItem('ambulance_id');
        const info = localStorage.getItem('ambulance_info');

        if (!id) {
            router.push('/ambulance/login');
            return;
        }

        setAmbulanceId(id);
        if (info) setAmbulanceInfo(JSON.parse(info));
    }, [router]);

    // Fetch assigned emergency
    const fetchEmergency = async () => {
        if (!ambulanceId) return;

        try {
            // Check for both 'dispatched' and 'picked_up'
            const vn = ambulanceInfo?.vehicle_number;
            // Use only number if ID is problematic, but for now we try both as the API handles fallback
            const res = await fetch(`/api/emergency?assigned_ambulance_number=${encodeURIComponent(vn || '')}`);
            const data = await res.json();

            if (data.success) {
                // Return all active emergencies (dispatched or in_progress)
                const activeMissions = (data.data || []).filter((e: any) => e.status === 'dispatched' || e.status === 'in_progress');
                setEmergencies(activeMissions);

                // If no mission selected, pick the first one
                if (!selectedEmergencyId && activeMissions.length > 0) {
                    setSelectedEmergencyId(activeMissions[0].id);
                }
            }
        } catch (e) {
            console.error("Error fetching emergency", e);
        }
    };

    const emergency = emergencies.find(e => e.id === selectedEmergencyId) || (emergencies.length > 0 ? emergencies[0] : null);

    const updateEmergencyStatus = async (id: string, status: string) => {
        try {
            const res = await fetch('/api/emergency', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    status: status
                }),
            });

            const data = await res.json();
            if (data.success) {
                if (status === 'resolved' && emergencies.length === 1) {
                    // Mark ambulance available again ONLY if no other missions left
                    await fetch('/api/ambulances', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: ambulanceId,
                            is_available: true
                        }),
                    });
                }
                fetchEmergency();
            } else {
                alert("Failed to update status: " + (data.error || "Unknown error"));
            }
        } catch (e) {
            console.error("Error updating status", e);
            alert("Connection error");
        }
    };

    useEffect(() => {
        if (!ambulanceId) return;

        fetchEmergency();
        const interval = setInterval(fetchEmergency, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [ambulanceId]);

    // 🔴 Live GPS tracking
    useEffect(() => {
        if (!ambulanceId) return;

        setIsTracking(true);

        const success = (pos: GeolocationPosition) => {
            const { latitude, longitude } = pos.coords;
            setLocation({ lat: latitude, lng: longitude });

            // Send to DB
            fetch('/api/ambulance-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ambulance_id: ambulanceId,
                    latitude,
                    longitude,
                }),
            }).catch(e => console.error("Loc update failed", e));
        };

        const error = (err: GeolocationPositionError) => {
            console.error("GPS Error:", err);
            setIsTracking(false);
        };

        const watchId = navigator.geolocation.watchPosition(success, error, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });

        return () => navigator.geolocation.clearWatch(watchId);
    }, [ambulanceId]);

    const handleLogout = () => {
        localStorage.removeItem('ambulance_id');
        localStorage.removeItem('ambulance_info');
        router.push('/ambulance/login');
    };

    const openMap = () => {
        if (emergency) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${emergency.latitude},${emergency.longitude}`, '_blank');
        }
    };

    if (!ambulanceId) return null; // Wait for redirect

    return (
        <div className="min-h-screen bg-gray-100 pb-20">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Ambulance className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">
                            {ambulanceInfo?.vehicle_number || 'Ambulance'}
                        </h1>
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            {isTracking ? 'GPS Active' : 'GPS Inactive'}
                        </p>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-gray-500 hover:text-red-500">
                    <LogOut className="w-6 h-6" />
                </button>
            </div>

            <div className="p-4 space-y-4">
                {emergencies.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {emergencies.map((e, idx) => (
                            <button
                                key={e.id}
                                onClick={() => setSelectedEmergencyId(e.id)}
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border-2 transition-all ${selectedEmergencyId === e.id || (!selectedEmergencyId && idx === 0)
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                                    : 'bg-white border-gray-200 text-gray-600'
                                    }`}
                            >
                                Mission {idx + 1}: {e.name || 'Anonymous'}
                            </button>
                        ))}
                    </div>
                )}

                {emergency ? (
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-red-500 animate-slide-up">
                        <div className="bg-red-600 p-4 text-white flex justify-between items-center">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <span className="animate-pulse">🚨</span> {emergency.status === 'in_progress' ? 'Patient Picked Up' : 'Emergency Assigned'}
                            </h2>
                            <span className="text-xs bg-red-800 px-2 py-1 rounded-full">{emergency.status === 'in_progress' ? 'IN TRANSIT' : 'CRITICAL'}</span>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Patient Name</p>
                                <p className="text-xl font-bold text-gray-900">{emergency.name || 'Unknown'}</p>
                            </div>

                            <div className="flex items-start gap-4">
                                <a href={`tel:${emergency.phone_number}`} className="flex-1 bg-green-50 p-3 rounded-xl border border-green-200 flex items-center gap-3 active:scale-95 transition-transform">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                        <Phone className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Call Patient</p>
                                        <p className="font-bold text-green-700">{emergency.phone_number}</p>
                                    </div>
                                </a>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm">
                                    <MapPin className="w-4 h-4" />
                                    Pickup Location
                                </div>
                                <p className="font-mono text-xs text-gray-600 mb-4 bg-white p-2 rounded border">
                                    {emergency.latitude.toFixed(6)}, {emergency.longitude.toFixed(6)}
                                </p>

                                {/* Map Integration */}
                                <div className="h-48 rounded-xl overflow-hidden mb-4 border-2 border-gray-100 shadow-inner">
                                    <SimpleAmbulanceMap
                                        patientLocation={{ lat: emergency.latitude, lng: emergency.longitude }}
                                        ambulances={ambulanceId && location ? [{
                                            id: ambulanceId,
                                            vehicle_number: ambulanceInfo?.vehicle_number || "Ambulance",
                                            latitude: location.lat,
                                            longitude: location.lng,
                                            is_available: false
                                        }] : []}
                                    />
                                </div>

                                <button
                                    onClick={openMap}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all mb-3 text-sm"
                                >
                                    <MapIcon className="w-5 h-5" />
                                    {emergency.status === 'in_progress' ? 'Navigate to Hospital (Google)' : 'Start Navigation (Google Maps)'}
                                </button>

                                {emergency.status === 'dispatched' ? (
                                    <button
                                        onClick={() => updateEmergencyStatus(emergency.id, 'in_progress')}
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Mark as Picked Up
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => updateEmergencyStatus(emergency.id, 'resolved')}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Complete Mission
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow p-8 text-center border border-gray-100">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute"></div>
                            <CheckCircle className="w-10 h-10 text-green-600 relative z-10" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">You are Active</h2>
                        <p className="text-gray-500 mb-6">Waiting for assignment from hospital...</p>

                        <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">My Status</p>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Location Update</span>
                                <span className="text-green-600 font-mono">
                                    {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Wait...'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
