// pages/ProducerDashboard.jsx
import { useState } from 'react';
import { mockOffers, mockOrders, mockProducts } from '../data/mockData';
import { Icons }               from '../components/ui/Icons';
import { Badge, Button, Card } from '../components/ui/primitives';
import { useAuth }             from '../auth/AuthContext';

export const ProducerDashboard = ({ setCurrentView }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const farm        = user?.farm;
  const displayName = user ? `${user.firstName} ${user.lastName}` : '—';
  const farmName    = farm?.farm_name ?? 'Ma ferme';
  const initials    = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : '?';

  const stats = [
    { label: 'Ventes du mois',     value: '2 450 DH', change: '+12%',        positive: true },
    { label: 'Commandes en cours', value: '8',       change: '+3',          positive: true },
    { label: 'Offres en attente',  value: '3',       change: '2 nouvelles', positive: false },
    { label: 'Note moyenne',       value: '4.8',     change: '',            positive: true },
  ];

  const tabs = [
    { id: 'overview',  label: 'Aperçu',       icon: <Icons.BarChart /> },
    { id: 'products',  label: 'Mes produits', icon: <Icons.Package /> },
    { id: 'orders',    label: 'Commandes',    icon: <Icons.Truck /> },
    { id: 'offers',    label: 'Offres',       icon: <Icons.Handshake /> },
    { id: 'settings',  label: 'Paramètres',   icon: <Icons.Settings /> },
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
                {farmName}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-stone-500 text-sm">{displayName}</span>
                <span className="text-stone-300">·</span>
                <span className="text-sm font-medium text-[#2D5016]">Producteur</span>
                {user?.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <Icons.Check /> Vérifié
                  </span>
                )}
              </div>
              {farm && (
                <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                  <Icons.Location /> {farm.city} · {farm.delivery_radius_km}km de rayon
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button>
              <Icons.Plus /> Ajouter un produit
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <Card key={idx} className="p-6">
              <p className="text-sm text-stone-500 mb-1">{stat.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-stone-900">{stat.value}</p>
                {stat.change && (
                  <span className={`text-sm font-medium ${stat.positive ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {stat.change}
                  </span>
                )}
              </div>
            </Card>
          ))}
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

        {/* ── Tab: Overview ── */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-stone-900 mb-4">Dernières commandes</h3>
              <div className="space-y-3">
                {mockOrders.slice(0, 3).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                    <div>
                      <p className="font-medium text-stone-900">{order.buyerName}</p>
                      <p className="text-sm text-stone-500">{order.items.length} article(s)</p>
                    </div>
                    <p className="font-bold text-[#2D5016]">{order.totalAmount.toFixed(2)} DH</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold text-stone-900 mb-4">Offres en attente</h3>
              <div className="space-y-3">
                {mockOffers.filter(o => o.status === 'pending').map(offer => (
                  <div key={offer.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div>
                      <p className="font-medium text-stone-900">{offer.productName}</p>
                      <p className="text-sm text-stone-500">{offer.buyerName} · {offer.proposedQuantity}kg</p>
                    </div>
                    <Button size="sm" variant="outline">Voir</Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── Tab: Offers ── */}
        {activeTab === 'offers' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Offres de négociation</h2>
            {mockOffers.map(offer => (
              <Card key={offer.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={offer.buyerType === 'restaurant' ? 'info' : 'default'}>
                        {offer.buyerType === 'restaurant' ? '🍽️ Restaurant' : '👤 Particulier'}
                      </Badge>
                      <Badge variant={offer.status === 'pending' ? 'warning' : offer.status === 'counter_offer' ? 'info' : 'success'}>
                        {offer.status === 'pending' ? 'En attente' : offer.status === 'counter_offer' ? 'Contre-offre envoyée' : 'Acceptée'}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-stone-900">{offer.productName}</h3>
                    <p className="text-stone-600">{offer.buyerName}</p>
                    <div className="mt-3 p-3 bg-stone-50 rounded-lg grid grid-cols-3 gap-4 text-sm">
                      <div><p className="text-stone-500">Quantité</p><p className="font-semibold">{offer.proposedQuantity} kg</p></div>
                      <div><p className="text-stone-500">Prix proposé</p><p className="font-semibold text-[#2D5016]">{offer.proposedPricePerUnit.toFixed(2)}DH/kg</p></div>
                      <div><p className="text-stone-500">Total</p><p className="font-semibold">{offer.totalProposed.toFixed(2)}DH</p></div>
                    </div>
                    {offer.message && <p className="mt-3 text-sm text-stone-600 italic">"{offer.message}"</p>}
                  </div>
                  {offer.status === 'pending' && (
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      <Button variant="success"><Icons.Check /> Accepter</Button>
                      <Button variant="outline"><Icons.MessageCircle /> Contre-proposer</Button>
                      <Button variant="ghost" className="text-red-600">Refuser</Button>
                    </div>
                  )}
                  {offer.status === 'counter_offer' && (
                    <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                      <p className="text-sm font-medium text-sky-800 mb-1">Votre contre-offre :</p>
                      <p className="text-2xl font-bold text-sky-900">{offer.counterPrice.toFixed(2)}DH/kg</p>
                      <p className="text-sm text-sky-600">En attente de réponse</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Tab: Orders ── */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Commandes récentes</h2>
            {mockOrders.map(order => (
              <Card key={order.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-stone-900">{order.buyerName}</h3>
                    <p className="text-sm text-stone-500">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')} · {order.deliveryMethod === 'pickup' ? 'Retrait' : 'Livraison'}
                    </p>
                  </div>
                  <Badge variant={order.status === 'confirmed' ? 'success' : order.status === 'preparing' ? 'warning' : 'default'}>
                    {order.status === 'confirmed' ? 'Confirmée' : order.status === 'preparing' ? 'En préparation' : order.status}
                  </Badge>
                </div>
                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity} {item.unit} × {item.name}</span>
                      <span className="font-medium">{(item.quantity * item.price).toFixed(2)}DH</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                  <p className="font-bold text-stone-900">Total : {order.totalAmount.toFixed(2)}DH</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Détails</Button>
                    {order.status === 'confirmed' && <Button size="sm">Préparer</Button>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Tab: Products ── */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Mes produits</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockProducts.filter(p => p.farmId === 'farm-1').map(product => (
                <Card key={product.id} className="p-4">
                  <div className="flex gap-4">
                    <img src={product.photoUrl} alt={product.name} className="w-24 h-24 rounded-lg object-cover" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-900">{product.name}</h3>
                      <p className="text-lg font-bold text-[#2D5016]">{product.pricePerUnit.toFixed(2)}DH/{product.unit}</p>
                      <p className="text-sm text-stone-500">{product.quantityAvailable} {product.unit} en stock</p>
                      <div className="flex gap-2 mt-2">
                        <Button variant="ghost" size="sm">Modifier</Button>
                        <Button variant="ghost" size="sm" className="text-red-600">Supprimer</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
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
            </div>
            {farm && (
              <>
                <h2 className="text-lg font-semibold text-stone-900 pt-2 border-t border-stone-100">Ma ferme</h2>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div><p className="text-stone-400 mb-0.5">Nom</p><p className="font-medium">{farm.farm_name}</p></div>
                  <div><p className="text-stone-400 mb-0.5">Ville</p><p className="font-medium">{farm.city}</p></div>
                  <div><p className="text-stone-400 mb-0.5">Adresse</p><p className="font-medium">{farm.address}</p></div>
                  <div><p className="text-stone-400 mb-0.5">Rayon livraison</p><p className="font-medium">{farm.delivery_radius_km} km</p></div>
                  {farm.certifications?.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-stone-400 mb-1">Certifications</p>
                      <div className="flex flex-wrap gap-2">
                        {farm.certifications.map(c => (
                          <span key={c} className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-full">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            <Button variant="outline" size="sm">Modifier mes informations</Button>
          </Card>
        )}
      </div>
    </div>
  );
};