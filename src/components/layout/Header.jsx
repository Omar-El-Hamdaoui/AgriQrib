// components/layout/Header.jsx
import { useState } from 'react';
import { Icons } from '../ui/Icons';
import { useAuth } from '../../auth/AuthContext';

export const Header = ({ currentView, setCurrentView, cartCount, setShowCart, unreadNotifs = 0 }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, status, logout } = useAuth();

  const isAuthenticated = status === 'authenticated';
  const isProducer      = user?.role === 'producer';
  const dashboardView   = isProducer ? 'producer-dashboard' : 'buyer-dashboard';
  const userInitials    = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : null;
  const isDashboard     = currentView === 'producer-dashboard' || currentView === 'buyer-dashboard';

  const handleLogout = async () => {
    await logout();
    setCurrentView('home');
    setMobileMenuOpen(false);
  };

  // Bouton profil → paramètres du dashboard
  const goToSettings = () => {
    setCurrentView(dashboardView);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('dashboard-tab', { detail: 'settings' }));
    }, 60);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'home',    label: 'Accueil',     icon: <Icons.Home /> },
    { id: 'catalog', label: 'Catalogue',   icon: <Icons.Package /> },
    { id: 'map',     label: 'Carte',       icon: <Icons.Location /> },
    { id: 'farms',   label: 'Producteurs', icon: <Icons.User /> },
    ...(isAuthenticated
      ? [{ id: dashboardView, label: 'Dashboard', icon: <Icons.BarChart /> }]
      : []),
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-10 h-10 bg-gradient-to-br from-[#2D5016] to-[#4a7c23] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">🌿</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-[#2D5016] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                AgriQrib
              </h1>
              <p className="text-[10px] text-stone-500 -mt-1 tracking-wider uppercase">Du producteur à vous</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${(item.id === dashboardView && isDashboard) || currentView === item.id
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

            {/* Notifications — connectés uniquement */}
            {isAuthenticated && (
              <button
                onClick={() => setCurrentView('notifications')}
                className={`relative p-2.5 rounded-xl transition-all hidden sm:flex items-center justify-center
                  ${currentView === 'notifications' ? 'bg-[#2D5016]/10 text-[#2D5016]' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                <Icons.Bell />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
            )}

            {/* Profil → paramètres */}
            {isAuthenticated ? (
              <>
                <button
                  onClick={goToSettings}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 transition-all"
                  title="Paramètres du compte"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#2D5016] to-[#4a7c23] rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    {userInitials}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-stone-700">{user.firstName}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-medium transition-all"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setCurrentView('register')}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D5016] text-white text-sm font-semibold hover:bg-[#1e3a0f] transition-all shadow-md">
                  S'inscrire
                </button>
                <button onClick={() => setCurrentView('login')}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-all">
                  Connexion
                </button>
              </>
            )}

            {/* Mobile hamburger */}
            <button className="md:hidden p-2 rounded-xl text-stone-600 hover:bg-stone-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <Icons.Close /> : <Icons.Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 py-4 space-y-2">
            {navItems.map(item => (
              <button key={item.id}
                onClick={() => { setCurrentView(item.id); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${(item.id === dashboardView && isDashboard) || currentView === item.id
                    ? 'bg-[#2D5016]/10 text-[#2D5016]' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                {item.icon} {item.label}
              </button>
            ))}
            {isAuthenticated && (
              <button onClick={() => { setCurrentView('notifications'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${currentView === 'notifications' ? 'bg-[#2D5016]/10 text-[#2D5016]' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                <Icons.Bell /> Notifications
                {unreadNotifs > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
            )}
            {isAuthenticated ? (
              <>
                <button onClick={goToSettings}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-all">
                  <span>⚙️</span> Paramètres du compte
                </button>
                <button onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
                  🚪 Déconnexion
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setCurrentView('register'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium bg-[#2D5016] text-white">
                  S'inscrire
                </button>
                <button onClick={() => { setCurrentView('login'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100">
                  Connexion
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};