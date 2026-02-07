'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, Navigation, LogOut, CheckCircle, ChevronRight, Map as MapIcon, Languages } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useLanguage } from '@/components/LanguageContext';

const LiveTrackingMap = dynamic(() => import('@/components/LiveTrackingMap'), {
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
    const { t, language, setLanguage } = useLanguage();
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
                const emergencyList = Array.isArray(data.data) ? data.data : [];
                const activeMissions = emergencyList.filter((e: any) => e.status === 'dispatched' || e.status === 'in_progress');
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
        <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-emerald-100 pb-20">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl p-5 shadow-lg border-b border-white/50 flex items-center justify-between sticky top-0 z-10 animate-slide-down">
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-green-400/20 rounded-xl blur-lg group-hover:bg-green-400/40 transition-all duration-300 animate-pulse"></div>
                        <Image
                            src="/KenLogo1.png"
                            alt="KEN Logo"
                            width={50}
                            height={50}
                            className="rounded-xl relative z-10 shadow-md group-hover:scale-110 transition-transform duration-300"
                        />
                    </div>
                    <div className="animate-slide-right">
                        <h1 className="text-xl font-bold text-gray-900 leading-tight hover:text-green-700 transition-colors duration-200">
                            {ambulanceInfo?.vehicle_number || 'Ambulance'}
                        </h1>
                        <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            {isTracking ? t('ambulance.gpsActive') : t('ambulance.gpsInactive')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-emerald-600 font-medium transition-colors"
                        title={language === 'en' ? 'Switch to Malayalam' : 'Switch to English'}
                    >
                        <Languages className="w-5 h-5" />
                        {language === 'en' ? 'മലയാളം' : 'English'}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-md group"
                    >
                        <LogOut className="w-6 h-6 group-hover:rotate-12 transition-transform duration-200" />
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-5">
                {emergencies.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {emergencies.map((e, idx) => (
                            <button
                                key={e.id}
                                onClick={() => setSelectedEmergencyId(e.id)}
                                className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap border-2 transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 ${selectedEmergencyId === e.id || (!selectedEmergencyId && idx === 0)
                                    ? 'bg-linear-to-r from-green-600 to-emerald-600 border-green-600 text-white shadow-lg scale-105 animate-pulse-subtle'
                                    : 'bg-white/80 backdrop-blur-sm border-gray-200 text-gray-700 hover:border-green-300 hover:shadow-md hover:bg-white'
                                    }`}
                            >
                                {t('ambulance.mission')} {idx + 1}: {e.name || t('ambulance.anonymous')}
                            </button>
                        ))}
                    </div>
                )}

                {emergency ? (
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border-2 border-red-400 animate-slide-up hover:shadow-3xl transition-all duration-300 hover:scale-[1.01]">
                        <div className={`p-5 text-white flex justify-between items-center relative overflow-hidden ${emergency.status === 'in_progress' ? 'bg-linear-to-r from-green-600 to-emerald-600' : 'bg-linear-to-r from-red-600 to-red-700'}`}>
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                            <h2 className="font-bold text-xl flex items-center gap-2 relative z-10">
                                <span className="animate-pulse text-2xl">{emergency.status === 'in_progress' ? '✅' : '🚨'}</span> {emergency.status === 'in_progress' ? t('ambulance.patientPickedUp') : t('ambulance.emergencyAssigned')}
                            </h2>
                            <span className={`text-xs backdrop-blur-sm px-3 py-1.5 rounded-full font-bold relative z-10 animate-bounce-subtle ${emergency.status === 'in_progress' ? 'bg-green-800/80' : 'bg-red-800/80'}`}>{emergency.status === 'in_progress' ? t('ambulance.inTransit') : t('ambulance.critical')}</span>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-linear-to-r from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-100 hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-default">
                                <p className="text-sm text-gray-600 mb-1 font-medium">{t('ambulance.patientName')}</p>
                                <p className="text-2xl font-bold text-gray-900">{emergency.name || t('ambulance.unknown')}</p>
                            </div>

                            <div className="flex items-start gap-4">
                                <a href={`tel:${emergency.phone_number}`} className="flex-1 bg-green-50/80 backdrop-blur-sm p-4 rounded-2xl border-2 border-green-200 flex items-center gap-3 active:scale-95 transition-all duration-300 hover:shadow-lg hover:border-green-300 hover:bg-green-100/80 group">
                                    <div className="w-12 h-12 bg-linear-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                                        <Phone className="w-6 h-6 text-white group-hover:animate-wiggle" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 font-medium">{t('ambulance.callPatient')}</p>
                                        <p className="font-bold text-green-700 text-lg group-hover:text-green-800 transition-colors">{emergency.phone_number}</p>
                                    </div>
                                </a>
                            </div>

                            <div className="bg-linear-to-br from-gray-50 to-gray-100 p-5 rounded-2xl border-2 border-gray-200 shadow-inner hover:shadow-md transition-all duration-300">
                                <div className="flex items-center gap-2 mb-3 text-gray-700 text-sm font-semibold">
                                    <MapPin className="w-5 h-5 text-green-600 animate-bounce-subtle" />
                                    {t('ambulance.pickupLocation')}
                                </div>
                                <p className="font-mono text-sm text-gray-700 mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    {emergency.latitude.toFixed(6)}, {emergency.longitude.toFixed(6)}
                                </p>

                                {/* Map Integration */}
                                <div className="h-[450px] rounded-2xl overflow-hidden mb-4 border-4 border-green-500 shadow-lg hover:shadow-2xl transition-shadow duration-300">
                                    {location ? (
                                        <LiveTrackingMap
                                            latitude={location.lat}
                                            longitude={location.lng}
                                            destLat={emergency.status === 'in_progress' ? emergency.assigned_hospital_lat : emergency.latitude}
                                            destLng={emergency.status === 'in_progress' ? emergency.assigned_hospital_lng : emergency.longitude}
                                            isHospital={emergency.status === 'in_progress'}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center text-gray-500 text-sm font-medium">
                                            {t('ambulance.waitingGps')}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={openMap}
                                    className="w-full bg-blue-50/80 backdrop-blur-sm text-blue-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 border-2 border-blue-200 active:scale-95 transition-all duration-300 mb-3 text-sm hover:shadow-lg hover:bg-blue-100 hover:border-blue-300 group"
                                >
                                    <Navigation className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                                    {emergency.status === 'in_progress' ? t('ambulance.navHospital') : t('ambulance.navPatient')}
                                </button>

                                {emergency.status === 'dispatched' ? (
                                    <button
                                        onClick={() => updateEmergencyStatus(emergency.id, 'in_progress')}
                                        className="w-full bg-linear-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] group"
                                    >
                                        <CheckCircle className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                                        {t('ambulance.markPickedUp')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => updateEmergencyStatus(emergency.id, 'resolved')}
                                        className="w-full bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] group"
                                    >
                                        <CheckCircle className="w-5 h-5 group-hover:scale-125 transition-transform duration-300" />
                                        {t('ambulance.completeMission')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center border border-white/50 hover:shadow-3xl transition-all duration-300 animate-fade-in">
                        <div className="w-24 h-24 bg-linear-to-br from-green-50 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 relative group cursor-default">
                            <div className="w-4 h-4 bg-green-500 rounded-full animate-ping absolute"></div>
                            <CheckCircle className="w-12 h-12 text-green-600 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2 hover:text-green-700 transition-colors duration-200">{t('ambulance.youAreActive')}</h2>
                        <p className="text-gray-600 mb-6 font-medium">{t('ambulance.waitingAssignment')}</p>

                        <div className="bg-linear-to-br from-gray-50 to-gray-100 p-5 rounded-2xl text-left border-2 border-gray-200 hover:shadow-md transition-all duration-300">
                            <p className="text-xs text-gray-600 uppercase font-bold tracking-wider mb-3">{t('ambulance.myStatus')}</p>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-700 font-semibold">{t('ambulance.locationUpdate')}</span>
                                <span className="text-green-600 font-mono font-bold animate-pulse-subtle">
                                    {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : t('ambulance.wait')}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}