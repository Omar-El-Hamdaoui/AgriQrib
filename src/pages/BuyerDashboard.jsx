// pages/BuyerDashboard.jsx
import { useState } from 'react';
import { Icons } from '../components/ui/Icons';
import { Badge, Button, Card } from '../components/ui/primitives';

export const BuyerDashboard = ({ setCurrentView }) => {
  const [activeTab, setActiveTab] = useState('orders');

  const tabs = [
    { id: 'orders',    label: 'Mes commandes', icon: <Icons.Package /> },
    { id: 'offers',    label: 'Mes offres',    icon: <Icons.Handshake /> },
    { id: 'favorites', label: 'Favoris',       icon: <Icons.Heart filled={false} /> },
    { id: 'settings',  label: 'Paramètres',    icon: <Icons.Settings /> },
  ];

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
              Mon compte
            </h1>
            <p className="text-stone-600">Mohamed Benjelloun · Particulier</p>
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
                    Ferme Agroécologique La Finca · Retrait le 02/03/2026
                  </p>
                </div>
                <p className="text-2xl font-bold text-[#2D5016]">19.90DH</p>
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
                <p className="text-2xl font-bold text-sky-900">8.00DH/kg au lieu de 8.90DH</p>
                <p className="text-sm text-sky-600">Votre offre : 7.50DH/kg</p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="success">Accepter</Button>
                  <Button size="sm" variant="outline">Décliner</Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
