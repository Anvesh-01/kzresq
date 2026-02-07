/**
 * Debug script to check what password is actually stored in the database
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

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
    console.log('🔍 Checking password for hospital261...\n')

    const { data: hospital, error } = await supabaseAdmin
        .from('hospitals')
        .select('id, name, username, password')
        .eq('username', 'hospital261')
        .single()

    if (error) {
        console.error('❌ Error:', error.message)
        process.exit(1)
    }

    console.log('Hospital:', hospital.name)
    console.log('Username:', hospital.username)
    console.log('Password field exists:', !!hospital.password)
    
    if (hospital.password) {
        console.log('Password starts with:', hospital.password.substring(0, 10))
        console.log('Password length:', hospital.password.length)
        console.log('Looks like bcrypt hash:', hospital.password.startsWith('$2'))
        
        // Test the password
        console.log('\n🔐 Testing password verification...')
        const testPassword = 'hospital123'
        
        try {
            const isValid = await bcrypt.compare(testPassword, hospital.password)
            console.log(`Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`)
            
            if (!isValid) {
                console.log('\n⚠️  Password does not match!')
                console.log('Let me set a fresh password...')
                
                const newHash = await bcrypt.hash(testPassword, 10)
                const { error: updateError } = await supabaseAdmin
                    .from('hospitals')
                    .update({ password: newHash })
                    .eq('username', 'hospital261')
                
                if (updateError) {
                    console.error('Update error:', updateError.message)
                } else {
                    console.log('✅ Fresh password set!')
                    console.log('\nTry logging in again with:')
                    console.log('Username: hospital261')
                    console.log('Password: hospital123')
                }
            }
        } catch (err) {
            console.error('Verification error:', err)
        }
    } else {
        console.log('\n❌ No password set!')
        console.log('Setting password now...')
        
        const newHash = await bcrypt.hash('hospital123', 10)
        const { error: updateError } = await supabaseAdmin
            .from('hospitals')
            .update({ password: newHash })
            .eq('username', 'hospital261')
        
        if (updateError) {
            console.error('Update error:', updateError.message)
        } else {
            console.log('✅ Password set!')
        }
    }
}

main().catch(console.error)
