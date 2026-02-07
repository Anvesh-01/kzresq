"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Shield, MapPin, Clock, AlertCircle, Phone, CheckCircle, Eye, Radio, Siren, Hospital, Navigation, Activity, Languages } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import "leaflet/dist/leaflet.css";
import { useLanguage } from '@/components/LanguageContext';

const PoliceMap = dynamic(() => import("./map/PoliceMap"), {
  ssr: false,
  loading: () => <div className="h-96 lg:h-[500px] w-full bg-gray-50 animate-pulse rounded-lg flex items-center justify-center text-gray-400 font-medium">Loading Interactive Map...</div>,
});

const LiveTrackingMap = dynamic(() => import('@/components/LiveTrackingMap'), {
  ssr: false,
  loading: () => <div className="h-96 lg:h-[500px] w-full bg-gray-50 animate-pulse rounded-lg flex items-center justify-center text-gray-400 font-medium">Loading Live Map...</div>,
});

/* ---------------- SUPABASE SETUP ---------------- */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ---------------- TYPES ---------------- */
type Hospital = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
};

type Emergency = {
  id: string;
  phone_number: string;
  name: string | null;
  latitude: number;
  longitude: number;
  location_text: string | null;
  emergency_level: 'low' | 'medium' | 'high' | 'critical';
  emergency_type: string | null;
  description: string | null;
  status: 'pending' | 'acknowledged' | 'dispatched' | 'in_progress' | 'resolved' | 'cancelled';
  assigned_hospital_name: string | null;
  assigned_hospital_lat: number | null;
  assigned_hospital_lng: number | null;
  assigned_ambulance_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  blood_group: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  created_at: string;
  updated_at: string;
  hospital_id: string | null;
  hospital?: Hospital;
  assigned_ambulance_id?: string | null;
};

type PoliceRequest = {
  id: string;
  emergency_id: string;
  hospital_id: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  traffic_notes: string | null;
  requested_at: string;
  acknowledged_at: string | null;
  updated_at: string;
  emergency: Emergency;
  hospital: Hospital;
};

/* ---------------- MAP COMPONENT WITH ROUTE ---------------- */
const EmergencyRouteMap = ({
  emergencyLat,
  emergencyLng,
  hospitalLat,
  hospitalLng,
  hospitalName,
  ambulanceLat,
  ambulanceLng,
}: {
  emergencyLat: number;
  emergencyLng: number;
  hospitalLat?: number | null;
  hospitalLng?: number | null;
  hospitalName?: string | null;
  ambulanceLat?: number | null;
  ambulanceLng?: number | null;
}) => {
  const { t } = useLanguage();

  if (true) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-lg text-gray-900">{t('police.emergencyLocation')}</h3>
          </div>

          {ambulanceLat && ambulanceLng ? (
            <div className="w-full h-96 lg:h-[500px] rounded-lg overflow-hidden border border-gray-200">
              <LiveTrackingMap
                latitude={ambulanceLat}
                longitude={ambulanceLng}
                destLat={emergencyLat}
                destLng={emergencyLng}
                isHospital={false}
              />
            </div>
          ) : (
            <div className="w-full h-96 lg:h-[500px] rounded-lg overflow-hidden border border-gray-200">
              <PoliceMap
                userLat={Number(emergencyLat)}
                userLng={Number(emergencyLng)}
                hospitalLat={hospitalLat ? Number(hospitalLat) : 0}
                hospitalLng={hospitalLng ? Number(hospitalLng) : 0}
              />
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-gray-500 font-medium">{t('police.incidentDetails')}</p>
                <p className="text-gray-900 font-semibold">{emergencyLat.toFixed(4)}, {emergencyLng.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Hospital className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-gray-500 font-medium">{hospitalName || 'Hospital'}</p>
                <p className="text-gray-900 font-semibold">
                  {hospitalLat && hospitalLng
                    ? `${Number(hospitalLat).toFixed(4)}, ${Number(hospitalLng).toFixed(4)}`
                    : 'Location pending'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

/* ---------------- UTILITY FUNCTIONS ---------------- */
const getTimeAgo = (timestamp: string) => {
  const now = new Date();
  const created = new Date(timestamp);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(2)}km`;
};

export default function PoliceDashboard() {
  const { t, language, setLanguage } = useLanguage();
  const [timeNow, setTimeNow] = useState("");
  const [policeRequests, setPoliceRequests] = useState<PoliceRequest[]>([]);
  const [selected, setSelected] = useState<PoliceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignedHospital, setAssignedHospital] = useState<Hospital | null>(null);
  const [trackedAmbulanceId, setTrackedAmbulanceId] = useState<string | null>(null);
  const [ambulanceLocation, setAmbulanceLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  /* ---------------- LIVE CLOCK ---------------- */
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /* ---------------- FETCH POLICE REQUESTS ---------------- */
  const fetchPoliceRequests = async () => {
    try {
      const res = await fetch('/api/police-requests');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const result = await res.json();
      const newRequests = result.data || [];
      setPoliceRequests(newRequests);

      if (selected) {
        const updated = newRequests.find((r: PoliceRequest) => r.id === selected.id);
        if (updated) {
          if (updated.status !== selected.status) {
            viewLocation(updated);
          } else {
            setSelected(updated);
          }
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching police requests:', error);
      setLoading(false);
    }
  };

  /* ---------------- FETCH HOSPITAL ---------------- */
  const fetchHospitalById = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', hospitalId)
        .single();

      if (error) {
        console.error('Hospital fetch error:', error);
        return null;
      }
      return data as Hospital;
    } catch (err) {
      console.error('Error fetching hospital:', err);
      return null;
    }
  };

  const fetchHospitalByName = async (name: string) => {
    try {
      const { data: exactMatch, error: exactError } = await supabase
        .from('hospitals')
        .select('*')
        .ilike('name', name)
        .maybeSingle();

      if (!exactError && exactMatch) return exactMatch as Hospital;

      const { data: fuzzyMatches, error: fuzzyError } = await supabase
        .from('hospitals')
        .select('*')
        .ilike('name', `%${name.split(' ')[0]}%`)
        .limit(5);

      if (!fuzzyError && fuzzyMatches && fuzzyMatches.length > 0) {
        return fuzzyMatches[0] as Hospital;
      }
      return null;
    } catch (err) {
      console.error('Error fetching hospital by name:', err);
      return null;
    }
  };

  /* ---------------- POLLING ---------------- */
  useEffect(() => {
    fetchPoliceRequests();
    const interval = setInterval(fetchPoliceRequests, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- UPDATE STATUS ---------------- */
  const updateStatus = async (id: string, newStatus: PoliceRequest['status']) => {
    try {
      const res = await fetch('/api/police-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      setPoliceRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: newStatus } : r)
      );

      if (selected?.id === id) {
        setSelected(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const markAcknowledged = (id: string) => updateStatus(id, 'acknowledged');
  const markResolved = (id: string) => updateStatus(id, 'resolved');

  /* ---------------- VIEW LOCATION ---------------- */
  const viewLocation = async (request: PoliceRequest) => {
    setSelected(request);
    const emergency = request.emergency;

    if (emergency.assigned_ambulance_id) {
      setTrackedAmbulanceId(emergency.assigned_ambulance_id);
    } else {
      setTrackedAmbulanceId(null);
    }

    if (emergency.assigned_hospital_lat && emergency.assigned_hospital_lng) {
      const hospitalData = {
        id: '',
        name: emergency.assigned_hospital_name || 'Assigned Hospital',
        address: '',
        latitude: emergency.assigned_hospital_lat,
        longitude: emergency.assigned_hospital_lng,
        phone: null
      };
      setAssignedHospital(hospitalData);
    } else if (request.hospital && request.hospital.latitude && request.hospital.longitude) {
      setAssignedHospital(request.hospital);
    } else if (emergency.hospital_id) {
      const hospitalData = await fetchHospitalById(emergency.hospital_id);
      if (hospitalData) {
        setAssignedHospital(hospitalData);
      } else {
        setAssignedHospital(null);
      }
    } else if (emergency.assigned_hospital_name) {
      const hospitalData = await fetchHospitalByName(emergency.assigned_hospital_name);
      if (hospitalData) {
        setAssignedHospital(hospitalData);
      } else {
        setAssignedHospital(null);
      }
    } else {
      setAssignedHospital(null);
    }

    setTimeout(() => {
      const mapSection = document.getElementById('location-map-section');
      if (mapSection) {
        mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  /* ---------------- COMPUTED VALUES ---------------- */
  const getPriorityStyles = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-black text-white border-2 border-black';
      case 'high':
        return 'bg-gray-800 text-white border-2 border-gray-800';
      case 'medium':
        return 'bg-gray-600 text-white border-2 border-gray-600';
      default:
        return 'bg-gray-400 text-white border-2 border-gray-400';
    }
  };

  const activeRequests = policeRequests.filter(r =>
    ['pending', 'acknowledged'].includes(r.status)
  );
  const criticalCount = policeRequests.filter(r =>
    r.emergency.emergency_level === 'critical' &&
    ['pending', 'acknowledged'].includes(r.status)
  ).length;
  const resolvedCount = policeRequests.filter(r => r.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ================= HEADER ================= */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile Layout */}
          <div className="flex flex-col gap-3 sm:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white border border-gray-200">
                  <Image
                    src="/KenLogo.png"
                    alt="KEN Logo"
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    {t('police.title')}
                  </h1>
                  <p className="text-xs text-gray-600">
                    {t('police.subtitle')}
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                PC
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200 self-start">
              <Activity className="w-4 h-4 text-green-600 animate-pulse" />
              <span className="text-green-800 font-semibold text-xs">
                {t('police.live')} · {timeNow}
              </span>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-white border border-gray-200">
                <Image
                  src="/KenLogo.png"
                  alt="KEN Logo"
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {t('police.title')}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {t('police.subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50 rounded-lg border border-green-200">
                <Activity className="w-5 h-5 text-green-600 animate-pulse" />
                <div className="text-left">
                  <p className="text-xs text-gray-600 font-medium">{t('police.systemStatus')}</p>
                  <span className="text-green-800 font-bold text-sm">
                    {t('police.live')} · {timeNow}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-emerald-600 font-medium transition-colors border border-gray-200 rounded-lg"
                title={language === 'en' ? 'Switch to Malayalam' : 'Switch to English'}
              >
                <Languages className="w-5 h-5" />
                {language === 'en' ? 'മലയാളം' : 'English'}
              </button>

              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="hidden lg:block">
                  <p className="font-bold text-gray-900 text-sm">{t('police.officerOnDuty')}</p>
                  <p className="text-xs text-gray-600">{t('police.controlRoom')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto">

        {/* ========== STATS CARDS ========== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Siren className="w-6 h-6 text-gray-700" />
              </div>
              <span className="text-3xl font-bold text-gray-900">{activeRequests.length}</span>
            </div>
            <p className="text-sm font-semibold text-gray-600">{t('police.activeEmergencies')}</p>
            <div className="mt-2 w-full h-1 bg-green-600 rounded-full"></div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-gray-900" />
              </div>
              <span className="text-3xl font-bold text-gray-900">{criticalCount}</span>
            </div>
            <p className="text-sm font-semibold text-gray-600">{t('police.criticalCases')}</p>
            <div className="mt-2 w-full h-1 bg-black rounded-full"></div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-3xl font-bold text-gray-900">{resolvedCount}</span>
            </div>
            <p className="text-sm font-semibold text-gray-600">{t('police.resolvedToday')}</p>
            <div className="mt-2 w-full h-1 bg-green-600 rounded-full"></div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Radio className="w-6 h-6 text-gray-700" />
              </div>
              <span className="text-3xl font-bold text-gray-900">{policeRequests.length}</span>
            </div>
            <p className="text-sm font-semibold text-gray-600">{t('police.totalRequests')}</p>
            <div className="mt-2 w-full h-1 bg-gray-400 rounded-full"></div>
          </div>
        </div>

        {/* ========== LIVE EMERGENCIES ========== */}
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 lg:px-8 py-5 bg-gray-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Siren className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {t('police.emergencyAlerts')}
                </h2>
                <p className="text-gray-300 text-sm">{t('police.realTimeTraffic')}</p>
              </div>
            </div>
            <div className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-bold border border-white/20">
              {activeRequests.length} {t('police.active')}
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">{t('police.loadingRequests')}</p>
              </div>
            ) : policeRequests.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-gray-700 font-semibold text-lg">{t('police.noActive')}</p>
                <p className="text-gray-500 text-sm mt-2">{t('police.allClear')}</p>
              </div>
            ) : (
              policeRequests.map((request) => {
                const e = request.emergency;
                return (
                  <div
                    key={request.id}
                    onClick={() => viewLocation(request)}
                    className={`p-6 lg:p-8 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === request.id ? "bg-green-50 border-l-4 border-green-600" : ""
                      }`}
                  >
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0">
                          <AlertCircle className={`w-7 h-7 ${e.emergency_level === 'critical' ? 'text-black' :
                            e.emergency_level === 'high' ? 'text-gray-800' :
                              e.emergency_level === 'medium' ? 'text-gray-600' : 'text-gray-500'
                            }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg text-gray-900 mb-3">
                            {e.emergency_type || 'Emergency Alert'}
                          </p>
                          <div className="space-y-2">
                            {e.name && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <Eye className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <p className="text-sm font-medium">{e.name}</p>
                              </div>
                            )}
                            {e.phone_number && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <p className="text-sm font-medium">{e.phone_number}</p>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-700">
                              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <p className="text-sm font-medium">
                                {e.location_text || `${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)}`}
                              </p>
                            </div>
                            {e.assigned_hospital_name && (
                              <div className="flex items-center gap-2 text-green-700">
                                <Hospital className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <p className="text-sm font-medium">{e.assigned_hospital_name}</p>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-500">
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              <p className="text-xs font-medium">{getTimeAgo(e.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className={`px-4 py-2 rounded-lg text-sm font-bold uppercase text-center ${getPriorityStyles(e.emergency_level)}`}>
                          {e.emergency_level}
                        </span>
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold text-center border border-gray-200">
                          {e.status}
                        </span>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    {['pending', 'acknowledged'].includes(request.status) && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            viewLocation(request);
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>{t('police.viewRoute')}</span>
                        </button>
                        {request.status === 'pending' && (
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              markAcknowledged(request.id);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>{t('police.acknowledge')}</span>
                          </button>
                        )}
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            markResolved(request.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{t('police.markResolved')}</span>
                        </button>
                      </div>
                    )}

                    {request.status === 'resolved' && (
                      <div className="flex items-center gap-3 px-5 py-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="font-semibold text-sm text-green-800">
                          {t('police.resolvedSuccess')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ========== MAP SECTION ========== */}
        {selected && (
          <section id="location-map-section" className="bg-white rounded-lg border border-gray-200 p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col gap-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {t('police.emergencyLocation')}
                  </h2>
                  <p className="text-gray-600 text-sm">{t('police.trafficManagement')}</p>
                </div>
              </div>

              {/* Location Info Card */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2 tracking-wider">{t('police.incidentDetails')}</p>
                    <p className="font-bold text-gray-900 text-lg mb-2">{selected.emergency.emergency_type || 'Emergency'}</p>
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {selected.emergency.location_text || `${selected.emergency.latitude.toFixed(6)}, ${selected.emergency.longitude.toFixed(6)}`}
                    </p>
                  </div>

                  {selected.emergency.phone_number && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-bold text-gray-500 mb-2 tracking-wider">{t('police.patientContact')}</p>
                      <a
                        href={`tel:${selected.emergency.phone_number}`}
                        className="text-green-700 font-bold text-lg hover:text-green-800 flex items-center gap-2"
                      >
                        <Phone className="w-5 h-5" />
                        {selected.emergency.phone_number}
                      </a>
                      {selected.emergency.name && (
                        <p className="text-sm text-gray-700 mt-2">{selected.emergency.name}</p>
                      )}
                    </div>
                  )}

                  {assignedHospital && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-bold text-gray-500 mb-2 tracking-wider">{t('police.destHospital')}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <Hospital className="w-5 h-5 text-green-600" />
                        <p className="font-bold text-gray-900 text-lg">{assignedHospital.name}</p>
                      </div>
                      {assignedHospital.latitude && assignedHospital.longitude && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Navigation className="w-4 h-4 text-gray-500" />
                          <span>{t('police.distance')}: </span>
                          <span className="font-bold text-green-700">
                            {calculateDistance(
                              selected.emergency.latitude,
                              selected.emergency.longitude,
                              assignedHospital.latitude,
                              assignedHospital.longitude
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selected.emergency.description && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-bold text-gray-500 mb-2 tracking-wider">{t('police.additionalInfo')}</p>
                      <p className="text-sm text-gray-700">{selected.emergency.description}</p>
                    </div>
                  )}
                </div>

                {/* Police Action Alert */}
                <div className="mt-5 p-4 bg-green-600 rounded-lg">
                  <p className="text-white font-bold text-sm flex items-center gap-3">
                    <Shield className="w-5 h-5" />
                    🚔 {t('police.priorityAlert')}
                  </p>
                </div>
              </div>
            </div>

            <EmergencyRouteMap
              emergencyLat={selected.emergency.latitude}
              emergencyLng={selected.emergency.longitude}
              hospitalLat={assignedHospital?.latitude}
              hospitalLng={assignedHospital?.longitude}
              hospitalName={assignedHospital?.name}
              ambulanceLat={ambulanceLocation?.latitude}
              ambulanceLng={ambulanceLocation?.longitude}
            />
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/KenLogo.png"
              alt="KEN Logo"
              width={36}
              height={36}
              className="w-9 h-9 object-contain"
            />
            <div>
              <p className="font-bold text-gray-900 text-sm">Kozhikode Emergency Network</p>
              <p className="text-xs text-gray-600">Every Second Saves a Life</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            © 2026 KEN - All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
}