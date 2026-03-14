// pages/NotificationsPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Page notifications + carnet de contacts débloqués
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../auth/supabaseClient';
import { useAuth } from '../auth/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

const NOTIF_STYLES = {
  new_bid:          { bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6', icon: '💬' },
  bid_updated:      { bg: '#fefce8', border: '#fef08a', dot: '#eab308', icon: '✏️' },
  bid_accepted:     { bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', icon: '🎉' },
  bid_rejected:     { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', icon: '❌' },
  deal_agreed:      { bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', icon: '✅' },
  contact_unlocked: { bg: '#faf5ff', border: '#e9d5ff', dot: '#a855f7', icon: '🔓' },
};

// ── Composant principal ───────────────────────────────────────────────────────
export function NotificationsPage({ setCurrentView }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('notifications'); // 'notifications' | 'contacts'

  const [notifications, setNotifications] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  // ── Charger les notifications ─────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setNotifsLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const list = data || [];
    setNotifications(list);
    setUnreadCount(list.filter(n => !n.is_read).length);
    setNotifsLoading(false);
  }, [user.id]);

  // ── Charger les contacts débloqués ────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);

    const [{ data: asProducer }, { data: asCollector }] = await Promise.all([
      supabase
        .from('unlocked_contacts')
        .select('*, listing:listing_id(product_name, agreed_price_per_unit, quantity_kg, agreed_at)')
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('unlocked_contacts')
        .select('*, listing:listing_id(product_name, agreed_price_per_unit, quantity_kg, agreed_at)')
        .eq('collector_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    const combined = [
      ...(asProducer  || []).map(uc => ({ ...uc, isProducer: true  })),
      ...(asCollector || []).map(uc => ({ ...uc, isProducer: false })),
    ];

    if (combined.length === 0) { setContacts([]); setContactsLoading(false); return; }

    const enriched = await Promise.all(combined.map(async (uc) => {
      const otherId = uc.isProducer ? uc.collector_id : uc.producer_id;
      const { data: other } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, role')
        .eq('id', otherId)
        .single();
      return { ...uc, other };
    }));

    setContacts(enriched);
    setContactsLoading(false);
  }, [user.id]);

  useEffect(() => { fetchNotifications(); fetchContacts(); }, [fetchNotifications, fetchContacts]);

  // ── Realtime : nouvelles notifications ───────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchNotifications())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user.id, fetchNotifications]);

  // ── Marquer toutes comme lues ─────────────────────────────────────────────
  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    fetchNotifications();
  };

  // ── Marquer une notif comme lue ───────────────────────────────────────────
  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // ── Supprimer une notification ────────────────────────────────────────────
  const deleteNotif = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: '#f9f7f4',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* ── Header page ── */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1f2937' }}>
                🔔 Notifications & Contacts
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                Suivez vos échanges et retrouvez vos partenaires commerciaux
              </p>
            </div>
            <button
              onClick={() => setCurrentView('map')}
              style={{
                padding: '8px 16px', borderRadius: 10,
                background: '#f0f7e6', color: '#2D5016',
                border: '1px solid #bbf7d0', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ← Retour à la carte
            </button>
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: 4, marginTop: 20 }}>
            {[
              { key: 'notifications', label: '🔔 Notifications', badge: unreadCount },
              { key: 'contacts',      label: '📋 Contacts débloqués', badge: contacts.length },
            ].map(({ key, label, badge }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  background: tab === key ? '#2D5016' : '#f3f4f6',
                  color: tab === key ? 'white' : '#6b7280',
                  transition: 'all 0.15s',
                }}
              >
                {label}
                {badge > 0 && (
                  <span style={{
                    background: tab === key ? 'rgba(255,255,255,0.25)' : '#2D5016',
                    color: tab === key ? 'white' : 'white',
                    borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 800,
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px' }}>

        {/* ══ Onglet Notifications ══ */}
        {tab === 'notifications' && (
          <div>
            {/* Barre d'actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                {unreadCount > 0
                  ? <><strong style={{ color: '#1f2937' }}>{unreadCount}</strong> non lue{unreadCount > 1 ? 's' : ''}</>
                  : 'Tout est à jour ✓'
                }
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: '#f0f7e6', color: '#2D5016',
                    border: '1px solid #bbf7d0', cursor: 'pointer',
                  }}
                >
                  ✓ Tout marquer comme lu
                </button>
              )}
            </div>

            {notifsLoading ? (
              <NotifSkeleton />
            ) : notifications.length === 0 ? (
              <EmptyState
                icon="🔔"
                title="Aucune notification"
                body="Vous recevrez une notification dès qu'un collecteur fait une offre sur une de vos annonces, ou dès qu'un producteur répond à la vôtre."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notifications.map(notif => (
                  <NotifCard
                    key={notif.id}
                    notif={notif}
                    onRead={() => markRead(notif.id)}
                    onDelete={() => deleteNotif(notif.id)}
                    onGoToMap={() => setCurrentView('map')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ Onglet Contacts ══ */}
        {tab === 'contacts' && (
          <div>
            <div style={{ marginBottom: 16, fontSize: 13, color: '#6b7280' }}>
              {contacts.length > 0
                ? <><strong style={{ color: '#1f2937' }}>{contacts.length}</strong> accord{contacts.length > 1 ? 's' : ''} conclu{contacts.length > 1 ? 's' : ''}</>
                : 'Aucun accord conclu pour l\'instant'
              }
            </div>

            {contactsLoading ? (
              <NotifSkeleton />
            ) : contacts.length === 0 ? (
              <EmptyState
                icon="📋"
                title="Aucun contact débloqué"
                body="Les coordonnées de vos partenaires apparaîtront ici dès qu'un accord commercial sera conclu sur la carte."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {contacts.map(uc => (
                  <ContactCard key={uc.id} uc={uc} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Carte notification ────────────────────────────────────────────────────────
function NotifCard({ notif, onRead, onDelete, onGoToMap }) {
  const style = NOTIF_STYLES[notif.type] || NOTIF_STYLES.new_bid;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { if (!notif.is_read) onRead(); }}
      style={{
        background: notif.is_read ? 'white' : style.bg,
        border: `1px solid ${notif.is_read ? '#e5e7eb' : style.border}`,
        borderRadius: 14, padding: '14px 16px',
        cursor: notif.is_read ? 'default' : 'pointer',
        transition: 'all 0.15s',
        boxShadow: hovered ? '0 2px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative',
      }}
    >
      {/* Indicateur non-lu */}
      {!notif.is_read && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          width: 9, height: 9, borderRadius: '50%',
          background: style.dot,
          boxShadow: `0 0 0 3px ${style.border}`,
        }} />
      )}

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Icône */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: style.border,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {style.icon}
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{
              fontWeight: notif.is_read ? 600 : 800,
              fontSize: 14, color: '#1f2937',
            }}>
              {notif.title}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {timeAgo(notif.created_at)}
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4, lineHeight: 1.5 }}>
            {notif.body}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {notif.listing_id && (
              <button
                onClick={(e) => { e.stopPropagation(); onGoToMap(); }}
                style={{
                  padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: '#2D5016', color: 'white', border: 'none', cursor: 'pointer',
                }}
              >
                Voir sur la carte →
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: '#f9fafb', color: '#9ca3af',
                border: '1px solid #e5e7eb', cursor: 'pointer',
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Carte contact débloqué ────────────────────────────────────────────────────
function ContactCard({ uc }) {
  const [copied, setCopied] = useState(null);
  const { other, isProducer, listing } = uc;

  if (!other) return null;

  const roleLabel = isProducer ? 'Collecteur' : 'Producteur';
  const roleIcon  = isProducer ? '🚚' : '🌾';

  const copy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* En-tête accord */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        borderBottom: '1px solid #bbf7d0',
        padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
            ✅ Accord conclu
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1f2937', marginTop: 2 }}>
            {listing?.product_name}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Prix accepté</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#166534' }}>
            {listing?.agreed_price_per_unit} MAD/kg
          </div>
          {listing?.quantity_kg && (
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {listing.quantity_kg} kg · {(listing.agreed_price_per_unit * listing.quantity_kg).toFixed(0)} MAD total
            </div>
          )}
        </div>
      </div>

      {/* Profil de l'autre partie */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, #2D5016, #4a7c23)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: 'white', fontWeight: 800,
          }}>
            {other.first_name?.[0]}{other.last_name?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1f2937' }}>
              {other.first_name} {other.last_name}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {roleIcon} {roleLabel}
            </div>
          </div>
          {listing?.agreed_at && (
            <div style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
              Accord le<br />
              {new Date(listing.agreed_at).toLocaleDateString('fr-MA', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </div>
          )}
        </div>

        {/* Coordonnées */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {other.phone && (
            <ContactRow
              icon="📞"
              label="Téléphone"
              value={other.phone}
              href={`tel:${other.phone}`}
              onCopy={() => copy(other.phone, 'phone')}
              copied={copied === 'phone'}
            />
          )}
          <ContactRow
            icon="📧"
            label="Email"
            value={other.email}
            href={`mailto:${other.email}`}
            onCopy={() => copy(other.email, 'email')}
            copied={copied === 'email'}
          />
        </div>
      </div>
    </div>
  );
}

// ── Ligne de contact ──────────────────────────────────────────────────────────
function ContactRow({ icon, label, value, href, onCopy, copied }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#f9fafb', borderRadius: 10, padding: '10px 14px',
      border: '1px solid #f3f4f6',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{value}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onCopy}
          style={{
            padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: copied ? '#f0fdf4' : '#f3f4f6',
            color: copied ? '#166534' : '#6b7280',
            border: `1px solid ${copied ? '#bbf7d0' : '#e5e7eb'}`,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Copié' : 'Copier'}
        </button>
        <a
          href={href}
          style={{
            padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: '#2D5016', color: 'white', textDecoration: 'none',
          }}
        >
          Contacter
        </a>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon, title, body }) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 24px',
      background: 'white', borderRadius: 16,
      border: '1px dashed #e5e7eb',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#1f2937', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function NotifSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          background: 'white', borderRadius: 14, padding: '14px 16px',
          border: '1px solid #f3f4f6', display: 'flex', gap: 14,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f3f4f6' }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: '40%', height: 14, background: '#f3f4f6', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ width: '80%', height: 12, background: '#f9fafb', borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}