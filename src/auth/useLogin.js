// auth/useLogin.js
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