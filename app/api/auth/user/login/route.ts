import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { phone_number, password } = body

        if (!phone_number || !password) {
            return NextResponse.json(
                { success: false, error: 'Phone number and password are required' },
                { status: 400 }
            )
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { success: false, error: 'Server configuration error' },
                { status: 500 }
            )
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        console.log('🔐 Login attempt for phone:', phone_number)

        // Find user by phone_number
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('phone_number', phone_number.trim())
            .single()

        if (error || !user) {
            console.error('❌ User not found:', phone_number)
            return NextResponse.json(
                { success: false, error: 'Invalid phone number or password' },
                { status: 401 }
            )
        }

        // Verify password
        if (!user.password) {
            return NextResponse.json(
                { success: false, error: 'Account setup incomplete' },
                { status: 500 }
            )
        }

        const isValidPassword = await bcrypt.compare(password, user.password)

        if (!isValidPassword) {
            console.error('❌ Invalid password for user:', phone_number)
            return NextResponse.json(
                { success: false, error: 'Invalid phone number or password' },
                { status: 401 }
            )
        }

        console.log('✅ Login successful for user:', user.phone_number)

        // Create session data (excluding sensitive fields)
        const sessionData = {
            id: user.id,
            email_id: user.email_id,
            phone_number: user.phone_number,
            name: user.name,
            blood_group: user.blood_group
        }

        // Create response with session cookie
        const response = NextResponse.json(
            {
                success: true,
                message: 'Login successful',
                user: sessionData
            },
            { status: 200 }
        )

        // Set user_session cookie
        response.cookies.set('user_session', JSON.stringify(sessionData), {
            httpOnly: false, // Allow client-side access
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/'
        })

        return response

    } catch (error: unknown) {
        console.error('Login error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
