"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ambulance, CheckCircle, AlertCircle } from "lucide-react";

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
    const [ambulances, setAmbulances] = useState<AmbulanceType[]>([]);

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
                const found = data.data.find((a: any) =>
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

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Ambulance className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Ambulance Driver</h1>
                    <p className="text-gray-500">Enter your vehicle details to start</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vehicle Number
                        </label>
                        <input
                            type="text"
                            placeholder="MH-12-AB-1234"
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? "Verifying..." : "Start Shift"}
                    </button>
                </div>
            </div>
        </div>
    );
}
