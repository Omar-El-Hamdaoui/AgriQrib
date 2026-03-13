// components/features/ContactModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal de coordonnées débloquées après accord entre producteur et collecteur
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { supabase } from '../../auth/supabaseClient';
import { ModalOverlay } from './ListingFormModal';

export function ContactModal({ listing, currentUserId, onClose }) {
  const [producer, setProducer] = useState(null);
  const [collector, setCollector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isProducer = listing.producer_id === currentUserId;

  useEffect(() => {
    const fetchContact = async () => {
      // 1. Récupérer l'entrée unlocked_contacts
      const { data: unlocked, error: e1 } = await supabase
        .from('unlocked_contacts')
        .select('producer_id, collector_id')
        .eq('listing_id', listing.id)
        .single();

      if (e1 || !unlocked) { setError(true); setLoading(false); return; }

      // 2. Récupérer les deux profils séparément (évite les problèmes d'alias FK)
      const [{ data: prod }, { data: coll }] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name, email, phone').eq('id', unlocked.producer_id).single(),
        supabase.from('users').select('id, first_name, last_name, email, phone').eq('id', unlocked.collector_id).single(),
      ]);

      setProducer(prod);
      setCollector(coll);
      setLoading(false);
    };
    fetchContact();
  }, [listing.id]);

  const otherParty = isProducer ? collector : producer;
  const otherRole  = isProducer ? 'Collecteur' : 'Producteur';

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* En-tête */}
        <div style={{
          padding: '20px 24px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: '#1f2937' }}>
              🔓 Contact débloqué
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              Accord conclu sur : <strong>{listing.product_name}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#f3f4f6', border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: '#6b7280',
          }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px' }}>

          {/* Récapitulatif accord */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1px solid #86efac', borderRadius: 12, padding: 14, marginBottom: 16,
          }}>
            <div style={{ fontWeight: 700, color: '#166534', marginBottom: 8 }}>
              ✅ Accord conclu
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div>
                <span style={{ color: '#6b7280' }}>Prix accepté : </span>
                <strong style={{ color: '#166534' }}>{listing.agreed_price_per_unit} €/kg</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Quantité : </span>
                <strong>{listing.quantity_kg} kg</strong>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <span style={{ color: '#6b7280' }}>Montant total estimé : </span>
                <strong style={{ color: '#166534' }}>
                  {(listing.agreed_price_per_unit * listing.quantity_kg).toFixed(2)} €
                </strong>
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
              Chargement des coordonnées…
            </div>
          ) : error || !otherParty ? (
            <div style={{
              textAlign: 'center', padding: 24, color: '#dc2626',
              background: '#fef2f2', borderRadius: 10, border: '1px solid #fca5a5',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontWeight: 600 }}>Coordonnées introuvables</div>
              <div style={{ fontSize: 12, marginTop: 4, color: '#9ca3af' }}>
                L'entrée unlocked_contacts n'existe pas encore pour cette annonce.
              </div>
            </div>
          ) : (
            <>
              <div style={{
                background: 'white', border: '1px solid #e5e7eb',
                borderRadius: 12, padding: 16, marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10 }}>
                  {otherRole}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: 'white', fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {otherParty.first_name?.[0]}{otherParty.last_name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1f2937' }}>
                      {otherParty.first_name} {otherParty.last_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{otherRole}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {otherParty.phone && (
                    <ContactRow
                      icon="📞"
                      label="Téléphone"
                      value={otherParty.phone}
                      href={`tel:${otherParty.phone}`}
                    />
                  )}
                  <ContactRow
                    icon="📧"
                    label="Email"
                    value={otherParty.email}
                    href={`mailto:${otherParty.email}`}
                  />
                </div>
              </div>

              {/* Notice */}
              <div style={{
                background: '#fffbeb', border: '1px solid #fcd34d',
                borderRadius: 10, padding: 12, fontSize: 12, color: '#78350f',
              }}>
                <strong>⚠️ Important</strong> : La transaction doit être finalisée directement entre vous.
                Terroir Direct n'intervient pas dans le paiement ni la livraison.
                Conservez une copie de cet accord pour vos dossiers.
              </div>
            </>
          )}

          <button onClick={onClose} style={{
            width: '100%', marginTop: 14, padding: '10px 20px', borderRadius: 10,
            background: '#f9fafb', color: '#374151',
            border: '1px solid #e5e7eb', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Fermer
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function ContactRow({ icon, label, value, href }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#f9fafb', borderRadius: 8, padding: '8px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{value}</div>
        </div>
      </div>
      <a
        href={href}
        style={{
          padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: '#2D5016', color: 'white', textDecoration: 'none',
        }}
      >
        Contacter
      </a>
    </div>
  );
}