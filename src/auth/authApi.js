
import { supabase } from './supabaseClient';

async function fetchProfile(uid) {
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single();

  if (error || !profile) throw Object.assign(new Error('Profil utilisateur introuvable.'), { status: 404 });

  let farm = null;
  if (profile.role === 'producer') {
    const { data } = await supabase
      .from('farms')
      .select('*')
      .eq('user_id', uid)
      .single();
    farm = data ?? null;
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
  };
}

export const authApi = {

  /**
   * register({ user: UserCreate, farm?: FarmCreate })
   * Crée le compte Supabase Auth + profil users + farms (si producteur).
   * Retourne : { user: UserProfile, farm?: FarmProfile }
   */
  register: async ({ user: userData, farm: farmData = null }) => {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered')) {
        throw Object.assign(new Error('Cette adresse email est déjà utilisée.'), { status: 409 });
      }
      throw Object.assign(new Error(signUpError.message), { status: 400 });
    }

    const uid = authData.user.id;
    const { error: profileError } = await supabase.from('users').insert({
      id: uid,
      email: userData.email,
      role: userData.role,
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone ?? null,
    });

    if (profileError) {
      throw Object.assign(new Error(`Erreur création profil : ${profileError.message}`), { status: 500 });
    }
    let farm = null;
    if (userData.role === 'producer') {
      if (!farmData) {
        throw Object.assign(new Error('Les informations de la ferme sont requises.'), { status: 422 });
      }
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
        .single();

      if (farmError) {
        throw Object.assign(new Error(`Erreur création ferme : ${farmError.message}`), { status: 500 });
      }
      farm = farmResult;
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
    };
  },

  /**
   * login(email, password)
   * Authentifie l'utilisateur et retourne { user, farm }.
   */
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw Object.assign(new Error('Email ou mot de passe incorrect.'), { status: 401 });
    }

    return fetchProfile(data.user.id);
  },

  /**
   * logout()
   * Déconnecte l'utilisateur côté Supabase.
   */
  logout: async () => {
    await supabase.auth.signOut();
    return null;
  },

  /**
   * me()
   * Retourne le profil de l'utilisateur courant depuis la session active.
   * Retourne null si aucune session (au lieu de throw 401).
   */
  me: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    try {
      return await fetchProfile(session.user.id);
    } catch {
      return null;
    }
  },
};

export const parseApiError = (error) => {
  const msg = error.message ?? '';
  const status = error.status;

  if (status === 409 || msg.toLowerCase().includes('already')) {
    return { email: 'Cette adresse email est déjà utilisée.' };
  }
  if (status === 422) {
    return { global: msg };
  }

  return { global: msg || 'Une erreur est survenue. Veuillez réessayer.' };
};