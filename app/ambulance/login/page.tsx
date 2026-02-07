"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ambulance, CheckCircle, AlertCircle, Loader2, Hash } from "lucide-react";
import Image from "next/image";

type AmbulanceType = {
    id: string;
    vehicle_number: string;
    driver_name: string;
    hospital_id: string;
};

export default function AmbulanceLogin() {
    const router = useRouter();
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Fetch all ambulances to let driver select (or simple verify)
    useEffect(() => {
        // Ideally we'd search by vehicle number, but for now we can just input it
    }, []);

    const handleLogin = async () => {
        if (!vehicleNumber.trim()) {
            setError("Please enter vehicle number");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Find ambulance by vehicle number
            // We need an API for this. For now let's use the existing list API and filter client side
            // or better, let's create a specific login action. 
            // Actually, looking at previous API, we can fetch all and find.
            // But for security/scalability we should filter on server. 
            // Let's rely on the user knowing their exact vehicle number for now.

            // Note: In a real app we'd have proper auth. Here we just "claim" an ambulance.
            // Let's fetch all ambulances first to match.
            const res = await fetch("/api/ambulances");
            const data = await res.json();

            if (data.success) {
                const found = data.data.find((a: AmbulanceType) =>
                    a.vehicle_number.toLowerCase() === vehicleNumber.trim().toLowerCase()
                );

                if (found) {
                    localStorage.setItem("ambulance_id", found.id);
                    localStorage.setItem("ambulance_info", JSON.stringify(found));
                    router.push("/ambulance");
                } else {
                    setError("Vehicle not found. Please contact hospital admin.");
                }
            } else {
                setError("Failed to fetch ambulance data");
            }

        } catch (err) {
            console.error(err);
            setError("Login failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleLogin();
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center px-6 py-12 relative overflow-hidden">
            {/* BACKGROUND DECORATIONS */}
            <div className="blur-blob w-96 h-96 bg-green-200 -top-24 -left-24 animate-pulse-slow" />
            <div className="blur-blob w-[500px] h-[500px] bg-emerald-200 -bottom-32 -right-32 animate-pulse-slow [animation-delay:1s]" />

            <div className="w-full max-w-md relative z-10">
                {/* BRANDING */}
                <div className="text-center mb-10 animate-blur-fade-in">
                    <div className="inline-flex items-center justify-center mb-6 animate-scale-in">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-400/30 rounded-2xl blur-xl animate-pulse"></div>
                            <Image
                                src="/KenLogo1.png"
                                alt="KEN Logo"
                                width={80}
                                height={80}
                                className="rounded-2xl relative z-10 shadow-lg"
                            />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 animate-slide-up delay-100">Ambulance Driver Portal</h1>
                    <p className="text-gray-600 font-medium animate-slide-up delay-200">Kozhikode Emergency Network</p>
                </div>

                {/* LOGIN CARD */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 animate-slide-up delay-300">
                    {/* ICON */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-linear-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Ambulance className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    {/* ERROR MESSAGE */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    {/* LOGIN FORM */}
                    <div className="space-y-5">
                        <div className="animate-slide-up delay-400">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Vehicle Number
                            </label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="MH-12-AB-1234"
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-green-300 hover:shadow-sm transition-all duration-200 outline-none font-medium"
                                    disabled={loading}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2 ml-1">Enter your assigned ambulance vehicle number</p>
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full gradient-bg-success text-white py-4 rounded-2xl font-bold text-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 animate-slide-up delay-500"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <Ambulance className="w-6 h-6" />
                                    Start Shift
                                </>
                            )}
                        </button>
                    </div>

                    {/* INFO BOX */}
                    <div className="mt-6 p-4 bg-green-50/80 backdrop-blur-sm rounded-2xl border border-green-100">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-green-900 mb-1">Quick Access</p>
                                <p className="text-xs text-green-700">Use your registered vehicle number to access the emergency response dashboard</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BACK TO HOME */}
                <button
                    onClick={() => router.push("/")}
                    className="mt-6 w-full text-center text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors duration-200"
                >
                    ← Back to Home
                </button>

                {/* FOOTER */}
                <p className="text-center text-xs text-gray-500 mt-6">
                    @2026 Kozhikode Emergency Network (KEN) · Every second saves a life
                </p>
            </div>
        </div>
    );
}
