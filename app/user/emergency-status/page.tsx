"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle, Clock, AlertCircle, Phone, Ambulance, MapPin } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";

export const dynamic = "force-dynamic";

type EmergencyData = {
  id: string;
  phone_number: string;
  name: string | null;
  latitude: number;
  longitude: number;
  status: string;
  emergency_level: string;
  hospital_id?: string;
  assigned_hospital_name?: string;
  assigned_hospital_lat?: number;
  assigned_hospital_lng?: number;
  assigned_ambulance_number?: string;
  driver_name?: string;
  driver_phone?: string;
  created_at: string;
};

export default function EmergencyStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    }>
      <EmergencyStatusContent />
    </Suspense>
  );
}

function EmergencyStatusContent() {
  const searchParams = useSearchParams();
  const emergencyId = searchParams.get("emergencyId");
  const { t } = useLanguage();

  const [emergencyData, setEmergencyData] = useState<EmergencyData | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Poll for emergency status updates
  useEffect(() => {
    if (!emergencyId) {
      if (isLoading) setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/emergency?id=${emergencyId}`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
          const emergency = data.data[0];
          setEmergencyData(emergency);

          // Set ETA when ambulance is dispatched
          if (emergency.status === "dispatched" || emergency.status === "in_progress") {
            setEta(7); // Default 7 minutes, you can calculate based on distance
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching emergency status:", error);
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, [emergencyId]);

  const getStatusInfo = () => {
    if (!emergencyData) {
      return {
        icon: <AlertCircle className="w-6 h-6 text-gray-600" />,
        color: "gray",
        text: "Loading...",
        bgClass: "bg-gray-50 border-gray-200",
        textClass: "text-gray-800",
      };
    }

    switch (emergencyData.status) {
      case "pending":
        return {
          icon: <Clock className="w-6 h-6 text-yellow-600" />,
          color: "yellow",
          text: t('waitingApproval'),
          bgClass: "bg-yellow-50 border-yellow-200",
          textClass: "text-yellow-800",
        };
      case "acknowledged":
        return {
          icon: <CheckCircle className="w-6 h-6 text-blue-600" />,
          color: "blue",
          text: t('approvedByHospital'),
          bgClass: "bg-blue-50 border-blue-200",
          textClass: "text-blue-800",
        };
      case "dispatched":
        return {
          icon: <Ambulance className="w-6 h-6 text-green-600" />,
          color: "green",
          text: t('ambulanceDispatched'),
          bgClass: "bg-green-50 border-green-200",
          textClass: "text-green-800",
        };
      case "in_progress":
        return {
          icon: <Ambulance className="w-6 h-6 text-green-600" />,
          color: "green",
          text: t('ambulanceWay'),
          bgClass: "bg-green-50 border-green-200",
          textClass: "text-green-800",
        };
      case "resolved":
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          color: "green",
          text: "Emergency Resolved",
          bgClass: "bg-green-50 border-green-200",
          textClass: "text-green-800",
        };
      default:
        return {
          icon: <AlertCircle className="w-6 h-6 text-gray-600" />,
          color: "gray",
          text: "Unknown Status",
          bgClass: "bg-gray-50 border-gray-200",
          textClass: "text-gray-800",
        };
    }
  };

  const statusInfo = getStatusInfo();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading emergency status...</p>
        </div>
      </div>
    );
  }

  if (!emergencyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Emergency Not Found</h1>
          <p className="text-gray-600">Unable to load emergency details. Please check your emergency ID.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-green-50/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center border border-green-100/50 hover:shadow-3xl transition-shadow duration-300">
          {/* Logo with pulse animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400/30 rounded-2xl blur-xl animate-pulse"></div>
              <Image
                src="/KenLogo1.png"
                alt="KEN Logo"
                width={90}
                height={90}
                className="rounded-2xl relative z-10 shadow-lg"
              />
            </div>
          </div>

          <h1 className="text-4xl font-bold bg-linear-to-r from-green-700 via-emerald-600 to-green-700 bg-clip-text text-transparent mb-3">
            {t('emergencyActive')}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-gray-700 font-semibold text-lg">
              {t('stayCalm')}
            </p>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div className="inline-block bg-green-100/80 backdrop-blur-sm px-4 py-2 rounded-full border border-green-200">
            <p className="text-sm text-gray-700 font-semibold">
              {t('emergencyId')}: <span className="font-mono text-green-700">{emergencyData.id.slice(0, 8)}...</span>
            </p>
          </div>
        </div>

        {/* STATUS TIMELINE */}
        <div className={`bg-emerald-50/90 backdrop-blur-xl rounded-3xl shadow-2xl p-7 border-2 ${statusInfo.bgClass} hover:shadow-3xl transition-all duration-300`}>
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
            <div className="p-3 bg-white/80 rounded-xl shadow-md">
              {statusInfo.icon}
            </div>
            <div className="flex-1">
              <p className="font-bold text-xl text-gray-900 mb-1">{t('currentStatus')}</p>
              <p className={`font-semibold text-lg ${statusInfo.textClass}`}>
                {statusInfo.text}
              </p>
            </div>
          </div>

          {/* Status Progress */}
          <div className="space-y-4 relative">
            {/* Connecting line */}
            <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-linear-to-b from-green-300 via-green-200 to-gray-200"></div>

            <div className="flex items-center gap-4 relative">
              <div className="w-9 h-9 bg-linear-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 ring-4 ring-green-100 z-10">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                <p className="font-bold text-gray-900">{t('requestSent')}</p>
                <p className="text-xs text-gray-600 mt-0.5">{t('requestRegistered')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 relative">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 z-10 ${emergencyData.status !== "pending"
                ? "bg-linear-to-br from-green-500 to-green-600 ring-4 ring-green-100"
                : "bg-linear-to-br from-yellow-400 to-yellow-500 animate-pulse ring-4 ring-yellow-100"
                }`}>
                {emergencyData.status !== "pending" ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Clock className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                <p className="font-bold text-gray-900">{t('hospitalReview')}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {emergencyData.status === "pending"
                    ? t('waitingApproval')
                    : t('approvedByHospital')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 relative">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 z-10 ${emergencyData.status === "dispatched" || emergencyData.status === "in_progress" || emergencyData.status === "resolved"
                ? "bg-linear-to-br from-green-500 to-green-600 ring-4 ring-green-100"
                : "bg-gray-300 ring-4 ring-gray-100"
                }`}>
                <Ambulance className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                <p className="font-bold text-gray-900">{t('ambulanceDispatched')}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {emergencyData.status === "dispatched" || emergencyData.status === "in_progress" || emergencyData.status === "resolved"
                    ? t('ambulanceWay')
                    : t('waitingDispatch')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* HOSPITAL INFO */}
        {emergencyData.assigned_hospital_name && (
          <div className="bg-green-50/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-green-100/50 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center shadow-md">
                <span className="text-3xl">🏥</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-xl text-gray-900 mb-1">{t('assignedHospital')}</p>
                <p className="text-gray-700 font-semibold text-lg">{emergencyData.assigned_hospital_name}</p>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4">
              <span className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold shadow-sm ${emergencyData.status === "pending"
                ? "bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-300"
                : "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-300"
                }`}>
                {emergencyData.status === "pending" ? (
                  <>
                    <Clock className="w-4 h-4" />
                    {t('reviewingRequest')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {t('requestApproved')}
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* AMBULANCE INFO */}
        {emergencyData.assigned_ambulance_number && (
          <div className="bg-emerald-50/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border-2 border-green-200 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center shadow-md">
                <Ambulance className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-xl text-gray-900 mb-1">{t('ambulanceDetails')}</p>
                <p className="text-gray-700 font-semibold text-lg">{t('vehicle')}: {emergencyData.assigned_ambulance_number}</p>
              </div>
            </div>

            {emergencyData.driver_name && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{t('driverName')}</p>
                    <p className="text-sm text-gray-800 font-bold">{emergencyData.driver_name}</p>
                  </div>
                </div>
                {emergencyData.driver_phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{t('contactNumber')}</p>
                      <p className="text-sm text-gray-800 font-bold">{emergencyData.driver_phone}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ETA */}
        {eta && (emergencyData.status === "dispatched" || emergencyData.status === "in_progress") && (
          <div className="bg-green-50/90 backdrop-blur-xl rounded-3xl shadow-2xl p-7 text-center border-2 border-green-200 hover:shadow-3xl transition-all duration-300">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg mb-3">
                <Ambulance className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="font-bold text-gray-900 mb-3 text-xl">{t('estimatedArrival')}</p>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 mb-3">
              <p className="text-5xl font-bold bg-linear-to-r from-green-600 via-emerald-600 to-green-600 bg-clip-text text-transparent">
                {eta} – {eta + 2} min
              </p>
            </div>
            <p className="text-sm text-gray-700 font-semibold flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              {t('stayLocation')}
            </p>
          </div>
        )}

        {/* MAP */}
        {emergencyData.assigned_hospital_lat && emergencyData.assigned_hospital_lng && (
          <div className="bg-emerald-50/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-green-100/50 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-200 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-bold text-gray-900 text-xl">{t('routeToHospital')}</p>
            </div>
            <iframe
              className="w-full h-64 rounded-xl border"
              loading="lazy"
              src={`https://www.google.com/maps?saddr=${emergencyData.latitude},${emergencyData.longitude}&daddr=${emergencyData.assigned_hospital_lat},${emergencyData.assigned_hospital_lng}&output=embed`}
            />
          </div>
        )}

        {/* POLICE NOTIFICATION */}
        <div className="bg-blue-50/90 backdrop-blur-xl border-2 border-blue-200 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🚓</span>
            </div>
            <p className="font-bold text-blue-900 text-lg">{t('policeNotified')}</p>
          </div>
          <p className="text-sm text-blue-800 font-medium">
            {t('policeMessage')}
          </p>
        </div>

        {/* EMERGENCY ACTIONS */}
        {emergencyData.driver_phone && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={`tel:${emergencyData.driver_phone}`}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 rounded-2xl font-bold text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              {t('callDriver')}
            </a>

            <a
              href="tel:108"
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-4 rounded-2xl font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              {t('callEmergency')}
            </a>
          </div>
        )}

        {/* HELP TEXT */}
        <div className="bg-red-50/90 backdrop-blur-xl border border-red-200 rounded-3xl p-4 text-center">
          <p className="text-sm text-red-800 font-semibold">
            ⚠️ {t('emergencyWarning')} <span className="font-bold">108</span> {t('immediately')}
          </p>
        </div>

        {/* FOOTER */}
        <p className="text-center text-sm text-gray-600 mt-6 font-medium">
          {t('footerCopyright')} · {t('footerQuote')}
        </p>
      </div>
    </div>
  );
}