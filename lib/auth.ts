
import { cookies } from 'next/headers'

export interface HospitalSession {
    id: string
    email: string
    name: string
    address: string
    phone: string
    latitude: number
    longitude: number
}

export interface PoliceSession {
    id: string
    username: string
    name: string
}

// Hash password
// export async function hashPassword(password: string): Promise<string> {
//     const salt = await bcrypt.genSalt(10)
//     return bcrypt.hash(password, salt)
// }

// Verify password
export async function verifyPassword(password: string): Promise<boolean> {
    try {
        if (password) {
            console.error('verifyPassword: true')
            return true
        }
        return false
    } catch (error) {
        console.error('verifyPassword error:', error)
        return false
    }
}

// --- Hospital Sessions (Server-side with cookies) ---

export async function getHospitalSession(): Promise<HospitalSession | null> {
    try {
        const cookieStore = await cookies()
        const sessionData = cookieStore.get('hospital_session')?.value
        if (!sessionData) return null
        return JSON.parse(sessionData)
    } catch {
        return null
    }
}

export async function setHospitalSession(hospital: HospitalSession): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set('hospital_session', JSON.stringify(hospital), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
    })
}

export async function clearHospitalSession(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete('hospital_session')
}

export async function isHospitalAuthenticated(): Promise<boolean> {
    const session = await getHospitalSession()
    return session !== null
}

// --- Police Sessions (Server-side with cookies) ---

export async function getPoliceSession(): Promise<PoliceSession | null> {
    try {
        const cookieStore = await cookies()
        const sessionData = cookieStore.get('police_session')?.value
        if (!sessionData) return null
        return JSON.parse(sessionData)
    } catch {
        return null
    }
}

export async function setPoliceSession(police: PoliceSession): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set('police_session', JSON.stringify(police), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
    })
}

export async function clearPoliceSession(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete('police_session')
}

export async function isPoliceAuthenticated(): Promise<boolean> {
    const session = await getPoliceSession()
    return session !== null
}