import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { username, password } = body

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password are required' },
                { status: 400 }
            )
        }

        const supabaseAdmin = getSupabaseAdmin()

        console.log('🔐 Login attempt:', { username: username.toLowerCase().trim() })

        // Find hospital by username
        const { data: hospital, error } = await supabaseAdmin
            .from('hospitals')
            .select('*')
            .eq('username', username.toLowerCase().trim())
            .eq('is_active', true)
            .single()

        if (error || !hospital) {
            console.error('❌ Hospital not found:', { username, error: error?.message })
            return NextResponse.json(
                { success: false, error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        console.log('✅ Hospital found:', { id: hospital.id, name: hospital.name, hasPasswordHash: !!hospital.password })

        // // Check if password hash exists
        // if (!hospital.password) {
        //     console.error('❌ Hospital password hash is missing:', { username, hospitalId: hospital.id })
        //     return NextResponse.json(
        //         { success: false, error: 'Account setup incomplete. Please contact administrator.' },
        //         { status: 500 }
        //     )    
        // }

        // Verify password
        console.log('🔍 Verifying password...')
        const isValid = await verifyPassword(password)
        console.log('🔍 Password verification result:', isValid)

        if (!isValid) {
            console.error('❌ Password verification failed')
            return NextResponse.json(
                { success: false, error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        console.log('✅ Login successful for:', hospital.name)

        // Update last login
        await supabaseAdmin
            .from('hospitals')
            .update({ last_login: new Date().toISOString() })
            .eq('id', hospital.id)

        // Return hospital data (excluding password hash)
        const { password: _password, ...hospitalData } = hospital

        // Create session data
        const sessionData = {
            id: hospitalData.id,
            email: hospitalData.email,
            name: hospitalData.name,
            address: hospitalData.address,
            phone: hospitalData.phone,
            latitude: hospitalData.latitude,
            longitude: hospitalData.longitude
        }

        // Create response with cookie
        const response = NextResponse.json(
            {
                success: true,
                hospital: hospitalData,
                message: 'Login successful'
            },
            { status: 200 }
        )

        // Set hospital_session cookie
        response.cookies.set('hospital_session', JSON.stringify(sessionData), {
            httpOnly: false, // Set to false so client-side can also read it
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
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

