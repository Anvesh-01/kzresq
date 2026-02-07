import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function checkDatabase() {
    console.log("🔍 Checking Supabase Database...\n");
    console.log(`📡 Supabase URL: ${supabaseUrl}\n`);

    try {
        // Check if hospitals table exists by trying to query it
        console.log("1️⃣ Checking 'hospitals' table...");
        const { data: hospitals, error: hospitalsError } = await supabase
            .from("hospitals")
            .select("*")
            .limit(5);

        if (hospitalsError) {
            console.error(`❌ Error querying hospitals table: ${hospitalsError.message}`);
            console.error(`   Code: ${hospitalsError.code}`);
            console.error(`   Details: ${hospitalsError.details}\n`);
        } else {
            console.log(`✅ Hospitals table exists!`);
            console.log(`   Found ${hospitals?.length || 0} records`);
            if (hospitals && hospitals.length > 0) {
                console.log(`   Sample record:`, hospitals[0]);
            }
            console.log();
        }

        // Check users table
        console.log("2️⃣ Checking 'users' table...");
        const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, name, phone_number")
            .limit(1);

        if (usersError) {
            console.error(`❌ Error querying users table: ${usersError.message}\n`);
        } else {
            console.log(`✅ Users table exists! (${users?.length || 0} records)\n`);
        }

        // Check emergencies table
        console.log("3️⃣ Checking 'emergencies' table...");
        const { data: emergencies, error: emergenciesError } = await supabase
            .from("emergencies")
            .select("id, status")
            .limit(1);

        if (emergenciesError) {
            console.error(`❌ Error querying emergencies table: ${emergenciesError.message}\n`);
        } else {
            console.log(`✅ Emergencies table exists! (${emergencies?.length || 0} records)\n`);
        }

        // Check emergency_notifications table
        console.log("4️⃣ Checking 'emergency_notifications' table...");
        const { data: notifications, error: notificationsError } = await supabase
            .from("emergency_notifications")
            .select("id")
            .limit(1);

        if (notificationsError) {
            console.error(`❌ Error querying emergency_notifications table: ${notificationsError.message}\n`);
        } else {
            console.log(`✅ Emergency_notifications table exists! (${notifications?.length || 0} records)\n`);
        }

        // Check police_requests table
        console.log("5️⃣ Checking 'police_requests' table...");
        const { data: policeRequests, error: policeError } = await supabase
            .from("police_requests")
            .select("id")
            .limit(1);

        if (policeError) {
            console.error(`❌ Error querying police_requests table: ${policeError.message}\n`);
        } else {
            console.log(`✅ Police_requests table exists! (${policeRequests?.length || 0} records)\n`);
        }

        console.log("\n✨ Database check complete!");
    } catch (error) {
        console.error("❌ Unexpected error:", error);
    }
}

checkDatabase();
