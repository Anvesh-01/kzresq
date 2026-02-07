'use client'

import { HospitalSession, PoliceSession } from './auth'

export interface UserSession {
    id: string
    email_id: string
    phone_number: string
    name: string | null
    blood_group: string | null
}

// Helper to parse cookies on client-side
function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null

    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)

    if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null
    }

    return null
}

// --- Hospital Sessions (Client-side) ---

export function getHospitalSession(): HospitalSession | null {
    try {
        const sessionData = getCookie('hospital_session')
        if (!sessionData) return null
        return JSON.parse(decodeURIComponent(sessionData))
    } catch (error) {
        console.error('Error reading hospital session:', error)
        return null
    }
}

export function clearHospitalSession(): void {
    document.cookie = 'hospital_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export function isHospitalAuthenticated(): boolean {
    return getHospitalSession() !== null
}

// --- Police Sessions (Client-side) ---

export function getPoliceSession(): PoliceSession | null {
    try {
        const sessionData = getCookie('police_session')
        if (!sessionData) return null
        return JSON.parse(decodeURIComponent(sessionData))
    } catch (error) {
        console.error('Error reading police session:', error)
        return null
    }
}

export function clearPoliceSession(): void {
    document.cookie = 'police_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export function isPoliceAuthenticated(): boolean {
    return getPoliceSession() !== null
}

// --- User Sessions (Client-side) ---

export function getUserSession(): UserSession | null {
    try {
        const sessionData = getCookie('user_session')
        if (!sessionData) return null
        return JSON.parse(decodeURIComponent(sessionData))
    } catch (error) {
        console.error('Error reading user session:', error)
        return null
    }
}

export function clearUserSession(): void {
    document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export function isUserAuthenticated(): boolean {
    return getUserSession() !== null
}