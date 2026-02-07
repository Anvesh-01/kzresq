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

async function debugAmbulance() {
    console.log("🔍 Checking emergencies for: ka30w7056");

    // Check all emergencies with this vehicle number
    const { data, error } = await supabase
        .from('sos_emergencies')
        .select('*')
        .eq('assigned_ambulance_number', 'ka30w7056');

    if (error) {
        console.error("error:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No emergencies found with assigned_ambulance_number = ka30w7056");
    } else {
        console.log(`Found ${data.length} emergencies:`);
        data.forEach(e => {
            console.log(`- ID: ${e.id}, Status: ${e.status}, Hospital: ${e.assigned_hospital_name}`);
        });
    }
}

debugAmbulance();
