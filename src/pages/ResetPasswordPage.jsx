// pages/ResetPasswordPage.jsx
import { useState, useEffect } from 'react';
import { Button, Card } from '../components/ui/primitives';
import { supabase } from '../auth/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../auth/authApi';

const PasswordStrength = ({ password }) => {
  const rules = [
    { label: '8 caractères min.', ok: password.length >= 8 },
    { label: 'Une majuscule', ok: /[A-Z]/.test(password) },
    { label: 'Une minuscule', ok: /[a-z]/.test(password) },
    { label: 'Un chiffre', ok: /\d/.test(password) },
  ];
  const score = rules.filter(r => r.ok).length;
  const colors = ['bg-stone-200', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-500'];
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < score ? colors[score] : 'bg-stone-200'}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {rules.map(r => (
          <p key={r.label} className={`text-xs flex items-center gap-1 ${r.ok ? 'text-emerald-600' : 'text-stone-400'}`}>
            {r.ok ? '✓' : '○'} {r.label}
          </p>
        ))}
      </div>
    </div>
  );
};

export const ResetPasswordPage = ({ setCurrentView }) => {
  const { user, status } = useAuth();

  const [pageStatus, setPageStatus] = useState('waiting');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Écouter l'événement PASSWORD_RECOVERY de Supabase ────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageStatus('ready');
      }
    });

    const timeout = setTimeout(() => {
      setPageStatus(prev => prev === 'waiting' ? 'error' : prev);
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // ── Redirection automatique après succès ──────────────────────────────────
  // Une fois que AuthContext a hydraté l'utilisateur, on redirige vers home
  useEffect(() => {
    if (pageStatus === 'success' && status === 'authenticated') {
      const timer = setTimeout(() => {
        setCurrentView(user?.role === 'producer' ? 'producer-dashboard' : 'buyer-dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pageStatus, status, user, setCurrentView]);

  const validate = () => {
    const errs = {};
    if (!password)
      errs.password = 'Le mot de passe est requis.';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password))
      errs.password = 'Mot de passe trop faible.';
    if (password !== confirm)
      errs.confirm = 'Les mots de passe ne correspondent pas.';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      // 1. Mettre à jour le mot de passe via Supabase
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrors({ global: error.message ?? 'Une erreur est survenue.' });
        setSaving(false);
        return;
      }

      // 2. Hydrater AuthContext avec le profil complet
      const result = await authApi.me();
      if (result) {
        // AuthContext se met à jour via onAuthStateChange (USER_UPDATED)
        // mais on force ici pour être sûr
      }

      // 3. Afficher l'écran de succès → useEffect redirige automatiquement
      setPageStatus('success');

    } catch {
      setErrors({ global: 'Impossible de mettre à jour le mot de passe.' });
      setSaving(false);
    }
  };

  // ── Écran d'attente ───────────────────────────────────────────────────────
  if (pageStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f0e8] via-[#e8e0d4] to-[#d4cfc5] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#2D5016] to-[#4a7c23] rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl">🌿</span>
          </div>
          <div className="w-6 h-6 border-2 border-[#2D5016]/30 border-t-[#2D5016] rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Vérification du lien…</p>
        </div>
      </div>
    );
  }

  // ── Écran d'erreur ────────────────────────────────────────────────────────
  if (pageStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f0e8] via-[#e8e0d4] to-[#d4cfc5] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="p-8 shadow-xl text-center">
            <div className="text-5xl mb-4">⏱️</div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">Lien expiré</h2>
            <p className="text-stone-500 text-sm mb-3">
              Ce lien de réinitialisation a expiré ou a déjà été utilisé.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              💡 Les liens expirent après <strong>1 heure</strong>. Faites une nouvelle demande depuis la page de connexion.
            </p>
            <Button className="w-full" onClick={() => setCurrentView('login')}>
              ← Retour à la connexion
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // ── Écran de succès ───────────────────────────────────────────────────────
  if (pageStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f0e8] via-[#e8e0d4] to-[#d4cfc5] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="p-8 shadow-xl text-center">
            <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">Mot de passe mis à jour !</h2>
            <p className="text-stone-500 text-sm mb-2">
              Votre mot de passe a été changé avec succès.
            </p>
            <p className="text-xs text-stone-400 mb-6">Redirection en cours…</p>
            <div className="w-5 h-5 border-2 border-[#2D5016]/30 border-t-[#2D5016] rounded-full animate-spin mx-auto" />
          </Card>
        </div>
      </div>
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f0e8] via-[#e8e0d4] to-[#d4cfc5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
              Nouveau mot de passe
            </h2>
            <p className="text-stone-500 mt-1 text-sm">Choisissez un mot de passe fort.</p>
          </div>

          {errors.global && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              ⚠ {errors.global}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  autoFocus
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                  className={`w-full rounded-xl border px-4 py-2.5 pr-16 text-stone-900 placeholder-stone-400
                    focus:ring-2 focus:ring-[#2D5016]/20 transition-all bg-white
                    ${errors.password ? 'border-red-400' : 'border-stone-300 focus:border-[#2D5016]'}`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-medium">
                  {showPass ? 'Masquer' : 'Voir'}
                </button>
              </div>
              {errors.password
                ? <p className="mt-1.5 text-xs text-red-600">⚠ {errors.password}</p>
                : <PasswordStrength password={password} />
              }
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Confirmer</label>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: undefined })); }}
                className={`w-full rounded-xl border px-4 py-2.5 text-stone-900 placeholder-stone-400
                  focus:ring-2 focus:ring-[#2D5016]/20 transition-all bg-white
                  ${errors.confirm ? 'border-red-400' : 'border-stone-300 focus:border-[#2D5016]'}`}
              />
              {errors.confirm && <p className="mt-1.5 text-xs text-red-600">⚠ {errors.confirm}</p>}
            </div>

            <Button onClick={handleSubmit} disabled={saving} className="w-full" size="lg">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mise à jour…
                </span>
              ) : 'Mettre à jour le mot de passe'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};