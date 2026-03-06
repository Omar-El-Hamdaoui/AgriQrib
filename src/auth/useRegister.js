// auth/useRegister.js
// Hook gérant l'état et la navigation du formulaire d'inscription multi-étapes.
// À la soumission : appel réel vers FastAPI, hydratation de l'AuthContext,
// puis redirection vers le bon dashboard.

import { useState } from 'react';
import {
  INITIAL_FORM_DATA,
  STEPS,
  getTotalSteps,
  validateStep,
  buildPayload,
} from './registerValidation';
import { authApi, parseApiError } from './authApi';
import { useAuth } from './AuthContext';

export const useRegister = ({ onSuccess } = {}) => {
  const { login } = useAuth();

  const [step, setStep]           = useState(STEPS.ROLE);
  const [data, setData]           = useState(INITIAL_FORM_DATA);
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = getTotalSteps(data.role);

  // ── Mise à jour d'un champ ──────────────────────────────────
  const setField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // ── Toggle certification ────────────────────────────────────
  const toggleCertification = (cert) => {
    setData(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert],
    }));
  };

  // ── Navigation ─────────────────────────────────────────────
  const next = () => {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length > 0) { setErrors(errs); return false; }
    setErrors({});
    const nextStep = step + 1;
    if (nextStep === STEPS.FARM && data.role !== 'producer') {
      setStep(STEPS.CONFIRM);
    } else {
      setStep(nextStep);
    }
    return true;
  };

  const prev = () => {
    setErrors({});
    const prevStep = step - 1;
    if (prevStep === STEPS.FARM && data.role !== 'producer') {
      setStep(STEPS.PASSWORD);
    } else {
      setStep(prevStep);
    }
  };

  // ── Soumission finale ───────────────────────────────────────
  const submit = async () => {
    const errs = validateStep(STEPS.CONFIRM, data);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      // 1. Appel POST /auth/register → FastAPI → Supabase → httpOnly cookie posé
      const payload  = buildPayload(data);
      const response = await authApi.register(payload);

      // 2. Hydrater le contexte d'auth avec le profil retourné par le serveur.
      //    Le cookie est déjà stocké dans le navigateur (httpOnly, géré par le serveur).
      login({
        ...response.user,
        farm: response.farm ?? null,
      });

      // 3. Marquer comme soumis (affiche l'écran de succès)
      setSubmitted(true);

      // 4. Callback optionnel (ex: pour rediriger depuis le parent)
      onSuccess?.(response);

    } catch (err) {
      // Normalise les erreurs API en erreurs de champ ou message global
      const fieldErrors = parseApiError(err);
      setErrors(fieldErrors);

      // Si l'erreur concerne l'email (conflit 409), remonter à l'étape identité
      if (fieldErrors.email) {
        setStep(STEPS.IDENTITY);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Progression ─────────────────────────────────────────────
  const progressPercent = Math.round((step / (totalSteps - 1)) * 100);

  return {
    step, data, errors, loading, submitted,
    totalSteps, progressPercent,
    setField, toggleCertification,
    next, prev, submit,
  };
};