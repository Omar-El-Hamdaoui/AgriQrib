// pages/FarmsPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Liste des fermes réelles depuis Supabase, avec navigation vers la carte
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../auth/supabaseClient';

const QUALITY_LABELS = {
  standard: 'Standard', premium: 'Premium', bio: 'Bio AB',
  bio_premium: 'Bio Premium', label_rouge: 'Label Rouge', aop: 'AOP', igp: 'IGP',
};

const QUALITY_COLORS = {
  standard: '#6b7280', premium: '#0ea5e9', bio: '#16a34a',
  bio_premium: '#15803d', label_rouge: '#dc2626', aop: '#9333ea', igp: '#ea580c',
};

// ── Composant principal ───────────────────────────────────────────────────────
export const FarmsPage = ({ setCurrentView }) => {
  const [farms, setFarms]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [expandedFarm, setExpandedFarm] = useState(null); // farm_id dont on voit les produits

  // ── Charger fermes + leurs annonces actives ────────────────────────────────
  const fetchFarms = useCallback(async () => {
    setLoading(true);

    const { data } = await supabase
      .from('farms')
      .select(`
        id, farm_name, address, city, rating, certifications, delivery_radius_km,
        users!farms_owner_id_fkey(first_name, last_name),
        listings(
          id, product_name, quantity_kg, asking_price_per_unit,
          status, offer_count, current_best_offer, quality_grade,
          available_from, latitude, longitude
        )
      `)
      .order('rating', { ascending: false });

    // Ne garder que les fermes avec au moins une annonce active ou en négociation
    const enriched = (data || []).map(farm => ({
      ...farm,
      activeListings: (farm.listings || []).filter(l =>
        ['active', 'negotiating'].includes(l.status)
      ),
    }));

    setFarms(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFarms(); }, [fetchFarms]);

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const cities = [...new Set(farms.map(f => f.city).filter(Boolean))].sort();

  const filtered = farms.filter(f => {
    const matchSearch = !search ||
      f.farm_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.city?.toLowerCase().includes(search.toLowerCase());
    const matchCity = !cityFilter || f.city === cityFilter;
    return matchSearch && matchCity;
  });

  // ── Navigation vers la carte ───────────────────────────────────────────────
  const goToFarmOnMap = (farm) => {
    setCurrentView('map');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('map-focus-farm', { detail: {
        lat: farm.latitude,
        lng: farm.longitude,
        farmId: farm.id,
      }}));
    }, 80);
  };

  const goToListingOnMap = (listing) => {
    setCurrentView('map');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('map-focus-listing', { detail: listing }));
    }, 80);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9f7f4', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1f2937', fontFamily: 'Georgia, serif' }}>
            🌾 Nos producteurs locaux
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
            Découvrez les fermes et leurs produits disponibles en ce moment
          </p>
        </div>

        {/* ── Filtres ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
            <input
              type="text"
              placeholder="Rechercher une ferme ou une ville…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10,
                border: '1px solid #e5e7eb', fontSize: 13, outline: 'none',
                background: 'white', boxSizing: 'border-box',
              }}
            />
          </div>
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
              fontSize: 13, background: 'white', color: '#374151', outline: 'none',
              minWidth: 160,
            }}
          >
            <option value="">Toutes les villes</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#6b7280', paddingLeft: 4 }}>
            {loading ? 'Chargement…' : `${filtered.length} ferme${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* ── Grille fermes ── */}
        {loading ? (
          <FarmsSkeletons />
        ) : filtered.length === 0 ? (
          <EmptyState icon="🌾" title="Aucune ferme trouvée" body="Essayez de modifier votre recherche." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filtered.map(farm => (
              <FarmCard
                key={farm.id}
                farm={farm}
                expanded={expandedFarm === farm.id}
                onToggleProducts={() => setExpandedFarm(expandedFarm === farm.id ? null : farm.id)}
                onGoToMap={() => goToFarmOnMap(farm)}
                onGoToListing={goToListingOnMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Carte ferme ───────────────────────────────────────────────────────────────
function FarmCard({ farm, expanded, onToggleProducts, onGoToMap, onGoToListing }) {
  const owner = farm.users;
  const activeCount = farm.activeListings?.length ?? 0;

  return (
    <div style={{
      background: 'white', borderRadius: 18, overflow: 'hidden',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Bandeau coloré */}
      <div style={{
        background: 'linear-gradient(135deg, #2D5016 0%, #4a7c23 60%, #6aab30 100%)',
        padding: '20px 20px 16px',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'white', fontFamily: 'Georgia, serif' }}>
              {farm.farm_name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>📍 {farm.city}</span>
              {farm.delivery_radius_km && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>🚚 {farm.delivery_radius_km} km</span>
                </>
              )}
            </div>
          </div>
          {farm.rating && (
            <div style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: 10,
              padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 13 }}>⭐</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{farm.rating}</span>
            </div>
          )}
        </div>

        {/* Certifications */}
        {farm.certifications?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {farm.certifications.map(c => (
              <span key={c} style={{
                background: 'rgba(255,255,255,0.2)', color: 'white',
                borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700,
              }}>
                ✓ {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Corps */}
      <div style={{ padding: 16 }}>
        {/* Producteur */}
        {owner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '8px 12px', background: '#f9fafb', borderRadius: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: 'white', fontWeight: 800,
            }}>
              {owner.first_name?.[0]}{owner.last_name?.[0]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
                {owner.first_name} {owner.last_name}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Producteur</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={{
                background: activeCount > 0 ? '#f0f7e6' : '#f3f4f6',
                color: activeCount > 0 ? '#2D5016' : '#9ca3af',
                borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700,
              }}>
                {activeCount > 0 ? `${activeCount} produit${activeCount > 1 ? 's' : ''} dispo` : 'Aucun produit actif'}
              </span>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onGoToMap}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10,
              background: '#f0f7e6', color: '#2D5016',
              border: '1px solid #bbf7d0', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            🗺️ Voir sur la carte
          </button>
          {activeCount > 0 && (
            <button
              onClick={onToggleProducts}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10,
                background: expanded ? '#2D5016' : 'white',
                color: expanded ? 'white' : '#2D5016',
                border: '1px solid #2D5016', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {expanded ? '▲ Masquer' : `🌿 ${activeCount} produit${activeCount > 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {/* Produits disponibles (expand) */}
        {expanded && activeCount > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>
              Produits disponibles
            </div>
            {farm.activeListings.map(listing => (
              <ListingMiniCard key={listing.id} listing={listing} onGoToMap={() => onGoToListing(listing)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mini-carte produit dans la ferme ──────────────────────────────────────────
function ListingMiniCard({ listing, onGoToMap }) {
  const qualColor = QUALITY_COLORS[listing.quality_grade] || '#6b7280';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 12px', background: '#f9fafb', borderRadius: 10,
      border: '1px solid #f3f4f6',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1f2937' }}>{listing.product_name}</span>
          <span style={{
            background: qualColor + '20', color: qualColor,
            borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700,
          }}>
            {QUALITY_LABELS[listing.quality_grade] || listing.quality_grade}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>
          {listing.quantity_kg} kg · <strong>{listing.asking_price_per_unit} MAD/kg</strong>
          {listing.offer_count > 0 && (
            <span style={{ color: '#d97706', marginLeft: 6 }}>🔥 {listing.offer_count} offre{listing.offer_count > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
      <button
        onClick={onGoToMap}
        style={{
          marginLeft: 10, padding: '5px 12px', borderRadius: 8,
          background: listing.status === 'negotiating' ? '#fef3c7' : '#f0f7e6',
          color: listing.status === 'negotiating' ? '#92400e' : '#2D5016',
          border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        {listing.status === 'negotiating' ? '⚔️ Enchérir' : '💬 Offrir'} →
      </button>
    </div>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', background: 'white', borderRadius: 16, border: '1px dashed #e5e7eb' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#1f2937', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#6b7280' }}>{body}</div>
    </div>
  );
}

function FarmsSkeletons() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ background: 'white', borderRadius: 18, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <div style={{ height: 96, background: 'linear-gradient(135deg, #e5e7eb, #f3f4f6)' }} />
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, width: '60%' }} />
            <div style={{ height: 12, background: '#f9fafb', borderRadius: 6, width: '40%' }} />
            <div style={{ height: 36, background: '#f3f4f6', borderRadius: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}