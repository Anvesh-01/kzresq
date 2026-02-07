import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function runMigration() {
    const migrationFile = path.join(process.cwd(), 'migrations', 'add_hospital_ai_fields.sql');

    try {
        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log(`Running migration: ${migrationFile}`);

        // Split by semicolons to run individual statements if needed, 
        // but supabase-js rpc usually handles blocks. 
        // However, direct SQL execution isn't supported via JS client unless via an RPC function called `exec_sql` or similar if setup.
        // 
        // Wait, the user previously had issues with `exec_sql`.
        // Let's trying checking if we can use the `pg` driver or if there is an `exec` function.
        // If not, we might be stuck.
        // BUT the previous turn said "Run migration script".
        // Let's assume there is NO `exec_sql` RPC function available as per previous context (Conversation 7b21aaf4...).

        // IF we cannot run SQL directly, we must instruct the user.
        // BUT I can try to use `postgres.js` or `pg` if installed? No, only `mysql2` is in dependencies.
        // Wait, `mysql2`? That's odd for Supabase (Postgres).

        // Plan B: I will try to use the `rpc` call `exec_sql` again, maybe it exists now?
        // If not, I will catch the error and Tell the user to run it.

        // Better Plan: Just output the SQL to the user in a notification if I can't run it?
        // No, I really want to fix it.

        // Let's try to assume the user has the `exec_sql` function. If not, I'll fail.

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            // Fallback: If exec_sql missing, try creating it? No, that requires valid SQL execution... catch-22.
            console.error("Migration Failed:", error);

            // ALTERNATIVE: Use the specific `postgres` connection string if available in env?
            // Usually DATABASE_URL.
            // But I don't see `pg` installed.

            throw error;
        }

        console.log('Migration successful!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
