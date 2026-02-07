"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import {
  Shield,
  MapPin,
  Clock,
  AlertCircle,
  Phone,
  CheckCircle,
  Eye,
  Radio,
  Siren,
  Hospital,
  Navigation,
  ChevronRight,
  Activity,
} from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const PoliceMap = dynamic(() => import("./map/PoliceMap"), {
  ssr: false,
  loading: () => (
    <div className="h-96 lg:h-[500px] w-full bg-slate-100 animate-pulse-subtle rounded-lg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <MapPin className="w-8 h-8 text-slate-400 animate-pulse" />
        <span className="text-slate-500 text-sm font-medium tracking-wide">
          Loading Interactive Map...
        </span>
      </div>
    </div>
  ),
})

/* ---------------- SUPABASE SETUP ---------------- */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/* ---------------- TYPES ---------------- */
type HospitalType = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  phone: string | null
}

type Emergency = {
  id: string
  phone_number: string
  name: string | null
  latitude: number
  longitude: number
  location_text: string | null
  emergency_level: "low" | "medium" | "high" | "critical"
  emergency_type: string | null
  description: string | null
  status:
    | "pending"
    | "acknowledged"
    | "dispatched"
    | "in_progress"
    | "resolved"
    | "cancelled"
  assigned_hospital_name: string | null
  assigned_hospital_lat: number | null
  assigned_hospital_lng: number | null
  assigned_ambulance_number: string | null
  driver_name: string | null
  driver_phone: string | null
  blood_group: string | null
  allergies: string | null
  medical_conditions: string | null
  created_at: string
  updated_at: string
  hospital_id: string | null
  hospital?: HospitalType
}

/* ---------------- MAP COMPONENT WITH ROUTE ---------------- */
function EmergencyRouteMap({
  emergencyLat,
  emergencyLng,
  hospitalLat,
  hospitalLng,
  hospitalName,
}: {
  emergencyLat: number
  emergencyLng: number
  hospitalLat?: number | null
  hospitalLng?: number | null
  hospitalName?: string | null
}) {
  if (hospitalLat && hospitalLng) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="w-4 h-4 text-slate-700" />
            <h3 className="font-semibold text-slate-900 text-sm tracking-tight">
              Emergency Route
            </h3>
          </div>
          <PoliceMap
            userLat={Number(emergencyLat)}
            userLng={Number(emergencyLng)}
            hospitalLat={Number(hospitalLat)}
            hospitalLng={Number(hospitalLng)}
          />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-mono">
                {emergencyLat.toFixed(4)}, {emergencyLng.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-mono">
                {hospitalName || "Hospital"}: {hospitalLat.toFixed(4)},{" "}
                {hospitalLng.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <iframe
        title="Emergency location map"
        className="w-full h-96 lg:h-[500px] rounded-lg border-0"
        loading="lazy"
        src={`https://maps.google.com/maps?q=${emergencyLat},${emergencyLng}&output=embed`}
      />
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-amber-800 text-sm font-medium">
          {hospitalName
            ? "Fetching hospital location details..."
            : "No hospital assigned to this emergency yet."}
        </p>
      </div>
    </div>
  )
}

/* ---------------- UTILITY FUNCTIONS ---------------- */
const getTimeAgo = (timestamp: string) => {
  const now = new Date()
  const created = new Date(timestamp)
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance < 1
    ? `${(distance * 1000).toFixed(0)}m`
    : `${distance.toFixed(2)}km`
}

/* ---------------- LEVEL BADGE STYLES ---------------- */
const getLevelStyles = (level: string) => {
  switch (level) {
    case "critical":
      return "bg-red-600 text-white"
    case "high":
      return "bg-orange-500 text-white"
    case "medium":
      return "bg-amber-500 text-white"
    default:
      return "bg-sky-500 text-white"
  }
}

const getLevelDot = (level: string) => {
  switch (level) {
    case "critical":
      return "bg-red-500"
    case "high":
      return "bg-orange-500"
    case "medium":
      return "bg-amber-500"
    default:
      return "bg-sky-500"
  }
}

const getStatusStyles = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-red-50 text-red-700 border-red-200"
    case "acknowledged":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "dispatched":
      return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "in_progress":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    default:
      return "bg-slate-50 text-slate-700 border-slate-200"
  }
}

/* ================================================================ */
/*  MAIN COMPONENT                                                   */
/* ================================================================ */
export default function PoliceDashboard() {
  const [timeNow, setTimeNow] = useState("")
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [selected, setSelected] = useState<Emergency | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignedHospital, setAssignedHospital] =
    useState<HospitalType | null>(null)

  /* --- Live Clock --- */
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  /* --- Fetch Emergencies --- */
  const fetchEmergencies = async () => {
    try {
      const { data, error } = await supabase
        .from("sos_emergencies")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      const newEmergencies = data || []
      setEmergencies(newEmergencies)

      if (selected) {
        const updated = newEmergencies.find((e) => e.id === selected.id)
        if (updated) {
          if (
            updated.hospital_id !== selected.hospital_id ||
            updated.assigned_hospital_name !==
              selected.assigned_hospital_name ||
            updated.status !== selected.status
          ) {
            viewLocation(updated)
          } else {
            setSelected(updated)
          }
        }
      }

      setLoading(false)
    } catch (error) {
      console.error("Error fetching emergencies:", error)
      setLoading(false)
    }
  }

  /* --- Fetch Hospital by ID --- */
  const fetchHospitalById = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from("hospitals")
        .select("*")
        .eq("id", hospitalId)
        .single()

      if (error) return null
      return data as HospitalType
    } catch {
      return null
    }
  }

  /* --- Fetch Hospital by Name --- */
  const fetchHospitalByName = async (name: string) => {
    try {
      const { data: exactMatch, error: exactError } = await supabase
        .from("hospitals")
        .select("*")
        .ilike("name", name)
        .maybeSingle()

      if (!exactError && exactMatch) return exactMatch as HospitalType

      const { data: fuzzyMatches, error: fuzzyError } = await supabase
        .from("hospitals")
        .select("*")
        .ilike("name", `%${name.split(" ")[0]}%`)
        .limit(5)

      if (!fuzzyError && fuzzyMatches && fuzzyMatches.length > 0) {
        return fuzzyMatches[0] as HospitalType
      }

      return null
    } catch {
      return null
    }
  }

  /* --- Real-time Subscription --- */
  useEffect(() => {
    fetchEmergencies()

    const channel = supabase
      .channel("sos_emergencies_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_emergencies" },
        () => {
          fetchEmergencies()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* --- Update Status --- */
  const updateStatus = async (id: string, newStatus: Emergency["status"]) => {
    try {
      const { error } = await supabase
        .from("sos_emergencies")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) throw error

      setEmergencies((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
      )

      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  const markAcknowledged = (id: string) => updateStatus(id, "acknowledged")
  const markInProgress = (id: string) => updateStatus(id, "in_progress")
  const markResolved = (id: string) => updateStatus(id, "resolved")

  /* --- View Location --- */
  const viewLocation = async (emergency: Emergency) => {
    setSelected(emergency)

    if (
      emergency.assigned_hospital_lat &&
      emergency.assigned_hospital_lng
    ) {
      setAssignedHospital({
        id: "",
        name: emergency.assigned_hospital_name || "Assigned Hospital",
        address: "",
        latitude: emergency.assigned_hospital_lat,
        longitude: emergency.assigned_hospital_lng,
        phone: null,
      })
    } else if (emergency.hospital_id) {
      const hospitalData = await fetchHospitalById(emergency.hospital_id)
      setAssignedHospital(hospitalData)
    } else if (emergency.assigned_hospital_name) {
      const hospitalData = await fetchHospitalByName(
        emergency.assigned_hospital_name
      )
      setAssignedHospital(hospitalData)
    } else {
      setAssignedHospital(null)
    }

    setTimeout(() => {
      const mapSection = document.getElementById("location-map-section")
      if (mapSection) {
        mapSection.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 100)
  }

  /* --- Computed --- */
  const activeEmergencies = emergencies.filter((e) =>
    ["pending", "acknowledged", "dispatched", "in_progress"].includes(e.status)
  )
  const criticalCount = emergencies.filter(
    (e) =>
      e.emergency_level === "critical" &&
      ["pending", "acknowledged", "dispatched", "in_progress"].includes(
        e.status
      )
  ).length
  const resolvedCount = emergencies.filter(
    (e) => e.status === "resolved"
  ).length

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== HEADER ===== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
          {/* Mobile */}
          <div className="flex flex-col gap-3 sm:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    ResQNet Police
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">
                    Emergency Response
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-semibold text-xs">
                PC
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 rounded-md border border-emerald-200 self-start">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-700 font-mono text-xs font-medium">
                LIVE {timeNow}
              </span>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden sm:flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 lg:w-11 lg:h-11 bg-slate-900 rounded-lg flex items-center justify-center transition-transform hover:scale-105 duration-200">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                  ResQNet Police
                </h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
                  Emergency Response Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-700 font-mono text-xs font-semibold tracking-wide">
                  LIVE {timeNow}
                </span>
              </div>

              <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 transition-colors hover:bg-slate-100 duration-200">
                <div className="w-8 h-8 lg:w-9 lg:h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center font-semibold text-sm">
                  PC
                </div>
                <div className="hidden md:block">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">
                    Officer John
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Police Administrator
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
        {/* --- STATS --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              label: "Active Emergencies",
              value: activeEmergencies.length,
              icon: Siren,
              color: "text-red-600",
              bg: "bg-red-50",
            },
            {
              label: "Critical Cases",
              value: criticalCount,
              icon: AlertCircle,
              color: "text-orange-600",
              bg: "bg-orange-50",
            },
            {
              label: "Resolved Cases",
              value: resolvedCount,
              icon: CheckCircle,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Total Cases",
              value: emergencies.length,
              icon: Activity,
              color: "text-slate-700",
              bg: "bg-slate-100",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-slate-200 p-4 lg:p-5 transition-shadow hover:shadow-md duration-200 animate-fade-in"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 lg:w-10 lg:h-10 ${stat.bg} rounded-lg flex items-center justify-center`}
                >
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums font-mono">
                  {stat.value}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* --- LIVE EMERGENCIES --- */}
        <section className="bg-white rounded-lg border border-slate-200 overflow-hidden animate-fade-in">
          <div className="px-4 sm:px-6 lg:px-8 py-4 lg:py-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 lg:w-9 lg:h-9 bg-red-600 rounded-lg flex items-center justify-center">
                <Siren className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Live Emergency Alerts
                </h2>
                <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase hidden sm:block">
                  Real-time incident monitoring
                </p>
              </div>
            </div>
            <span className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold tabular-nums">
              {activeEmergencies.length} Active
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 font-medium">
                  Loading emergencies...
                </p>
              </div>
            ) : emergencies.length === 0 ? (
              <div className="p-12 flex flex-col items-center gap-2">
                <CheckCircle className="w-10 h-10 text-emerald-300" />
                <p className="text-sm text-slate-500 font-medium">
                  No emergencies at this time
                </p>
              </div>
            ) : (
              emergencies.map((e) => (
                <div
                  key={e.id}
                  onClick={() => viewLocation(e)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") viewLocation(e)
                  }}
                  className={`p-4 sm:p-5 lg:p-6 cursor-pointer transition-all duration-200 group
                    ${
                      selected?.id === e.id
                        ? "bg-slate-50 border-l-[3px] border-l-slate-900"
                        : "hover:bg-slate-50/60 border-l-[3px] border-l-transparent"
                    }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Level indicator dot */}
                      <div className="mt-2 shrink-0">
                        <span
                          className={`block w-3 h-3 rounded-full ${getLevelDot(e.emergency_level)} ${e.emergency_level === "critical" ? "animate-pulse" : ""}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="font-semibold text-sm sm:text-base text-slate-900 tracking-tight truncate">
                            {e.emergency_type || "Emergency Alert"}
                          </p>
                          <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
                        </div>
                        <div className="space-y-1">
                          {e.name && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Eye className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <p className="text-xs font-medium truncate">
                                {e.name}
                              </p>
                            </div>
                          )}
                          {e.phone_number && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <p className="text-xs font-mono font-medium truncate">
                                {e.phone_number}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <p className="text-xs font-medium truncate">
                              {e.location_text ||
                                `${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)}`}
                            </p>
                          </div>
                          {e.assigned_hospital_name && (
                            <div className="flex items-center gap-2 text-blue-600">
                              <Hospital className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                              <p className="text-xs font-medium truncate">
                                {e.assigned_hospital_name}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock className="w-3 h-3 shrink-0" />
                            <p className="text-[11px] font-medium">
                              {getTimeAgo(e.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center sm:flex-col gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider ${getLevelStyles(e.emergency_level)}`}
                      >
                        {e.emergency_level}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border capitalize ${getStatusStyles(e.status)}`}
                      >
                        {e.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {["pending", "acknowledged", "in_progress"].includes(
                    e.status
                  ) && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          viewLocation(e)
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-md text-xs font-medium transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        View Route
                      </button>
                      {e.status === "pending" && (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            markAcknowledged(e.id)
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-md text-xs font-medium transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98]"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Acknowledge
                        </button>
                      )}
                      {e.status === "acknowledged" && (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            markInProgress(e.id)
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-md text-xs font-medium transition-all duration-200 hover:bg-amber-700 active:scale-[0.98]"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          En Route
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          markResolved(e.id)
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition-all duration-200 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98]"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Resolve
                      </button>
                    </div>
                  )}

                  {e.status === "resolved" && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-md border border-emerald-200 mt-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-xs font-medium text-emerald-700">
                        Emergency Resolved
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* --- MAP SECTION --- */}
        {selected && (
          <section
            id="location-map-section"
            className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6 lg:p-8 animate-scale-in"
          >
            <div className="flex flex-col gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 lg:w-9 lg:h-9 bg-slate-900 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Incident Details
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">
                    Location & route information
                  </p>
                </div>
              </div>

              {/* Location Info */}
              <div className="bg-slate-50 rounded-lg p-4 lg:p-5 border border-slate-200">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Incident Type
                    </p>
                    <p className="font-semibold text-slate-900">
                      {selected.emergency_type || "Emergency"}
                    </p>
                    <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {selected.location_text ||
                        `${selected.latitude.toFixed(6)}, ${selected.longitude.toFixed(6)}`}
                    </p>
                  </div>

                  {selected.phone_number && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Caller Contact
                      </p>
                      <a
                        href={`tel:${selected.phone_number}`}
                        className="text-slate-900 font-semibold flex items-center gap-1.5 transition-colors duration-200 hover:text-blue-600"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {selected.phone_number}
                      </a>
                      {selected.name && (
                        <p className="text-sm text-slate-600 mt-0.5">
                          {selected.name}
                        </p>
                      )}
                    </div>
                  )}

                  {assignedHospital && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Assigned Hospital
                      </p>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Hospital className="w-3.5 h-3.5 text-blue-500" />
                        <p className="font-semibold text-slate-900">
                          {assignedHospital.name}
                        </p>
                      </div>
                      {assignedHospital.latitude &&
                        assignedHospital.longitude && (
                          <p className="text-sm text-slate-600 flex items-center gap-1.5">
                            <Navigation className="w-3 h-3 text-slate-400" />
                            Distance:{" "}
                            <span className="font-semibold text-slate-900">
                              {calculateDistance(
                                selected.latitude,
                                selected.longitude,
                                assignedHospital.latitude,
                                assignedHospital.longitude
                              )}
                            </span>
                          </p>
                        )}
                    </div>
                  )}

                  {selected.description && (
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Description
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {selected.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Police Action */}
                <div className="mt-4 p-3 bg-slate-900 rounded-lg flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-white shrink-0" />
                  <p className="text-white text-xs font-medium tracking-wide">
                    Police assistance requested -- Clear the route for ambulance
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border border-slate-200">
              <EmergencyRouteMap
                emergencyLat={selected.latitude}
                emergencyLng={selected.longitude}
                hospitalLat={assignedHospital?.latitude}
                hospitalLng={assignedHospital?.longitude}
                hospitalName={assignedHospital?.name}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
