import { createClient } from "@supabase/supabase-js";
import fs from 'fs';
import path from 'path';

// Load .env.local manually
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
} catch (e) { }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAPI() {
    console.log("🔍 Checking ambulance ID for: ka30w7056");
    const { data: amb, error: ambError } = await supabase
        .from('ambulances')
        .select('id')
        .eq('vehicle_number', 'ka30w7056')
        .single();

    if (ambError) {
        console.error("Ambulance not found:", ambError);
        return;
    }

    const ambulanceId = amb.id;
    console.log(`✅ Ambulance ID: ${ambulanceId}`);

    // Simulate the API call
    console.log("\n📡 Simulating API call...");
    const url = `http://localhost:3000/api/emergency?assigned_ambulance_id=${ambulanceId}&assigned_ambulance_number=ka30w7056`;
    console.log(`URL: ${url}`);

    // Since I can't hit localhost easily from here if the server is in 'npm run dev' mode in another terminal
    // I will mock the logic of my GET endpoint to see what it would do.

    let query = supabase
        .from('sos_emergencies')
        .select('*')
        .order('created_at', { ascending: false })
        .eq('assigned_ambulance_id', ambulanceId); // This should fail if column missing

    let { data, error } = await query;

    if (error && error.message.includes('assigned_ambulance_id')) {
        console.log("⚠️ Column 'assigned_ambulance_id' is missing. Retrying with fallback...");
        const fallbackQuery = supabase
            .from('sos_emergencies')
            .select('*')
            .order('created_at', { ascending: false })
            .eq('assigned_ambulance_number', 'ka30w7056');

        const retry = await fallbackQuery;
        data = retry.data;
        error = retry.error;
    }

    if (error) {
        console.error("❌ API Mock Error:", error);
    } else {
        console.log(`✅ API Mock Result: Found ${data?.length} emergencies`);
        data?.forEach(e => console.log(`   - ${e.id}: ${e.status}`));
    }
}

debugAPI();
