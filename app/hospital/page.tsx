'use client';
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  MapPin,
  Phone,
  Clock,
  LogOut,
  Ambulance,
  Calendar,
  User,
  Activity,
  FileText,
  AlertCircle,
  X,
  Search,
  Filter,
  Shield,
  Droplet,
  Languages
} from "lucide-react";
import AmbulanceAssignmentMap from '@/components/AmbulanceAssignmentMap';
import { getHospitalSession, clearHospitalSession } from '@/lib/auth-client';
import type { HospitalSession } from '@/lib/auth';
import dynamic from 'next/dynamic';
import { useLanguage } from "@/components/LanguageContext";

const LiveTrackingMap = dynamic(() => import('@/components/LiveTrackingMap'), {
  ssr: false,
  loading: () => <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-xl animate-pulse text-gray-400 font-bold">Loading Live Map...</div>
});

type AmbulanceType = {
  id: string;
  hospital_id: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  is_available: boolean;
  latitude: number;
  longitude: number;
};

type AmbulanceLocation = {
  ambulance_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
};

type SOSEmergency = {
  id: string;
  phone_number: string;
  name: string | null;
  latitude: number;
  longitude: number;
  emergency_level: string;
  status: string;
  created_at: string;
  assigned_hospital_name?: string;
  assigned_hospital_lat?: number;
  assigned_hospital_lng?: number;
  assigned_ambulance_number?: string;
  driver_name?: string;
  driver_phone?: string;
  description?: string;
  blood_group?: string;
  allergies?: string;
  medical_conditions?: string;
  hospital_id?: string;
  notified_hospitals?: string[];
  ai_score?: number;
};

type Appointment = {
  id: string;
  user_phone: string;
  user_name: string | null;
  blood_group: string | null;
  medical_conditions: string | null;
  issue_type: string;
  description: string | null;
  hospital_name: string;
  hospital_lat: number;
  hospital_lng: number;
  user_lat: number;
  user_lng: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  appointment_time: string | null;
  assigned_doctor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// Constants for polling intervals
const EMERGENCY_POLL_INTERVAL = 3000; // 3 seconds
const AMBULANCE_POLL_INTERVAL = 10000; // 10 seconds
const APPOINTMENT_POLL_INTERVAL = 5000; // 5 seconds
const AMBULANCE_LOCATION_POLL_INTERVAL = 3000; // 3 seconds

export default function HospitalDashboard() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [hospitalInfo, setHospitalInfo] = useState<HospitalSession | null>(null);
  const [emergencies, setEmergencies] = useState<SOSEmergency[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [timeNow, setTimeNow] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEmergencyId, setExpandedEmergencyId] = useState<string | null>(null);

  // 🚑 Ambulance live tracking state
  const [trackedAmbulanceId, setTrackedAmbulanceId] = useState<string | null>(null);
  const [ambulanceLocation, setAmbulanceLocation] = useState<AmbulanceLocation | null>(null);

  // Form state for new ambulance
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [phone, setPhone] = useState('');

  // Appointment modal state
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [appointmentDateTime, setAppointmentDateTime] = useState('');

  // Loading states for async operations
  const [isApproving, setIsApproving] = useState(false);
  const [assigningAmbulanceId, setAssigningAmbulanceId] = useState<string | null>(null);
  const [isAddingAmbulance, setIsAddingAmbulance] = useState(false);
  const [requestingPoliceFor, setRequestingPoliceFor] = useState<string | null>(null);
  const [policeRequested, setPoliceRequested] = useState<Set<string>>(new Set());


  // Helper to find ambulance ID by number and track it
  const trackAmbulanceByNumber = (vehicleNumber: string) => {
    const amb = ambulances.find(a => a.vehicle_number === vehicleNumber);
    if (amb) {
      console.log(`🚑 Starting tracking for ambulance: ${vehicleNumber} (ID: ${amb.id})`);
      console.log(`📍 Current ambulance data:`, amb);
      setTrackedAmbulanceId(amb.id);
    } else {
      console.error(`❌ Ambulance ${vehicleNumber} not found in list. Available ambulances:`, ambulances.map(a => a.vehicle_number));
      alert(`Ambulance ${vehicleNumber} not found in your list.`);
    }
  };

  // Toggle expanded state for emergency cards
  const toggleEmergencyExpansion = (id: string) => {
    setExpandedEmergencyId(prev => prev === id ? null : id);
  };

  // ✅ FIX: Move getDistance function to component level (was inside areHospitalNamesSimilar)
  const getDistance = useCallback((
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    // Safety check (prevents NaN bugs during demo)
    if (
      lat1 == null || lon1 == null ||
      lat2 == null || lon2 == null
    ) {
      return Infinity;
    }

    const R = 6371; // Earth radius in KM
    const toRad = (value: number) => (value * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Number((R * c).toFixed(2)); // distance in KM (rounded)
  }, []);

  // ✅ FIX: Simplified helper for fuzzy matching hospital names (removed incorrect code)
  const areHospitalNamesSimilar = useCallback((name1: string, name2: string) => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const tokens1 = normalize(name1).split(/\s+/).filter(t => t.length > 2);
    const tokens2 = normalize(name2).split(/\s+/).filter(t => t.length > 2);

    // Check for intersection
    const intersection = tokens1.filter(t => tokens2.includes(t));
    return intersection.length > 0;
  }, []);

  // ✅ FIX: Use stable hospitalId instead of entire hospitalInfo object
  const hospitalId = hospitalInfo?.id;
  const hospitalName = hospitalInfo?.name;

  // ✅ FIX: Added proper error handling and isMounted flag to prevent race conditions
  const fetchAppointments = useCallback(async () => {
    if (!hospitalId || !hospitalName) return;

    let isMounted = true;

    try {
      const res = await fetch(`/api/appointments?status=pending`);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (isMounted && data.success) {
        // Client-side fuzzy filter
        const myAppointments = data.data.filter((appt: Appointment) =>
          areHospitalNamesSimilar(appt.hospital_name, hospitalName)
        );
        setAppointments(myAppointments);
      }
    } catch (error) {
      if (isMounted) {
        console.error('Error fetching appointments:', error);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [hospitalId, hospitalName, areHospitalNamesSimilar]);

  useEffect(() => {
    if (!hospitalId || !hospitalName) return;

    fetchAppointments();
    const interval = setInterval(fetchAppointments, APPOINTMENT_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [hospitalId, hospitalName, fetchAppointments]);

  const openApproveModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowApproveModal(true);
    setAssignedDoctor('');
    setAppointmentDateTime('');
  };

  // ✅ FIX: Added loading state and better error handling
  const approveAppointment = async () => {
    if (!selectedAppointment || !assignedDoctor || !appointmentDateTime) {
      alert('Please fill in all fields');
      return;
    }

    setIsApproving(true);

    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAppointment.id,
          status: 'approved',
          assigned_doctor: assignedDoctor,
          appointment_time: appointmentDateTime,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        alert('Appointment approved successfully!');
        setShowApproveModal(false);
        fetchAppointments();
      } else {
        alert(data.error || 'Failed to approve appointment');
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      alert('Failed to approve appointment. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const rejectAppointment = async (appointmentId: string) => {
    const reason = prompt('Reason for rejection (optional):');

    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: appointmentId,
          status: 'rejected',
          notes: reason || 'Appointment rejected',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        alert('Appointment rejected');
        fetchAppointments();
      } else {
        alert(data.error || 'Failed to reject appointment');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      alert('Failed to reject appointment. Please try again.');
    }
  };

  // Check authentication on mount
  useEffect(() => {
    const session = getHospitalSession();
    if (!session) {
      router.push('/hospital/sign-in');
      return;
    }
    setHospitalInfo(session);
  }, [router]);

  // ✅ FIX: Added proper error handling and isMounted flag
  const fetchEmergencies = useCallback(async () => {
    if (!hospitalId) return;

    let isMounted = true;

    try {
      const res = await fetch(`/api/emergency?hospital_id=${hospitalId}`);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (isMounted && data.success) {
        setEmergencies(data.data);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    } catch (error) {
      if (isMounted) {
        console.error('Error fetching emergencies:', error);
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [hospitalId]);

  useEffect(() => {
    if (!hospitalId) return;

    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, EMERGENCY_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [hospitalId, fetchEmergencies]);

  // ✅ FIX: Added proper error handling
  const fetchAmbulances = useCallback(async () => {
    if (!hospitalId) return;

    let isMounted = true;

    try {
      const res = await fetch(`/api/ambulances?hospital_id=${hospitalId}`);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (isMounted && data.success) {
        setAmbulances(data.data);
      }
    } catch (error) {
      if (isMounted) {
        console.error('Error fetching ambulances:', error);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [hospitalId]);

  // 🚑 Poll live ambulance location (every 3 seconds)
  useEffect(() => {
    if (!trackedAmbulanceId) return;

    let isMounted = true;

    const fetchAmbulanceLocation = async () => {
      try {
        console.log(`📡 Fetching location for ambulance ID: ${trackedAmbulanceId}`);
        const res = await fetch(
          `/api/ambulance-location?ambulance_id=${trackedAmbulanceId}`
        );

        if (!res.ok) {
          console.error(`❌ Location fetch failed with status: ${res.status}`);
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log(`✅ Location data received:`, data);

        if (isMounted && data.success) {
          console.log(`📍 Setting ambulance location:`, data.data);
          setAmbulanceLocation(data.data);
        } else if (!data.success) {
          console.warn(`⚠️ API returned success=false:`, data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('❌ Error fetching ambulance location:', err);
        }
      }
    };

    fetchAmbulanceLocation();
    const interval = setInterval(fetchAmbulanceLocation, AMBULANCE_LOCATION_POLL_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [trackedAmbulanceId]);

  useEffect(() => {
    if (!hospitalId) return;

    fetchAmbulances();
    const interval = setInterval(fetchAmbulances, AMBULANCE_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [hospitalId, fetchAmbulances]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearHospitalSession();
    router.push('/hospital/sign-in');
  };

  // ✅ FIX: Added loading state and better error handling
  const approveEmergency = async (emergencyId: string) => {
    if (!hospitalInfo) {
      alert('Please select a hospital first');
      return;
    }

    setIsApproving(true);

    try {
      const res = await fetch('/api/emergency', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: emergencyId,
          status: 'acknowledged',
          hospital_id: hospitalInfo.id,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Already assigned to another hospital
        alert(`Emergency already assigned to: ${data.assigned_to}`);
        fetchEmergencies(); // Refresh to show updated status
        return;
      }

      if (res.ok) {
        fetchEmergencies();
        alert(`Emergency approved and assigned to ${hospitalInfo.name}`);
      } else {
        alert(data.error || 'Failed to approve emergency');
      }
    } catch (error) {
      console.error('Error approving emergency:', error);
      alert('Failed to approve emergency. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const [showAssignmentMap, setShowAssignmentMap] = useState(false);
  const [selectedEmergencyForAssignment, setSelectedEmergencyForAssignment] = useState<any>(null);

  const openAssignmentMap = (emergency: any) => {
    setSelectedEmergencyForAssignment(emergency);
    setShowAssignmentMap(true);
  };

  /* ---------------- DISPATCH AMBULANCE ---------------- */
  const dispatchAmbulance = async (emergencyId: string, ambulanceId: string) => {
    setAssigningAmbulanceId(ambulanceId);

    try {
      const selectedAmbulance = ambulances.find(a => a.id === ambulanceId);
      if (!selectedAmbulance) throw new Error("Ambulance not found");

      const res = await fetch("/api/emergency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: emergencyId,
          status: "dispatched",
          assigned_ambulance_id: ambulanceId,
          assigned_ambulance_number: selectedAmbulance.vehicle_number,
          driver_name: selectedAmbulance.driver_name,
          driver_phone: selectedAmbulance.driver_phone,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Update ambulance status to busy
      await fetch('/api/ambulances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ambulanceId,
          is_available: false,
        }),
      });

      // Optimistic update
      setEmergencies((prev) =>
        prev.map((e) =>
          e.id === emergencyId
            ? { ...e, status: "dispatched", assigned_ambulance_id: ambulanceId, assigned_ambulance_number: selectedAmbulance.vehicle_number }
            : e
        )
      );
      setAmbulances((prev) =>
        prev.map(a => a.id === ambulanceId ? { ...a, is_available: false } : a)
      );

      setShowAssignmentMap(false); // Close modal
      setTrackedAmbulanceId(ambulanceId); // Start tracking
      alert('Ambulance dispatched successfully!');

      fetchEmergencies();
      fetchAmbulances();

    } catch (err) {
      console.error("Error dispatching ambulance:", err);
      alert('Failed to dispatch ambulance. Please try again.');
    } finally {
      setAssigningAmbulanceId(null);
    }
  };

  /* ---------------- REQUEST POLICE ASSISTANCE ---------------- */
  const requestPoliceAssistance = async (emergencyId: string) => {
    if (!hospitalInfo) return;

    setRequestingPoliceFor(emergencyId);

    try {
      const res = await fetch('/api/police-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergency_id: emergencyId,
          hospital_id: hospitalInfo.id,
          notes: 'Critical emergency - traffic clearance requested',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Mark as requested
      setPoliceRequested(prev => new Set(prev).add(emergencyId));
      alert('Police assistance requested successfully!');

    } catch (err) {
      console.error('Error requesting police assistance:', err);
      alert('Failed to request police assistance. Please try again.');
    } finally {
      setRequestingPoliceFor(null);
    }
  };

  // ✅ FIX: Added input validation, loading state, and better error handling
  const addAmbulance = async () => {
    if (!vehicleNumber || !driverName || !phone || !hospitalInfo) {
      alert('Please fill in all fields');
      return;
    }

    // Validate phone number (basic check)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      alert('Please enter a valid phone number (numbers, spaces, and +()-  allowed)');
      return;
    }

    // Validate vehicle number (basic check)
    if (vehicleNumber.trim().length < 5) {
      alert('Please enter a valid vehicle number (minimum 5 characters)');
      return;
    }

    // Validate driver name
    if (driverName.trim().length < 2) {
      alert('Please enter a valid driver name');
      return;
    }

    setIsAddingAmbulance(true);

    try {
      const res = await fetch('/api/ambulances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: hospitalInfo.id,
          vehicle_number: vehicleNumber.trim(),
          driver_name: driverName.trim(),
          driver_phone: phone.trim(),
          is_available: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      setVehicleNumber('');
      setDriverName('');
      setPhone('');
      setShowForm(false);
      fetchAmbulances();
      alert('Ambulance added successfully!');
    } catch (error) {
      console.error('Error adding ambulance:', error);
      alert('Failed to add ambulance. Please try again.');
    } finally {
      setIsAddingAmbulance(false);
    }
  };

  const availableAmbulances = ambulances.filter(a => a.is_available);

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-200';
      case 'high':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200';
      case 'medium':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-200';
      case 'low':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-200';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending Approval', class: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'acknowledged':
        return { text: 'Acknowledged', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'dispatched':
        return { text: 'Dispatched', class: 'bg-green-100 text-green-800 border-green-300' };
      case 'in_progress':
        return { text: 'In Progress', class: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'resolved':
        return { text: 'Resolved', class: 'bg-gray-100 text-gray-800 border-gray-300' };
      default:
        return { text: status, class: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  // Redirect to login if not authenticated
  if (!hospitalInfo) {
    return null; // Will redirect in useEffect
  }

  // ✅ FIX: Get minimum datetime for appointment input (prevent past dates)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 relative overflow-hidden">
      {/* BACKGROUND DECORATIONS */}
      <div className="blur-blob w-[600px] h-[600px] bg-gradient-to-br from-emerald-200 to-green-100 -top-32 -left-32 animate-pulse-slow z-0 opacity-30" />
      <div className="blur-blob w-[700px] h-[700px] bg-gradient-to-tl from-teal-200 to-emerald-100 -bottom-40 -right-40 animate-pulse-slow [animation-delay:1s] z-0 opacity-20" />
      <div className="blur-blob w-[400px] h-[400px] bg-gradient-to-tr from-green-100 to-emerald-50 top-1/3 -right-20 animate-pulse-slow [animation-delay:2s] z-0 opacity-15" />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-[100] bg-white/70 backdrop-blur-2xl border-b border-white/60 shadow-[0_4px_30px_rgb(0,0,0,0.03)] transition-all duration-500">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5">
          <div className="flex justify-between items-center">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 sm:gap-4 group cursor-pointer">
              <div className="relative w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center animate-scale-in shrink-0">
                <Image
                  src="/KenLogo1.png"
                  alt="KEN Health Logo"
                  fill
                  className="object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-500"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight truncate max-w-[150px] sm:max-w-none">
                  KEN <span className="text-emerald-600">Health</span>
                </h1>
              </div>
            </div>

            {/* Right Group: Status & User */}
            <div className="flex items-center gap-2 sm:gap-6">
              <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 bg-gray-50/50 backdrop-blur-md rounded-2xl border border-gray-100/50 shadow-inner">
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Live Terminal</p>
                  <p className="text-xs font-bold text-emerald-600 tracking-tight uppercase">{timeNow || 'Syncing...'}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {hospitalInfo && (
                  <div className="hidden sm:flex flex-col items-end">
                    <p className="text-xs font-bold text-gray-900 tracking-tight uppercase">{hospitalInfo.name}</p>
                  </div>
                )}
                <button
                  onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-emerald-600 font-medium transition-colors"
                  title={language === 'en' ? 'Switch to Malayalam' : 'Switch to English'}
                >
                  <Languages className="w-5 h-5" />
                  <span>{language === 'en' ? 'മലയാളം' : 'English'}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="group flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-950 hover:bg-red-600 text-white rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-500 shadow-xl shadow-gray-950/10 hover:shadow-red-950/20 active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                  <span className="hidden xs:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 max-w-[1600px] mx-auto relative z-10">
        {/* STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-4 sm:p-5 lg:p-6 animate-slide-up delay-200 hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)] transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-red-500/10 transition-colors"></div>
            <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm border border-red-100">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <span className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                {emergencies.filter(e => e.status === 'pending').length}
              </span>
            </div>
            <p className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest relative z-10">Pending Alerts</p>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-4 sm:p-5 lg:p-6 animate-slide-up delay-300 hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)] transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-colors"></div>
            <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm border border-emerald-100">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
              <span className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                {emergencies.filter(e => e.status === 'acknowledged').length}
              </span>
            </div>
            <p className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest relative z-10">Active Response</p>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-4 sm:p-5 lg:p-6 animate-slide-up delay-400 hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)] transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-green-500/10 transition-colors"></div>
            <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm border border-green-100">
                <Ambulance className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <span className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{availableAmbulances.length}</span>
            </div>
            <p className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest relative z-10">Fleet Ready</p>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-4 sm:p-5 lg:p-6 animate-slide-up delay-500 hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)] transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-teal-500/10 transition-colors"></div>
            <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm border border-teal-100">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
              </div>
              <span className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                {emergencies.filter(e => e.status === 'dispatched').length}
              </span>
            </div>
            <p className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest relative z-10">In Transit</p>
          </div>
        </div>

        {/* EMERGENCY ALERTS */}
        <section className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden animate-slide-up delay-600">
          <div className="px-5 sm:px-8 py-6 sm:py-8 bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-950 border-b border-white/5 flex justify-between items-center relative overflow-hidden group">
            {/* Visual background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 blur-[80px] -ml-24 -mb-24"></div>

            <div className="flex items-center gap-4 sm:gap-6 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse-subtle"></div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 backdrop-blur-2xl rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden group-hover:border-emerald-500/30 transition-colors duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
                  <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">{t('hospital.liveFeed')}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tightest">
                  {t('hospital.priorityAlerts')}
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-60">{t('hospital.emergencySurveillance')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 relative z-10 shrink-0">
              <div className="hidden xs:flex flex-col items-end mr-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{t('hospital.queueStatus')}</p>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">{t('hospital.normalLoad')}</p>
              </div>
              <div className="bg-emerald-500/10 backdrop-blur-xl px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-emerald-400 text-[10px] sm:text-xs font-bold border border-emerald-500/20 tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                {emergencies.length} {t('hospital.active')}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {isLoading ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-50 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('hospital.hydrating')}</p>
              </div>
            ) : emergencies.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex items-center justify-center gap-4 group cursor-pointer mb-6">
                  <div className="relative w-10 h-10 transition-transform duration-500 group-hover:scale-110">
                    <Image
                      src="/KenLogo1.png"
                      alt="KEN Health"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">{t('hospital.noEmergencies')}</h3>
                </div>
                <p className="text-sm text-gray-400 font-bold max-w-xs mx-auto">{t('hospital.noEmergenciesDesc')}</p>
              </div>
            ) : (
              emergencies.map((emergency) => {
                const statusBadge = getStatusBadge(emergency.status);
                const isAssignedToAnotherHospital = emergency.assigned_hospital_name &&
                  emergency.assigned_hospital_name !== hospitalInfo.name;
                const isExpanded = expandedEmergencyId === emergency.id;
                const isCritical = emergency.emergency_level === 'critical';

                return (
                  <div
                    key={emergency.id}
                    onClick={() => toggleEmergencyExpansion(emergency.id)}
                    className={`p-3 sm:p-4 hover:bg-emerald-50/20 transition-all duration-500 border-b-8 border-gray-950/5 last:border-0 relative group/item cursor-pointer ${isAssignedToAnotherHospital ? 'opacity-40 grayscale-[0.5]' : ''
                      } ${isExpanded ? 'bg-emerald-50/10' : ''}`}
                  >
                    {isCritical && !isAssignedToAnotherHospital && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse"></div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between items-start gap-3 mb-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 transition-all duration-500 group-hover/item:scale-105 ${isCritical ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          }`}>
                          <MapPin className="w-6 h-6 sm:w-7 h-7" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold text-base sm:text-lg text-gray-900 tracking-tight">
                              {emergency.name || t('hospital.anonymous')}
                            </h3>
                            {emergency.ai_score && (
                              <span className="bg-emerald-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                                {emergency.ai_score}% {t('hospital.match')}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <p className="text-[10px] text-gray-500 font-bold flex items-center gap-1 uppercase tracking-widest">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              {emergency.phone_number}
                            </p>
                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200/50">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{formatTime(emergency.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto items-center md:items-end">
                        <div className="flex flex-row md:flex-col gap-2 flex-1 md:flex-none">
                          <span className={`flex-1 md:flex-none text-center px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-sm border ${getPriorityStyles(emergency.emergency_level)}`}>
                            {emergency.emergency_level}
                          </span>
                          <span className={`flex-1 md:flex-none text-center px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border-2 shadow-sm ${statusBadge.class}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                        <div className={`transition-transform duration-500 text-gray-400 group-hover/item:text-emerald-500 ${isExpanded ? 'rotate-180' : ''}`}>
                          <Filter className={`w-4 h-4 ${isExpanded ? 'fill-emerald-500' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="animate-premium-blur-in mt-4">
                        {/* Medical Info */}
                        {(emergency.blood_group || emergency.allergies || emergency.medical_conditions) && (
                          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {emergency.blood_group && (
                              <div className="bg-emerald-50/50 backdrop-blur-sm p-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-0.5">{t('hospital.blood')}</p>
                                  <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">{emergency.blood_group}</p>
                                </div>
                              </div>
                            )}
                            {emergency.allergies && (
                              <div className="bg-amber-50/50 backdrop-blur-sm p-2 rounded-xl border border-amber-100 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                </div>
                                <div>
                                  <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest leading-none mb-0.5">{t('hospital.allergies')}</p>
                                  <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest truncate max-w-[100px]">{emergency.allergies}</p>
                                </div>
                              </div>
                            )}
                            {emergency.medical_conditions && (
                              <div className="bg-slate-50/50 backdrop-blur-sm p-2 rounded-xl border border-slate-100 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                                <div>
                                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest leading-none mb-0.5">{t('hospital.clinical')}</p>
                                  <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest truncate max-w-[100px]">{emergency.medical_conditions}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ✅ FIX: Display live ambulance location with resilient checks */}
                        {emergency.status === 'dispatched' &&
                          emergency.assigned_ambulance_number &&
                          trackedAmbulanceId &&
                          ambulanceLocation?.latitude != null &&
                          ambulances.find(a => a.id === trackedAmbulanceId)?.vehicle_number === emergency.assigned_ambulance_number && (
                            <div className="mb-4 p-4 bg-green-50 rounded-2xl border-2 border-green-400 shadow-lg animate-pulse-subtle">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <Ambulance className="w-4 h-4 text-green-600" />
                                  </div>
                                  <span className="font-bold text-sm text-green-900 uppercase tracking-wider">{t('hospital.liveTracking')}: {emergency.assigned_ambulance_number}</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTrackedAmbulanceId(null);
                                  }}
                                  className="bg-white hover:bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-200 transition-colors shadow-sm"
                                >
                                  ✕ {t('hospital.stop')}
                                </button>
                              </div>

                              <div className="h-[300px] sm:h-[450px] mb-4 overflow-hidden rounded-xl border border-green-200">
                                <LiveTrackingMap
                                  latitude={ambulanceLocation.latitude}
                                  longitude={ambulanceLocation.longitude}
                                  destLat={emergency.assigned_hospital_lat}
                                  destLng={emergency.assigned_hospital_lng}
                                  isHospital={true}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-2 rounded-xl border border-green-100">
                                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{t('hospital.position')}</p>
                                  <p className="text-xs text-gray-700 font-mono font-bold">
                                    {ambulanceLocation.latitude.toFixed(6)}, {ambulanceLocation.longitude.toFixed(6)}
                                  </p>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-green-100">
                                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{t('hospital.status')}</p>
                                  <p className="text-xs text-gray-700 font-bold flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-green-500" />
                                    {ambulanceLocation.updated_at
                                      ? new Date(ambulanceLocation.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                      : t('hospital.syncing')
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                        {/* 🔄 Loading state: Tracking active but no location data yet */}
                        {emergency.status === 'dispatched' &&
                          emergency.assigned_ambulance_number &&
                          trackedAmbulanceId &&
                          (!ambulanceLocation || ambulanceLocation?.latitude == null) &&
                          ambulances.find(a => a.id === trackedAmbulanceId)?.vehicle_number === emergency.assigned_ambulance_number && (
                            <div className="mb-4 p-4 bg-blue-50 rounded-2xl border-2 border-blue-400 shadow-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                                    <Ambulance className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <span className="font-bold text-sm text-blue-900 uppercase tracking-wider">{t('hospital.connecting')} {emergency.assigned_ambulance_number}...</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTrackedAmbulanceId(null);
                                  }}
                                  className="bg-white hover:bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-200 transition-colors shadow-sm"
                                >
                                  ✕ {t('hospital.stop')}
                                </button>
                              </div>

                              <div className="bg-white p-4 rounded-xl border border-blue-200">
                                <div className="flex items-center gap-3">
                                  <div className="animate-spin">
                                    <Activity className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-blue-900">{t('hospital.waitingGPS')}</p>
                                    <p className="text-xs text-blue-700 mt-1">
                                      {t('hospital.driverAppInfo')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Assignment Status */}
                        {isAssignedToAnotherHospital && (
                          <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-sm font-bold text-orange-900">
                              ⚠️ {t('hospital.assignedTo')}: {emergency.assigned_hospital_name}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                          {emergency.status === 'pending' && !isAssignedToAnotherHospital && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                approveEmergency(emergency.id);
                              }}
                              disabled={isApproving}
                              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 sm:px-8 py-2.5 rounded-xl text-[9px] sm:text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-950/10 hover:shadow-emerald-950/20 transform hover:scale-[1.02] active:scale-95 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed border-b-2 border-emerald-800"
                            >
                              {isApproving ? t('hospital.approving') : `✓ ${t('hospital.approveAccept')}`}
                            </button>
                          )}

                          {emergency.status === 'acknowledged' &&
                            emergency.assigned_hospital_name === hospitalInfo.name && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAssignmentMap(emergency);
                                }}
                                className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-4 sm:px-6 py-2.5 rounded-xl text-[9px] sm:text-xs font-bold uppercase tracking-widest shadow-lg shadow-gray-950/10 transition-all flex items-center justify-center gap-2 border-b-2 border-gray-950"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                {t('hospital.assignAmbulance')}
                              </button>
                            )}

                          {emergency.status === 'dispatched' && emergency.assigned_ambulance_number && (
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  trackAmbulanceByNumber(emergency.assigned_ambulance_number!);
                                }}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all shadow-md hover:scale-[1.02] active:scale-95 text-[9px] sm:text-xs font-bold uppercase tracking-widest ${trackedAmbulanceId && ambulances.find(a => a.id === trackedAmbulanceId)?.vehicle_number === emergency.assigned_ambulance_number
                                  ? "bg-emerald-600 border-emerald-700 text-white"
                                  : "bg-white border-emerald-100 text-emerald-800 hover:bg-emerald-50"
                                  }`}
                              >
                                <Activity className={`w-4 h-4 ${trackedAmbulanceId && ambulances.find(a => a.id === trackedAmbulanceId)?.vehicle_number === emergency.assigned_ambulance_number ? "animate-spin" : ""}`} />
                                <p>
                                  {trackedAmbulanceId && ambulances.find(a => a.id === trackedAmbulanceId)?.vehicle_number === emergency.assigned_ambulance_number
                                    ? t('hospital.trackingLive')
                                    : `${t('hospital.track')}: ${emergency.assigned_ambulance_number}`}
                                </p>
                              </button>

                              {(emergency.emergency_level === 'critical' || emergency.emergency_level === 'high') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestPoliceAssistance(emergency.id);
                                  }}
                                  disabled={requestingPoliceFor === emergency.id || policeRequested.has(emergency.id)}
                                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[9px] sm:text-xs font-bold uppercase tracking-widest shadow-md transition-all ${policeRequested.has(emergency.id)
                                    ? "bg-indigo-50 border-2 border-indigo-100 text-indigo-800 cursor-not-allowed"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02] active:scale-95 border-b-2 border-indigo-900"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  <Shield className="w-4 h-4" />
                                  {requestingPoliceFor === emergency.id
                                    ? "..."
                                    : policeRequested.has(emergency.id)
                                      ? `✓ ${t('hospital.notified')}`
                                      : `🚔 ${t('hospital.policeAssist')}`}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* APPOINTMENTS SECTION */}
        <section className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden animate-slide-up delay-650">
          <div className="px-5 sm:px-8 py-6 sm:py-8 bg-gradient-to-br from-blue-900 via-indigo-950 to-blue-950 border-b border-white/5 flex justify-between items-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 blur-[80px] -ml-24 -mb-24"></div>

            <div className="flex items-center gap-4 sm:gap-6 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse-subtle"></div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 backdrop-blur-2xl rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden group-hover:border-blue-500/30 transition-colors duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
                  <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">{t('hospital.scheduled')}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tightest">
                  {t('hospital.appointmentRequests')}
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-60">{t('hospital.patientIntake')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 relative z-10 shrink-0">
              <div className="bg-blue-500/10 backdrop-blur-xl px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-blue-400 text-[10px] sm:text-xs font-bold border border-blue-500/20 tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                {appointments.length} {t('hospital.pending')}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {appointments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex items-center justify-center gap-4 group cursor-pointer mb-6">
                  <div className="relative w-10 h-10 transition-transform duration-500 group-hover:scale-110">
                    <Image
                      src="/KenLogo1.png"
                      alt="KEN Health"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">{t('hospital.noAppointments')}</h3>
                </div>
                <p className="text-sm text-gray-400 font-bold max-w-xs mx-auto">{t('hospital.noAppointmentsDesc')}</p>
              </div>
            ) : (
              appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-5 sm:p-6 lg:p-8 hover:bg-blue-50/30 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{appointment.user_name || t('hospital.anonymous')}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {appointment.user_phone}
                            </span>
                            {appointment.blood_group && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg font-semibold">
                                <Droplet className="w-3.5 h-3.5" />
                                {appointment.blood_group}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-16">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-700">{appointment.issue_type}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {appointment.appointment_time
                              ? new Date(appointment.appointment_time).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                              : t('hospital.timeNotSet')}
                          </span>
                        </div>
                      </div>

                      {appointment.description && (
                        <div className="pl-16 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                          <p className="font-medium">{appointment.description}</p>
                        </div>
                      )}

                      {appointment.medical_conditions && (
                        <div className="pl-16 text-xs text-orange-700 bg-orange-50 p-3 rounded-xl border border-orange-100">
                          <span className="font-bold uppercase tracking-wider">{t('hospital.clinical')}:</span> {appointment.medical_conditions}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 lg:flex-col lg:w-48">
                      <button
                        onClick={() => openApproveModal(appointment)}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-950/10 transition-all hover:scale-[1.02] active:scale-95 border-b-2 border-emerald-800"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t('hospital.approveAppt')}
                      </button>
                      <button
                        onClick={() => rejectAppointment(appointment.id)}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold uppercase tracking-widest border-2 border-red-200 transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <X className="w-4 h-4" />
                        {t('hospital.rejectIntake')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* AMBULANCE MANAGEMENT */}
        <section className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-5 sm:p-6 lg:p-8 animate-slide-up delay-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner border border-emerald-100 bg-emerald-50">
                <Ambulance className="w-6 h-6 sm:w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight underline decoration-emerald-500 decoration-4 underline-offset-8">
                  {t('hospital.fleetManagement')}
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{t('hospital.fleetDesc')}</p>
              </div>
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 sm:px-8 py-3.5 rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-950/10 hover:shadow-emerald-950/20 transform hover:scale-[1.02] active:scale-95 transition-all duration-500 flex items-center justify-center gap-2 border-b-4 border-emerald-800"
            >
              {showForm ? <X className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
              {showForm ? t('hospital.cancelOp') : t('hospital.addNewUnit')}
            </button>
          </div>

          {showForm && (
            <div className="mt-6 bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl border-2 border-emerald-200 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="vehicleNumber" className="text-xs font-bold text-gray-700 mb-2 block">
                    {t('hospital.vehicleNumber')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="vehicleNumber"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 font-semibold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all"
                    placeholder="e.g., MH-12-AB-1234"
                    value={vehicleNumber}
                    onChange={e => setVehicleNumber(e.target.value)}
                    aria-required="true"
                  />
                </div>
                <div>
                  <label htmlFor="driverName" className="text-xs font-bold text-gray-700 mb-2 block">
                    {t('hospital.driverName')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="driverName"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 font-semibold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all"
                    placeholder="e.g., John Smith"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    aria-required="true"
                  />
                </div>
                <div>
                  <label htmlFor="driverPhone" className="text-xs font-bold text-gray-700 mb-2 block">
                    {t('hospital.phone')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="driverPhone"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 font-semibold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all"
                    placeholder="e.g., +91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    aria-required="true"
                  />
                </div>
              </div>

              <button
                onClick={addAmbulance}
                disabled={isAddingAmbulance}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                aria-label="Save new ambulance"
              >
                {isAddingAmbulance ? t('hospital.saving') : t('hospital.save')}
              </button>
            </div>
          )}

          {ambulances.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ambulances.map(amb => (
                <div key={amb.id} className="bg-white/40 backdrop-blur-xl p-4 sm:p-6 rounded-[2rem] border border-white/60 hover:border-emerald-200 hover:bg-white transition-all duration-500 group shadow-sm hover:shadow-[0_20px_50px_rgba(16,185,129,0.05)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/10 blur-3xl -mr-12 -mt-12 group-hover:bg-emerald-100/20 transition-colors"></div>
                  <div className="flex flex-col xs:flex-row items-start justify-between gap-4 mb-6 relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-emerald-600 transition-colors duration-500 shrink-0">
                        <Ambulance className="w-6 h-6 sm:w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-lg sm:text-xl text-gray-900 tracking-tight uppercase">{amb.vehicle_number}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{amb.driver_name}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest border shadow-sm shrink-0 transition-colors duration-500 ${amb.is_available
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                      {amb.is_available ? t('hospital.ready') : t('hospital.inSvc')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-5 border-t border-gray-100 relative z-10">
                    <div className="flex items-center gap-2 text-gray-800 overflow-hidden">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-bold text-xs sm:text-sm tracking-widest truncate">{amb.driver_phone}</span>
                    </div>
                    {!amb.is_available && (
                      <button
                        onClick={() => setTrackedAmbulanceId(amb.id)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 border ${trackedAmbulanceId === amb.id
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-md"
                          : "bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                          }`}
                      >
                        {trackedAmbulanceId === amb.id ? t('hospital.trackingLive') : t('hospital.track')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Ambulance className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>{t('hospital.noAmbulances')}</p>
            </div>
          )}
        </section>

        {/* APPOINTMENT REQUESTS SECTION
        <section className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-5 sm:p-6 lg:p-8 animate-slide-up delay-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner border border-teal-100 bg-teal-50">
                <Calendar className="w-6 h-6 sm:w-7 h-7 text-teal-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight underline decoration-teal-500 decoration-4 underline-offset-8">
                  Patient Intake
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Appointment Queue</p>
              </div>
            </div>
            <div className="flex items-center shrink-0">
              <span className="bg-teal-900 px-4 sm:px-6 py-2 rounded-full text-white text-[10px] sm:text-xs font-bold tracking-widest shadow-lg shadow-teal-950/20 whitespace-nowrap">
                {appointments.length} PENDING
              </span>
            </div>
          </div>

          {appointments.length > 0 ? (
            <div className="space-y-3 lg:space-y-4">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-white/60 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all duration-300 group shadow-lg hover:shadow-emerald-900/5 mb-4"
                >
        //           {/* Patient Info */}
        {/* //           <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        //             <div className="flex-1 w-full flex items-center gap-4">
        //               <div className="w-14 h-14 bg-gradient-to-br from-teal-50 to-emerald-100 rounded-2xl flex items-center justify-center border border-teal-100 shadow-sm shrink-0">
        //                 <User className="w-7 h-7 text-teal-600" />
        //               </div>
        //               <div>
        //                 <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-1">
        //                   {appt.user_name || 'Patient Intake'}
        //                 </h3>
        //                 <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        //                   <div className="flex items-center gap-1.5 font-bold">
        //                     <Phone className="w-3.5 h-3.5 text-teal-500" />
        //                     {appt.user_phone}
        //                   </div>
        //                   {appt.blood_group && ( */}
        {/* //                     <div className="flex items-center gap-1.5 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
        //                       <Activity className="w-3.5 h-3.5" />
        //                       {appt.blood_group}
        //                     </div>
        //                   )}
        //                 </div>
        //               </div> */}
        {/* //             </div>
        //             <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1 rounded-lg">
        //               {new Date(appt.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
        //             </div>
        //           </div> */}

        {/* //           {/* Medical Issue */}
        //           {/* Medical History */}
        {/* //           <div className="bg-gray-50/50 backdrop-blur-sm p-4 sm:p-6 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row gap-6">
        //             <div className="flex-1 space-y-4">
        //               <div className="flex items-center gap-3">
        //                 <div className="w-10 h-10 rounded-[1rem] bg-emerald-50 flex items-center justify-center text-emerald-600">
        //                   <Activity className="w-5 h-5" />
        //                 </div>
        //                 <div>
        //                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Issue Overview</p>
        //                   <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">{appt.issue_type}</p>
        //                 </div>
        //               </div>
        //               <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        //                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Patient History</p>
        //                 <p className="text-sm font-bold text-gray-700">{appt.medical_conditions || "No previous history recorded."}</p>
        //               </div>
        //             </div>
        //             <div className="flex-1 p-4 sm:p-6 bg-gray-900 rounded-[2rem] text-white shadow-xl shadow-gray-950/20">
        //               <div className="flex items-center gap-3 mb-4">
        //                 <MapPin className="w-5 h-5 text-emerald-400" />
        //                 <h4 className="text-sm font-bold uppercase tracking-widest">Location Data</h4>
        //               </div>
        //               <div className="space-y-2 opacity-80">
        //                 <p className="text-[10px] font-bold uppercase tracking-widest">Coordinates</p>
        //                 <p className="text-xs font-mono">{appt.user_lat.toFixed(4)}, {appt.user_lng.toFixed(4)}</p>
        //                 <p className="text-xs pt-2 border-t border-white/10 italic">Request initiated from user mobile.</p>
        //               </div>
        //             </div>
        //           </div>

        //           {/* Action Buttons */}
        //           {/* <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-8">
        //             <button
        //               onClick={() => openApproveModal(appt)} */}
        //               {/* className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-8 py-4 rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-emerald-950/20 transform hover:scale-[1.02] active:scale-95 transition-all duration-500 flex items-center justify-center gap-2 border-b-4 border-emerald-800"
        //             >
        //               <CheckCircle className="w-4 h-4" />
        //               Approve Intake
        //             </button>
        //             <button
        //               onClick={() => rejectAppointment(appt.id)}
        //               className="flex-1 bg-white hover:bg-gray-50 text-gray-900 px-4 sm:px-8 py-4 rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-widest border-2 border-gray-100 shadow-sm transition-all duration-500 flex items-center justify-center gap-2"
        //             >
        //               <X className="w-4 h-4" />
        //               Reject Intake
        //             </button>
        //             <a
        //               href={`https://www.google.com/maps?q=${appt.user_lat},${appt.user_lng}`}
        //               target="_blank"
        //               rel="noopener noreferrer"
        //               className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 sm:px-8 py-4 rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-sm transition-all duration-500 flex items-center justify-center gap-2"
        //             >
        //               <MapPin className="w-4 h-4 text-emerald-600" />
        //               Patient OSINT
        //             </a>
        //           </div>
        //         </div>
        //       ))}
        //     </div>
        //   ) : (
        //     <div className="text-center py-8 text-gray-500">
        //       <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        //       <p>No pending appointment requests</p>
        //     </div>
        //   )}
        // </section> */}

        //APPROVAL MODAL
        {showApproveModal && selectedAppointment && (
          <div
            className="fixed inset-0 bg-emerald-950/60 backdrop-blur-xl flex items-center justify-center z-[100] p-3 sm:p-4 animate-premium-blur-in"
            role="dialog"
            aria-labelledby="approve-modal-title"
            aria-modal="true"
          >
            <div className="bg-white rounded-[2.5rem] max-w-md w-full p-6 sm:p-10 shadow-[0_20px_70px_rgba(0,0,0,0.4)] border border-white/20 animate-scale-in max-h-[95vh] overflow-y-auto custom-scrollbar relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500"></div>

              <div className="flex items-center gap-5 mb-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center border border-emerald-100 shadow-sm shrink-0">
                  <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
                </div>
                <div>
                  <h3 id="approve-modal-title" className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Confirm Intake
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Resource Allocation</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <div className="bg-gray-50/50 backdrop-blur-sm p-4 sm:p-6 rounded-[2rem] border border-gray-100">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-3">Target Patient</p>
                  <p className="text-base sm:text-lg text-gray-900 font-bold uppercase tracking-tight">
                    {selectedAppointment.user_name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-700 font-bold mt-2 uppercase tracking-widest bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-100">
                    {selectedAppointment.issue_type}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="assignedDoctor" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                      Attending Physician <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="assignedDoctor"
                        type="text"
                        value={assignedDoctor}
                        onChange={(e) => setAssignedDoctor(e.target.value)}
                        placeholder="e.g., Dr. Arun Kumar"
                        className="w-full p-4 sm:p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-sm font-bold tracking-tight placeholder:text-gray-300"
                        aria-required="true"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="appointmentDateTime" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                      Time Classification <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      id="appointmentDateTime"
                      type="datetime-local"
                      value={appointmentDateTime}
                      onChange={(e) => setAppointmentDateTime(e.target.value)}
                      min={getMinDateTime()}
                      className="w-full p-4 sm:p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-sm font-bold tracking-tight"
                      aria-required="true"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={approveAppointment}
                  disabled={isApproving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 sm:py-5 rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-emerald-950/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-emerald-800"
                >
                  {isApproving ? 'Synchronizing...' : 'Authorize Patient Intake'}
                </button>
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={isApproving}
                  className="w-full bg-white hover:bg-gray-50 text-gray-400 px-6 py-4 sm:py-5 rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-widest border-2 border-transparent transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Terminate Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AMBULANCE ASSIGNMENT MODAL (NEW) */}
        <AmbulanceAssignmentMap
          isOpen={showAssignmentMap}
          onClose={() => setShowAssignmentMap(false)}
          emergency={selectedEmergencyForAssignment}
          ambulances={ambulances}
          onAssign={(ambulanceId) => dispatchAmbulance(selectedEmergencyForAssignment.id, ambulanceId)}
          assigningAmbulanceId={assigningAmbulanceId}
        />

        {/* FOOTER */}
        <footer className="mt-12 pb-12 text-center animate-fade-in delay-1000">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Image src="/KenLogo1.png" alt="KEN Logo" width={24} height={24} />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              Kozhikode Emergency Network
            </p>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
            Every second saves a life • Secure Medical Portal
          </p>
        </footer>
      </main>
    </div>
  );
}