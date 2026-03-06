// auth/authApi.js
// Couche réseau : toutes les requêtes HTTP vers le backend FastAPI
//
// Conventions :
//   - credentials: 'include'  → envoie/reçoit le httpOnly cookie automatiquement
//   - Le backend pose/supprime le cookie ; le JS ne le lit jamais
//   - Les erreurs HTTP sont normalisées en { message, field? } pour l'UI

const BASE_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:8000';

// ── Helper fetch centralisé ───────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // <-- envoie le cookie httpOnly à chaque requête
    ...options,
  });

  if (res.status === 204) return null; // No Content (ex: logout)

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // FastAPI renvoie { detail: string | [{ loc, msg, type }] }
    const detail = body?.detail;
    const message = Array.isArray(detail)
      ? detail.map(e => e.msg).join(', ')
      : detail ?? `Erreur ${res.status}`;

    // Détection des conflits d'email (409)
    const error = new Error(message);
    error.status = res.status;
    error.body   = body;
    throw error;
  }

  return body;
}

// ── Endpoints d'authentification ──────────────────────────────────────────────

export const authApi = {

  /**
   * POST /auth/register
   * Crée l'utilisateur Supabase Auth + profil users + farms (si producteur).
   * Le backend pose le cookie httpOnly sur succès.
   * Retourne : { user: UserProfile, farm?: FarmProfile }
   */
  register: (payload) =>
    apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * POST /auth/login
   * Authentifie un utilisateur existant.
   * Le backend pose/renouvelle le cookie httpOnly.
   * Retourne : { user: UserProfile }
   */
  login: (email, password) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /**
   * POST /auth/logout
   * Demande au backend de supprimer le cookie (Set-Cookie: expires=past).
   * Révoque aussi la session Supabase côté serveur.
   */
  logout: () =>
    apiFetch('/auth/logout', { method: 'POST' }),

  /**
   * GET /auth/me
   * Renvoie le profil de l'utilisateur courant en lisant le cookie.
   * Utilisé au montage pour restaurer la session sans re-login.
   * Lance une erreur 401 si le cookie est absent ou expiré.
   */
  me: () =>
    apiFetch('/auth/me'),
};

// ── Normalisation des erreurs API vers les champs du formulaire ───────────────
// FastAPI/Supabase peuvent renvoyer des erreurs métier spécifiques.
// On les transforme en { fieldName: 'message' } pour useRegister.

export const parseApiError = (error) => {
  const msg     = error.message ?? '';
  const status  = error.status;

  // Email déjà utilisé (Supabase : "User already registered")
  if (status === 409 || msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
    return { email: 'Cette adresse email est déjà utilisée.' };
  }

  // Erreur de validation FastAPI (422 Unprocessable Entity)
  if (status === 422 && error.body?.detail) {
    const fieldErrors = {};
    for (const e of error.body.detail) {
      const field = e.loc?.at(-1); // ex: ["body", "email"] → "email"
      if (field) fieldErrors[field] = e.msg;
    }
    if (Object.keys(fieldErrors).length > 0) return fieldErrors;
  }

  // Erreur générique
  return { global: msg || 'Une erreur est survenue. Veuillez réessayer.' };
};