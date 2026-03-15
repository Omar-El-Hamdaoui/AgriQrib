// components/features/BidModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal d'enchères : collecteurs soumettent des offres, producteur les gère
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../auth/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { ModalOverlay } from './ListingFormModal';

// ─────────────────────────────────────────────────────────────────────────────
export function BidModal({ listing, onClose, onSubmitted }) {
  const { user } = useAuth();
  const isProducer = listing.producer_id === user.id;
  const isCollector = !isProducer;

  const [bids, setBids] = useState([]);
  const [myBid, setMyBid] = useState(null);
  const [loadingBids, setLoadingBids] = useState(true);

  const [offerPrice, setOfferPrice] = useState('');
  const [offerQty, setOfferQty] = useState('');
  const [offerMsg, setOfferMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger les offres
  const fetchBids = useCallback(async () => {
    setLoadingBids(true);
    let query = supabase
      .from('bids')
      .select(`
        *,
        users!bids_bidder_id_fkey(first_name, last_name)
      `)
      .eq('listing_id', listing.id)
      .order('price_per_unit', { ascending: false });

    // Le producteur voit toutes les offres, le collecteur seulement la sienne
    if (isCollector) {
      query = query.eq('bidder_id', user.id);
    }

    const { data } = await query;
    setBids(data || []);
    if (isCollector) {
      setMyBid(data?.[0] || null);
      if (data?.[0]) {
        setOfferPrice(data[0].price_per_unit?.toString() || '');
        setOfferQty(data[0].quantity_wanted_kg?.toString() || '');
        setOfferMsg(data[0].message || '');
      }
    }
    setLoadingBids(false);
  }, [listing.id, isCollector, user.id]);

  useEffect(() => { fetchBids(); }, [fetchBids]);

  // Realtime : mise à jour en temps réel
  useEffect(() => {
    const channel = supabase
      .channel(`bids-${listing.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bids',
        filter: `listing_id=eq.${listing.id}`,
      }, () => fetchBids())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [listing.id, fetchBids]);

  // ── Soumettre une offre (collecteur) ─────────────────────────────────────
  const handleSubmitBid = async () => {
    setError(''); setSuccess('');
    if (!offerPrice || parseFloat(offerPrice) <= 0) {
      setError('Veuillez entrer un prix valide.');
      return;
    }
    setSubmitting(true);

    const payload = {
      listing_id: listing.id,
      bidder_id: user.id,
      price_per_unit: parseFloat(offerPrice),
      quantity_wanted_kg: offerQty ? parseFloat(offerQty) : null,
      message: offerMsg.trim() || null,
    };

    let err;
    if (myBid) {
      ({ error: err } = await supabase
        .from('bids')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', myBid.id));
    } else {
      ({ error: err } = await supabase.from('bids').insert(payload));

      // BUG 1 FIX : passer le statut à 'negotiating' dès la première offre
      if (!err) {
        await supabase
          .from('listings')
          .update({
            status: 'negotiating',
            current_best_offer: parseFloat(offerPrice),
            offer_count: 1,
          })
          .eq('id', listing.id)
          .eq('status', 'active'); // seulement si encore active (évite d'écraser un statut ultérieur)
      }
    }

    setSubmitting(false);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(myBid ? 'Votre offre a bien été mise à jour !' : 'Votre offre a bien été envoyée !');
      fetchBids();
      setTimeout(() => { onSubmitted(); }, 1500);
    }
  };

  // ── Accepter une offre (producteur) ──────────────────────────────────────
  const handleAcceptBid = async (bid) => {
    setSubmitting(true);

    // 1. Marquer l'offre comme acceptée et gagnante
    const { error: e1 } = await supabase
      .from('bids')
      .update({ is_accepted: true, is_winning: true })
      .eq('id', bid.id);

    if (e1) { setError(e1.message); setSubmitting(false); return; }

    // 2. Mettre à jour l'annonce
    const { error: e2 } = await supabase
      .from('listings')
      .update({
        status: 'agreed',
        agreed_with_user_id: bid.bidder_id,
        agreed_price_per_unit: bid.price_per_unit,
        agreed_at: new Date().toISOString(),
        contact_unlocked: true,
      })
      .eq('id', listing.id);

    if (e2) { setError(e2.message); setSubmitting(false); return; }

    // 3. Créer l'entrée unlocked_contacts (upsert pour éviter les doublons)
    const { error: e3 } = await supabase
      .from('unlocked_contacts')
      .upsert({
        listing_id: listing.id,
        bid_id: bid.id,
        producer_id: listing.producer_id,
        collector_id: bid.bidder_id,
      }, { onConflict: 'listing_id' });

    if (e3) { setError(e3.message); setSubmitting(false); return; }

    // 4. Marquer toutes les autres offres comme perdantes
    await supabase
      .from('bids')
      .update({ is_winning: false, is_accepted: false })
      .eq('listing_id', listing.id)
      .neq('id', bid.id);

    // 5. Notifier les deux parties : contact débloqué
    await supabase.from('notifications').insert([
      {
        user_id:    listing.producer_id,
        type:       'contact_unlocked',
        title:      '🔓 Nouveau contact débloqué',
        body:       `Vous avez conclu un accord sur "${listing.product_name}" à ${bid.price_per_unit} MAD/kg. Les coordonnées de votre collecteur sont maintenant disponibles.`,
        listing_id: listing.id,
        bid_id:     bid.id,
      },
      {
        user_id:    bid.bidder_id,
        type:       'contact_unlocked',
        title:      '🔓 Nouveau contact débloqué',
        body:       `Votre offre sur "${listing.product_name}" à ${bid.price_per_unit} MAD/kg a été acceptée. Les coordonnées du producteur sont maintenant disponibles.`,
        listing_id: listing.id,
        bid_id:     bid.id,
      },
    ]);

    setSubmitting(false);

    // BUG 2 FIX : recharger les offres pour griser les boutons, puis fermer
    await fetchBids();
    setSuccess('Accord conclu ! Les coordonnées sont maintenant débloquées.');
    setTimeout(() => { onSubmitted(); }, 1800);
  };

  const priceDiff = offerPrice && listing.asking_price_per_unit
    ? (((parseFloat(offerPrice) - listing.asking_price_per_unit) / listing.asking_price_per_unit) * 100).toFixed(1)
    : null;

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* En-tête */}
        <div style={{
          padding: '20px 24px 0', display: 'flex',
          justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: '#1f2937' }}>
              {isProducer ? '📊 Gérer les offres' : '💬 Faire une offre'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              {listing.product_name} · {listing.quantity_kg} kg
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#f3f4f6', border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: '#6b7280',
          }}>✕</button>
        </div>

        <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: '70vh' }}>

          {/* Résumé de l'annonce */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f7e6, #e8f5d0)',
            borderRadius: 12, padding: 14, marginBottom: 16,
            border: '1px solid #bbf7d0',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
          }}>
            <StatChip icon="💰" label="Prix demandé" value={`${listing.asking_price_per_unit} DH/kg`} />
            <StatChip icon="🔥" label="Meilleure offre" value={
              listing.current_best_offer
                ? `${listing.current_best_offer} DH/kg`
                : 'Aucune offre'
            } highlight={!!listing.current_best_offer} />
            <StatChip icon="👥" label="Offres reçues" value={`${listing.offer_count || 0}`} />
          </div>

          {/* ── VUE PRODUCTEUR : liste des offres ── */}
          {isProducer && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>
                Offres reçues ({bids.length})
              </div>

              {loadingBids ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>Chargement…</div>
              ) : bids.length === 0 ? (
                <div style={{
                  textAlign: 'center', color: '#9ca3af', padding: 24,
                  background: '#f9fafb', borderRadius: 12, border: '1px dashed #e5e7eb',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                  <div>Aucune offre pour le moment.</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Les collecteurs proches pourront enchérir sur votre annonce.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bids.map((bid, i) => (
                    <BidCard
                      key={bid.id}
                      bid={bid}
                      rank={i + 1}
                      askingPrice={listing.asking_price_per_unit}
                      onAccept={() => handleAcceptBid(bid)}
                      accepting={submitting}
                      isTop={i === 0}
                      isAgreed={bids.some(b => b.is_accepted)} // BUG 2 FIX : grise tout si déjà accepté
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── VUE COLLECTEUR : formulaire d'offre ── */}
          {isCollector && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {myBid && (
                <div style={{
                  background: '#eff6ff', borderRadius: 10, padding: 12,
                  border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af',
                }}>
                  ✏️ Vous avez déjà soumis une offre à <strong>{myBid.price_per_unit} DH/kg</strong>.
                  Vous pouvez la modifier ci-dessous.
                </div>
              )}

              {/* Prix */}
              <div>
                <label style={labelStyle}>
                  Votre prix proposé (DH / {listing.unit || 'kg'}) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" step="0.01" min={0}
                    placeholder={`Prix demandé : ${listing.asking_price_per_unit} DH`}
                    value={offerPrice}
                    onChange={e => setOfferPrice(e.target.value)}
                    style={{ ...formInputStyle, paddingRight: priceDiff ? 90 : 12 }}
                  />
                  {priceDiff !== null && (
                    <span style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 12, fontWeight: 700,
                      color: parseFloat(priceDiff) >= 0 ? '#16a34a' : '#dc2626',
                    }}>
                      {parseFloat(priceDiff) >= 0 ? '+' : ''}{priceDiff}%
                    </span>
                  )}
                </div>
                {offerPrice && parseFloat(offerPrice) < listing.asking_price_per_unit && (
                  <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                    ⚠️ Votre offre est inférieure au prix demandé. L'agriculteur peut la refuser.
                  </p>
                )}
              </div>

              {/* Quantité souhaitée */}
              <div>
                <label style={labelStyle}>
                  Quantité souhaitée (kg)
                  <span style={{ color: '#9ca3af', fontWeight: 400 }}> · Optionnel (toute la quantité par défaut)</span>
                </label>
                <input
                  type="number" min={1} placeholder={`Max : ${listing.quantity_kg} kg`}
                  value={offerQty}
                  onChange={e => setOfferQty(e.target.value)}
                  style={formInputStyle}
                />
              </div>

              {/* Message */}
              <div>
                <label style={labelStyle}>
                  Message à l'agriculteur
                  <span style={{ color: '#9ca3af', fontWeight: 400 }}> · Optionnel</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Présentez-vous, précisez vos conditions, votre disponibilité…"
                  value={offerMsg}
                  onChange={e => setOfferMsg(e.target.value)}
                  style={{ ...formInputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Estimation */}
              {offerPrice && offerQty && (
                <div style={{
                  background: '#f0fdf4', borderRadius: 10, padding: 12,
                  border: '1px solid #86efac',
                }}>
                  <div style={{ fontSize: 12, color: '#166534', fontWeight: 600, marginBottom: 4 }}>
                    💼 Estimation de la transaction
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>
                    {(parseFloat(offerPrice) * parseFloat(offerQty)).toFixed(2)} DH
                  </div>
                  <div style={{ fontSize: 12, color: '#4ade80' }}>
                    {offerQty} kg × {offerPrice} DH/kg
                  </div>
                </div>
              )}

              {/* Feedback */}
              {error && <FeedbackBox type="error" message={error} />}
              {success && <FeedbackBox type="success" message={success} />}
            </div>
          )}

          {/* Messages globaux (producteur) */}
          {isProducer && error && <FeedbackBox type="error" message={error} />}
          {isProducer && success && <FeedbackBox type="success" message={success} />}
        </div>

        {/* Footer */}
        {isCollector && (
          <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={secondaryBtnStyle}>Annuler</button>
            <button
              onClick={handleSubmitBid}
              disabled={submitting || !!success}
              style={{
                flex: 1, padding: '10px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
                color: 'white', border: 'none', fontSize: 14, fontWeight: 700,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting || success ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(45,80,22,0.25)',
              }}
            >
              {submitting ? 'Envoi…' : myBid ? '✏️ Modifier mon offre' : '🚀 Soumettre mon offre'}
            </button>
          </div>
        )}

        {isProducer && (
          <div style={{ padding: '0 24px 20px' }}>
            <button onClick={onClose} style={{ ...secondaryBtnStyle, width: '100%' }}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function BidCard({ bid, rank, askingPrice, onAccept, accepting, isTop, isAgreed }) {
  const diff = (((bid.price_per_unit - askingPrice) / askingPrice) * 100).toFixed(1);
  const diffPositive = parseFloat(diff) >= 0;
  const isWinner = bid.is_accepted && bid.is_winning;
  const isLoser  = isAgreed && !bid.is_accepted;

  return (
    <div style={{
      background: isWinner
        ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
        : isTop ? 'linear-gradient(135deg, #fefce8, #fef9c3)' : '#f9fafb',
      border: isWinner
        ? '2px solid #86efac'
        : isTop ? '2px solid #fcd34d' : '1px solid #e5e7eb',
      borderRadius: 12, padding: 14, position: 'relative',
      opacity: isLoser ? 0.5 : 1,
    }}>
      {isWinner && (
        <span style={{
          position: 'absolute', top: -10, left: 12,
          background: '#16a34a', color: 'white', borderRadius: 999,
          padding: '2px 10px', fontSize: 11, fontWeight: 700,
        }}>
          ✅ Offre acceptée
        </span>
      )}
      {!isWinner && isTop && !isAgreed && (
        <span style={{
          position: 'absolute', top: -10, left: 12,
          background: '#f59e0b', color: 'white', borderRadius: 999,
          padding: '2px 10px', fontSize: 11, fontWeight: 700,
        }}>
          🥇 Meilleure offre
        </span>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>
            {bid.price_per_unit} DH/kg
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {bid.users?.first_name} {bid.users?.last_name?.charAt(0)}.
            {bid.quantity_wanted_kg && ` · ${bid.quantity_wanted_kg} kg souhaités`}
          </div>
          {bid.message && (
            <div style={{
              marginTop: 8, fontSize: 12, color: '#4b5563',
              background: 'white', borderRadius: 8, padding: '6px 10px',
              border: '1px solid #e5e7eb', fontStyle: 'italic',
            }}>
              "{bid.message}"
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '2px 8px',
            background: diffPositive ? '#f0fdf4' : '#fef2f2',
            color: diffPositive ? '#16a34a' : '#dc2626',
          }}>
            {diffPositive ? '+' : ''}{diff}%
          </span>

          <button
            onClick={onAccept}
            disabled={accepting || isAgreed}
            style={{
              padding: '6px 14px', borderRadius: 8,
              background: isWinner
                ? '#f0fdf4'
                : isAgreed
                  ? '#f3f4f6'
                  : 'linear-gradient(135deg, #2D5016, #4a7c23)',
              color: isWinner ? '#16a34a' : isAgreed ? '#9ca3af' : 'white',
              border: isWinner ? '1px solid #86efac' : 'none',
              fontSize: 12, fontWeight: 700,
              cursor: (accepting || isAgreed) ? 'not-allowed' : 'pointer',
            }}
          >
            {accepting ? '…' : isWinner ? '✅ Acceptée' : isLoser ? 'Non retenue' : '✅ Accepter'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, highlight }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: highlight ? '#d97706' : '#1f2937' }}>{value}</div>
    </div>
  );
}

function FeedbackBox({ type, message }) {
  const styles = {
    error: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    success: { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
  };
  const s = styles[type];
  return (
    <div style={{
      background: s.bg, color: s.color, borderRadius: 8, padding: '8px 12px',
      fontSize: 13, border: `1px solid ${s.border}`,
    }}>
      {message}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 700, color: '#374151',
  marginBottom: 6, textTransform: 'uppercase',
};
const formInputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box', background: 'white',
};
const secondaryBtnStyle = {
  padding: '10px 20px', borderRadius: 10,
  background: '#f9fafb', color: '#374151',
  border: '1px solid #e5e7eb', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};