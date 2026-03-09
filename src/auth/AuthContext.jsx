// // auth/AuthContext.jsx
// // Contexte global d'authentification — source de vérité unique pour la session
// //
// // Flux Supabase + FastAPI + httpOnly cookie :
// //   1. FastAPI reçoit les credentials
// //   2. Appelle supabase.auth.sign_up() / sign_in()
// //   3. Pose le JWT Supabase dans un httpOnly cookie (Set-Cookie)
// //   4. Renvoie le profil utilisateur en JSON (pas le token — il est dans le cookie)
// //   5. Ce contexte stocke uniquement le profil, jamais le token

// import { createContext, useContext, useState, useEffect, useCallback } from 'react';
// import { authApi } from './authApi';

// // ── Shape du contexte ─────────────────────────────────────────────────────────
// // user : null | { id, email, role, firstName, lastName, phone, isVerified, farm? }
// // status : 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

// const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
//   const [user,   setUser]   = useState(null);
//   const [status, setStatus] = useState('idle'); // démarrage : on tente un refresh

//   // ── Restauration de session au montage ────────────────────────────────────
//   // Le cookie httpOnly est envoyé automatiquement ; on demande simplement
//   // au backend de renvoyer le profil de l'utilisateur courant.
//   useEffect(() => {
//     const restoreSession = async () => {
//       try {
//         const profile = await authApi.me();
//         setUser(profile);
//         setStatus('authenticated');
//       } catch {
//         // Cookie absent ou expiré : utilisateur non connecté
//         setStatus('unauthenticated');
//       }
//     };
//     restoreSession();
//   }, []);

//   // ── login : appelé après inscription ou connexion réussie ─────────────────
//   // Le cookie est déjà posé par le serveur ; on reçoit juste le profil.
//   const login = useCallback((userProfile) => {
//     setUser(userProfile);
//     setStatus('authenticated');
//   }, []);

//   // ── logout : demande au backend de supprimer le cookie ───────────────────
//   const logout = useCallback(async () => {
//     try {
//       await authApi.logout();
//     } finally {
//       setUser(null);
//       setStatus('unauthenticated');
//     }
//   }, []);

//   // ── Helpers dérivés ───────────────────────────────────────────────────────
//   const isAuthenticated = status === 'authenticated';
//   const isProducer      = user?.role === 'producer';
//   const isBuyer         = user?.role?.startsWith('buyer_');

//   return (
//     <AuthContext.Provider value={{
//       user, status,
//       isAuthenticated, isProducer, isBuyer,
//       login, logout,
//     }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// // ── Hook d'accès ──────────────────────────────────────────────────────────────
// export const useAuth = () => {
//   const ctx = useContext(AuthContext);
//   if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
//   return ctx;
// };


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

// auth/useLogin.js
// Hook gérant le formulaire de connexion : validation, appel API, hydratation session.

import { useState } from 'react';
import { parseApiError } from './authApi';
import { useAuth } from './AuthContext';

const INITIAL = { email: '', password: '', rememberMe: false };

const validate = ({ email, password }) => {
  const errors = {};
  if (!email.trim()) errors.email = "L'email est requis.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Format email invalide.';
  if (!password) errors.password = 'Le mot de passe est requis.';
  return errors;
};

export const useLogin = ({ onSuccess } = {}) => {
  const { login } = useAuth();
  const [data, setData] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const submit = async (e) => {
    e?.preventDefault();
    const errs = validate(data);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      // login() du contexte appelle authApi + hydrate user/farm automatiquement
      const result = await login(data.email.trim().toLowerCase(), data.password);
      onSuccess?.(result.user);
    } catch (err) {
      if (err.status === 400 || err.status === 401) {
        setErrors({ password: 'Email ou mot de passe incorrect.' });
      } else {
        setErrors(parseApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return { data, errors, loading, setField, submit };
};