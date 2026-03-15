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

const CATEGORIES = [
  { id: 'all', label: '🌿 Tous', match: null },
  { id: 'legumes', label: '🥕 Légumes', match: ['tomate', 'carotte', 'oignon', 'pomme de terre', 'courgette', 'poivron', 'aubergine', 'haricot', 'salade', 'épinard', 'navet', 'brocoli', 'chou', 'ail', 'poireau'] },
  { id: 'fruits', label: '🍎 Fruits', match: ['pomme', 'poire', 'figue', 'grenade', 'raisin', 'orange', 'citron', 'abricot', 'pêche', 'cerise', 'fraise', 'pastèque', 'melon', 'mandarine', 'datte', 'banane'] },
  { id: 'olives', label: '🫒 Olives & huile', match: ['olive', 'huile'] },
  { id: 'cereales', label: '🌾 Céréales', match: ['blé', 'orge', 'maïs', 'sorgho', 'avoine'] },
  { id: 'aromatiques', label: '🌱 Aromatiques', match: ['menthe', 'persil', 'coriandre', 'thym', 'romarin', 'basilic', 'lavande'] },
];

function matchCategory(productName, match) {
  if (!match) return true;
  const lower = productName.toLowerCase();
  return match.some(m => lower.includes(m));
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' }) : '—';
}
export const CatalogPage = ({ setCurrentView }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [qualityFilter, setQuality] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [minQty, setMinQty] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [statusFilter, setStatus] = useState('all'); // 'all' | 'active' | 'negotiating'
  const fetchListings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('listings')
      .select(`
        id, product_name, quantity_kg, asking_price_per_unit,
        quality_grade, status, offer_count, current_best_offer,
        available_from, available_until, description, certifications,
        latitude, longitude,
        farms(farm_name, city, rating, certifications),
        users!listings_producer_id_fkey(first_name, last_name)
      `)
      .in('status', ['active', 'negotiating'])
      .gte('available_until', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false });

    setListings(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  const catObj = CATEGORIES.find(c => c.id === category);

  let filtered = listings.filter(l => {
    if (search && !l.product_name.toLowerCase().includes(search.toLowerCase()) &&
      !l.farms?.farm_name?.toLowerCase().includes(search.toLowerCase()) &&
      !l.farms?.city?.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'all' && !matchCategory(l.product_name, catObj?.match)) return false;
    if (qualityFilter && l.quality_grade !== qualityFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (minQty && (l.quantity_kg || 0) < parseFloat(minQty)) return false;
    if (maxPrice && (l.asking_price_per_unit || 0) > parseFloat(maxPrice)) return false;
    return true;
  });

  if (sortBy === 'price_asc') filtered = [...filtered].sort((a, b) => a.asking_price_per_unit - b.asking_price_per_unit);
  if (sortBy === 'price_desc') filtered = [...filtered].sort((a, b) => b.asking_price_per_unit - a.asking_price_per_unit);
  if (sortBy === 'qty_desc') filtered = [...filtered].sort((a, b) => b.quantity_kg - a.quantity_kg);
  if (sortBy === 'offers') filtered = [...filtered].sort((a, b) => (b.offer_count || 0) - (a.offer_count || 0));
  const goToListingOnMap = (listing) => {
    setCurrentView('map');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('map-focus-listing', { detail: listing }));
    }, 80);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9f7f4', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Barre de recherche sticky ── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 40,
        background: 'white', borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
              <input
                type="text"
                placeholder="Produit, ferme, ville…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 38px', borderRadius: 10,
                  border: '1px solid #e5e7eb', fontSize: 13, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Bouton filtres */}
            <button
              onClick={() => setShowFilters(v => !v)}
              style={{
                padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: showFilters ? '#2D5016' : '#f0f7e6', color: showFilters ? 'white' : '#2D5016',
                border: '1px solid #4a7c23', cursor: 'pointer',
              }}
            >
              ⚙️ Filtres {showFilters ? '▲' : '▼'}
            </button>

            {/* Tri */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, background: 'white', outline: 'none' }}
            >
              <option value="recent">Trier : Récent</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="qty_desc">Quantité (↓)</option>
              <option value="offers">Plus d'offres</option>
            </select>

            {/* Compteur */}
            <div style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>
              {loading ? '…' : <><strong style={{ color: '#1f2937' }}>{filtered.length}</strong> produit{filtered.length !== 1 ? 's' : ''}</>}
            </div>
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div style={{
              marginTop: 12, padding: 16, background: '#f9fafb', borderRadius: 12,
              display: 'flex', gap: 16, flexWrap: 'wrap', border: '1px solid #f3f4f6',
            }}>
              <FilterField label="Qualité">
                <select value={qualityFilter} onChange={e => setQuality(e.target.value)} style={selectStyle}>
                  <option value="">Toutes</option>
                  {Object.entries(QUALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </FilterField>
              <FilterField label="Statut">
                <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={selectStyle}>
                  <option value="all">Tous</option>
                  <option value="active">Nouvelle annonce</option>
                  <option value="negotiating">En enchères</option>
                </select>
              </FilterField>
              <FilterField label="Quantité min (kg)">
                <input type="number" min={0} placeholder="Ex: 100" value={minQty} onChange={e => setMinQty(e.target.value)} style={{ ...selectStyle, width: 100 }} />
              </FilterField>
              <FilterField label="Prix max (MAD/kg)">
                <input type="number" min={0} placeholder="Ex: 10" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ ...selectStyle, width: 100 }} />
              </FilterField>
              <button
                onClick={() => { setQuality(''); setStatus('all'); setMinQty(''); setMaxPrice(''); }}
                style={{ padding: '6px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end' }}
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>

        {/* Catégories */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 12px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                whiteSpace: 'nowrap', border: 'none', cursor: 'pointer',
                background: category === cat.id ? '#2D5016' : '#f3f4f6',
                color: category === cat.id ? 'white' : '#374151',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grille produits ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {loading ? (
          <ProductSkeletons />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(listing => (
              <ProductCard key={listing.id} listing={listing} onGoToMap={() => goToListingOnMap(listing)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
function ProductCard({ listing, onGoToMap }) {
  const qualColor = QUALITY_COLORS[listing.quality_grade] || '#6b7280';
  const isNegotiating = listing.status === 'negotiating';

  return (
    <div style={{
      background: 'white', borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${isNegotiating ? '#fcd34d' : '#e5e7eb'}`,
      boxShadow: isNegotiating ? '0 2px 12px rgba(217,119,6,0.12)' : '0 1px 4px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header coloré */}
      <div style={{
        background: isNegotiating
          ? 'linear-gradient(135deg, #fef3c7, #fef9c3)'
          : 'linear-gradient(135deg, #f0f7e6, #e8f5d0)',
        padding: '14px 16px 10px',
        borderBottom: `1px solid ${isNegotiating ? '#fde68a' : '#bbf7d0'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1f2937', marginBottom: 4 }}>
              {listing.product_name}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {listing.farms?.farm_name}
              {listing.farms?.city && ` · 📍 ${listing.farms.city}`}
            </div>
          </div>
          <span style={{
            background: qualColor + '20', color: qualColor,
            borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 700,
            border: `1px solid ${qualColor}40`, marginLeft: 8, flexShrink: 0,
          }}>
            {QUALITY_LABELS[listing.quality_grade] || listing.quality_grade}
          </span>
        </div>
      </div>

      {/* Corps */}
      <div style={{ padding: '12px 16px', flex: 1 }}>
        {/* Infos clés */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <InfoChip label="Quantité" value={`${listing.quantity_kg} kg`} />
          <InfoChip label="Prix demandé" value={`${listing.asking_price_per_unit} MAD/kg`} highlight />
          <InfoChip label="Disponible dès" value={fmtDate(listing.available_from)} />
          <InfoChip label="Producteur" value={`${listing.users?.first_name ?? ''} ${listing.users?.last_name ?? ''}`} />
        </div>

        {/* Description */}
        {listing.description && (
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {listing.description}
          </p>
        )}

        {/* Certifications */}
        {listing.certifications?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {listing.certifications.map(c => (
              <span key={c} style={{ background: '#f0f7e6', color: '#2D5016', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                ✓ {c}
              </span>
            ))}
          </div>
        )}

        {/* Enchères en cours */}
        {isNegotiating && (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7, #fef9c3)',
            borderRadius: 10, padding: '8px 12px', marginBottom: 10,
            border: '1px solid #fde68a',
          }}>
            <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700, marginBottom: 4 }}>
              🔥 {listing.offer_count} offre{listing.offer_count > 1 ? 's' : ''} en cours
            </div>
            {listing.current_best_offer && (
              <div style={{ fontSize: 14, fontWeight: 800, color: '#78350f' }}>
                Meilleure offre : {listing.current_best_offer} MAD/kg
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
        {/* Badge statut */}
        <span style={{
          padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: isNegotiating ? '#fef3c7' : '#f0f7e6',
          color: isNegotiating ? '#92400e' : '#2D5016',
          border: `1px solid ${isNegotiating ? '#fcd34d' : '#bbf7d0'}`,
          display: 'flex', alignItems: 'center',
        }}>
          {isNegotiating ? '🤝 En enchères' : '🌾 Nouvelle annonce'}
        </span>

        {/* Bouton vers la carte */}
        <button
          onClick={onGoToMap}
          style={{
            marginLeft: 'auto', padding: '7px 14px', borderRadius: 10,
            background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
            color: 'white', border: 'none', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', boxShadow: '0 2px 6px rgba(45,80,22,0.25)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {isNegotiating ? '⚔️ Enchérir' : '💬 Faire une offre'} →
        </button>
      </div>
    </div>
  );
}

function InfoChip({ label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? '#f0f7e6' : '#f9fafb',
      borderRadius: 8, padding: '6px 10px',
      border: highlight ? '1px solid #bbf7d0' : '1px solid #f3f4f6',
    }}>
      <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: highlight ? '#2D5016' : '#1f2937' }}>{value}</div>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', background: 'white', borderRadius: 16, border: '1px dashed #e5e7eb' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#1f2937', marginBottom: 8 }}>Aucun produit trouvé</div>
      <div style={{ fontSize: 13, color: '#6b7280' }}>Essayez de modifier vos critères de recherche.</div>
    </div>
  );
}

function ProductSkeletons() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <div style={{ height: 80, background: 'linear-gradient(135deg, #e5e7eb, #f3f4f6)' }} />
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, width: '55%' }} />
            <div style={{ height: 12, background: '#f9fafb', borderRadius: 6, width: '40%' }} />
            <div style={{ height: 60, background: '#f3f4f6', borderRadius: 10 }} />
            <div style={{ height: 36, background: '#f0f7e6', borderRadius: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const selectStyle = {
  padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
  fontSize: 12, background: 'white', outline: 'none',
};