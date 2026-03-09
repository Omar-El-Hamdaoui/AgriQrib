// App.jsx – Point d'entrée principal
import { useState } from 'react';
import './styles/global.css';

import { AuthProvider, useAuth } from './auth/AuthContext';
import { Header }            from './components/layout/Header';
import { CartSidebar }       from './components/features/CartSidebar';
import { HomePage }          from './pages/HomePage';
import { CatalogPage }       from './pages/CatalogPage';
import { FarmsPage }         from './pages/FarmsPage';
import { ProducerDashboard } from './pages/ProducerDashboard';
import { BuyerDashboard }    from './pages/BuyerDashboard';
import { RegisterPage }      from './pages/RegisterPage';
import { LoginPage }         from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// ── Détection de la vue initiale depuis l'URL ─────────────────────────────────
function getInitialView() {
  const hashParams  = new URLSearchParams(window.location.hash.substring(1));
  const queryParams = new URLSearchParams(window.location.search);

  // Token valide — legacy flow : #access_token=XXX&type=recovery
  if (hashParams.get('type') === 'recovery' && hashParams.get('access_token')) {
    return 'reset-password';
  }
  // Token valide — PKCE flow : ?code=XXX
  if (queryParams.get('code')) {
    return 'reset-password';
  }
  // Erreur Supabase dans le hash (ex: #error=access_denied&error_code=otp_expired)
  // On route quand même vers reset-password pour afficher le bon message d'erreur
  if (hashParams.get('error')) {
    return 'reset-password';
  }
  return 'home';
}

// ── Contenu principal ─────────────────────────────────────────────────────────
function AppContent() {
  const { status } = useAuth();

  const [currentView,      setCurrentView]     = useState(getInitialView);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cartItems,        setCartItems]        = useState([]);
  const [showCart,         setShowCart]         = useState(false);

  const navigateAfterAuth = (userProfile) => {
    if (userProfile?.role === 'producer') {
      setCurrentView('producer-dashboard');
    } else {
      setCurrentView('buyer-dashboard');
    }
  };

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

  // reset-password rendu AVANT le spinner — le hash disparaît sinon
  if (currentView === 'reset-password') {
    return <ResetPasswordPage setCurrentView={setCurrentView} />;
  }

  if (status === 'idle') {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#2D5016] to-[#4a7c23] rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl">🌿</span>
          </div>
          <div className="w-6 h-6 border-2 border-[#2D5016]/30 border-t-[#2D5016] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (currentView === 'login') {
    return <LoginPage setCurrentView={setCurrentView} onLoggedIn={navigateAfterAuth} />;
  }
  if (currentView === 'register') {
    return <RegisterPage setCurrentView={setCurrentView} onRegistered={navigateAfterAuth} />;
  }

  return (
    <div className="min-h-screen bg-[#f9f7f4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        cartCount={cartCount}
        setShowCart={setShowCart}
      />
      {currentView === 'home' && (
        <HomePage setCurrentView={setCurrentView} setSelectedCategory={setSelectedCategory} />
      )}
      {currentView === 'catalog' && (
        <CatalogPage
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onAddToCart={handleAddToCart}
        />
      )}
      {currentView === 'farms'              && <FarmsPage          setCurrentView={setCurrentView} />}
      {currentView === 'producer-dashboard' && <ProducerDashboard  setCurrentView={setCurrentView} />}
      {currentView === 'buyer-dashboard'    && <BuyerDashboard     setCurrentView={setCurrentView} />}
      <CartSidebar
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        items={cartItems}
        setItems={setCartItems}
      />
    </div>
  );
}

export default function TerroirDirectApp() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}