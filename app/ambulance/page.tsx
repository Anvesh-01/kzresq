'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Ambulance, MapPin, Phone, Navigation, LogOut, CheckCircle } from 'lucide-react';

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
    const [emergency, setEmergency] = useState<AssignedEmergency | null>(null);
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
            const res = await fetch(`/api/emergency?ambulance_id=${ambulanceId}&status=dispatched`);
            const data = await res.json();

            if (data.success && data.data.length > 0) {
                setEmergency(data.data[0]);
            } else {
                // Also check for acknowledged but not yet completed? 
                // For now, let's assume 'dispatched' is the active status for ambulance
                setEmergency(null);
            }
        } catch (e) {
            console.error("Error fetching emergency", e);
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
                {emergency ? (
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-red-500 animate-slide-up">
                        <div className="bg-red-600 p-4 text-white flex justify-between items-center">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <span className="animate-pulse">🚨</span> Emergency Assigned
                            </h2>
                            <span className="text-xs bg-red-800 px-2 py-1 rounded-full">CRITICAL</span>
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
                                <p className="font-mono text-xs text-gray-600 mb-3 bg-white p-2 rounded border">
                                    {emergency.latitude.toFixed(6)}, {emergency.longitude.toFixed(6)}
                                </p>
                                <button
                                    onClick={openMap}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                                >
                                    <Navigation className="w-5 h-5" />
                                    Start Navigation
                                </button>
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
