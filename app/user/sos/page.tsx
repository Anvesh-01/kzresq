"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Phone, Users, MapPin, Clock, AlertCircle, Loader2, CheckCircle, Zap, Shield, X } from "lucide-react";
import { UserSession } from "@/lib/auth-client";
import { useLanguage } from "@/components/LanguageContext";

type Hospital = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  phone_number?: string;
  distance?: number;
  ai_score?: number;
  availability?: {
    total: number;
    occupied: number;
    load_percentage: number;
  };
};

export default function SOSPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locationError, setLocationError] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] =
    useState<Hospital | null>(null);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const [isCreatingEmergency, setIsCreatingEmergency] = useState(false);
  const [isSplash, setIsSplash] = useState(true);

  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasNavigatedRef = useRef(false);

  /* ---------------- SPLASH SCREEN TIMER ---------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplash(false);
    }, 1000); // Faster duration
    return () => clearTimeout(timer);
  }, []);

  /* ---------------- DISTANCE ---------------- */
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  /* ---------------- FETCH HOSPITALS ---------------- */
  const fetchHospitals = async (lat: number, lng: number) => {
    try {
      const res = await fetch("/api/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      let data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
        console.error("Failed to fetch hospitals:", data);
        setHospitals([]);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = data.map((h: any) => ({
        id: h.id,
        name: h.name,
        lat: h.latitude,
        lng: h.longitude,
        phone_number: h.phone,
        distance: calculateDistance(lat, lng, h.latitude, h.longitude),
        ai_score: h.ai_score,
        availability: h.availability
      }))
        // Sort by AI score if available, otherwise by distance
        .sort((a: any, b: any) => (b.ai_score || 0) - (a.ai_score || 0));

      setHospitals(data);

      autoTimerRef.current = setTimeout(() => {
        if (!selectedHospital) {
          if (phone.trim() && location) {
            createEmergency(phone.trim(), location.lat, location.lng, name.trim() || undefined, null, 20);
          }
        }
      }, 10000);
    } catch (error) {
      console.error("Error fetching hospitals:", error);
    }
  };

  /* ---------------- CREATE EMERGENCY IN DB ---------------- */
  const createEmergency = async (
    phoneNumber: string,
    lat: number,
    lng: number,
    userName?: string,
    selectedHospitalId?: string | null,
    notifyCount?: number
  ) => {
    if (isCreatingEmergency || emergencyId) return emergencyId;

    setIsCreatingEmergency(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
        phone: phoneNumber,
        latitude: lat,
        longitude: lng,
        name: userName || null,
        emergency_type: "SOS",
        user_notes: "Emergency SOS call",
      };

      if (selectedHospitalId) {
        payload.selected_hospital_id = selectedHospitalId;
      } else if (notifyCount) {
        payload.radius_km = 50;
      }

      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setEmergencyId(data.emergency.id);
        return data.emergency.id;
      } else {
        alert(data.error || "Failed to create emergency");
        return null;
      }
    } catch (err) {
      console.error("Error creating emergency:", err);
      alert("Server error while creating emergency");
      return null;
    } finally {
      setIsCreatingEmergency(false);
    }
  };

  /* ---------------- GET LOCATION ---------------- */
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocation({ lat, lng });
          fetchHospitals(lat, lng);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Location permission denied. Please enable location access.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser");
    }
  };

  /* ---------------- CHECK SESSION ON MOUNT ---------------- */
  useEffect(() => {
    // Check if user is logged in
    const sessionCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_session="));

    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(
          decodeURIComponent(sessionCookie.split("=")[1])
        );
        setUserSession(sessionData);
        // Auto-populate name and phone for logged-in users
        setName(sessionData.name || "");
        setPhone(sessionData.phone_number || "");
      } catch (error) {
        console.error("Failed to parse session:", error);
      }
    }
  }, []);

  /* ---------------- AUTO GET LOCATION ON MOUNT ---------------- */
  useEffect(() => {
    getUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- HANDLE PHONE SUBMIT ---------------- */
  const handlePhoneSubmit = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return;

    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(trimmedPhone) || trimmedPhone.replace(/\D/g, "").length < 10) {
      alert("Please enter a valid phone number (at least 10 digits)");
      return;
    }
  };

  /* ---------------- AUTO CONTINUE (SAFE) ---------------- */
  useEffect(() => {
    if (location && emergencyId && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;

      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
      }

      const params = new URLSearchParams();
      params.append("emergencyId", emergencyId);
      params.append("mode", "CRITICAL");
      params.append("uLat", location.lat.toString());
      params.append("uLng", location.lng.toString());

      if (selectedHospital) {
        params.append("hospital", selectedHospital.name);
        params.append("hLat", selectedHospital.lat.toString());
        params.append("hLng", selectedHospital.lng.toString());
      } else {
        params.append("hospital", "Nearby Hospitals");
      }

      router.push(`/user/emergency-status?${params.toString()}`);
    }
  }, [location, selectedHospital, emergencyId, router]);

  /* ---------------- MANUAL CONTINUE ---------------- */
  const handleContinue = async () => {
    if (!phone.trim()) {
      alert("Please enter your phone number");
      return;
    }

    if (!location) {
      alert("Waiting for location...");
      return;
    }

    let currentEmergencyId = emergencyId;
    if (!currentEmergencyId && !isCreatingEmergency) {
      if (selectedHospital) {
        currentEmergencyId = await createEmergency(
          phone.trim(),
          location.lat,
          location.lng,
          name.trim() || undefined,
          selectedHospital.id
        );
      } else {
        currentEmergencyId = await createEmergency(
          phone.trim(),
          location.lat,
          location.lng,
          name.trim() || undefined,
          null,
          20
        );
      }

      if (!currentEmergencyId) return;
    }

    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
    }
  };

  /* ---------------- CLEANUP ---------------- */
  useEffect(() => {
    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
      }
    };
  }, []);

  /* ---------------- UI ---------------- */
  return (
    <>
      {/* UBER-STYLE SPLASH SCREEN */}
      {isSplash && (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center overflow-hidden animate-[uber-exit_0.4s_ease-in-out_0.6s_forwards]">
          <div className="relative w-28 h-28 md:w-36 md:h-36 animate-[uber-reveal_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <Image
              src="/KenLogo1.png"
              alt="KEN Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 relative overflow-hidden flex items-center justify-center px-4 py-6">
        {/* BACKGROUND DECORATIONS */}
        <div className="blur-blob w-[600px] h-[600px] bg-gradient-to-br from-emerald-200 to-green-100 -top-32 -left-32 animate-pulse-slow z-0 opacity-30" />
        <div className="blur-blob w-[700px] h-[700px] bg-gradient-to-tl from-teal-200 to-emerald-100 -bottom-40 -right-40 animate-pulse-slow [animation-delay:1s] z-0 opacity-20" />
        <div className="blur-blob w-[400px] h-[400px] bg-gradient-to-tr from-green-100 to-emerald-50 top-1/3 -right-20 animate-pulse-slow [animation-delay:2s] z-0 opacity-15" />

        <div className={`relative z-10 w-full max-w-lg transition-all duration-700 ease-in-out ${isSplash ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100 blur-0'}`}>
          {/* HEADER */}
          <div className={`text-center mb-10 ${!isSplash ? 'animate-[premium-blur-in_0.6s_ease-out_forwards]' : ''}`}>
            <div className="relative inline-flex items-center justify-center w-24 h-24 mb-5">
              <div className="relative w-24 h-24 drop-shadow-2xl">
                <Image
                  src="/KenLogo1.png"
                  alt="KEN Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="-mt-7 text-4xl md:text-6xl font-extrabold text-gray-900 mb-3 tracking-tight">{t('sosTitle')}</h1>
          </div>

          <div className={`bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/60 ${!isSplash ? 'animate-[premium-blur-in_0.8s_ease-out_0.1s_both]' : 'opacity-0'}`}>

            {/* NAME INPUT (OPTIONAL) */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-800 mb-3 px-1">
                {t('requestingFor')} <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <div className="relative group">
                <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5 z-10" />
                <input
                  type="text"
                  placeholder={t('myself')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/80 border-2 border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white transition-all duration-200 font-medium"
                  disabled={isCreatingEmergency}
                />
              </div>
            </div>

            {/* PHONE INPUT */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-800 mb-3 px-1">
                Phone Number <span className="text-emerald-600 text-lg">*</span>
              </label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5 z-10" />
                <input
                  type="tel"
                  placeholder="+1 (234) 567-8900"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={handlePhoneSubmit}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/80 border-2 border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white transition-all duration-200 font-medium"
                  disabled={isCreatingEmergency}
                />
              </div>
              {isCreatingEmergency && (
                <div className="flex items-center gap-2 mt-3 text-emerald-600 px-1 animate-fade-in">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-sm font-semibold">{t('dispatching')}</p>
                </div>
              )}
              {emergencyId && (
                <div className="flex items-center gap-2 mt-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl animate-scale-in">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-bold text-green-800">{t('alertSent')}</p>
                </div>
              )}
            </div>

            {/* LOCATION STATUS */}
            {location && (
              <div className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl px-5 py-4 mb-6 animate-scale-in shadow-sm">
                <div className="bg-emerald-500 p-1.5 rounded-full">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-emerald-800 text-base">Location Detected</span>
              </div>
            )}

            {locationError && (
              <div className="flex items-start gap-3 bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6 animate-scale-in">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-800">{locationError}</p>
              </div>
            )}

            {/* MAP */}
            {location && (
              <div className="mb-7">
                <div className="flex items-center gap-2.5 mb-4 px-1">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900">Your Current Location</h3>
                </div>
                <div className="relative group">
                  <iframe
                    className="w-full h-64 rounded-2xl border-4 border-white shadow-xl group-hover:shadow-2xl transition-shadow duration-300"
                    loading="lazy"
                    src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
                  />
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-100 pointer-events-none"></div>
                </div>
              </div>
            )}

            {/* SELECTED HOSPITAL */}
            {selectedHospital && (
              <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-5 mb-7 animate-scale-in relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-emerald-500 px-2.5 py-1 rounded-full">
                        <p className="text-[10px] font-black text-white uppercase tracking-wider">Selected</p>
                      </div>
                    </div>
                    <p className="font-extrabold text-gray-900 text-xl leading-tight mb-2">{selectedHospital.name}</p>
                    <div className="flex flex-wrap gap-2">
                      <p className="text-sm text-emerald-700 flex items-center gap-2 font-bold">
                        <MapPin className="w-4 h-4" />
                        {selectedHospital.distance?.toFixed(2)} km away
                      </p>
                      {selectedHospital.ai_score && (
                        <p className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center ${selectedHospital.ai_score > 80 ? 'bg-green-200 text-green-800' :
                          selectedHospital.ai_score > 60 ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-800'
                          }`}>
                          AI Score: {selectedHospital.ai_score}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="bg-emerald-500 rounded-full p-2 shadow-lg">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-200 rounded-full opacity-20 blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-green-200 rounded-full opacity-20 blur-3xl pointer-events-none"></div>
              </div>
            )}

            {/* HOSPITAL LIST */}
            {hospitals.length > 0 && (
              <div className="mb-7">
                <div className="flex items-center gap-2.5 mb-4 px-1">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <MapPin className="w-4 h-4 text-gray-600" />
                  </div>
                  <p className="text-base font-extrabold text-gray-900">
                    Nearby Hospitals
                  </p>
                  <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {hospitals.length} found
                  </span>
                </div>

                <div className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {hospitals.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (autoTimerRef.current) {
                          clearTimeout(autoTimerRef.current);
                        }
                        setSelectedHospital(h);
                      }}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 group ${selectedHospital?.name === h.name
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg transform scale-[1.02]"
                        : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-md"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-gray-900 text-base leading-tight pr-2">{h.name}</p>
                        {selectedHospital?.name === h.name ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0 group-hover:border-emerald-400 transition-colors"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                          <p className="text-xs text-gray-600 font-semibold">
                            {h.distance?.toFixed(2)} km away
                          </p>
                        </div>
                        {h.ai_score && (
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.ai_score > 80 ? 'bg-green-100 text-green-700' :
                            h.ai_score > 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                            Match: {h.ai_score}%
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CONTINUE BUTTON */}
            <button
              onClick={handleContinue}
              disabled={
                !phone.trim() || !location || isCreatingEmergency
              }
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 flex items-center justify-center gap-3"
            >
              {isCreatingEmergency ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {t('dispatching')}
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  {t('criticalAlert')}
                </>
              )}
            </button>

            {/* QUICK TIP */}
            <div className="mt-8 p-5 bg-gradient-to-br from-emerald-50/80 to-green-50/80 backdrop-blur-sm border-2 border-emerald-100 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500 p-2 rounded-xl shadow-sm">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-emerald-900 uppercase tracking-wide mb-1">Auto-Response Protocol</p>
                  <p className="text-xs text-emerald-800/90 font-medium leading-relaxed">
                    If you don't select a hospital, we'll automatically notify the 10 nearest facilities after 10 seconds to ensure the fastest possible response.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className={`mt-8 flex flex-col items-center gap-5 ${!isSplash ? 'animate-[premium-blur-in_0.8s_ease-out_0.2s_both]' : 'opacity-0'}`}>
            <button
              onClick={() => router.push("/user/")}
              className="flex items-center gap-2.5 text-gray-600 hover:text-emerald-600 font-bold text-sm transition-all hover:gap-3 px-5 py-2.5 rounded-full hover:bg-white/50 backdrop-blur-sm"
            >
              <div className="p-1.5 rounded-full border-2 border-gray-300 group-hover:border-emerald-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </div>
              Go Back
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #059669);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #047857);
        }
      `}</style>
    </>
  );
}