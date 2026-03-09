// auth/useRegister.js
import { useState } from 'react';
import {
  INITIAL_FORM_DATA,
  STEPS,
  getTotalSteps,
  validateStep,
  buildPayload,
} from './registerValidation';
import { parseApiError } from './authApi';
import { useAuth } from './AuthContext';

export const useRegister = ({ onSuccess } = {}) => {
  const { register } = useAuth();
  const [step, setStep] = useState(STEPS.ROLE);
  const [data, setData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = getTotalSteps(data.role);

  // ── Mise à jour d'un champ ────────────────────────────────────────────────
  const setField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // ── Toggle certification ──────────────────────────────────────────────────
  const toggleCertification = (cert) => {
    setData(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert],
    }));
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const next = () => {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length > 0) { setErrors(errs); return false; }
    setErrors({});

    // Sauter l'étape FARM si l'utilisateur n'est pas producteur
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
    // Sauter l'étape FARM en arrière si non producteur
    if (prevStep === STEPS.FARM && data.role !== 'producer') {
      setStep(STEPS.PASSWORD);
    } else {
      setStep(prevStep);
    }
  };

  // ── Soumission finale ─────────────────────────────────────────────────────
  const submit = async () => {
    const errs = validateStep(STEPS.CONFIRM, data);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = buildPayload(data);

      // ✅ register() du contexte : appelle authApi + setUser + setFarm
      const response = await register(payload.user, payload.farm ?? null);

      setSubmitted(true);
      onSuccess?.(response);
    } catch (err) {
      const fieldErrors = parseApiError(err);
      setErrors(fieldErrors);
      if (fieldErrors.email) setStep(STEPS.IDENTITY);
    } finally {
      setLoading(false);
    }
  };

  // ── Progression ───────────────────────────────────────────────────────────
  // Calcule le step visuel en tenant compte des étapes sautées
  const getVisualStep = () => {
    if (data.role !== 'producer' && step >= STEPS.CONFIRM) {
      return step - 1; // CONFIRM est à l'index 3 pour un non-producteur
    }
    return step;
  };

  const progressPercent = Math.round((getVisualStep() / (totalSteps - 1)) * 100);

  return {
    step, data, errors, loading, submitted,
    totalSteps, progressPercent,
    setField, toggleCertification,
    next, prev, submit,
  };
};