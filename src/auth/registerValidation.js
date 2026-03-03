// auth/registerValidation.js
// Règles de validation côté client pour le formulaire d'inscription
// Miroir des contraintes du schéma SQL (users + farms)

// ── Helpers ──────────────────────────────────────────────────────────────────

const isEmpty   = (v) => !v || v.trim() === '';
const minLen    = (v, n) => v && v.trim().length >= n;
const maxLen    = (v, n) => !v || v.trim().length <= n;
const isEmail   = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone   = (v) => !v || /^[\d\s\+\-\(\)]{7,20}$/.test(v);
const isPostal  = (v) => /^\d{5}$/.test(v);
const isStrongPwd = (v) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);

// ── Rôles disponibles (enum schema) ──────────────────────────────────────────

export const ROLES = [
  { value: 'buyer_individual',  label: '👤 Particulier',              desc: 'Achetez pour votre foyer' },
  { value: 'buyer_restaurant',  label: '🍽️ Restaurant / Pro',         desc: 'Achetez en volume pour votre établissement' },
  { value: 'buyer_transit',     label: '🚛 Centrale d\'achat / Transit', desc: 'Distributeur ou grossiste' },
  { value: 'producer',          label: '🌾 Producteur',               desc: 'Vendez vos récoltes en direct' },
];

export const CERTIFICATIONS = ['Bio', 'HVE', 'Label Rouge', 'AOP', 'AOC', 'IGP', 'AB'];

// ── Étapes du formulaire ──────────────────────────────────────────────────────

export const STEPS = {
  ROLE:     0, // Choix du rôle
  IDENTITY: 1, // Nom, prénom, email, téléphone
  PASSWORD: 2, // Mot de passe + confirmation
  FARM:     3, // Infos ferme (producteur uniquement)
  CONFIRM:  4, // Récap + CGU
};

export const getTotalSteps = (role) =>
  role === 'producer' ? 5 : 4;

// ── Validateurs par étape ─────────────────────────────────────────────────────

export const validateStep = (step, data) => {
  const errors = {};

  if (step === STEPS.ROLE) {
    if (!data.role) errors.role = 'Veuillez choisir un type de compte.';
  }

  if (step === STEPS.IDENTITY) {
    if (isEmpty(data.firstName))        errors.firstName = 'Le prénom est requis.';
    else if (!maxLen(data.firstName, 100)) errors.firstName = '100 caractères max.';

    if (isEmpty(data.lastName))         errors.lastName = 'Le nom est requis.';
    else if (!maxLen(data.lastName, 100))  errors.lastName = '100 caractères max.';

    if (isEmpty(data.email))            errors.email = "L'email est requis.";
    else if (!isEmail(data.email))      errors.email = 'Format email invalide.';

    if (data.phone && !isPhone(data.phone))
      errors.phone = 'Numéro de téléphone invalide.';
  }

  if (step === STEPS.PASSWORD) {
    if (isEmpty(data.password))
      errors.password = 'Le mot de passe est requis.';
    else if (!isStrongPwd(data.password))
      errors.password = 'Minimum 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre.';

    if (isEmpty(data.confirmPassword))
      errors.confirmPassword = 'Veuillez confirmer le mot de passe.';
    else if (data.password !== data.confirmPassword)
      errors.confirmPassword = 'Les mots de passe ne correspondent pas.';
  }

  if (step === STEPS.FARM) {
    if (isEmpty(data.farmName))         errors.farmName = 'Le nom de la ferme est requis.';
    else if (!maxLen(data.farmName, 200))  errors.farmName = '200 caractères max.';

    if (isEmpty(data.address))          errors.address = "L'adresse est requise.";

    if (isEmpty(data.city))             errors.city = 'La ville est requise.';
    else if (!maxLen(data.city, 100))      errors.city = '100 caractères max.';

    if (isEmpty(data.postalCode))       errors.postalCode = 'Le code postal est requis.';
    else if (!isPostal(data.postalCode))   errors.postalCode = 'Format invalide (5 chiffres).';

    if (data.deliveryRadius && (isNaN(data.deliveryRadius) || data.deliveryRadius < 1))
      errors.deliveryRadius = 'Rayon de livraison invalide.';

    if (data.minimumOrder && (isNaN(data.minimumOrder) || data.minimumOrder < 0))
      errors.minimumOrder = 'Montant minimum invalide.';
  }

  if (step === STEPS.CONFIRM) {
    if (!data.acceptCGU) errors.acceptCGU = 'Vous devez accepter les CGU.';
  }

  return errors; // {} = pas d'erreur
};

// ── Valeurs initiales ─────────────────────────────────────────────────────────

export const INITIAL_FORM_DATA = {
  // users
  role:            '',
  firstName:       '',
  lastName:        '',
  email:           '',
  phone:           '',
  password:        '',
  confirmPassword: '',
  // farms (producteur)
  farmName:        '',
  description:     '',
  address:         '',
  city:            '',
  postalCode:      '',
  certifications:  [],
  deliveryRadius:  50,
  minimumOrder:    0,
  // CGU
  acceptCGU:       false,
  acceptNewsletter:false,
};

// ── Payload final (pour l'API) ─────────────────────────────────────────────────

export const buildPayload = (data) => {
  const userPayload = {
    email:      data.email.trim().toLowerCase(),
    role:       data.role,
    first_name: data.firstName.trim(),
    last_name:  data.lastName.trim(),
    phone:      data.phone?.trim() || null,
    // password_hash sera géré côté serveur
    password:   data.password,
  };

  if (data.role !== 'producer') return { user: userPayload };

  const farmPayload = {
    farm_name:             data.farmName.trim(),
    description:           data.description?.trim() || null,
    address:               data.address.trim(),
    city:                  data.city.trim(),
    postal_code:           data.postalCode.trim(),
    certifications:        data.certifications,
    delivery_radius_km:    Number(data.deliveryRadius),
    minimum_order_amount:  Number(data.minimumOrder),
  };

  return { user: userPayload, farm: farmPayload };
};