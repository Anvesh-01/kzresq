"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  User,
  Phone,
  Droplet,
  FileText,
  MapPin,
  Hospital,
  Clock,
  Calendar,
  AlertCircle,
  Activity,
  LogOut,
  Zap,
  CalendarPlus,
  History as HistoryIcon,
  Settings,
  Mail,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { UserSession } from "@/lib/auth-client";
import { useLanguage } from "@/components/LanguageContext";

type Emergency = {
  id: string;
  date: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  hospital: string;
  type: "emergency" | "appointment";
  time?: string;
};

type Hospital = {
  id: string;
  name: string;
  distance: string;
  doctor: string;
  lat: number;
  lng: number;
};

export default function UserDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
      const sessionCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("user_session="));

      if (!sessionCookie) {
        router.push("/user/sign-in");
        return;
      }

      try {
        const sessionData = JSON.parse(
          decodeURIComponent(sessionCookie.split("=")[1])
        );
        setUserSession(sessionData);
      } catch (error) {
        console.error("Failed to parse session:", error);
        router.push("/user/sign-in");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch user's emergency/appointment history from database
  useEffect(() => {
    if (userSession) {
      const fetchUserHistory = async () => {
        try {
          // Fetch appointments
          const appointmentsRes = await fetch(
            `/api/appointments?user_phone=${encodeURIComponent(userSession.phone_number)}`
          );
          const appointmentsData = await appointmentsRes.json();

          // Fetch SOS emergencies
          const emergenciesRes = await fetch(
            `/api/emergency?phone=${encodeURIComponent(userSession.phone_number)}`
          );
          const emergenciesData = await emergenciesRes.json();

          const combinedHistory: Emergency[] = [];

          // Add appointments
          if (appointmentsData.success && appointmentsData.appointments) {
            const dbAppointments: Emergency[] = appointmentsData.appointments.map((apt: any) => ({
              id: apt.id,
              date: new Date(apt.created_at).toISOString().split('T')[0],
              status: apt.status,
              hospital: apt.hospital_name,
              type: "appointment",
              time: apt.appointment_time
                ? new Date(apt.appointment_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : undefined,
            }));
            combinedHistory.push(...dbAppointments);
          }

          // Add SOS emergencies
          if (emergenciesData.success && emergenciesData.data) {
            const dbEmergencies: Emergency[] = emergenciesData.data.map((emer: any) => ({
              id: emer.id,
              date: new Date(emer.created_at).toISOString().split('T')[0],
              status: emer.status,
              hospital: emer.assigned_hospital_name || 'Awaiting Assignment',
              type: "emergency",
            }));
            combinedHistory.push(...dbEmergencies);
          }

          // Sort by date (newest first)
          combinedHistory.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
          });

          setEmergencies(combinedHistory);
        } catch (error) {
          console.error("Failed to fetch user history:", error);
          // Keep empty array on error
          setEmergencies([]);
        }
      };

      fetchUserHistory();
    }
  }, [userSession]);

  // Fetch nearby hospitals when opening appointment modal
  useEffect(() => {
    if (showAppointmentModal && hospitals.length === 0) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await fetch("/api/hospitals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            });
            const data = await res.json();

            // Map the hospital data from the API (which already includes calculated distances)
            const nearby = data.slice(0, 10).map((h: any) => ({
              id: h.id,
              name: h.name,
              distance: `${h.distance.toFixed(1)} km`, // Use the actual distance from API
              doctor: h.specialties || "General Physician", // Use specialties if available
              lat: h.latitude, // Correct field name
              lng: h.longitude, // Correct field name
            }));
            setHospitals(nearby);
          } catch (error) {
            console.error("Failed to fetch hospitals:", error);
          }
        },
        (error) => {
          console.error("Location error:", error);
        }
      );
    }
  }, [showAppointmentModal, hospitals.length]);

  const handleLogout = () => {
    document.cookie =
      "user_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/user");
  };

  const handleSOSClick = () => {
    router.push("/user/sos");
  };

  const handleBookAppointment = async () => {
    if (!selectedHospital || !selectedDate || !selectedTime) {
      alert("Please select hospital, date, and time");
      return;
    }

    if (!userSession) {
      alert("Please log in to book an appointment");
      return;
    }

    setBookingLoading(true);

    try {
      // Get user's current location for the appointment
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Convert 12-hour time format (e.g., "09:00 AM") to 24-hour format (e.g., "09:00")
      const convertTo24Hour = (time12h: string): string => {
        const [time, period] = time12h.split(' ');
        let [hours, minutes] = time.split(':');

        if (period === 'PM' && hours !== '12') {
          hours = String(parseInt(hours) + 12);
        } else if (period === 'AM' && hours === '12') {
          hours = '00';
        }

        return `${hours.padStart(2, '0')}:${minutes}`;
      };

      // Combine date and time into a timestamp
      const time24h = convertTo24Hour(selectedTime);
      const appointmentDateTime = `${selectedDate}T${time24h}:00`;

      // Call the API to create appointment
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_phone: userSession.phone_number,
          user_name: userSession.name,
          blood_group: userSession.blood_group,
          medical_conditions: null, // You can add this to user profile later
          issue_type: "General Consultation",
          description: "User booked appointment from dashboard",
          hospital_name: selectedHospital.name,
          hospital_lat: selectedHospital.lat,
          hospital_lng: selectedHospital.lng,
          user_lat: position.coords.latitude,
          user_lng: position.coords.longitude,
          appointment_time: appointmentDateTime, // Add the appointment time
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add new appointment to the local list
        const newAppointment: Emergency = {
          id: data.data.id,
          date: selectedDate,
          status: "pending",
          hospital: selectedHospital.name,
          type: "appointment",
          time: selectedTime,
        };
        setEmergencies([newAppointment, ...emergencies]);

        alert(`✅ Appointment booked successfully at ${selectedHospital.name}!`);
      } else {
        alert(`❌ Failed to book appointment: ${data.error}`);
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      alert("❌ Failed to book appointment. Please try again.");
    } finally {
      // Reset and close modal
      setShowAppointmentModal(false);
      setSelectedHospital(null);
      setSelectedDate("");
      setSelectedTime("");
      setBookingLoading(false);
    }
  };

  const handleEditProfile = () => {
    // Navigate to a profile edit page or open a modal
    // For now, we'll show an alert - you can implement a proper edit page later
    alert("Profile editing feature coming soon! This will allow you to update your personal and medical information.");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userSession) {
    return null;
  }

  const getStatusColor = (status: Emergency["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "in-progress":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "pending":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "cancelled":
        return "text-red-600 bg-red-50 border-red-200";
    }
  };

  const getStatusIcon = (status: Emergency["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "in-progress":
        return <Activity className="w-4 h-4 animate-pulse" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
    }
  };

  const timeSlots = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="blur-blob w-96 h-96 bg-green-200 -top-24 -left-24 animate-pulse-slow z-0" />
      <div className="blur-blob w-[500px] h-[500px] bg-emerald-200 -bottom-32 -right-32 animate-pulse-slow [animation-delay:1s] z-0" />

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 md:w-14 md:h-14">
                <Image
                  src="/KenLogo1.png"
                  alt="KEN Logo"
                  fill
                  className="object-contain rounded-xl"
                  priority
                />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                {t('dashboardTitle')}
              </h1>
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <User className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{userSession.name}</p>
                  <p className="text-xs text-gray-600">{userSession.phone_number}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">{t('logout')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                  <Zap className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {emergencies.filter(e => e.type === "emergency").length}
                  </p>
                  <p className="text-sm text-gray-600">{t('totalEmergencies')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {emergencies.filter(e => e.type === "appointment").length}
                  </p>
                  <p className="text-sm text-gray-600">{t('appointments')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {emergencies.filter(e => e.status === "pending").length}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('pendingActions')}</p>
                </div>
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">{t('medicalAssistance')}</h1>
            <p className="text-gray-600 font-medium">{t('requestAppt')}</p>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* SOS Emergency */}
            <button
              onClick={handleSOSClick}
              className="bg-gradient-to-br from-red-600 to-red-700 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex flex-col items-center gap-3 border-4 border-white ring-4 ring-red-50"
            >
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg">{t('emergencySOS')}</h3>
                <p className="text-xs text-red-100 mt-1">{t('instantHelp')}</p>
              </div>
            </button>

            {/* Book Appointment */}
            <button
              onClick={() => setShowAppointmentModal(true)}
              className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex flex-col items-center gap-3 border border-gray-200"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <CalendarPlus className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg text-gray-900">{t('bookAppointment')}</h3>
                <p className="text-xs text-gray-600 mt-1">{t('scheduleVisit')}</p>
              </div>
            </button>

            {/* View History */}
            <button
              className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex flex-col items-center gap-3 border border-gray-200"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <HistoryIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg text-gray-900">{t('history')}</h3>
                <p className="text-xs text-gray-600 mt-1">{emergencies.length} {t('records')}</p>
              </div>
            </button>

            {/* Edit Profile */}
            <button
              onClick={handleEditProfile}
              className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex flex-col items-center gap-3 border border-gray-200"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Settings className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg text-gray-900">{t('settings')}</h3>
                <p className="text-xs text-gray-600 mt-1">{t('editProfile')}</p>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Emergency & Appointment History */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <HistoryIcon className="w-6 h-6 text-emerald-600" />
                <h3 className="text-xl font-bold text-gray-900">{t('recentActivity')}</h3>
              </div>

              {emergencies.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('noHistory')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {emergencies.map((emergency) => (
                    <div
                      key={emergency.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {emergency.type === "emergency" ? (
                          <Zap className="w-6 h-6 text-red-600" />
                        ) : (
                          <Calendar className="w-6 h-6 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {emergency.type === "emergency" ? "Emergency SOS" : "Appointment"}
                          </h4>
                          <span
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              emergency.status
                            )}`}
                          >
                            {getStatusIcon(emergency.status)}
                            {emergency.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Hospital className="w-4 h-4" />
                            {emergency.hospital}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {emergency.date}
                          </span>
                          {emergency.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {emergency.time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Information */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-emerald-600" />
                <h3 className="text-xl font-bold text-gray-900">Profile</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{userSession.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{userSession.phone_number}</p>
                  </div>
                </div>

                {userSession.blood_group && (
                  <div className="flex items-start gap-3">
                    <Droplet className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Blood Group</p>
                      <p className="font-medium text-gray-900">{userSession.blood_group}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleEditProfile}
                  className="w-full mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Appointment Booking Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-2xl font-bold text-gray-900">Book Appointment</h2>
              <button
                onClick={() => setShowAppointmentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Hospital Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Hospital className="w-5 h-5 text-emerald-600" />
                  Select Hospital
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hospitals.map((hospital) => (
                    <button
                      key={hospital.id}
                      onClick={() => setSelectedHospital(hospital)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${selectedHospital?.id === hospital.id
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-gray-200 hover:border-emerald-300 bg-white"
                        }`}
                    >
                      <h4 className="font-semibold text-gray-900 mb-1">{hospital.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {hospital.distance}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {hospital.doctor}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              {selectedHospital && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    Select Date
                  </h3>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              )}

              {/* Time Selection */}
              {selectedHospital && selectedDate && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    Select Time
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${selectedTime === time
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 hover:border-emerald-300 text-gray-700"
                          }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm Button */}
              {selectedHospital && selectedDate && selectedTime && (
                <button
                  onClick={handleBookAppointment}
                  disabled={bookingLoading}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {bookingLoading ? (
                    <>
                      <Activity className="w-5 h-5 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Confirm Appointment
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
