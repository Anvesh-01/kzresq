
import { createClient } from "@supabase/supabase-js";
import fs from 'fs';
import path from 'path';

// Load .env.local manualy
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key] = value;
        }
    });
} catch (e) {
    console.log("Could not load .env.local");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const bcrypt = require('bcryptjs');

async function setHospitalPassword(username: string, password: string) {
    console.log(`Setting password for: ${username}`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
        .from('hospitals')
        .update({ password: hashedPassword }) // Use 'password' instead of 'password_hash'
        .eq('username', username)
        .select();

    if (error) {
        console.error("Error updating password:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("Hospital not found or update failed");
        return;
    }

    console.log("✅ Password updated successfully for:", username);
}

const username = process.argv[2];
const password = process.argv[3] || "password123";

if (!username) {
    console.error("Please provide a username");
} else {
    setHospitalPassword(username, password);
}
