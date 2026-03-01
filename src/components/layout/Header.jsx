// components/layout/Header.jsx
import { useState } from 'react';
import { Icons } from '../ui/Icons';

export const Header = ({ currentView, setCurrentView, userRole, cartCount, setShowCart }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home',    label: 'Accueil',     icon: <Icons.Home /> },
    { id: 'catalog', label: 'Catalogue',   icon: <Icons.Package /> },
    { id: 'farms',   label: 'Producteurs', icon: <Icons.Location /> },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setCurrentView('home')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#2D5016] to-[#4a7c23] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">🌿</span>
            </div>
            <div className="hidden sm:block">
              <h1
                className="text-xl font-bold text-[#2D5016] tracking-tight"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                AgriQrib
              </h1>
              <p className="text-[10px] text-stone-500 -mt-1 tracking-wider uppercase">
                Du producteur à vous
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${currentView === item.id
                    ? 'bg-[#2D5016]/10 text-[#2D5016]'
                    : 'text-stone-600 hover:bg-stone-100'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">

            {/* Cart */}
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition-all"
            >
              <Icons.Cart />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#2D5016] text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Notifications */}
            <button className="relative p-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition-all hidden sm:block">
              <Icons.Bell />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Account */}
            <button
              onClick={() =>
                setCurrentView(userRole === 'producer' ? 'producer-dashboard' : 'buyer-dashboard')
              }
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 transition-all"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#2D5016] to-[#4a7c23] rounded-lg flex items-center justify-center text-white text-sm font-bold">
                JD
              </div>
              <span className="hidden sm:block text-sm font-medium text-stone-700">
                Mon compte
              </span>
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-xl text-stone-600 hover:bg-stone-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <Icons.Close /> : <Icons.Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 py-4 space-y-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setCurrentView(item.id); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${currentView === item.id
                    ? 'bg-[#2D5016]/10 text-[#2D5016]'
                    : 'text-stone-600 hover:bg-stone-100'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};
