// auth/AuthContext.jsx
//
// Remplace le FastAPI — gestion de session via Supabase SDK directement.
//
// Expose via useAuth() :
//   user      : { id, email, role, firstName, lastName, phone, isVerified }
//   farm      : données ferme (si producteur) | null
//   status    : 'idle' | 'authenticated' | 'unauthenticated'
//   login()   : (email, password) → { user, farm }
//   logout()  : () → void
//   register(): (userData, farmData?) → { user, farm }

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import * as authService from './authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [farm, setFarm] = useState(null)
  const [status, setStatus] = useState('idle')  // 'idle' pendant le chargement initial

  // Charger la session existante au montage
  useEffect(() => {
    authService.getMe().then(result => {
      if (result) {
        setUser(result.user)
        setFarm(result.farm)
        setStatus('authenticated')
      } else {
        setStatus('unauthenticated')
      }
    })

    // Écouter les changements de session Supabase (refresh automatique, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        setFarm(null)
        setStatus('unauthenticated')
        return
      }
      if (['TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
        const result = await authService.getMe()
        if (result) {
          setUser(result.user)
          setFarm(result.farm)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const result = await authService.login(email, password)
    setUser(result.user)
    setFarm(result.farm)
    setStatus('authenticated')
    return result
  }

  async function register(userData, farmData) {
    const result = await authService.register(userData, farmData)
    setUser(result.user)
    setFarm(result.farm)
    setStatus('authenticated')
    return result
  }

  async function logout() {
    await authService.logout()
    setUser(null)
    setFarm(null)
    setStatus('unauthenticated')
  }

  return (
    <AuthContext.Provider value={{ user, farm, status, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>')
  return ctx
}