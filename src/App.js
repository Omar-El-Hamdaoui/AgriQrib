// App.jsx – Point d'entrée principal
import { useState } from 'react';
import './styles/global.css';

import { Header }            from './components/layout/Header';
import { CartSidebar }       from './components/features/CartSidebar';
import { HomePage }          from './pages/HomePage';
import { CatalogPage }       from './pages/CatalogPage';
import { FarmsPage }         from './pages/FarmsPage';
import { ProducerDashboard } from './pages/ProducerDashboard';
import { BuyerDashboard }    from './pages/BuyerDashboard';

export default function TerroirDirectApp() {
  const [currentView,      setCurrentView]      = useState('home');
  const [userRole,         setUserRole]          = useState('buyer'); // 'buyer' | 'producer'
  const [selectedCategory, setSelectedCategory]  = useState(null);
  const [cartItems,        setCartItems]         = useState([]);
  const [showCart,         setShowCart]          = useState(false);

  const handleAddToCart = (product, quantity) => {
    const existingIndex = cartItems.findIndex(item => item.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += quantity;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, { ...product, quantity, price: product.pricePerUnit }]);
    }
    setShowCart(true);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#f9f7f4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        userRole={userRole}
        cartCount={cartCount}
        setShowCart={setShowCart}
      />

      {currentView === 'home' && (
        <HomePage
          setCurrentView={setCurrentView}
          setSelectedCategory={setSelectedCategory}
        />
      )}

      {currentView === 'catalog' && (
        <CatalogPage
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onAddToCart={handleAddToCart}
        />
      )}

      {currentView === 'farms' && (
        <FarmsPage setCurrentView={setCurrentView} />
      )}

      {currentView === 'producer-dashboard' && (
        <ProducerDashboard setCurrentView={setCurrentView} />
      )}

      {currentView === 'buyer-dashboard' && (
        <BuyerDashboard setCurrentView={setCurrentView} />
      )}

      <CartSidebar
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        items={cartItems}
        setItems={setCartItems}
      />

      {/* Role Switcher (dev only) */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-white rounded-xl shadow-lg border border-stone-200 p-2 flex gap-1">
          {[
            { role: 'buyer',    label: '👤 Acheteur' },
            { role: 'producer', label: '🌾 Producteur' },
          ].map(({ role, label }) => (
            <button
              key={role}
              onClick={() => setUserRole(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${userRole === role ? 'bg-[#2D5016] text-white' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}