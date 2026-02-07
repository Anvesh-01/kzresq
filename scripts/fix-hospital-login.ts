/**
 * Simple script to check hospital table schema and set a test password
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { writeFileSync } from 'fs'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables!')
    process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function main() {
    const output: string[] = []
    const log = (msg: string) => {
        console.log(msg)
        output.push(msg)
    }

    log('🔍 Checking hospital table schema...\n')

    // Get one hospital to see what fields exist
    const { data: hospital, error } = await supabaseAdmin
        .from('hospitals')
        .select('*')
        .limit(1)
        .single()

    if (error) {
        log(`❌ Error: ${error.message}`)
        process.exit(1)
    }

    log('📋 Available fields in hospitals table:')
    log(Object.keys(hospital).join(', '))
    log('')

    // Check if password field exists
    const hasPassword = 'password' in hospital
    const hasPasswordHash = 'password_hash' in hospital

    log(`Has 'password' field: ${hasPassword ? '✅ Yes' : '❌ No'}`)
    log(`Has 'password_hash' field: ${hasPasswordHash ? '✅ Yes' : '❌ No'}`)
    log('')

    // Set a test password for hospital261
    log('🔐 Setting test password for hospital261...')
    const testPassword = 'hospital123'
    const passwordHash = await bcrypt.hash(testPassword, 10)

    const fieldToUpdate = hasPassword ? 'password' : 'password_hash'
    log(`Using field: ${fieldToUpdate}`)

    const { error: updateError } = await supabaseAdmin
        .from('hospitals')
        .update({ [fieldToUpdate]: passwordHash })
        .eq('username', 'hospital261')

    if (updateError) {
        log(`❌ Update error: ${updateError.message}`)
        process.exit(1)
    }

    log('✅ Password set successfully!')
    log('')
    log('='.repeat(60))
    log('TEST CREDENTIALS:')
    log('Username: hospital261')
    log('Password: hospital123')
    log(`Field used: ${fieldToUpdate}`)
    log('='.repeat(60))

    // Write to file
    writeFileSync('hospital-login-result.txt', output.join('\n'))
    log('\n📄 Results saved to hospital-login-result.txt')
}

main().catch(console.error)
