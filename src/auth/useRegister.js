// auth/useRegister.js
// Hook gérant l'état et la navigation du formulaire d'inscription multi-étapes

import { useState } from 'react';
import {
  INITIAL_FORM_DATA,
  STEPS,
  getTotalSteps,
  validateStep,
  buildPayload,
} from './registerValidation';

export const useRegister = ({ onSuccess } = {}) => {
  const [step, setStep]       = useState(STEPS.ROLE);
  const [data, setData]       = useState(INITIAL_FORM_DATA);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = getTotalSteps(data.role);

  // ── Mise à jour d'un champ ──────────────────────────────────
  const setField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    // Efface l'erreur du champ dès que l'utilisateur corrige
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
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    setErrors({});
    // Sauter l'étape FARM si pas producteur
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
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const payload = buildPayload(data);
      // Simulation d'un appel API (à remplacer par fetch/axios réel)
      await new Promise(r => setTimeout(r, 1200));
      console.log('[Register] Payload envoyé :', payload);
      setSubmitted(true);
      onSuccess?.(payload);
    } catch (err) {
      setErrors({ global: "Une erreur est survenue. Veuillez réessayer." });
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