import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMultiAssignment() {
    console.log("🚀 Starting Multi-Assignment Test...");

    // 1. Setup Test Hospital
    const { data: hospital, error: hError } = await supabase
        .from('hospitals')
        .upsert({
            name: "Multi-Assignment Test Hospital",
            username: "multi_test_hospital",
            password: "password123",
            latitude: 18.5204,
            longitude: 73.8567,
            address: "Test Hospital Address"
        })
        .select()
        .single();

    if (hError) {
        console.error("❌ Hospital setup failed:", hError);
        return;
    }
    console.log(`🏥 Hospital ready: ${hospital.name} (${hospital.id})`);

    // 2. Setup Test Ambulance
    const { data: ambulance, error: aError } = await supabase
        .from('ambulances')
        .upsert({
            hospital_id: hospital.id,
            vehicle_number: "MULTI-AMB-001",
            driver_name: "Multi Driver",
            driver_phone: "3333333333",
            is_available: true,
            latitude: 18.5204,
            longitude: 73.8567
        })
        .select()
        .single();

    if (aError) {
        console.error("❌ Ambulance setup failed:", aError);
        return;
    }
    console.log(`🚑 Ambulance ready: ${ambulance.vehicle_number} (${ambulance.id})`);

    // 3. Create Emergency 1
    console.log("\n🆘 Creating SOS request 1...");
    const { data: e1, error: e1Error } = await supabase
        .from('sos_emergencies')
        .insert({
            phone_number: "1111111111",
            name: "Emergency 1",
            latitude: 18.5205,
            longitude: 73.8568,
            status: "pending",
            emergency_level: "critical",
            emergency_type: "Accident"
        })
        .select()
        .single();

    if (e1Error) {
        console.error("❌ Emergency 1 creation failed:", e1Error);
        return;
    }
    console.log(`✅ Emergency 1 created: ${e1.id}`);

    // 4. Create Emergency 2
    console.log("\n🆘 Creating SOS request 2...");
    const { data: e2, error: e2Error } = await supabase
        .from('sos_emergencies')
        .insert({
            phone_number: "2222222222",
            name: "Emergency 2",
            latitude: 18.5210,
            longitude: 73.8570,
            status: "pending",
            emergency_level: "critical",
            emergency_type: "Heart Attack"
        })
        .select()
        .single();

    if (e2Error) {
        console.error("❌ Emergency 2 creation failed:", e2Error);
        return;
    }
    console.log(`✅ Emergency 2 created: ${e2.id}`);

    // 5. Dispatch Ambulance to Emergency 1
    console.log("\n📡 Dispatching ambulance to Emergency 1...");
    await supabase.from('sos_emergencies').update({
        status: 'dispatched',
        assigned_ambulance_number: ambulance.vehicle_number,
        assigned_hospital_name: hospital.name
    }).eq('id', e1.id);

    // 6. Dispatch SAME Ambulance to Emergency 2 (Multi-assignment)
    console.log("📡 Dispatching same ambulance to Emergency 2...");
    await supabase.from('sos_emergencies').update({
        status: 'dispatched',
        assigned_ambulance_number: ambulance.vehicle_number,
        assigned_hospital_name: hospital.name
    }).eq('id', e2.id);

    // 7. Verify Retrieval
    console.log("\n🔍 Verifying multiple assignments for ambulance...");
    const { data: missions, error: mError } = await supabase
        .from('sos_emergencies')
        .select('*')
        .eq('assigned_ambulance_number', ambulance.vehicle_number)
        .in('status', ['dispatched', 'in_progress']);

    if (mError || missions.length < 2) {
        console.error("❌ Verification failed:", mError || `Only found ${missions?.length} missions`);
    } else {
        console.log(`✅ Success! Found ${missions.length} active missions for ambulance.`);
        missions.forEach((m, idx) => console.log(`   Mission ${idx + 1}: ${m.name} (${m.status})`));
    }

    // Cleanup
    console.log("\n🧹 Cleaning up...");
    await supabase.from('sos_emergencies').delete().in('id', [e1.id, e2.id]);
    console.log("🏁 Multi-Assignment Test Complete");
}

testMultiAssignment();
