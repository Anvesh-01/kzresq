"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { User, Phone, Droplet, FileText, MapPin, Hospital, Clock, Navigation, AlertCircle, Activity, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import Image from "next/image";

type Hospital = {
  name: string;
  lat: number;
  lng: number;
  distance: number;
  doctor: string;
  ai_score?: number;
  availability?: {
    total: number;
    occupied: number;
    load_percentage: number;
  };
};

export default function EmergencyDetailsPage() {
  /* ---------------- MOCK USER ---------------- */
  const user = {
    name: "John Doe",
    phone: "9845612206",
    bloodGroup: "O+",
    conditions: "Asthma",
  };

  /* ---------------- STATE ---------------- */
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] =
    useState<Hospital | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<string | null>(null);
  const [isSplash, setIsSplash] = useState(true);

  /* ---------------- SPLASH SCREEN TIMER ---------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplash(false);
    }, 1000);
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
  const fetchHospitals = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch("/api/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      const data = await res.json();

      if (!Array.isArray(data)) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enriched: Hospital[] = data.map((h: any) => ({
        name: h.name,
        lat: h.latitude,
        lng: h.longitude,
        distance: h.distance || calculateDistance(lat, lng, h.latitude, h.longitude),
        doctor: ["General Physician", "Cardiologist", "Orthopaedic"][
          Math.floor(Math.random() * 3)
        ],
        ai_score: h.ai_score,
        availability: h.availability
      }));

      // Sort by AI score if available, otherwise by distance
      enriched.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));

      setHospitals(enriched);
    } catch (error) {
      console.error("Error fetching hospitals:", error);
    }
  }, []);

  /* ---------------- LOCATION ---------------- */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocation(loc);
        fetchHospitals(loc.lat, loc.lng);
      },
      () => alert("Location permission required"),
      { enableHighAccuracy: true }
    );
  }, [fetchHospitals]);

  /* ---------------- SELECT HOSPITAL ---------------- */
  const handleHospitalSelect = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setAppointmentTime("Within 30–45 minutes");

    // Smooth scroll to scroll bottom
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  };

  /* ---------------- SUBMIT ---------------- */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleRequestAppointment = async () => {
    if (!issueType) {
      setSubmitError("Please select a medical issue");
      return;
    }
    if (!selectedHospital) {
      setSubmitError("Please select a hospital");
      return;
    }
    if (!location) {
      setSubmitError("Location not available");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_phone: user.phone,
          user_name: user.name,
          blood_group: user.bloodGroup,
          medical_conditions: user.conditions,
          issue_type: issueType,
          description: description,
          hospital_name: selectedHospital.name,
          hospital_lat: selectedHospital.lat,
          hospital_lng: selectedHospital.lng,
          user_lat: location.lat,
          user_lng: location.lng,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitSuccess(true);
        // Reset form after 3 seconds
        setTimeout(() => {
          setIssueType("");
          setDescription("");
          setSelectedHospital(null);
          setAppointmentTime(null);
          setSubmitSuccess(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 3000);
      } else {
        setSubmitError(data.error || "Failed to submit appointment request");
      }
    } catch (error) {
      console.error("Error submitting appointment:", error);
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 relative overflow-hidden py-8 px-4 sm:px-6 lg:px-8">
        {/* BACKGROUND DECORATIONS */}
        <div className="blur-blob w-[600px] h-[600px] bg-gradient-to-br from-emerald-200 to-green-100 -top-32 -left-32 animate-pulse-slow z-0 opacity-30 fixed" />
        <div className="blur-blob w-[700px] h-[700px] bg-gradient-to-tl from-teal-200 to-emerald-100 -bottom-40 -right-40 animate-pulse-slow [animation-delay:1s] z-0 opacity-20 fixed" />

        <div className={`relative z-10 max-w-5xl mx-auto transition-all duration-700 ease-in-out ${isSplash ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100 blur-0'}`}>
          {/* HEADER */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
              <div className="relative w-20 h-20 drop-shadow-xl">
                <Image
                  src="/KenLogo1.png"
                  alt="KEN Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">Medical Assistance</h1>
            <p className="text-gray-600 font-medium">Request appointments with nearby AI-recommended hospitals</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT COLUMN - USER INFO & FORM */}
            <div className="lg:col-span-1 space-y-6">
              {/* PATIENT DETAILS CARD */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60 p-6 animate-slide-up">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Patient Details</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Name</p>
                      <p className="text-gray-900 font-bold text-sm">{user.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Phone</p>
                      <p className="text-gray-900 font-bold text-sm">{user.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
                      <Droplet className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Blood</p>
                        <p className="text-gray-900 font-bold text-sm">{user.bloodGroup}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Conditions</p>
                        <p className="text-gray-900 font-bold text-sm truncate max-w-[80px]">{user.conditions}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MEDICAL ISSUE CARD */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60 p-6 animate-slide-up [animation-delay:0.1s]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Medical Issue</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 pl-1">
                      Type of Issue <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-900 font-medium focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white transition-all appearance-none"
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                    >
                      <option value="">Select medical issue</option>
                      <option>General Consultation</option>
                      <option>Accident / Injury</option>
                      <option>Cardiac</option>
                      <option>Orthopaedic</option>
                      <option>Emergency</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 pl-1">
                      Description <span className="text-gray-400 font-medium normal-case">(Optional)</span>
                    </label>
                    <textarea
                      placeholder="Brief description of your condition..."
                      className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-900 font-medium h-32 resize-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white transition-all"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - MAP & HOSPITALS */}
            <div className="lg:col-span-2 space-y-6">

              {/* 1. MAP + CURRENT LOCATION */}
              {location && (
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60 p-6 animate-slide-up [animation-delay:0.2s]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Your Location</h2>
                  </div>
                  <div className="relative group rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                    <iframe
                      className="w-full h-48 md:h-64 group-hover:scale-105 transition-transform duration-700"
                      src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
                    />
                    <div className="absolute inset-0 ring-2 ring-emerald-100 pointer-events-none rounded-2xl"></div>
                  </div>
                </div>
              )}

              {/* 2. HOSPITAL SELECTION */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60 p-6 animate-slide-up [animation-delay:0.3s]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <Hospital className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Nearby Hospitals</h2>
                      <p className="text-xs text-gray-500 font-medium">Select a hospital to proceed</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {hospitals.length} found
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {hospitals.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => handleHospitalSelect(h)}
                      className={`relative w-full text-left p-4 rounded-3xl border-2 transition-all duration-300 group overflow-hidden ${selectedHospital?.name === h.name
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg transform scale-[1.02] ring-2 ring-emerald-200 ring-offset-2"
                        : "border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-md"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <div className="flex-1 pr-2">
                          <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{h.name}</h3>
                          {/* AI SCORE BADGE */}
                          {h.ai_score && (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${h.ai_score > 80 ? 'bg-green-100 text-green-700 border-green-200' :
                              h.ai_score > 60 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}>
                              <Activity className="w-3 h-3" />
                              Match: {h.ai_score}%
                            </div>
                          )}
                        </div>
                        {selectedHospital?.name === h.name ? (
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-200 rounded-full group-hover:border-emerald-300 transition-colors"></div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 font-medium relative z-10">
                        <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                          <MapPin className="w-3 h-3 text-emerald-500" />
                          {h.distance.toFixed(1)} km
                        </span>
                        {/* AVAILABILITY BADGE */}
                        {h.availability && (
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${h.availability.load_percentage < 50 ? 'bg-blue-50 text-blue-700' :
                            h.availability.load_percentage < 80 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'
                            }`}>
                            <Activity className="w-3 h-3" />
                            {h.availability.load_percentage < 50 ? 'Available' : h.availability.load_percentage < 80 ? 'Busy' : 'Full'}
                          </span>
                        )}
                      </div>

                      {/* DECORATIVE BLUR */}
                      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-emerald-100 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. CONFIRMATION / SUBMIT AREA */}
              {selectedHospital && location && (
                <div className="bg-gradient-to-br from-emerald-900 to-green-900 rounded-3xl shadow-2xl p-8 animate-slide-up text-white relative overflow-hidden">
                  {/* Background Patterns */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                        <Navigation className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Route to Hospital</h2>
                        <p className="text-emerald-100/80 text-sm">Estimated arrival: {appointmentTime}</p>
                      </div>
                    </div>

                    {/* MINI MAP or ROUTE INFO */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                          <Hospital className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] text-emerald-200 uppercase tracking-widest font-bold">Destination</p>
                          <p className="font-bold text-lg">{selectedHospital.name}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-6 h-6 text-emerald-200/50" />
                    </div>

                    <button
                      onClick={handleRequestAppointment}
                      disabled={isSubmitting || submitSuccess}
                      className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 ${submitSuccess
                        ? "bg-white text-emerald-900"
                        : isSubmitting
                          ? "bg-gray-500/50 text-white/50 cursor-not-allowed"
                          : "bg-gradient-to-r from-emerald-400 to-green-400 text-emerald-950"
                        }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Submitting Request...
                        </>
                      ) : submitSuccess ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                          Request Sent Successfully!
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-6 h-6" />
                          Confirm Appointment
                        </>
                      )}
                    </button>

                    {submitError && (
                      <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-center backdrop-blur-md">
                        <p className="text-red-100 text-sm font-bold flex items-center justify-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {submitError}
                        </p>
                      </div>
                    )}

                    {submitSuccess && (
                      <div className="mt-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-center backdrop-blur-md">
                        <p className="text-emerald-100 text-sm font-bold">
                          Redirecting to emergency status...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
