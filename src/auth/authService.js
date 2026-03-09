// auth/authService.js
//
// Toute la logique métier auth — remplace les endpoints FastAPI.
//   register()       → POST /auth/register
//   login()          → POST /auth/login
//   logout()         → POST /auth/logout
//   getMe()          → GET  /auth/me
//   forgotPassword() → POST /auth/forgot-password
//   resetPassword()  → POST /auth/reset-password

import { supabase } from './supabaseClient'

// ── Validation ────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['producer', 'buyer_individual', 'buyer_restaurant', 'buyer_transit']

function validatePassword(password) {
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
        throw new Error('Mot de passe trop faible (8 car. min, 1 maj, 1 min, 1 chiffre).')
    }
}

function validateRole(role) {
    if (!ALLOWED_ROLES.includes(role)) {
        throw new Error(`Rôle invalide. Valeurs acceptées : ${ALLOWED_ROLES.join(', ')}`)
    }
}

// ── Helper : récupérer le profil complet ─────────────────────────────────────

async function fetchProfile(uid) {
    const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single()

    if (error || !profile) throw new Error('Profil utilisateur introuvable.')

    let farm = null
    if (profile.role === 'producer') {
        const { data } = await supabase
            .from('farms')
            .select('*')
            .eq('user_id', uid)
            .single()
        farm = data ?? null
    }

    return {
        user: {
            id: profile.id,
            email: profile.email,
            role: profile.role,
            firstName: profile.first_name,
            lastName: profile.last_name,
            phone: profile.phone ?? null,
            isVerified: profile.is_verified ?? false,
        },
        farm,
    }
}

// ── register ──────────────────────────────────────────────────────────────────

export async function register(userData, farmData = null) {
    validatePassword(userData.password)
    validateRole(userData.role)

    if (userData.role === 'producer' && !farmData) {
        throw new Error("Les informations de la ferme sont requises pour un producteur.")
    }

    // 1. Créer le compte Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
    })

    if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already')) {
            throw new Error('Cette adresse email est déjà utilisée.')
        }
        throw new Error(`Erreur inscription : ${signUpError.message}`)
    }

    const uid = authData.user.id

    // 2. Insérer le profil dans `users`
    const { error: profileError } = await supabase.from('users').insert({
        id: uid,
        email: userData.email,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone ?? null,
    })

    if (profileError) throw new Error(`Erreur création profil : ${profileError.message}`)

    // 3. Insérer la ferme si producteur
    let farm = null
    if (userData.role === 'producer') {
        const { data: farmResult, error: farmError } = await supabase
            .from('farms')
            .insert({
                user_id: uid,
                farm_name: farmData.farm_name,
                description: farmData.description ?? null,
                address: farmData.address,
                city: farmData.city,
                postal_code: farmData.postal_code,
                certifications: farmData.certifications ?? [],
                delivery_radius_km: farmData.delivery_radius_km ?? 50,
                minimum_order_amount: farmData.minimum_order_amount ?? 0.0,
            })
            .select()
            .single()

        if (farmError) throw new Error(`Erreur création ferme : ${farmError.message}`)
        farm = farmResult
    }

    return {
        user: {
            id: uid,
            email: userData.email,
            role: userData.role,
            firstName: userData.first_name,
            lastName: userData.last_name,
            phone: userData.phone ?? null,
            isVerified: false,
        },
        farm,
    }
}

// ── login ─────────────────────────────────────────────────────────────────────

export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Email ou mot de passe incorrect.')
    return fetchProfile(data.user.id)
}

// ── logout ────────────────────────────────────────────────────────────────────

export async function logout() {
    await supabase.auth.signOut()
}

// ── getMe ─────────────────────────────────────────────────────────────────────

export async function getMe() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    try {
        return await fetchProfile(session.user.id)
    } catch {
        return null
    }
}

// ── forgotPassword ────────────────────────────────────────────────────────────

export async function forgotPassword(email, redirectUrl = `${window.location.origin}/reset-password`) {
    // Toujours résoudre — ne révèle pas si l'email existe
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl })
}

// ── resetPassword ─────────────────────────────────────────────────────────────
// À appeler sur /reset-password après que Supabase a redirigé avec le token.
// Le SDK gère automatiquement la session depuis l'URL.

export async function resetPassword(newPassword) {
    validatePassword(newPassword)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(`Erreur réinitialisation : ${error.message}`)
}