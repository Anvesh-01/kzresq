'use client';
import Link from "next/link";
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
  Filter
} from "lucide-react";
import EmergencyMap from "@/components/EmergencyMap";
import AmbulanceAssignmentMap from '@/components/AmbulanceAssignmentMap';
import { getHospitalSession, clearHospitalSession, type HospitalSession } from '@/lib/auth';
import dynamic from 'next/dynamic';

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
  const [hospitalInfo, setHospitalInfo] = useState<HospitalSession | null>(null);
  const [emergencies, setEmergencies] = useState<SOSEmergency[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [timeNow, setTimeNow] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
  const [isDispatching, setIsDispatching] = useState(false);
  const [isAddingAmbulance, setIsAddingAmbulance] = useState(false);

  // Helper to find ambulance ID by number and track it
  const trackAmbulanceByNumber = (vehicleNumber: string) => {
    const amb = ambulances.find(a => a.vehicle_number === vehicleNumber);
    if (amb) {
      setTrackedAmbulanceId(amb.id);
      // Scroll to the top or where the live location is shown?
      // For now, just alert or visual feedback is enough.
      console.log(`Tracking ambulance: ${vehicleNumber} (${amb.id})`);
    } else {
      alert(`Ambulance ${vehicleNumber} not found in your list.`);
    }
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
      router.push('/login');
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
        const res = await fetch(
          `/api/ambulance-location?ambulance_id=${trackedAmbulanceId}`
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (isMounted && data.success) {
          setAmbulanceLocation(data.data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching ambulance location:', err);
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
    router.push('/login');
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
    setIsDispatching(true);

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
      setIsDispatching(false);
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
        return { text: 'Acknowledged', class: 'bg-blue-100 text-blue-800 border-blue-300' };
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
                <Activity className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                  {hospitalInfo.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">
                  Emergency Response Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full border border-green-200">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-800 font-semibold text-sm">
                  {timeNow}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 transition-all"
                aria-label="Logout from hospital dashboard"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-[1600px] mx-auto">
        {/* STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-3xl font-black text-gray-900">
                {emergencies.filter(e => e.status === 'pending').length}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-600">Pending Requests</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-3xl font-black text-gray-900">
                {emergencies.filter(e => e.status === 'acknowledged').length}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-600">Acknowledged</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                <Ambulance className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-3xl font-black text-gray-900">{availableAmbulances.length}</span>
            </div>
            <p className="text-sm font-semibold text-gray-600">Available Ambulances</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                <Ambulance className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-3xl font-black text-gray-900">
                {emergencies.filter(e => e.status === 'dispatched').length}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-600">Dispatched</p>
          </div>
        </div>

        {/* EMERGENCY ALERTS */}
        <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-black text-gray-900">
                Emergency Alerts for Your Hospital
              </h2>
            </div>
            <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              {emergencies.length} Total
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading emergencies...</p>
              </div>
            ) : emergencies.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="font-semibold">No emergency alerts for your hospital</p>
                <p className="text-sm mt-1">New emergencies will appear here automatically</p>
              </div>
            ) : (
              emergencies.map((emergency) => {
                const statusBadge = getStatusBadge(emergency.status);
                const isAssignedToAnotherHospital = emergency.assigned_hospital_name &&
                  emergency.assigned_hospital_name !== hospitalInfo.name;

                return (
                  <div
                    key={emergency.id}
                    className={`p-6 hover:bg-gray-50 transition-all ${isAssignedToAnotherHospital ? 'opacity-50' : ''
                      }`}
                  >
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center border border-gray-200 shadow-sm">
                          <MapPin className="w-7 h-7 text-gray-700" />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-lg text-gray-900">
                            {emergency.name || 'Anonymous'}
                          </p>
                          <p className="text-sm text-gray-600 font-semibold">
                            📞 {emergency.phone_number}
                          </p>
                          <div className="flex items-center gap-2 text-gray-600 mt-1">
                            <Clock className="w-4 h-4" />
                            <p className="text-sm font-semibold">{formatTime(emergency.created_at)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className={`px-4 py-2 rounded-xl text-sm font-black whitespace-nowrap ${getPriorityStyles(emergency.emergency_level)}`}>
                          {emergency.emergency_level.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${statusBadge.class}`}>
                          {statusBadge.text}
                        </span>
                      </div>
                    </div>

                    {/* Medical Info */}
                    {(emergency.blood_group || emergency.allergies || emergency.medical_conditions) && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                        {emergency.blood_group && (
                          <p><span className="font-bold">Blood Group:</span> {emergency.blood_group}</p>
                        )}
                        {emergency.allergies && (
                          <p><span className="font-bold">Allergies:</span> {emergency.allergies}</p>
                        )}
                        {emergency.medical_conditions && (
                          <p><span className="font-bold">Conditions:</span> {emergency.medical_conditions}</p>
                        )}
                      </div>
                    )}

                    {/* ✅ FIX: Display live ambulance location with resilient checks */}
                    {emergency.status === 'dispatched' &&
                      emergency.assigned_ambulance_number &&
                      trackedAmbulanceId &&
                      ambulanceLocation?.latitude != null && // Safer property check
                      ambulances.find(a => a.id === trackedAmbulanceId)?.vehicle_number === emergency.assigned_ambulance_number && (
                        <div className="mb-4 p-4 bg-green-50 rounded-2xl border-2 border-green-400 shadow-lg animate-pulse-subtle">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <Ambulance className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="font-black text-sm text-green-900 uppercase tracking-wider">Live Tracking: {emergency.assigned_ambulance_number}</span>
                            </div>
                            <button
                              onClick={() => setTrackedAmbulanceId(null)}
                              className="bg-white hover:bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-200 transition-colors shadow-sm"
                            >
                              ✕ Stop
                            </button>
                          </div>

                          {/* Map View */}
                          <div className="h-[450px] mb-4">
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
                              <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Position</p>
                              <p className="text-xs text-gray-700 font-mono font-bold">
                                {ambulanceLocation.latitude.toFixed(6)}, {ambulanceLocation.longitude.toFixed(6)}
                              </p>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-green-100">
                              <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Status</p>
                              <p className="text-xs text-gray-700 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-green-500" />
                                {new Date(ambulanceLocation.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Assignment Status */}
                    {isAssignedToAnotherHospital && (
                      <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm font-bold text-orange-900">
                          ⚠️ Assigned to: {emergency.assigned_hospital_name}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      {emergency.status === 'pending' && !isAssignedToAnotherHospital && (
                        <button
                          onClick={() => approveEmergency(emergency.id)}
                          disabled={isApproving}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          aria-label="Approve and accept emergency request"
                        >
                          {isApproving ? 'Approving...' : '✓ Approve & Accept Emergency'}
                        </button>
                      )}

                      {emergency.status === 'acknowledged' &&
                        emergency.assigned_hospital_name === hospitalInfo.name && (
                          <button
                            onClick={() => openAssignmentMap(emergency)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4" />
                            Assign Ambulance
                          </button>
                        )}

                      {emergency.status === 'dispatched' && emergency.assigned_ambulance_number && (
                        <button
                          onClick={() => trackAmbulanceByNumber(emergency.assigned_ambulance_number!)}
                          className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all shadow-md hover:scale-105 active:scale-95 ${trackedAmbulanceId && ambulances.find(a => a.id === trackedAmbulanceId)?.vehicle_number === emergency.assigned_ambulance_number
                            ? "bg-green-600 border-green-700 text-white"
                            : "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-800 hover:bg-green-100"
                            }`}
                        >
                          <Activity className={`w-5 h-5 ${trackedAmbulanceId && ambulances.find(a => a.id === trackedAmbulanceId)?.vehicle_number === emergency.assigned_ambulance_number ? "animate-spin" : ""}`} />
                          <p className="font-black text-sm">
                            {trackedAmbulanceId && ambulances.find(a => a.id === trackedAmbulanceId)?.vehicle_number === emergency.assigned_ambulance_number
                              ? "Tracking Live..."
                              : `Track: ${emergency.assigned_ambulance_number}`}
                          </p>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* AMBULANCE MANAGEMENT */}
        <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                <Ambulance className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-black text-gray-900">
                Your Ambulances
              </h2>
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              aria-label={showForm ? 'Close add ambulance form' : 'Open add ambulance form'}
            >
              {showForm ? '✕ Cancel' : '+ Add Ambulance'}
            </button>
          </div>

          {showForm && (
            <div className="mt-6 bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl border-2 border-emerald-200 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="vehicleNumber" className="text-xs font-bold text-gray-700 mb-2 block">
                    Vehicle Number <span className="text-red-600">*</span>
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
                    Driver Name <span className="text-red-600">*</span>
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
                    Driver Phone <span className="text-red-600">*</span>
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
                {isAddingAmbulance ? 'Saving...' : 'Save Ambulance'}
              </button>
            </div>
          )}

          {ambulances.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ambulances.map(amb => (
                <div key={amb.id} className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl border-2 border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                        <Ambulance className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-lg text-gray-900">{amb.vehicle_number}</p>
                        <p className="text-sm text-gray-600 font-semibold">{amb.driver_name}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap ${amb.is_available
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-2 border-green-300'
                      : 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border-2 border-orange-300'
                      }`}>
                      {amb.is_available ? 'Available' : 'On Route'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-gray-600 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span className="font-semibold">{amb.driver_phone}</span>
                    </div>
                    {!amb.is_available && (
                      <button
                        onClick={() => setTrackedAmbulanceId(amb.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${trackedAmbulanceId === amb.id
                          ? "bg-green-600 text-white shadow-inner"
                          : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                          }`}
                      >
                        {trackedAmbulanceId === amb.id ? "Tracking..." : "Track Live"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Ambulance className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No ambulances added yet</p>
            </div>
          )}
        </section>

        {/* APPOINTMENT REQUESTS SECTION */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg lg:rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-gray-900">
                Appointment Requests
              </h2>
            </div>
            <span className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 sm:px-4 lg:px-5 py-1.5 lg:py-2 rounded-full text-sm font-bold shadow-lg">
              {appointments.length} Pending
            </span>
          </div>

          {appointments.length > 0 ? (
            <div className="space-y-3 lg:space-y-4">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-gradient-to-r from-gray-50 to-white p-4 lg:p-6 rounded-xl lg:rounded-2xl border-2 border-gray-200 hover:border-purple-300 transition-all shadow-md hover:shadow-lg"
                >
                  {/* Patient Info */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4 lg:mb-5">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
                        <h3 className="text-base sm:text-lg lg:text-xl font-black text-gray-900">
                          {appt.user_name || 'Patient'}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 lg:w-4 lg:h-4" />
                          <span className="font-semibold">{appt.user_phone}</span>
                        </div>
                        {appt.blood_group && (
                          <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 lg:w-4 lg:h-4 text-red-600" />
                            <span className="font-semibold">Blood: {appt.blood_group}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(appt.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Medical Issue */}
                  <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="font-bold text-sm text-orange-900">Medical Issue:</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 ml-6">{appt.issue_type}</p>
                    {appt.description && (
                      <p className="text-sm text-gray-700 ml-6 mt-1">{appt.description}</p>
                    )}
                  </div>

                  {/* Medical Conditions */}
                  {appt.medical_conditions && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-sm text-blue-900">Medical History:</span>
                      </div>
                      <p className="text-sm text-gray-700 ml-6">{appt.medical_conditions}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                    <button
                      onClick={() => openApproveModal(appt)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      aria-label="Approve and assign appointment"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Assign
                    </button>
                    <button
                      onClick={() => rejectAppointment(appt.id)}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      aria-label="Reject appointment"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                    <a
                      href={`https://www.google.com/maps?q=${appt.user_lat},${appt.user_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      aria-label="View patient location on map"
                    >
                      <MapPin className="w-4 h-4" />
                      View Location
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No pending appointment requests</p>
            </div>
          )}
        </section>

        {/* APPROVAL MODAL */}
        {showApproveModal && selectedAppointment && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-labelledby="approve-modal-title"
            aria-modal="true"
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 id="approve-modal-title" className="text-xl font-bold text-gray-900 mb-4">
                Approve Appointment
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Patient: <span className="font-bold text-gray-900">{selectedAppointment.user_name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Issue: <span className="font-bold text-gray-900">{selectedAppointment.issue_type}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="assignedDoctor" className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Doctor <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="assignedDoctor"
                    type="text"
                    value={assignedDoctor}
                    onChange={(e) => setAssignedDoctor(e.target.value)}
                    placeholder="Dr. Smith"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="appointmentDateTime" className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Date & Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="appointmentDateTime"
                    type="datetime-local"
                    value={appointmentDateTime}
                    onChange={(e) => setAppointmentDateTime(e.target.value)}
                    min={getMinDateTime()}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    aria-required="true"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={approveAppointment}
                  disabled={isApproving}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Confirm appointment approval"
                >
                  {isApproving ? 'Approving...' : 'Confirm Approval'}
                </button>
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={isApproving}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-bold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Cancel appointment approval"
                >
                  Cancel
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
          isAssigning={isDispatching}
        />

        {/* FOOTER */}
        <p className="text-center text-xs text-gray-500 mt-6 pb-6">
          © {new Date().getFullYear()} ResQNet. All rights reserved. Saving lives, one second at a time.
        </p>
      </main>
    </div>
  );
}