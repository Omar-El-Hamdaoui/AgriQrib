
import { useState, useEffect } from 'react';
import { supabase } from '../../auth/supabaseClient';
import { useAuth } from '../../auth/AuthContext';

const QUALITY_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'bio', label: '🌿 Bio (AB)' },
  { value: 'bio_premium', label: '🌿 Bio Premium' },
  { value: 'label_rouge', label: '🔴 Label Rouge' },
  { value: 'aop', label: 'AOP' },
  { value: 'igp', label: 'IGP' },
];

const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'piece', label: 'Pièce' },
  { value: 'bunch', label: 'Botte' },
  { value: 'liter', label: 'Litre' },
  { value: 'dozen', label: 'Douzaine' },
];

const CERT_OPTIONS = ['AB', 'HVE', 'GlobalGAP', 'Demeter', 'Nature & Progrès'];

const today = () => new Date().toISOString().split('T')[0];
const inDays = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
export function ListingFormModal({ userCoords, onClose, onCreated }) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    product_name: '',
    description: '',
    quantity_kg: '',
    unit: 'kg',
    quality_grade: 'standard',
    certifications: [],
    is_organic: false,
    asking_price_per_unit: '',
    reserve_price_per_unit: '',
    harvest_date: today(),
    available_from: today(),
    available_until: inDays(14),
    auction_ends_at: '',
    latitude: userCoords?.[0] ?? '',
    longitude: userCoords?.[1] ?? '',
    city: '',
    address: '',
  });

  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1 = produit, 2 = prix/dates, 3 = localisation
  useEffect(() => {
    supabase
      .from('farms')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFarm(data);
          setForm(f => ({
            ...f,
            latitude: data.latitude || userCoords?.[0] || '',
            longitude: data.longitude || userCoords?.[1] || '',
            city: data.city || '',
            address: data.address || '',
          }));
        }
      });
  }, [user.id, userCoords]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const toggleCert = (cert) => {
    setForm(f => ({
      ...f,
      certifications: f.certifications.includes(cert)
        ? f.certifications.filter(c => c !== cert)
        : [...f.certifications, cert],
    }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.product_name || !form.quantity_kg || !form.asking_price_per_unit) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!form.latitude || !form.longitude) {
      setError('La localisation est requise.');
      return;
    }
    if (!farm) {
      setError('Vous devez d\'abord créer votre profil de ferme.');
      return;
    }

    setLoading(true);
    const payload = {
      farm_id: farm.id,
      producer_id: user.id,
      product_name: form.product_name.trim(),
      description: form.description.trim() || null,
      quantity_kg: parseFloat(form.quantity_kg),
      unit: form.unit,
      quality_grade: form.quality_grade,
      certifications: form.certifications,
      is_organic: form.is_organic,
      asking_price_per_unit: parseFloat(form.asking_price_per_unit),
      reserve_price_per_unit: form.reserve_price_per_unit ? parseFloat(form.reserve_price_per_unit) : null,
      harvest_date: form.harvest_date,
      available_from: form.available_from,
      available_until: form.available_until,
      auction_ends_at: form.auction_ends_at
        ? new Date(form.auction_ends_at).toISOString()
        : null,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      status: 'active',
    };

    const { error: err } = await supabase.from('listings').insert(payload);
    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      onCreated();
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* En-tête */}
        <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: '#1f2937' }}>
              📢 Nouvelle annonce
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
              Étape {step} / 3
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Barre de progression */}
        <div style={{ padding: '12px 24px 0' }}>
          <div style={{ height: 4, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(step / 3) * 100}%`,
              background: 'linear-gradient(90deg, #2D5016, #4a7c23)',
              borderRadius: 99, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Corps */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '65vh' }}>

          {/* ÉTAPE 1 : Produit */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="Produit *" hint="Ex: Tomates cerises, Olives, Oranges…">
                <input
                  type="text" placeholder="Nom du produit"
                  value={form.product_name}
                  onChange={e => set('product_name', e.target.value)}
                  style={inputStyle}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Quantité *">
                  <input
                    type="number" placeholder="ex: 500" min={0}
                    value={form.quantity_kg}
                    onChange={e => set('quantity_kg', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Unité">
                  <select value={form.unit} onChange={e => set('unit', e.target.value)} style={inputStyle}>
                    {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </FormField>
              </div>

              <FormField label="Qualité / Grade">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {QUALITY_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => set('quality_grade', o.value)}
                      style={{
                        padding: '5px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                        fontWeight: 600, border: '1px solid',
                        background: form.quality_grade === o.value ? '#2D5016' : 'white',
                        color: form.quality_grade === o.value ? 'white' : '#4b5563',
                        borderColor: form.quality_grade === o.value ? '#2D5016' : '#d1d5db',
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Certifications">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CERT_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => toggleCert(c)}
                      style={{
                        padding: '4px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                        fontWeight: 600, border: '1px solid',
                        background: form.certifications.includes(c) ? '#f0f7e6' : 'white',
                        color: form.certifications.includes(c) ? '#2D5016' : '#6b7280',
                        borderColor: form.certifications.includes(c) ? '#4a7c23' : '#d1d5db',
                      }}
                    >
                      {form.certifications.includes(c) ? '✓ ' : ''}{c}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Description (optionnel)">
                <textarea
                  rows={3} placeholder="Décrivez votre récolte, variété, mode de culture…"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </FormField>
            </div>
          )}

          {/* ÉTAPE 2 : Prix & Dates */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Prix souhaité *" hint="DH / unité">
                  <input
                    type="number" step="0.01" min={0}
                    placeholder="ex: 1.20"
                    value={form.asking_price_per_unit}
                    onChange={e => set('asking_price_per_unit', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Prix plancher (privé)" hint="Non visible par les acheteurs">
                  <input
                    type="number" step="0.01" min={0}
                    placeholder="ex: 0.90"
                    value={form.reserve_price_per_unit}
                    onChange={e => set('reserve_price_per_unit', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Date de récolte *">
                  <input type="date" value={form.harvest_date}
                    onChange={e => set('harvest_date', e.target.value)} style={inputStyle} />
                </FormField>
                <FormField label="Disponible à partir du *">
                  <input type="date" value={form.available_from}
                    onChange={e => set('available_from', e.target.value)} style={inputStyle} />
                </FormField>
              </div>

              <FormField label="Date limite de l'annonce *">
                <input type="date" value={form.available_until}
                  onChange={e => set('available_until', e.target.value)} style={inputStyle} />
              </FormField>

              {/* Enchère chronométrée optionnelle */}
              <div style={{
                background: '#fffbeb', borderRadius: 10, padding: 14,
                border: '1px solid #fcd34d',
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 8 }}>
                  ⏱️ Enchère chronométrée (optionnel)
                </div>
                <p style={{ fontSize: 12, color: '#78350f', margin: '0 0 10px' }}>
                  Si vous définissez une fin d'enchère, toutes les offres seront closes à cette heure.
                  Sans ça, vous restez libre d'accepter une offre quand vous le souhaitez.
                </p>
                <input
                  type="datetime-local"
                  value={form.auction_ends_at}
                  onChange={e => set('auction_ends_at', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : Localisation */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: '#f0f7e6', borderRadius: 10, padding: 12,
                border: '1px solid #86efac', fontSize: 13, color: '#166534',
              }}>
                ✅ Votre position a été pré-remplie depuis votre profil de ferme.
                Vous pouvez la modifier si la récolte se trouve à un autre endroit.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Latitude *">
                  <input type="number" step="0.000001"
                    value={form.latitude}
                    onChange={e => set('latitude', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Longitude *">
                  <input type="number" step="0.000001"
                    value={form.longitude}
                    onChange={e => set('longitude', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
              </div>

              <FormField label="Ville">
                <input type="text" placeholder="ex: Marseille"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Adresse (optionnel)">
                <input type="text" placeholder="Chemin de la Bastide…"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  style={inputStyle}
                />
              </FormField>

              {/* Récapitulatif */}
              <div style={{
                background: '#f9fafb', borderRadius: 10, padding: 14,
                border: '1px solid #e5e7eb',
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 8 }}>
                  📋 Récapitulatif
                </div>
                <div style={{ fontSize: 13, color: '#4b5563', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div><strong>Produit:</strong> {form.product_name || '–'}</div>
                  <div><strong>Quantité:</strong> {form.quantity_kg} {form.unit}</div>
                  <div><strong>Qualité:</strong> {QUALITY_OPTIONS.find(q => q.value === form.quality_grade)?.label}</div>
                  <div><strong>Prix:</strong> {form.asking_price_per_unit} DH/{form.unit}</div>
                  <div><strong>Récolte:</strong> {form.harvest_date}</div>
                  <div><strong>Dispo:</strong> {form.available_from}</div>
                </div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div style={{
              marginTop: 12, background: '#fef2f2', color: '#dc2626',
              borderRadius: 8, padding: '8px 12px', fontSize: 13,
              border: '1px solid #fca5a5',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0 24px 20px', display: 'flex', justifyContent: 'space-between', gap: 10,
        }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} style={secondaryBtnStyle}>
              ← Précédent
            </button>
          ) : (
            <button onClick={onClose} style={secondaryBtnStyle}>Annuler</button>
          )}

          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} style={primaryBtnStyle}>
              Suivant →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{
              ...primaryBtnStyle,
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Publication…' : '🚀 Publier l\'annonce'}
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#9ca3af', textTransform: 'none', marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function ModalOverlay({ onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 560,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  );
}
const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box', background: 'white',
};
const primaryBtnStyle = {
  flex: 1, padding: '10px 20px', borderRadius: 10,
  background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
  color: 'white', border: 'none', fontSize: 14, fontWeight: 700,
  cursor: 'pointer', boxShadow: '0 2px 8px rgba(45,80,22,0.25)',
};
const secondaryBtnStyle = {
  padding: '10px 20px', borderRadius: 10,
  background: '#f9fafb', color: '#374151',
  border: '1px solid #e5e7eb', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
const closeBtnStyle = {
  background: '#f3f4f6', border: 'none', borderRadius: 8,
  width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: '#6b7280',
};