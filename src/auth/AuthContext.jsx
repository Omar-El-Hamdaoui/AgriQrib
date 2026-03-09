import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { authApi } from './authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,   setUser]   = useState(null);
  const [farm,   setFarm]   = useState(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    authApi.me().then(result => {
      if (result) {
        setUser(result.user);
        setFarm(result.farm);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null); setFarm(null); setStatus('unauthenticated');
        return;
      }
      if (['TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
        const result = await authApi.me();
        if (result) { setUser(result.user); setFarm(result.farm); }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    const result = await authApi.login(email, password);
    setUser(result.user); setFarm(result.farm); setStatus('authenticated');
    return result;
  }

  async function register(userData, farmData) {
    const result = await authApi.register({ user: userData, farm: farmData });
    setUser(result.user); setFarm(result.farm); setStatus('authenticated');
    return result;
  }

  async function logout() {
    await authApi.logout();
    setUser(null); setFarm(null); setStatus('unauthenticated');
  }

  return (
    <AuthContext.Provider value={{ user, farm, status, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return ctx;
}
