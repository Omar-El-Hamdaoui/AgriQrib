// pages/MapPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Carte interactive : géolocalisation, annonces agricoles, enchères en temps réel
// Dépendances : leaflet, react-leaflet  →  npm install leaflet react-leaflet
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../auth/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { ListingFormModal } from '../components/features/ListingFormModal';
import { BidModal } from '../components/features/BidModal';
import { ContactModal } from '../components/features/ContactModal';

// ── Fix icônes Leaflet avec Vite/CRA ─────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Icônes personnalisées ─────────────────────────────────────────────────────
const makeIcon = (emoji, color, size = 38) => L.divIcon({
  html: `
    <div style="
      background:${color};
      width:${size}px;height:${size}px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 3px 12px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
    ">
      <span style="transform:rotate(45deg);font-size:${size * 0.42}px;line-height:1">${emoji}</span>
    </div>
  `,
  className: '',
  iconSize: [size, size],
  iconAnchor: [size / 2, size],
  popupAnchor: [0, -size],
});

const ICONS = {
  me:         makeIcon('📍', '#2D5016', 42),
  active:     makeIcon('🌾', '#4a7c23', 38),
  negotiating:makeIcon('🤝', '#d97706', 38),
  agreed:     makeIcon('✅', '#6b7280', 32),
};

const QUALITY_LABELS = {
  standard: 'Standard', premium: 'Premium', bio: 'Bio AB',
  bio_premium: 'Bio Premium', label_rouge: 'Label Rouge', aop: 'AOP', igp: 'IGP',
};

const QUALITY_COLORS = {
  standard: '#6b7280', premium: '#0ea5e9', bio: '#16a34a',
  bio_premium: '#15803d', label_rouge: '#dc2626', aop: '#9333ea', igp: '#ea580c',
};

const RADIUS_KM = 70;

// ── Composant de recadrage de la carte ───────────────────────────────────────
function FlyToUser({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 11, { duration: 1.5 });
  }, [coords, map]);
  return null;
}

// ── Exposer la ref Leaflet au composant parent ────────────────────────────────
function SetMapRef({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

// ── Filtres ───────────────────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  product: '',
  maxDistance: RADIUS_KM,
  minQuantity: '',
  availableFrom: '',
  quality: '',
  status: 'all',
};

// ─────────────────────────────────────────────────────────────────────────────
export function MapPage({ setCurrentView }) {
  const { user } = useAuth();
  const userRole    = user?.role ?? '';
  const isProducer  = userRole === 'producer';
  const isCollector = ['buyer_individual', 'buyer_restaurant', 'buyer_transit'].includes(userRole);
  const isGuest     = !user; // visiteur non connecté

  const [userCoords, setUserCoords] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(true);

  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedListing, setSelectedListing] = useState(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [showListingForm, setShowListingForm] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const realtimeRef = useRef(null);
  const [positionSource, setPositionSource] = useState('auto'); // 'auto' | 'db' | 'gps'
  const mapRef = useRef(null); // référence à l'instance Leaflet

  // ── Écouter les événements de navigation depuis FarmsPage / CatalogPage ───
  useEffect(() => {
    // Focus sur une ferme (depuis FarmsPage)
    const handleFocusFarm = (e) => {
      const { lat, lng } = e.detail;
      if (lat && lng && mapRef.current) {
        mapRef.current.flyTo([lat, lng], 13, { duration: 1.2 });
      }
    };

    // Focus sur une annonce spécifique (ouvrir son panneau latéral)
    const handleFocusListing = (e) => {
      const listing = e.detail;
      if (!listing) return;
      // Centrer sur l'annonce
      if (listing.latitude && listing.longitude && mapRef.current) {
        mapRef.current.flyTo([listing.latitude, listing.longitude], 14, { duration: 1.2 });
      }
      // Ouvrir le panneau latéral
      setSelectedListing(listing);
      setShowSidePanel(true);
    };

    window.addEventListener('map-focus-farm', handleFocusFarm);
    window.addEventListener('map-focus-listing', handleFocusListing);
    return () => {
      window.removeEventListener('map-focus-farm', handleFocusFarm);
      window.removeEventListener('map-focus-listing', handleFocusListing);
    };
  }, []);

  // ── 1. Géolocalisation ───────────────────────────────────────────────────
  // Connecté : base → GPS → fallback | Invité : GPS → fallback direct
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setGeoLoading(true);

      // 1a. Utilisateur connecté : chercher position sauvegardée en base
      if (user?.id) {
        const { data: savedLoc } = await supabase
          .from('user_locations')
          .select('latitude, longitude')
          .eq('user_id', user.id)
          .single();

        if (cancelled) return;

        if (savedLoc?.latitude && savedLoc?.longitude) {
          setUserCoords([savedLoc.latitude, savedLoc.longitude]);
          setPositionSource('db');
          setGeoLoading(false);
          return;
        }
      }

      // 1b. GPS navigateur (connecté sans position sauvegardée, ou invité)
      if (!navigator.geolocation) {
        setGeoError('Géolocalisation non supportée par votre navigateur.');
        setUserCoords([33.8935, -5.5547]);
        setPositionSource('fallback');
        setGeoLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserCoords(coords);
          setPositionSource('gps');
          setGeoLoading(false);

          // Sauvegarder en base seulement si connecté
          if (user?.id) {
            await supabase.from('user_locations').upsert({
              user_id: user.id,
              latitude: coords[0],
              longitude: coords[1],
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
          }
        },
        () => {
          if (cancelled) return;
          setGeoError('Position GPS indisponible.');
          setUserCoords([33.8935, -5.5547]);
          setPositionSource('fallback');
          setGeoLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };

    init();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── 2. Charger les annonces proches ──────────────────────────────────────
  const fetchListings = useCallback(async () => {
    if (!userCoords) return;
    setListingsLoading(true);

    let query = supabase
      .from('listings')
      .select(`
        *,
        farms(farm_name, address, city, rating),
        users!listings_producer_id_fkey(first_name, last_name, phone, email)
      `)
      .in('status', ['active', 'negotiating', 'agreed'])
      .gte('available_until', new Date().toISOString().split('T')[0]);

    // Filtre produit
    if (filters.product) {
      query = query.ilike('product_name', `%${filters.product}%`);
    }
    // Filtre qualité
    if (filters.quality) {
      query = query.eq('quality_grade', filters.quality);
    }
    // Filtre date disponibilité
    if (filters.availableFrom) {
      query = query.lte('available_from', filters.availableFrom);
    }
    // Filtre quantité min
    if (filters.minQuantity) {
      query = query.gte('quantity_kg', parseFloat(filters.minQuantity));
    }

    const { data, error } = await query;
    if (error) { console.error(error); setListingsLoading(false); return; }

    // Filtre distance côté client (haversine simplifié)
    const filtered = (data || []).filter(l => {
      const dist = haversineKm(userCoords[0], userCoords[1], l.latitude, l.longitude);
      l._distanceKm = Math.round(dist * 10) / 10;
      return dist <= filters.maxDistance;
    });

    // Tri par distance
    filtered.sort((a, b) => a._distanceKm - b._distanceKm);
    setListings(filtered);

    // ── Sync selectedListing : si le panneau est ouvert, mettre à jour
    // l'objet avec les données fraîches (nouveau statut, offer_count, etc.)
    setSelectedListing(prev => {
      if (!prev) return null;
      const fresh = filtered.find(l => l.id === prev.id);
      return fresh ?? prev; // si l'annonce a disparu (expirée), garder l'ancienne
    });

    setListingsLoading(false);
  }, [userCoords, filters]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // ── 3. Realtime : écouter les nouvelles annonces et offres ───────────────
  useEffect(() => {
    if (!userCoords) return;

    const channel = supabase
      .channel('map-realtime')
      // Toute modification d'une annonce (statut, offer_count, best_offer)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' },
        () => { fetchListings(); }
      )
      // Nouvelle offre → recharger pour mettre à jour le panneau ouvert
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' },
        () => { fetchListings(); }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bids' },
        () => { fetchListings(); }
      )
      .subscribe();

    realtimeRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [userCoords, fetchListings]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleListingClick = (listing) => {
    setSelectedListing(listing);
    setShowSidePanel(true);
  };

  const handleBidSubmitted = () => {
    setShowBidModal(false);
    fetchListings(); // sync automatique de selectedListing via setSelectedListing dans fetchListings
  };

  const handleListingCreated = () => {
    setShowListingForm(false);
    fetchListings();
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: '#f9f7f4' }}>

      {/* ── Barre d'outils ── */}
      <div style={{
        padding: '10px 16px', background: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Titre */}
        <div style={{ fontWeight: 700, color: '#2D5016', fontSize: 15, whiteSpace: 'nowrap' }}>
          🗺️ Carte des annonces
        </div>

        {/* Compteur */}
        <div style={{
          background: '#f0f7e6', color: '#2D5016', borderRadius: 999,
          padding: '3px 10px', fontSize: 13, fontWeight: 600,
        }}>
          {listingsLoading ? '…' : `${listings.length} annonce${listings.length !== 1 ? 's' : ''}`} dans {filters.maxDistance} km
        </div>

        <div style={{ flex: 1 }} />

        {/* Filtres rapides */}
        <input
          type="text"
          placeholder="🔍 Produit (tomates, olives…)"
          value={filters.product}
          onChange={e => setFilters(f => ({ ...f, product: e.target.value }))}
          style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db',
            fontSize: 13, outline: 'none', minWidth: 180,
          }}
        />

        <button
          onClick={() => setShowFilters(v => !v)}
          style={{
            padding: '6px 14px', borderRadius: 8,
            background: showFilters ? '#2D5016' : '#f0f7e6',
            color: showFilters ? 'white' : '#2D5016',
            border: '1px solid #4a7c23', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          ⚙️ Filtres
        </button>

        {/* 🛠️ Sélecteur de position fictive — dev uniquement */}
        {import.meta.env.DEV && user?.id && (
          <PositionOverride
            currentCoords={userCoords}
            positionSource={positionSource}
            onOverride={async (coords) => {
              setUserCoords(coords);
              setPositionSource('manual');
              await supabase.from('user_locations').upsert({
                user_id: user.id,
                latitude: coords[0],
                longitude: coords[1],
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' });
            }}
          />
        )}

        {/* Bouton Créer annonce (producteur uniquement) */}
        {isProducer && (
          <button
            onClick={() => setShowListingForm(true)}
            style={{
              padding: '6px 16px', borderRadius: 8,
              background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
              color: 'white', border: 'none', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 2px 6px rgba(45,80,22,0.25)',
            }}
          >
            + Nouvelle annonce
          </button>
        )}
      </div>

      {/* ── Panneau de filtres avancés ── */}
      {showFilters && (
        <div style={{
          background: 'white', padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          <FilterField label="Distance max (km)">
            <input
              type="range" min={10} max={RADIUS_KM} value={filters.maxDistance}
              onChange={e => setFilters(f => ({ ...f, maxDistance: +e.target.value }))}
              style={{ width: 120 }}
            />
            <span style={{ fontSize: 12, color: '#6b7280' }}>{filters.maxDistance} km</span>
          </FilterField>

          <FilterField label="Quantité min (kg)">
            <input
              type="number" placeholder="ex: 500" value={filters.minQuantity}
              onChange={e => setFilters(f => ({ ...f, minQuantity: e.target.value }))}
              style={inputStyle}
            />
          </FilterField>

          <FilterField label="Disponible dès">
            <input
              type="date" value={filters.availableFrom}
              onChange={e => setFilters(f => ({ ...f, availableFrom: e.target.value }))}
              style={inputStyle}
            />
          </FilterField>

          <FilterField label="Qualité / Certification">
            <select
              value={filters.quality}
              onChange={e => setFilters(f => ({ ...f, quality: e.target.value }))}
              style={inputStyle}
            >
              <option value="">Toutes</option>
              {Object.entries(QUALITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FilterField>

          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            style={{
              padding: '6px 12px', borderRadius: 8, background: '#fef2f2',
              color: '#dc2626', border: '1px solid #fca5a5', fontSize: 12,
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            Réinitialiser
          </button>
        </div>
      )}

      {/* ── Erreur géoloc ── */}
      {geoError && (
        <div style={{
          background: '#fef3c7', color: '#92400e', padding: '8px 16px',
          fontSize: 13, borderBottom: '1px solid #fcd34d',
        }}>
          ⚠️ {geoError}
        </div>
      )}

      {/* ── Carte principale ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {geoLoading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1000,
            background: 'rgba(249,247,244,0.85)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12,
          }}>
            <div style={{
              width: 48, height: 48,
              background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
              borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, boxShadow: '0 4px 16px rgba(45,80,22,0.3)',
            }}>🌿</div>
            <div style={{ color: '#2D5016', fontWeight: 600, fontSize: 14 }}>
              Localisation en cours…
            </div>
          </div>
        )}

        {!geoLoading && (
          <MapContainer
            center={userCoords || [46.5, 2.5]}
            zoom={userCoords ? 10 : 6}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Exposer la ref Leaflet */}
            <SetMapRef mapRef={mapRef} />

            {/* Recadrage automatique */}
            {userCoords && <FlyToUser coords={userCoords} />}

            {/* Cercle de rayon */}
            {userCoords && (
              <Circle
                center={userCoords}
                radius={filters.maxDistance * 1000}
                pathOptions={{
                  color: '#2D5016', fillColor: '#4a7c23',
                  fillOpacity: 0.04, weight: 1.5, dashArray: '6 4',
                }}
              />
            )}

            {/* Marqueur de l'utilisateur */}
            {userCoords && (
              <Marker position={userCoords} icon={ICONS.me}>
                <Tooltip direction="top" offset={[0, -42]} opacity={0.95} permanent={false}>
                  <div style={{ fontWeight: 700 }}>📍 Votre position</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    {isProducer ? 'Producteur' : 'Collecteur'}
                  </div>
                </Tooltip>
              </Marker>
            )}

            {/* Marqueurs des annonces */}
            {listings.map(listing => (
              <Marker
                key={listing.id}
                position={[listing.latitude, listing.longitude]}
                icon={ICONS[listing.status] || ICONS.active}
                eventHandlers={{ click: () => handleListingClick(listing) }}
              >
                <Tooltip direction="top" offset={[0, -38]} opacity={0.95}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{listing.product_name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    {listing._distanceKm} km · {listing.asking_price_per_unit} DH/kg
                    {listing.offer_count > 0 && ` · 🔥 ${listing.offer_count} offre(s)`}
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* ── Légende ── */}
        <div style={{
          position: 'absolute', bottom: 24, left: 16, zIndex: 900,
          background: 'white', borderRadius: 12, padding: '10px 14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 12,
        }}>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: 8 }}>Légende</div>
          {[
            { icon: '🌾', color: '#4a7c23', label: 'Annonce active' },
            { icon: '🤝', color: '#d97706', label: 'En négociation' },
            { icon: '✅', color: '#6b7280', label: 'Accord trouvé' },
            { icon: '📍', color: '#2D5016', label: 'Votre position' },
          ].map(({ icon, color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50% 50% 50% 0', background: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, transform: 'rotate(-45deg)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}>
                <span style={{ transform: 'rotate(45deg)' }}>{icon}</span>
              </span>
              <span style={{ color: '#4b5563' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panneau latéral : détail annonce ── */}
      {showSidePanel && selectedListing && (
        <ListingSidePanel
          listing={selectedListing}
          isProducer={isProducer}
          isCollector={isCollector}
          isGuest={isGuest}
          currentUserId={user?.id}
          onClose={() => { setShowSidePanel(false); setSelectedListing(null); }}
          onBid={() => setShowBidModal(true)}
          onContact={() => setShowContactModal(true)}
          onLogin={(view) => setCurrentView(view)}
        />
      )}

      {/* ── Modals ── */}
      {showListingForm && (
        <ListingFormModal
          userCoords={userCoords}
          onClose={() => setShowListingForm(false)}
          onCreated={handleListingCreated}
        />
      )}

      {showBidModal && selectedListing && (
        <BidModal
          listing={selectedListing}
          onClose={() => setShowBidModal(false)}
          onSubmitted={handleBidSubmitted}
        />
      )}

      {showContactModal && selectedListing && (
        <ContactModal
          listing={selectedListing}
          currentUserId={user.id}
          onClose={() => setShowContactModal(false)}
        />
      )}
    </div>
  );
}

// ── Panneau latéral détail annonce ────────────────────────────────────────────
function ListingSidePanel({ listing, isProducer, isCollector, isGuest, currentUserId, onClose, onBid, onContact, onLogin }) {
  const isOwner = listing.producer_id === currentUserId;
  const isWinner = listing.agreed_with_user_id === currentUserId;
  const isAgreed = listing.status === 'agreed';
  const qualColor = QUALITY_COLORS[listing.quality_grade] || '#6b7280';

  const statusConfig = {
    active:      { label: 'Active',           bg: '#f0f7e6', color: '#2D5016' },
    negotiating: { label: 'En négociation',   bg: '#fef3c7', color: '#92400e' },
    agreed:      { label: 'Accord conclu',    bg: '#f0fdf4', color: '#166534' },
  };
  const sc = statusConfig[listing.status] || statusConfig.active;

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0,
      width: 340, zIndex: 800,
      background: 'white',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif",
      animation: 'slideIn 0.2s ease',
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              background: sc.bg, color: sc.color,
              borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700,
            }}>
              {sc.label}
            </span>
            <span style={{
              background: qualColor + '20', color: qualColor,
              borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700,
              border: `1px solid ${qualColor}40`,
            }}>
              {QUALITY_LABELS[listing.quality_grade]}
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1f2937' }}>
            {listing.product_name}
          </h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {listing.farms?.farm_name} · {listing.city} · {listing._distanceKm} km
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#f3f4f6', border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', fontSize: 16,
            color: '#6b7280', flexShrink: 0, marginLeft: 8,
          }}
        >✕</button>
      </div>

      {/* Corps scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Grid infos clés */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <SidePanelChip icon="⚖️" label="Quantité"      value={`${listing.quantity_kg} kg`} />
          <SidePanelChip icon="💰" label="Prix demandé"  value={`${listing.asking_price_per_unit} MAD/kg`} highlight />
          <SidePanelChip icon="🌱" label="Récolte"       value={formatDate(listing.harvest_date)} />
          <SidePanelChip icon="📅" label="Disponible dès" value={formatDate(listing.available_from)} />
        </div>

        {/* Description */}
        {listing.description && (
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
            <p style={{ margin: 0, fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>{listing.description}</p>
          </div>
        )}

        {/* Certifications */}
        {listing.certifications?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {listing.certifications.map(c => (
              <span key={c} style={{
                background: '#f0f7e6', color: '#2D5016', borderRadius: 999,
                padding: '3px 10px', fontSize: 12, fontWeight: 600,
                border: '1px solid #bbf7d0',
              }}>
                ✓ {c}
              </span>
            ))}
          </div>
        )}

        {/* Enchères en cours */}
        {listing.offer_count > 0 && !isAgreed && (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7, #fef9c3)',
            borderRadius: 12, padding: 14, border: '1px solid #fcd34d',
          }}>
            <div style={{ fontSize: 12, color: '#92400e', fontWeight: 700, marginBottom: 8 }}>
              🔥 Enchères en cours
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: '#a16207' }}>Meilleure offre</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#78350f' }}>
                  {listing.current_best_offer ?? '–'} <span style={{ fontSize: 13 }}>MAD/kg</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#a16207' }}>Enchérisseurs</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#78350f' }}>
                  {listing.offer_count}
                </div>
              </div>
            </div>
            {listing.asking_price_per_unit && listing.current_best_offer && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#92400e' }}>
                {listing.current_best_offer >= listing.asking_price_per_unit
                  ? `✅ Prix demandé atteint !`
                  : `⬆️ Il manque ${(listing.asking_price_per_unit - listing.current_best_offer).toFixed(2)} MAD/kg pour atteindre le prix demandé`
                }
              </div>
            )}
          </div>
        )}

        {/* Accord trouvé */}
        {isAgreed && (
          <div style={{
            background: '#f0fdf4', borderRadius: 12, padding: 14, border: '1px solid #86efac',
          }}>
            <div style={{ fontSize: 12, color: '#166534', fontWeight: 700, marginBottom: 4 }}>✅ Accord conclu</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>
              {listing.agreed_price_per_unit} MAD/kg
            </div>
            <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>
              Total estimé : {(listing.agreed_price_per_unit * listing.quantity_kg).toFixed(2)} MAD
            </div>
          </div>
        )}

        {/* Info propriétaire */}
        {isOwner && !isAgreed && (
          <div style={{
            background: '#eff6ff', borderRadius: 10, padding: 12,
            border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af',
          }}>
            📢 C'est votre annonce. Ouvrez le gestionnaire d'offres pour voir et accepter les enchères.
          </div>
        )}
      </div>

      {/* Footer : boutons d'action */}
      <div style={{ padding: 16, borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* 🛠️ Debug temporaire — à supprimer après vérification */}
        {import.meta.env.DEV && (
          <div style={{
            background: '#fef3c7', borderRadius: 8, padding: '6px 10px',
            fontSize: 11, color: '#92400e', border: '1px solid #fcd34d',
          }}>
            🛠️ isCollector={String(isCollector)} · isProducer={String(isProducer)} · isOwner={String(isOwner)} · status={listing.status}
          </div>
        )}

        {/* Collecteur → faire / modifier une offre */}
        {isCollector && !isOwner && !isAgreed && (
          <button
            onClick={onBid}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
              color: 'white', border: 'none', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', boxShadow: '0 3px 10px rgba(45,80,22,0.3)',
            }}
          >
            {listing.offer_count > 0 ? '⚔️ Surenchérir' : '💬 Faire une offre'}
          </button>
        )}

        {/* Invité → CTA connexion/inscription */}
        {isGuest && !isAgreed && (
          <div style={{
            background: 'linear-gradient(135deg, #f0f7e6, #e8f5d0)',
            borderRadius: 12, padding: 14,
            border: '1px solid #bbf7d0',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
              🔒 Connectez-vous pour faire une offre ou enchérir sur cette annonce
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => onLogin('login')}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 9,
                  background: 'white', color: '#2D5016',
                  border: '1.5px solid #2D5016', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Se connecter
              </button>
              <button
                onClick={() => onLogin('register')}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 9,
                  background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
                  color: 'white', border: 'none', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 6px rgba(45,80,22,0.25)',
                }}
              >
                S'inscrire
              </button>
            </div>
          </div>
        )}

        {/* Producteur → gérer les offres */}
        {isOwner && !isAgreed && (
          <button
            onClick={onBid}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              color: 'white', border: 'none', fontSize: 15, fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            📊 Voir et gérer les offres ({listing.offer_count})
          </button>
        )}

        {/* Contact débloqué */}
        {(isOwner || isWinner) && isAgreed && (
          <button
            onClick={onContact}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              background: '#f0fdf4', color: '#166534',
              border: '2px solid #86efac', fontSize: 15, fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🔓 Voir les coordonnées de contact
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 10,
            background: '#f9fafb', color: '#6b7280',
            border: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

function SidePanelChip({ icon, label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? 'linear-gradient(135deg, #f0f7e6, #e8f5d0)' : '#f9fafb',
      borderRadius: 10, padding: '10px 12px',
      border: highlight ? '1px solid #bbf7d0' : '1px solid #f3f4f6',
    }}>
      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: highlight ? '#2D5016' : '#1f2937' }}>
        {value}
      </div>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
    </div>
  );
}

// ── Utilitaires ───────────────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

const inputStyle = {
  padding: '5px 10px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: 13, outline: 'none',
};

// ── Composant de position fictive (dev uniquement) ────────────────────────────
// Permet de simuler n'importe quelle position sans bouger physiquement.
// Visible uniquement quand import.meta.env.DEV === true (npm run dev).

const DEV_POSITIONS = [
  { label: '📍 Ma vraie position (GPS)', coords: null },
  { label: '🇲🇦 Meknès centre',          coords: [33.8935, -5.5547] },
  { label: '🌾 Aïn Taoujdate (Hassan)',   coords: [33.9300, 5.2200] },
  { label: '🌿 Khemisset (Fatima)',       coords: [33.8200, 6.0700] },
  { label: '🥔 El Hajeb (Youssef)',       coords: [33.6800, 5.3700] },
  { label: '🛒 Collecteur Amine',         coords: [33.9100, 5.5100] },
  { label: '🚛 Collecteur Karim',         coords: [33.8700, 5.6200] },
];

function PositionOverride({ currentCoords, positionSource, onOverride }) {
  const [open, setOpen] = useState(false);

  const sourceLabel = {
    db:       '💾 base',
    gps:      '📡 GPS',
    manual:   '🎯 fictive',
    fallback: '⚠️ fallback',
    auto:     '…',
  }[positionSource] || '…';

  const handleSelect = async (pos) => {
    setOpen(false);
    if (pos.coords === null) {
      // Redemander le vrai GPS
      navigator.geolocation.getCurrentPosition(
        (p) => onOverride([p.coords.latitude, p.coords.longitude]),
        () => alert('GPS non disponible')
      );
    } else {
      onOverride(pos.coords);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Changer de position (dev uniquement)"
        style={{
          padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: '#fef3c7', color: '#92400e',
          border: '1px solid #fcd34d', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}
      >
        🛠️ Position : {sourceLabel}
        {currentCoords && (
          <span style={{ fontWeight: 400, color: '#a16207' }}>
            ({currentCoords[0].toFixed(2)}, {currentCoords[1].toFixed(2)})
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 9999,
          background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb', overflow: 'hidden', minWidth: 240,
        }}>
          <div style={{
            padding: '8px 12px', background: '#fffbeb',
            fontSize: 11, color: '#92400e', fontWeight: 700, borderBottom: '1px solid #fef3c7',
          }}>
            🛠️ SIMULATION DE POSITION — DEV ONLY
          </div>
          {DEV_POSITIONS.map((pos) => (
            <button
              key={pos.label}
              onClick={() => handleSelect(pos)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', fontSize: 13, background: 'white',
                border: 'none', borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer', color: '#374151',
              }}
              onMouseEnter={e => e.target.style.background = '#f9fafb'}
              onMouseLeave={e => e.target.style.background = 'white'}
            >
              {pos.label}
              {pos.coords && (
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>
                  {pos.coords[0].toFixed(2)}, {pos.coords[1].toFixed(2)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}