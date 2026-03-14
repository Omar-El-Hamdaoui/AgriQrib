// pages/BuyerDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase }  from '../auth/supabaseClient';
import { useAuth }   from '../auth/AuthContext';

const COMMISSION_RATE = 0.04; // 4%

const ROLE_LABELS = {
  buyer_individual: 'Particulier',
  buyer_restaurant: 'Restaurant / Pro',
  buyer_transit:    "Centrale d'achat",
};

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export const BuyerDashboard = ({ setCurrentView }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab]       = useState('overview');
  const [purchases, setPurchases]       = useState([]);
  const [activeBids, setActiveBids]     = useState([]);
  const [loading, setLoading]           = useState(true);

  const roleLabel   = ROLE_LABELS[user?.role] ?? 'Acheteur';
  const displayName = user ? `${user.firstName} ${user.lastName}` : '—';
  const initials    = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : '?';

  // Écouter le custom event du Header pour ouvrir directement l'onglet Paramètres
  useEffect(() => {
    const handler = (e) => setActiveTab(e.detail);
    window.addEventListener('dashboard-tab', handler);
    return () => window.removeEventListener('dashboard-tab', handler);
  }, []);

  // ── Charger les données réelles ────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    // Achats conclus (annonces agreed avec ce collecteur)
    const { data: purchData } = await supabase
      .from('listings')
      .select(`
        id, product_name, quantity_kg,
        agreed_price_per_unit, agreed_at,
        users!listings_producer_id_fkey(first_name, last_name, email, phone),
        farms(farm_name, city)
      `)
      .eq('agreed_with_user_id', user.id)
      .eq('status', 'agreed')
      .order('agreed_at', { ascending: false });

    // Offres en cours (bids actifs non acceptés)
    const { data: bidsData } = await supabase
      .from('bids')
      .select(`
        id, price_per_unit, quantity_wanted_kg, created_at, is_accepted, is_winning,
        listings(id, product_name, quantity_kg, asking_price_per_unit, status, offer_count, current_best_offer,
          farms(farm_name, city)
        )
      `)
      .eq('bidder_id', user.id)
      .eq('is_accepted', false)
      .order('created_at', { ascending: false });

    setPurchases(purchData || []);
    setActiveBids(bidsData || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Stats calculées ────────────────────────────────────────────────────────
  const totalAchats    = purchases.reduce((s, p) => s + (p.agreed_price_per_unit || 0) * (p.quantity_kg || 0), 0);
  const totalCommission = totalAchats * COMMISSION_RATE;
  const totalTTC       = totalAchats + totalCommission;

  const now = new Date();
  const purchThisMonth = purchases.filter(p => {
    const d = new Date(p.agreed_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const achatsThisMonth = purchThisMonth.reduce(
    (s, p) => s + (p.agreed_price_per_unit || 0) * (p.quantity_kg || 0), 0
  );

  const tabs = [
    { id: 'overview',   label: 'Aperçu',        icon: '📊' },
    { id: 'purchases',  label: 'Mes achats',     icon: '🛒' },
    { id: 'bids',       label: 'Offres en cours', icon: '💬' },
    { id: 'settings',   label: 'Paramètres',     icon: '⚙️' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f9f7f4', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: 'white', fontWeight: 800,
              boxShadow: '0 4px 14px rgba(30,64,175,0.3)',
            }}>
              {initials}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1f2937', fontFamily: 'Georgia, serif' }}>
                {displayName}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{user?.email}</span>
                <span style={{ color: '#d1d5db' }}>·</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>{roleLabel}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('map')}
            style={{
              padding: '10px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              color: 'white', border: 'none', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', boxShadow: '0 3px 10px rgba(30,64,175,0.3)',
            }}
          >
            🗺️ Chercher sur la carte
          </button>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard icon="🛒" label="Total achats (HT)" value={`${fmt(totalAchats)} MAD`}
            sub={`${purchases.length} achat${purchases.length !== 1 ? 's' : ''} conclu${purchases.length !== 1 ? 's' : ''}`} color="#1e40af" />
          <StatCard icon="📅" label="Ce mois (HT)" value={`${fmt(achatsThisMonth)} MAD`}
            sub={`${purchThisMonth.length} achat${purchThisMonth.length !== 1 ? 's' : ''}`} color="#3b82f6" />
          <StatCard icon="🏦" label="Commission site (4%)" value={`+ ${fmt(totalCommission)} MAD`}
            sub="Frais de service" color="#d97706" negative />
          <StatCard icon="💳" label="Total TTC" value={`${fmt(totalTTC)} MAD`}
            sub="Commission incluse" color="#1e40af" highlight />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: activeTab === tab.id ? '#1e40af' : 'white',
                color: activeTab === tab.id ? 'white' : '#6b7280',
                boxShadow: activeTab === tab.id ? '0 3px 10px rgba(30,64,175,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ══ Tab Aperçu ══ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Derniers achats */}
            <DashCard title="Derniers achats" icon="🛒">
              {loading ? <Skeleton /> : purchases.length === 0 ? (
                <Empty icon="🛒" text="Aucun achat conclu pour l'instant" />
              ) : purchases.slice(0, 4).map(p => {
                const montant = (p.agreed_price_per_unit || 0) * (p.quantity_kg || 0);
                const ttc     = montant * (1 + COMMISSION_RATE);
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>{p.product_name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {p.farms?.farm_name} · {fmtDate(p.agreed_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#1e40af', fontSize: 14 }}>{fmt(ttc)} MAD</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>TTC</div>
                    </div>
                  </div>
                );
              })}
              {purchases.length > 4 && (
                <button onClick={() => setActiveTab('purchases')} style={linkBtnStyle}>
                  Voir tout ({purchases.length}) →
                </button>
              )}
            </DashCard>

            {/* Offres en cours */}
            <DashCard title="Offres en cours" icon="💬">
              {loading ? <Skeleton /> : activeBids.length === 0 ? (
                <Empty icon="💬" text="Aucune offre en cours" />
              ) : activeBids.slice(0, 4).map(b => {
                const listing = b.listings;
                const isBest  = listing?.current_best_offer === b.price_per_unit;
                return (
                  <div key={b.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>{listing?.product_name}</div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px',
                        background: isBest ? '#fef3c7' : '#f0f9ff',
                        color: isBest ? '#92400e' : '#1e40af',
                      }}>
                        {isBest ? '🥇 Meilleure offre' : 'En compétition'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {listing?.farms?.farm_name} · Mon offre : <strong>{b.price_per_unit} MAD/kg</strong>
                    </div>
                  </div>
                );
              })}
              {activeBids.length > 4 && (
                <button onClick={() => setActiveTab('bids')} style={linkBtnStyle}>
                  Voir tout ({activeBids.length}) →
                </button>
              )}
            </DashCard>

            {/* Tableau récap */}
            <DashCard title="Récapitulatif financier" icon="📊" style={{ gridColumn: '1 / -1' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Produit', 'Ferme', 'Qté (kg)', 'Prix/kg', 'Montant HT', 'Commission (4%)', 'Total TTC', 'Date'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Chargement…</td></tr>
                    ) : purchases.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Aucun achat</td></tr>
                    ) : purchases.map(p => {
                      const ht   = (p.agreed_price_per_unit || 0) * (p.quantity_kg || 0);
                      const comm = ht * COMMISSION_RATE;
                      const ttc  = ht + comm;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{p.product_name}</td>
                          <td style={tdStyle}>{p.farms?.farm_name}<br/><span style={{ fontSize: 11, color: '#9ca3af' }}>{p.farms?.city}</span></td>
                          <td style={tdStyle}>{p.quantity_kg} kg</td>
                          <td style={tdStyle}>{p.agreed_price_per_unit} MAD</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(ht)} MAD</td>
                          <td style={{ ...tdStyle, color: '#d97706' }}>+ {fmt(comm)} MAD</td>
                          <td style={{ ...tdStyle, fontWeight: 800, color: '#1e40af', fontSize: 14 }}>{fmt(ttc)} MAD</td>
                          <td style={{ ...tdStyle, color: '#9ca3af' }}>{fmtDate(p.agreed_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {purchases.length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#eff6ff', borderTop: '2px solid #bfdbfe' }}>
                        <td colSpan={4} style={{ ...tdStyle, fontWeight: 800, color: '#1e40af' }}>TOTAL ({purchases.length} achats)</td>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{fmt(totalAchats)} MAD</td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: '#d97706' }}>+ {fmt(totalCommission)} MAD</td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: '#1e40af', fontSize: 15 }}>{fmt(totalTTC)} MAD</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </DashCard>
          </div>
        )}

        {/* ══ Tab Achats ══ */}
        {activeTab === 'purchases' && (
          <DashCard title={`Historique des achats (${purchases.length})`} icon="🛒">
            {loading ? <Skeleton /> : purchases.length === 0 ? (
              <Empty icon="🛒" text="Aucun achat conclu pour l'instant" />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Produit', 'Producteur', 'Contact', 'Ferme', 'Qté (kg)', 'Prix/kg', 'Montant HT', 'Commission (4%)', 'Total TTC', 'Date accord'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p, i) => {
                      const ht   = (p.agreed_price_per_unit || 0) * (p.quantity_kg || 0);
                      const comm = ht * COMMISSION_RATE;
                      const ttc  = ht + comm;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{p.product_name}</td>
                          <td style={tdStyle}>{p.users?.first_name} {p.users?.last_name}</td>
                          <td style={tdStyle}>
                            <div style={{ fontSize: 11 }}>
                              <a href={`mailto:${p.users?.email}`} style={{ color: '#1e40af', textDecoration: 'none' }}>{p.users?.email}</a>
                              {p.users?.phone && <div style={{ color: '#6b7280' }}>{p.users.phone}</div>}
                            </div>
                          </td>
                          <td style={tdStyle}>{p.farms?.farm_name}<br/><span style={{ fontSize: 11, color: '#9ca3af' }}>{p.farms?.city}</span></td>
                          <td style={tdStyle}>{p.quantity_kg} kg</td>
                          <td style={tdStyle}>{p.agreed_price_per_unit} MAD</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(ht)} MAD</td>
                          <td style={{ ...tdStyle, color: '#d97706' }}>+ {fmt(comm)} MAD</td>
                          <td style={{ ...tdStyle, fontWeight: 800, color: '#1e40af', fontSize: 14 }}>{fmt(ttc)} MAD</td>
                          <td style={{ ...tdStyle, color: '#9ca3af' }}>{fmtDate(p.agreed_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#eff6ff', borderTop: '2px solid #bfdbfe' }}>
                      <td colSpan={6} style={{ ...tdStyle, fontWeight: 800, color: '#1e40af' }}>TOTAL</td>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{fmt(totalAchats)} MAD</td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: '#d97706' }}>+ {fmt(totalCommission)} MAD</td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: '#1e40af', fontSize: 15 }}>{fmt(totalTTC)} MAD</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </DashCard>
        )}

        {/* ══ Tab Offres en cours ══ */}
        {activeTab === 'bids' && (
          <DashCard title={`Offres en cours (${activeBids.length})`} icon="💬">
            {loading ? <Skeleton /> : activeBids.length === 0 ? (
              <Empty icon="💬" text="Aucune offre en cours. Allez sur la carte pour enchérir !" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeBids.map(b => {
                  const listing = b.listings;
                  const isBest  = listing?.current_best_offer === b.price_per_unit;
                  const diff    = listing?.asking_price_per_unit
                    ? (((b.price_per_unit - listing.asking_price_per_unit) / listing.asking_price_per_unit) * 100).toFixed(1)
                    : null;
                  return (
                    <div key={b.id} style={{ padding: 16, background: '#f9fafb', borderRadius: 12, border: `1px solid ${isBest ? '#fcd34d' : '#f3f4f6'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>
                            {listing?.product_name}
                          </div>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>
                            {listing?.farms?.farm_name} · {listing?.farms?.city}
                          </div>
                          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13 }}>
                            <div>
                              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Mon offre</div>
                              <div style={{ fontWeight: 800, color: '#1e40af' }}>{b.price_per_unit} MAD/kg</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Prix demandé</div>
                              <div style={{ fontWeight: 700 }}>{listing?.asking_price_per_unit} MAD/kg</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Meilleure offre</div>
                              <div style={{ fontWeight: 700, color: isBest ? '#d97706' : '#374151' }}>
                                {listing?.current_best_offer} MAD/kg
                              </div>
                            </div>
                            {listing?.quantity_wanted_kg && (
                              <div>
                                <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Qté souhaitée</div>
                                <div style={{ fontWeight: 700 }}>{b.quantity_wanted_kg} kg</div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span style={{
                            fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '3px 10px',
                            background: isBest ? '#fef3c7' : '#eff6ff',
                            color: isBest ? '#92400e' : '#1e40af',
                          }}>
                            {isBest ? '🥇 Meilleure offre' : '⚔️ En compétition'}
                          </span>
                          {diff !== null && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px',
                              background: parseFloat(diff) >= 0 ? '#f0fdf4' : '#fef2f2',
                              color: parseFloat(diff) >= 0 ? '#16a34a' : '#dc2626',
                            }}>
                              {parseFloat(diff) >= 0 ? '+' : ''}{diff}% vs prix demandé
                            </span>
                          )}
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmtDate(b.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>
        )}

        {/* ══ Tab Paramètres ══ */}
        {activeTab === 'settings' && (
          <DashCard title="Informations du compte" icon="⚙️">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
              {[
                ['Prénom',    user?.firstName],
                ['Nom',       user?.lastName],
                ['Email',     user?.email],
                ['Téléphone', user?.phone || '—'],
                ['Rôle',      roleLabel],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>{val}</div>
                </div>
              ))}
            </div>
          </DashCard>
        )}

      </div>
    </div>
  );
};

// ── Sous-composants ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, highlight, negative }) {
  return (
    <div style={{
      background: highlight ? `linear-gradient(135deg, ${color}15, ${color}08)` : 'white',
      border: `1px solid ${highlight ? color + '30' : '#e5e7eb'}`,
      borderRadius: 16, padding: 20,
      boxShadow: highlight ? `0 4px 14px ${color}18` : '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: negative ? '#d97706' : color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function DashCard({ title, icon, children, style }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', ...style }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#1f2937', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 48, background: '#f3f4f6', borderRadius: 8 }} />
      ))}
    </div>
  );
}

const tdStyle    = { padding: '10px 12px', color: '#374151', verticalAlign: 'middle' };
const linkBtnStyle = { marginTop: 12, fontSize: 12, fontWeight: 700, color: '#1e40af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 };