// lib/auth.js
//
// Remplace tous les endpoints FastAPI /auth/*
// Utilise le SDK Supabase directement côté client.
//
// Fonctions exportées :
//   register(userData, farmData?)  → { user, farm }
//   login(email, password)         → { user, farm }
//   logout()                       → void
//   getMe()                        → { user, farm } | null
//   refreshSession()               → void
//   forgotPassword(email)          → void
//   resetPassword(newPassword)     → void

import { supabase } from './supabase'

// ── Validation (miroir de FastAPI / registerValidation.js) ────────────────────

const ALLOWED_ROLES = ['producer', 'buyer_individual', 'buyer_restaurant', 'buyer_transit']

export function validatePassword(password) {
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    throw new Error('Mot de passe trop faible (8 car. min, 1 maj, 1 min, 1 chiffre).')
  }
}

export function validateRole(role) {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error(`Rôle invalide. Valeurs acceptées : ${ALLOWED_ROLES.join(', ')}`)
  }
}

// ── Helper : récupérer le profil complet depuis la DB ────────────────────────

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
      id:         profile.id,
      email:      profile.email,
      role:       profile.role,
      firstName:  profile.first_name,
      lastName:   profile.last_name,
      phone:      profile.phone ?? null,
      isVerified: profile.is_verified ?? false,
    },
    farm,
  }
}

// ── POST /auth/register ───────────────────────────────────────────────────────

/**
 * @param {{ email, password, role, first_name, last_name, phone? }} userData
 * @param {{ farm_name, description?, address, city, postal_code,
 *            certifications?, delivery_radius_km?, minimum_order_amount? } | null} farmData
 */
export async function register(userData, farmData = null) {
  validatePassword(userData.password)
  validateRole(userData.role)

  if (userData.role === 'producer' && !farmData) {
    throw new Error("Les informations de la ferme sont requises pour un producteur.")
  }

  // 1. Créer le compte Supabase Auth
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email:    userData.email,
    password: userData.password,
  })

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes('already')) {
      throw new Error('Cette adresse email est déjà utilisée.')
    }
    throw new Error(`Erreur inscription : ${signUpError.message}`)
  }

  const uid = authData.user.id

  // 2. Insérer le profil étendu dans `users`
  const { error: profileError } = await supabase.from('users').insert({
    id:         uid,
    email:      userData.email,
    role:       userData.role,
    first_name: userData.first_name,
    last_name:  userData.last_name,
    phone:      userData.phone ?? null,
  })

  if (profileError) throw new Error(`Erreur création profil : ${profileError.message}`)

  // 3. Insérer la ferme si producteur
  let farm = null
  if (userData.role === 'producer') {
    const { data: farmResult, error: farmError } = await supabase.from('farms').insert({
      user_id:              uid,
      farm_name:            farmData.farm_name,
      description:          farmData.description ?? null,
      address:              farmData.address,
      city:                 farmData.city,
      postal_code:          farmData.postal_code,
      certifications:       farmData.certifications ?? [],
      delivery_radius_km:   farmData.delivery_radius_km ?? 50,
      minimum_order_amount: farmData.minimum_order_amount ?? 0.0,
    }).select().single()

    if (farmError) throw new Error(`Erreur création ferme : ${farmError.message}`)
    farm = farmResult
  }

  return {
    user: {
      id:         uid,
      email:      userData.email,
      role:       userData.role,
      firstName:  userData.first_name,
      lastName:   userData.last_name,
      phone:      userData.phone ?? null,
      isVerified: false,
    },
    farm,
  }
}

// ── POST /auth/login ──────────────────────────────────────────────────────────

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) throw new Error('Email ou mot de passe incorrect.')

  return fetchProfile(data.user.id)
}

// ── POST /auth/logout ─────────────────────────────────────────────────────────

export async function logout() {
  await supabase.auth.signOut()
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────

export async function getMe() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  try {
    return await fetchProfile(session.user.id)
  } catch {
    return null
  }
}

// ── POST /auth/refresh ────────────────────────────────────────────────────────
// Le SDK Supabase gère le refresh automatiquement.
// Cette fonction est fournie si tu veux le déclencher manuellement.

export async function refreshSession() {
  const { error } = await supabase.auth.refreshSession()
  if (error) throw new Error('Session expirée. Veuillez vous reconnecter.')
}

// ── POST /auth/forgot-password ────────────────────────────────────────────────

export async function forgotPassword(email, redirectUrl = `${window.location.origin}/reset-password`) {
  // Toujours résoudre (ne révèle pas si l'email existe)
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl })
}

// ── POST /auth/reset-password ─────────────────────────────────────────────────
// À appeler sur la page /reset-password après que Supabase a redirigé
// l'utilisateur avec le token dans l'URL (géré automatiquement par le SDK).

export async function resetPassword(newPassword) {
  validatePassword(newPassword)

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(`Erreur réinitialisation : ${error.message}`)
}
