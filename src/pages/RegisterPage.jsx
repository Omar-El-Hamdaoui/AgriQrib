// pages/RegisterPage.jsx
// Formulaire d'inscription multi-étapes pour Terroir Direct

import { useState } from 'react';
import { Icons } from '../components/ui/Icons';
import { Button, Card, Input } from '../components/ui/primitives';
import { useRegister } from '../auth/useRegister';
import {
  ROLES,
  CERTIFICATIONS,
  STEPS,
} from '../auth/registerValidation';

// ── Sous-composants internes ──────────────────────────────────────────────────

const FieldError = ({ msg }) =>
  msg ? <p className="mt-1 text-xs text-red-600 flex items-center gap-1">⚠ {msg}</p> : null;

const StepIndicator = ({ current, total }) => (
  <div className="flex items-center gap-2 mb-8">
    {Array.from({ length: total }).map((_, idx) => (
      <div key={idx} className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
          ${idx < current  ? 'bg-[#2D5016] text-white'
          : idx === current ? 'bg-[#2D5016] text-white ring-4 ring-[#2D5016]/20'
          :                   'bg-stone-200 text-stone-500'}`}
        >
          {idx < current ? <Icons.Check /> : idx + 1}
        </div>
        {idx < total - 1 && (
          <div className={`h-0.5 w-8 transition-all duration-300 ${idx < current ? 'bg-[#2D5016]' : 'bg-stone-200'}`} />
        )}
      </div>
    ))}
  </div>
);

const PasswordStrength = ({ password }) => {
  const rules = [
    { label: '8 caractères min.', ok: password.length >= 8 },
    { label: 'Une majuscule',     ok: /[A-Z]/.test(password) },
    { label: 'Une minuscule',     ok: /[a-z]/.test(password) },
    { label: 'Un chiffre',        ok: /\d/.test(password) },
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
            <span>{r.ok ? '✓' : '○'}</span> {r.label}
          </p>
        ))}
      </div>
    </div>
  );
};

// ── Étapes ────────────────────────────────────────────────────────────────────

const StepRole = ({ data, errors, setField }) => (
  <div>
    <h2 className="text-2xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
      Quel type de compte ?
    </h2>
    <p className="text-stone-500 mb-6">Choisissez le profil qui correspond à votre usage.</p>

    <div className="grid sm:grid-cols-2 gap-3">
      {ROLES.map(role => (
        <button
          key={role.value}
          type="button"
          onClick={() => setField('role', role.value)}
          className={`p-5 rounded-2xl border-2 text-left transition-all duration-200
            ${data.role === role.value
              ? 'border-[#2D5016] bg-[#2D5016]/5 shadow-md'
              : 'border-stone-200 hover:border-[#2D5016]/40 hover:bg-stone-50'}`}
        >
          <p className="text-2xl mb-2">{role.label.split(' ')[0]}</p>
          <p className="font-semibold text-stone-900 text-sm">{role.label.split(' ').slice(1).join(' ')}</p>
          <p className="text-xs text-stone-500 mt-1">{role.desc}</p>
          {data.role === role.value && (
            <div className="mt-3 w-5 h-5 rounded-full bg-[#2D5016] flex items-center justify-center ml-auto">
              <Icons.Check />
            </div>
          )}
        </button>
      ))}
    </div>
    <FieldError msg={errors.role} />
  </div>
);

const StepIdentity = ({ data, errors, setField }) => (
  <div>
    <h2 className="text-2xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
      Vos informations
    </h2>

    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Input
            label="Prénom *"
            placeholder="Ahmed"
            value={data.firstName}
            onChange={e => setField('firstName', e.target.value)}
            maxLength={100}
          />
          <FieldError msg={errors.firstName} />
        </div>
        <div>
          <Input
            label="Nom *"
            placeholder="Bennani"
            value={data.lastName}
            onChange={e => setField('lastName', e.target.value)}
            maxLength={100}
          />
          <FieldError msg={errors.lastName} />
        </div>
      </div>

      <div>
        <Input
          label="Adresse email *"
          type="email"
          placeholder="marie@exemple.fr"
          icon={<Icons.User />}
          value={data.email}
          onChange={e => setField('email', e.target.value)}
        />
        <FieldError msg={errors.email} />
      </div>

      <div>
        <Input
          label="Téléphone (optionnel)"
          type="tel"
          placeholder="+212 6 12 34 56 78"
          value={data.phone}
          onChange={e => setField('phone', e.target.value)}
          maxLength={20}
        />
        <FieldError msg={errors.phone} />
        <p className="mt-1 text-xs text-stone-400">Utilisé pour les notifications de livraison.</p>
      </div>
    </div>
  </div>
);

const StepPassword = ({ data, errors, setField }) => {
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div>
      <h2 className="text-2xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
        Sécurité du compte
      </h2>
      <p className="text-stone-500 mb-6">Votre mot de passe sera haché (bcrypt) avant stockage.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Mot de passe *</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={data.password}
              onChange={e => setField('password', e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 pr-12 text-stone-900 placeholder-stone-400 focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-medium"
            >
              {showPwd ? 'Masquer' : 'Voir'}
            </button>
          </div>
          {data.password && <PasswordStrength password={data.password} />}
          <FieldError msg={errors.password} />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Confirmer le mot de passe *</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={data.confirmPassword}
              onChange={e => setField('confirmPassword', e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 pr-12 text-stone-900 placeholder-stone-400 focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-medium"
            >
              {showConfirm ? 'Masquer' : 'Voir'}
            </button>
          </div>
          {data.confirmPassword && data.password === data.confirmPassword && (
            <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1"><Icons.Check /> Les mots de passe correspondent.</p>
          )}
          <FieldError msg={errors.confirmPassword} />
        </div>
      </div>
    </div>
  );
};

const StepFarm = ({ data, errors, setField, toggleCertification }) => (
  <div>
    <h2 className="text-2xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
      Votre exploitation
    </h2>

    <div className="space-y-4">
      <div>
        <Input
          label="Nom de la ferme *"
          placeholder="Ferme Agroécologique La Finca"
          value={data.farmName}
          onChange={e => setField('farmName', e.target.value)}
          maxLength={200}
        />
        <FieldError msg={errors.farmName} />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          Description (optionnelle)
        </label>
        <textarea
          value={data.description}
          onChange={e => setField('description', e.target.value)}
          placeholder="Parlez de votre exploitation, vos pratiques, vos valeurs…"
          rows={3}
          className="w-full px-4 py-3 border border-stone-300 rounded-xl resize-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/20 text-stone-900 placeholder-stone-400"
        />
      </div>

      <div>
        <Input
          label="Adresse *"
          placeholder="12 Route des Champs"
          value={data.address}
          onChange={e => setField('address', e.target.value)}
        />
        <FieldError msg={errors.address} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Input
            label="Ville *"
            placeholder="Aix-en-Provence"
            value={data.city}
            onChange={e => setField('city', e.target.value)}
            maxLength={100}
          />
          <FieldError msg={errors.city} />
        </div>
        <div>
          <Input
            label="Code postal *"
            placeholder="13100"
            value={data.postalCode}
            onChange={e => setField('postalCode', e.target.value)}
            maxLength={5}
          />
          <FieldError msg={errors.postalCode} />
        </div>
      </div>

      {/* Certifications */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Certifications (champ <code className="text-xs bg-stone-100 px-1 rounded">TEXT[]</code>)
        </label>
        <div className="flex flex-wrap gap-2">
          {CERTIFICATIONS.map(cert => (
            <button
              key={cert}
              type="button"
              onClick={() => toggleCertification(cert)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                ${data.certifications.includes(cert)
                  ? 'bg-[#2D5016] text-white border-[#2D5016]'
                  : 'bg-white text-stone-600 border-stone-300 hover:border-[#2D5016]/50'}`}
            >
              {cert}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Rayon de disponibilité : <span className="text-[#2D5016] font-bold">{data.deliveryRadius} km</span>
          </label>
          <input
            type="range"
            min={5} max={200} step={5}
            value={data.deliveryRadius}
            onChange={e => setField('deliveryRadius', e.target.value)}
            className="w-full accent-[#2D5016]"
          />
          <div className="flex justify-between text-xs text-stone-400 mt-1">
            <span>5 km</span><span>200 km</span>
          </div>
          <FieldError msg={errors.deliveryRadius} />
        </div>

        <div>
          <Input
            label="Commande minimum (DH)"
            type="number"
            min={0}
            placeholder="0"
            value={data.minimumOrder}
            onChange={e => setField('minimumOrder', e.target.value)}
          />
          <FieldError msg={errors.minimumOrder} />
        </div>
      </div>
    </div>
  </div>
);

const StepConfirm = ({ data, errors, setField }) => {
  const roleLabel = ROLES.find(r => r.value === data.role)?.label || data.role;

  return (
    <div>
      <h2 className="text-2xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
        Récapitulatif
      </h2>
      <p className="text-stone-500 mb-6">Vérifiez vos informations avant de créer le compte.</p>

      {/* Recap card */}
      <div className="bg-stone-50 rounded-2xl p-5 space-y-3 mb-6 border border-stone-200">
        <SummaryRow label="Type de compte" value={roleLabel} />
        <SummaryRow label="Prénom / Nom"   value={`${data.firstName} ${data.lastName}`} />
        <SummaryRow label="Email"          value={data.email} />
        {data.phone && <SummaryRow label="Téléphone"  value={data.phone} />}

        {data.role === 'producer' && (
          <>
            <div className="border-t border-stone-200 pt-3 mt-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Ferme</p>
            </div>
            <SummaryRow label="Nom"         value={data.farmName} />
            <SummaryRow label="Adresse"     value={`${data.address}, ${data.postalCode} ${data.city}`} />
            <SummaryRow label="Rayon"       value={`${data.deliveryRadius} km`} />
            {data.certifications.length > 0 && (
              <SummaryRow label="Certifications" value={data.certifications.join(', ')} />
            )}
          </>
        )}
      </div>

      {/* CGU */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0
            ${data.acceptCGU ? 'bg-[#2D5016] border-[#2D5016]' : 'border-stone-300 group-hover:border-[#2D5016]/50'}`}
            onClick={() => setField('acceptCGU', !data.acceptCGU)}
          >
            {data.acceptCGU && <Icons.Check />}
          </div>
          <span className="text-sm text-stone-700">
            J'accepte les{' '}
            <a href="https://www.index-education.com/contenu/telechargement/doc/Modele_CGU_CLIENT.pdf" className="text-[#2D5016] underline hover:text-[#1e3a0f]">
              Conditions Générales d'Utilisation
            </a>{' '}
            et la{' '}
            <a href="https://www.fondationdentreprisehermes.org/sites/default/files/pdf/fondation-confidentialite.pdf" className="text-[#2D5016] underline hover:text-[#1e3a0f]">
              Politique de confidentialité
            </a>. *
          </span>
        </label>
        <FieldError msg={errors.acceptCGU} />

        <label className="flex items-start gap-3 cursor-pointer">
          <div
            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0
              ${data.acceptNewsletter ? 'bg-[#2D5016] border-[#2D5016]' : 'border-stone-300'}`}
            onClick={() => setField('acceptNewsletter', !data.acceptNewsletter)}
          >
            {data.acceptNewsletter && <Icons.Check />}
          </div>
          <span className="text-sm text-stone-500">
            Je souhaite recevoir les nouveautés et offres d'AgriQrib (optionnel).
          </span>
        </label>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-stone-500">{label}</span>
    <span className="font-medium text-stone-900 text-right max-w-[60%]">{value}</span>
  </div>
);

// ── Écran de succès ───────────────────────────────────────────────────────────

const SuccessScreen = ({ data, setCurrentView }) => (
  <div className="text-center py-8">
    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <div className="w-10 h-10 text-emerald-600"><Icons.Check /></div>
    </div>
    <h2 className="text-2xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
      Bienvenue, {data.firstName} !
    </h2>
    <p className="text-stone-500 mb-2">
      Votre compte a été créé avec succès.
    </p>
    <p className="text-sm text-stone-400 mb-8">
      Un email de vérification a été envoyé à <strong>{data.email}</strong>.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button onClick={() => setCurrentView('home')}>
        Accéder à la marketplace
      </Button>
      {data.role === 'producer' && (
        <Button variant="outline" onClick={() => setCurrentView('producer-dashboard')}>
          Mon tableau de bord
        </Button>
      )}
    </div>
  </div>
);

// ── Composant principal ───────────────────────────────────────────────────────

export const RegisterPage = ({ setCurrentView }) => {
  const {
    step, data, errors, loading, submitted,
    totalSteps, progressPercent,
    setField, toggleCertification,
    next, prev, submit,
  } = useRegister();


  const stepComponents = {
    [STEPS.ROLE]:     <StepRole     data={data} errors={errors} setField={setField} />,
    [STEPS.IDENTITY]: <StepIdentity data={data} errors={errors} setField={setField} />,
    [STEPS.PASSWORD]: <StepPassword data={data} errors={errors} setField={setField} />,
    [STEPS.FARM]:     <StepFarm     data={data} errors={errors} setField={setField} toggleCertification={toggleCertification} />,
    [STEPS.CONFIRM]:  <StepConfirm  data={data} errors={errors} setField={setField} />,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f0e8] via-[#e8e0d4] to-[#d4cfc5] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-xl">

        <Card className="p-8 shadow-xl">
          {submitted ? (
            <SuccessScreen data={data} setCurrentView={setCurrentView} />
          ) : (
            <>
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-stone-400 mb-2">
                  <span>Étape {step + 1} / {totalSteps}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2D5016] rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Step indicator */}
              <StepIndicator current={step} total={totalSteps} />

              {/* Step content */}
              <div className="animate-in mb-8">
                {stepComponents[step]}
              </div>

              {/* Global error */}
              {errors.global && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {errors.global}
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                {step > STEPS.ROLE && (
                  <Button variant="secondary" onClick={prev} className="flex-1" disabled={loading}>
                    <Icons.ArrowLeft /> Retour
                  </Button>
                )}

                {step < totalSteps - 1 ? (
                  <Button onClick={next} className="flex-1">
                    Continuer <Icons.ChevronRight />
                  </Button>
                ) : (
                  <Button onClick={submit} className="flex-1" disabled={loading}>
                    {loading
                      ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création…</span>
                      : <><Icons.Check /> Créer mon compte</>}
                  </Button>
                )}
              </div>

              {/* Lien connexion */}
              <p className="text-center text-sm text-stone-500 mt-6">
                Déjà un compte ?{' '}
                <button
                  onClick={() => setCurrentView('home')}
                  className="text-[#2D5016] font-medium hover:underline"
                >
                  Se connecter
                </button>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};