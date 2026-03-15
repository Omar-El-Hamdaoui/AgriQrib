
import { useState } from 'react';
import { Icons } from '../components/ui/Icons';
import { Button, Card } from '../components/ui/primitives';
import { useLogin } from '../auth/useLogin';
import { supabase } from '../auth/supabaseClient';

const FieldError = ({ msg }) =>
  msg ? <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">⚠ {msg}</p> : null;
const ForgotPasswordForm = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | sent
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Entrez une adresse email valide.');
      return;
    }
    setError('');
    setStatus('loading');
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setStatus('sent');
  };

  if (status === 'sent') {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📬</span>
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-2">Vérifiez votre boîte mail</h3>
        <p className="text-sm text-stone-500 mb-2">
          Si un compte existe pour{' '}
          <span className="font-medium text-stone-700">{email}</span>,
          vous recevrez un lien dans quelques instants.
        </p>
        <p className="text-xs text-stone-400 mb-6">Pensez à vérifier vos spams.</p>
        <Button variant="outline" className="w-full" onClick={onBack}>
          ← Retour à la connexion
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-6 transition-colors"
      >
        ← Retour
      </button>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
          Mot de passe oublié
        </h2>
        <p className="text-stone-500 mt-1 text-sm">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Adresse email</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
              <Icons.User />
            </span>
            <input
              type="email"
              placeholder="marie@exemple.fr"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoComplete="email"
              autoFocus
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-stone-900 placeholder-stone-400
                focus:ring-2 focus:ring-[#2D5016]/20 transition-all bg-white
                ${error ? 'border-red-400' : 'border-stone-300 focus:border-[#2D5016]'}`}
            />
          </div>
          <FieldError msg={error} />
        </div>
        <Button onClick={handleSubmit} disabled={status === 'loading'} className="w-full" size="lg">
          {status === 'loading' ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Envoi…
            </span>
          ) : 'Envoyer le lien'}
        </Button>
      </div>
    </div>
  );
};
export const LoginPage = ({ setCurrentView, onLoggedIn }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const { data, errors, loading, setField, submit } = useLogin({
    onSuccess: (user) => onLoggedIn?.(user),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f0e8] via-[#e8e0d4] to-[#d4cfc5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <Card className="p-8 shadow-xl">
          {showForgot ? (
            <ForgotPasswordForm onBack={() => setShowForgot(false)} />
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                  Bon retour 👋
                </h2>
                <p className="text-stone-500 mt-1">Connectez-vous pour accéder à votre espace.</p>
              </div>

              {errors.global && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                  <span>⚠</span> {errors.global}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Adresse email</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"><Icons.User /></span>
                    <input
                      type="email"
                      placeholder="marie@exemple.fr"
                      value={data.email}
                      onChange={e => setField('email', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submit(e)}
                      autoComplete="email"
                      className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-stone-900 placeholder-stone-400
                        focus:ring-2 focus:ring-[#2D5016]/20 transition-all bg-white
                        ${errors.email ? 'border-red-400' : 'border-stone-300 focus:border-[#2D5016]'}`}
                    />
                  </div>
                  <FieldError msg={errors.email} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-stone-700">Mot de passe</label>
                    <button
                      type="button"
                      className="text-xs text-[#2D5016] hover:underline font-medium"
                      onClick={() => setShowForgot(true)}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={data.password}
                      onChange={e => setField('password', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submit(e)}
                      autoComplete="current-password"
                      className={`w-full rounded-xl border px-4 py-2.5 pr-16 text-stone-900 placeholder-stone-400
                        focus:ring-2 focus:ring-[#2D5016]/20 transition-all bg-white
                        ${errors.password ? 'border-red-400' : 'border-stone-300 focus:border-[#2D5016]'}`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-medium">
                      {showPassword ? 'Masquer' : 'Voir'}
                    </button>
                  </div>
                  <FieldError msg={errors.password} />
                </div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setField('rememberMe', !data.rememberMe)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0
                      ${data.rememberMe ? 'bg-[#2D5016] border-[#2D5016]' : 'border-stone-300 hover:border-[#2D5016]/50'}`}
                  >
                    {data.rememberMe && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-stone-600">Se souvenir de moi</span>
                </label>

                <Button onClick={submit} disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connexion…
                    </span>
                  ) : 'Se connecter'}
                </Button>
              </div>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400 font-medium">ou</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              <p className="text-center text-sm text-stone-500">
                Pas encore de compte ?{' '}
                <button onClick={() => setCurrentView('register')} className="text-[#2D5016] font-semibold hover:underline">
                  Créer un compte
                </button>
              </p>
            </>
          )}
        </Card>

        {!showForgot && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { icon: '👤', label: 'Particulier', desc: 'Achetez en direct' },
              { icon: '🍽️', label: 'Restaurant', desc: 'Commandes en volume' },
              { icon: '🌾', label: 'Producteur', desc: 'Gérez vos récoltes' },
              { icon: '🚛', label: 'Distributeur', desc: "Centrale d'achat" },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2 p-3 bg-white/60 rounded-xl border border-stone-200">
                <span className="text-lg">{r.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-stone-800">{r.label}</p>
                  <p className="text-[10px] text-stone-400">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};