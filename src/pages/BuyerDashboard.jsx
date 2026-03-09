// pages/BuyerDashboard.jsx
import { useState } from 'react';
import { Icons }              from '../components/ui/Icons';
import { Badge, Button, Card } from '../components/ui/primitives';
import { useAuth }            from '../auth/AuthContext';

const ROLE_LABELS = {
  buyer_individual: 'Particulier',
  buyer_restaurant: 'Restaurant / Pro',
  buyer_transit:    "Centrale d'achat",
};

export const BuyerDashboard = ({ setCurrentView }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');

  const roleLabel   = ROLE_LABELS[user?.role] ?? 'Acheteur';
  const displayName = user ? `${user.firstName} ${user.lastName}` : '—';
  const initials    = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : '?';

  const tabs = [
    { id: 'orders',    label: 'Mes commandes', icon: <Icons.Package /> },
    { id: 'offers',    label: 'Mes offres',    icon: <Icons.Handshake /> },
    { id: 'favorites', label: 'Favoris',       icon: <Icons.Heart filled={false} /> },
    { id: 'settings',  label: 'Paramètres',    icon: <Icons.Settings /> },
  ];

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#2D5016] to-[#4a7c23] rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                {displayName}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-stone-500 text-sm">{user?.email}</span>
                <span className="text-stone-300">·</span>
                <span className="text-sm font-medium text-[#2D5016]">{roleLabel}</span>
                {user?.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <Icons.Check /> Vérifié
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all
                ${activeTab === tab.id
                  ? 'bg-[#2D5016] text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Orders ── */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Badge variant="success">Confirmée</Badge>
                  <h3 className="font-semibold text-stone-900 mt-2">Commande #12345</h3>
                  <p className="text-sm text-stone-500">
                    Ferme du Soleil Levant · Retrait le 02/03/2026
                  </p>
                </div>
                <p className="text-2xl font-bold text-[#2D5016]">19.90 DH</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Voir détails</Button>
                <Button variant="ghost"   size="sm">Renouveler</Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── Tab: Offers ── */}
        {activeTab === 'offers' && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="info">Contre-offre reçue</Badge>
              </div>
              <h3 className="font-semibold text-stone-900">Fraises Gariguette</h3>
              <p className="text-sm text-stone-500">Les Jardins de Marie</p>
              <div className="mt-4 p-4 bg-sky-50 rounded-xl border border-sky-200">
                <p className="text-sm text-sky-800 mb-2">Le producteur propose :</p>
                <p className="text-2xl font-bold text-sky-900">8.00 DH/kg au lieu de 8.90 DH</p>
                <p className="text-sm text-sky-600">Votre offre : 7.50 DH/kg</p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="success">Accepter</Button>
                  <Button size="sm" variant="outline">Décliner</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Tab: Settings ── */}
        {activeTab === 'settings' && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-stone-900">Informations du compte</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-stone-400 mb-0.5">Prénom</p><p className="font-medium">{user?.firstName}</p></div>
              <div><p className="text-stone-400 mb-0.5">Nom</p><p className="font-medium">{user?.lastName}</p></div>
              <div><p className="text-stone-400 mb-0.5">Email</p><p className="font-medium">{user?.email}</p></div>
              <div><p className="text-stone-400 mb-0.5">Téléphone</p><p className="font-medium">{user?.phone || '—'}</p></div>
              <div><p className="text-stone-400 mb-0.5">Rôle</p><p className="font-medium">{roleLabel}</p></div>
              <div>
                <p className="text-stone-400 mb-0.5">Email vérifié</p>
                <p className={`font-medium ${user?.isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {user?.isVerified ? 'Oui' : 'En attente de vérification'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">Modifier mes informations</Button>
          </Card>
        )}

        {/* ── Tab: Favorites ── */}
        {activeTab === 'favorites' && (
          <div className="text-center py-16 text-stone-400">
            <div className="text-5xl mb-4">❤️</div>
            <p className="font-medium text-stone-600">Aucun favori pour l'instant</p>
            <p className="text-sm mt-1">Explorez les fermes et ajoutez vos préférées</p>
            <Button className="mt-4" onClick={() => setCurrentView('farms')}>
              Découvrir les fermes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};