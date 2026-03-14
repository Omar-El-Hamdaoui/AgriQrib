// pages/ProducerDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase }            from '../auth/supabaseClient';
import { Icons }               from '../components/ui/Icons';
import { Badge, Button, Card } from '../components/ui/primitives';
import { useAuth }             from '../auth/AuthContext';

const COMMISSION_RATE = 0.02; // 2%

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export const ProducerDashboard = ({ setCurrentView }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const [transactions, setTransactions]   = useState([]);
  const [activeListings, setActiveListings] = useState([]);
  const [loading, setLoading]             = useState(true);

  const farm        = user?.farm;
  const displayName = user ? `${user.firstName} ${user.lastName}` : '—';
  const farmName    = farm?.farm_name ?? 'Ma ferme';
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

    // Transactions conclues (annonces agreed par ce producteur)
    const { data: txData } = await supabase
      .from('listings')
      .select(`
        id, product_name, quantity_kg,
        agreed_price_per_unit, agreed_at, status,
        users!listings_agreed_with_user_id_fkey(first_name, last_name, email, phone)
      `)
      .eq('producer_id', user.id)
      .eq('status', 'agreed')
      .order('agreed_at', { ascending: false });

    // Annonces actives / en négociation
    const { data: listData } = await supabase
      .from('listings')
      .select('id, product_name, quantity_kg, asking_price_per_unit, status, offer_count, current_best_offer, available_from')
      .eq('producer_id', user.id)
      .in('status', ['active', 'negotiating'])
      .order('created_at', { ascending: false });

    setTransactions(txData || []);
    setActiveListings(listData || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Stats calculées ────────────────────────────────────────────────────────
  const totalBrut = transactions.reduce(
    (s, t) => s + (t.agreed_price_per_unit || 0) * (t.quantity_kg || 0), 0
  );
  const totalCommission = totalBrut * COMMISSION_RATE;
  const totalNet        = totalBrut - totalCommission;

  // Ce mois
  const now = new Date();
  const txThisMonth = transactions.filter(t => {
    const d = new Date(t.agreed_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const brutThisMonth = txThisMonth.reduce(
    (s, t) => s + (t.agreed_price_per_unit || 0) * (t.quantity_kg || 0), 0
  );

  const tabs = [
    { id: 'overview',      label: 'Aperçu',          icon: '📊' },
    { id: 'transactions',  label: 'Transactions',     icon: '💰' },
    { id: 'listings',      label: 'Mes annonces',     icon: '🌾' },
    { id: 'settings',      label: 'Paramètres',       icon: '⚙️' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f9f7f4', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: 'white', fontWeight: 800,
              boxShadow: '0 4px 14px rgba(45,80,22,0.3)',
            }}>
              {initials}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1f2937', fontFamily: 'Georgia, serif' }}>
                {farmName}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{displayName}</span>
                <span style={{ color: '#d1d5db' }}>·</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2D5016' }}>Producteur</span>
                {farm?.city && (
                  <>
                    <span style={{ color: '#d1d5db' }}>·</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>📍 {farm.city}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('map')}
            style={{
              padding: '10px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
              color: 'white', border: 'none', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', boxShadow: '0 3px 10px rgba(45,80,22,0.3)',
            }}
          >
            🗺️ Gérer mes annonces
          </button>
        </div>

        {/* ── Stats cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard
            icon="💰" label="Revenus bruts (total)"
            value={`${fmt(totalBrut)} MAD`}
            sub={`${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} conclue${transactions.length !== 1 ? 's' : ''}`}
            color="#2D5016"
          />
          <StatCard
            icon="📅" label="Ce mois"
            value={`${fmt(brutThisMonth)} MAD`}
            sub={`${txThisMonth.length} transaction${txThisMonth.length !== 1 ? 's' : ''}`}
            color="#4a7c23"
          />
          <StatCard
            icon="🏦" label="Commission site (2%)"
            value={`- ${fmt(totalCommission)} MAD`}
            sub="Déduite automatiquement"
            color="#d97706"
            negative
          />
          <StatCard
            icon="✅" label="Net perçu (total)"
            value={`${fmt(totalNet)} MAD`}
            sub="Après commission"
            color="#166534"
            highlight
          />
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
                background: activeTab === tab.id ? '#2D5016' : 'white',
                color: activeTab === tab.id ? 'white' : '#6b7280',
                boxShadow: activeTab === tab.id ? '0 3px 10px rgba(45,80,22,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ══ Tab Aperçu ══ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Dernières transactions */}
            <DashCard title="Dernières transactions" icon="💰">
              {loading ? <Skeleton /> : transactions.length === 0 ? (
                <Empty icon="💰" text="Aucune transaction conclue pour l'instant" />
              ) : transactions.slice(0, 4).map(tx => {
                const montant = (tx.agreed_price_per_unit || 0) * (tx.quantity_kg || 0);
                const net     = montant * (1 - COMMISSION_RATE);
                return (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>{tx.product_name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {tx.users?.first_name} {tx.users?.last_name} · {fmtDate(tx.agreed_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#166534', fontSize: 14 }}>{fmt(net)} MAD</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>net</div>
                    </div>
                  </div>
                );
              })}
              {transactions.length > 4 && (
                <button onClick={() => setActiveTab('transactions')} style={linkBtnStyle}>
                  Voir tout ({transactions.length}) →
                </button>
              )}
            </DashCard>

            {/* Annonces actives */}
            <DashCard title="Annonces en cours" icon="🌾">
              {loading ? <Skeleton /> : activeListings.length === 0 ? (
                <Empty icon="🌾" text="Aucune annonce active. Créez-en une sur la carte !" />
              ) : activeListings.slice(0, 4).map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>{l.product_name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {l.quantity_kg} kg · {l.asking_price_per_unit} MAD/kg
                    </div>
                  </div>
                  <StatusPill status={l.status} offerCount={l.offer_count} />
                </div>
              ))}
              {activeListings.length > 4 && (
                <button onClick={() => setActiveTab('listings')} style={linkBtnStyle}>
                  Voir tout ({activeListings.length}) →
                </button>
              )}
            </DashCard>

            {/* Récap financier */}
            <DashCard title="Récapitulatif financier" icon="📊" style={{ gridColumn: '1 / -1' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Produit', 'Collecteur', 'Qté (kg)', 'Prix/kg', 'Brut', 'Commission 2%', 'Net', 'Date'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Chargement…</td></tr>
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Aucune transaction</td></tr>
                    ) : transactions.map(tx => {
                      const brut  = (tx.agreed_price_per_unit || 0) * (tx.quantity_kg || 0);
                      const comm  = brut * COMMISSION_RATE;
                      const net   = brut - comm;
                      return (
                        <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={tdStyle}><span style={{ fontWeight: 700 }}>{tx.product_name}</span></td>
                          <td style={tdStyle}>{tx.users?.first_name} {tx.users?.last_name}</td>
                          <td style={tdStyle}>{tx.quantity_kg}</td>
                          <td style={tdStyle}>{tx.agreed_price_per_unit} MAD</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(brut)} MAD</td>
                          <td style={{ ...tdStyle, color: '#d97706' }}>- {fmt(comm)} MAD</td>
                          <td style={{ ...tdStyle, fontWeight: 800, color: '#166534' }}>{fmt(net)} MAD</td>
                          <td style={{ ...tdStyle, color: '#9ca3af' }}>{fmtDate(tx.agreed_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {transactions.length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#f0f7e6', borderTop: '2px solid #bbf7d0' }}>
                        <td colSpan={4} style={{ ...tdStyle, fontWeight: 800, color: '#2D5016' }}>TOTAL</td>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{fmt(totalBrut)} MAD</td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: '#d97706' }}>- {fmt(totalCommission)} MAD</td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: '#166534', fontSize: 15 }}>{fmt(totalNet)} MAD</td>
                        <td style={tdStyle}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </DashCard>
          </div>
        )}

        {/* ══ Tab Transactions ══ */}
        {activeTab === 'transactions' && (
          <DashCard title={`Historique des transactions (${transactions.length})`} icon="💰">
            {loading ? <Skeleton /> : transactions.length === 0 ? (
              <Empty icon="🤝" text="Aucune transaction conclue pour l'instant" />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Produit', 'Collecteur', 'Contact', 'Qté (kg)', 'Prix/kg', 'Montant brut', 'Commission (2%)', 'Net reçu', 'Date accord'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, i) => {
                      const brut = (tx.agreed_price_per_unit || 0) * (tx.quantity_kg || 0);
                      const comm = brut * COMMISSION_RATE;
                      const net  = brut - comm;
                      return (
                        <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{tx.product_name}</td>
                          <td style={tdStyle}>{tx.users?.first_name} {tx.users?.last_name}</td>
                          <td style={tdStyle}>
                            <div style={{ fontSize: 11 }}>
                              <a href={`mailto:${tx.users?.email}`} style={{ color: '#2D5016', textDecoration: 'none' }}>{tx.users?.email}</a>
                              {tx.users?.phone && <div style={{ color: '#6b7280' }}>{tx.users.phone}</div>}
                            </div>
                          </td>
                          <td style={tdStyle}>{tx.quantity_kg} kg</td>
                          <td style={tdStyle}>{tx.agreed_price_per_unit} MAD</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(brut)} MAD</td>
                          <td style={{ ...tdStyle, color: '#d97706' }}>- {fmt(comm)} MAD</td>
                          <td style={{ ...tdStyle, fontWeight: 800, color: '#166534', fontSize: 14 }}>{fmt(net)} MAD</td>
                          <td style={{ ...tdStyle, color: '#9ca3af' }}>{fmtDate(tx.agreed_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0f7e6', borderTop: '2px solid #bbf7d0' }}>
                      <td colSpan={5} style={{ ...tdStyle, fontWeight: 800, color: '#2D5016' }}>TOTAL ({transactions.length} transactions)</td>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{fmt(totalBrut)} MAD</td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: '#d97706' }}>- {fmt(totalCommission)} MAD</td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: '#166534', fontSize: 15 }}>{fmt(totalNet)} MAD</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </DashCard>
        )}

        {/* ══ Tab Annonces ══ */}
        {activeTab === 'listings' && (
          <DashCard title={`Annonces actives (${activeListings.length})`} icon="🌾">
            {loading ? <Skeleton /> : activeListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌾</div>
                <div style={{ fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>Aucune annonce active</div>
                <button
                  onClick={() => setCurrentView('map')}
                  style={{ padding: '10px 20px', borderRadius: 10, background: '#2D5016', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Créer une annonce sur la carte
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeListings.map(l => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: '#f9fafb', borderRadius: 12, border: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>{l.product_name}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        {l.quantity_kg} kg · {l.asking_price_per_unit} MAD/kg · Dispo le {fmtDate(l.available_from)}
                      </div>
                      {l.offer_count > 0 && (
                        <div style={{ fontSize: 12, color: '#d97706', marginTop: 4 }}>
                          🔥 {l.offer_count} offre{l.offer_count > 1 ? 's' : ''} · Meilleure : {l.current_best_offer} MAD/kg
                        </div>
                      )}
                    </div>
                    <StatusPill status={l.status} offerCount={l.offer_count} />
                  </div>
                ))}
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
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>{val}</div>
                </div>
              ))}
            </div>
            {farm && (
              <>
                <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 20, paddingTop: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#1f2937', marginBottom: 16 }}>Ma ferme</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
                    {[
                      ['Nom de la ferme', farm.farm_name],
                      ['Ville',           farm.city],
                      ['Adresse',         farm.address],
                      ['Rayon livraison', `${farm.delivery_radius_km} km`],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontWeight: 600, color: '#1f2937' }}>{val || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
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

function StatusPill({ status, offerCount }) {
  const cfg = {
    active:      { bg: '#f0f7e6', color: '#2D5016', label: 'Active' },
    negotiating: { bg: '#fef3c7', color: '#92400e', label: `Négociation · ${offerCount} offre${offerCount !== 1 ? 's' : ''}` },
    agreed:      { bg: '#f0fdf4', color: '#166534', label: 'Accordé' },
  };
  const s = cfg[status] || cfg.active;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
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
        <div key={i} style={{ height: 48, background: '#f3f4f6', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  );
}

const tdStyle = { padding: '10px 12px', color: '#374151', verticalAlign: 'middle' };
const linkBtnStyle = {
  marginTop: 12, fontSize: 12, fontWeight: 700, color: '#2D5016',
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
};