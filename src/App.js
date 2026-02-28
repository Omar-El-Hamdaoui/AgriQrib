import React, { useState, useEffect } from 'react';

// ============================================================================
// TERROIR DIRECT - Marketplace Agricole Local
// Architecture: React + Tailwind + SQLite/PostgreSQL Ready
// ============================================================================

// ============================================================================
// DATABASE SCHEMA (Relationnel - PostgreSQL/SQLite)
// ============================================================================
/*
-- SCHÉMA DE BASE DE DONNÉES RELATIONNELLE

-- 1. UTILISATEURS (Base RBAC)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('producer', 'buyer_individual', 'buyer_restaurant', 'buyer_transit', 'admin') NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. PROFILS PRODUCTEURS (Fermes)
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    farm_name VARCHAR(200) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    certifications TEXT[], -- Bio, Label Rouge, etc.
    cover_image_url TEXT,
    rating DECIMAL(2,1) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    delivery_radius_km INT DEFAULT 50,
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. CATÉGORIES DE PRODUITS
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    parent_id INT REFERENCES categories(id),
    display_order INT DEFAULT 0
);

-- 4. PRODUITS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    photo_url TEXT,
    photos TEXT[], -- Galerie additionnelle
    unit ENUM('kg', 'piece', 'bunch', 'liter', 'dozen') NOT NULL,
    price_per_unit DECIMAL(10,2) NOT NULL,
    quantity_available DECIMAL(10,2) NOT NULL,
    minimum_quantity DECIMAL(10,2) DEFAULT 1,
    is_organic BOOLEAN DEFAULT FALSE,
    harvest_date DATE,
    expiry_date DATE,
    is_available BOOLEAN DEFAULT TRUE,
    bulk_discount_threshold DECIMAL(10,2), -- Seuil pour remise volume
    bulk_discount_percent DECIMAL(5,2),    -- % de remise
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. PANIERS
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL, -- Prix au moment de l'ajout
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cart_id, product_id)
);

-- 6. COMMANDES (Transactions)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES users(id),
    farm_id UUID REFERENCES farms(id),
    status ENUM('pending', 'confirmed', 'preparing', 'ready', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_method ENUM('pickup', 'delivery') NOT NULL,
    delivery_address TEXT,
    delivery_date DATE,
    delivery_time_slot VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL
);

-- 7. OFFRES DE NÉGOCIATION
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id),
    farm_id UUID REFERENCES farms(id),
    proposed_quantity DECIMAL(10,2) NOT NULL,
    proposed_price_per_unit DECIMAL(10,2) NOT NULL,
    total_proposed DECIMAL(10,2) NOT NULL,
    original_price_per_unit DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'counter_offer', 'expired') DEFAULT 'pending',
    counter_price DECIMAL(10,2), -- Si contre-proposition
    counter_quantity DECIMAL(10,2),
    message TEXT, -- Message de l'acheteur
    response_message TEXT, -- Réponse du producteur
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. AVIS ET ÉVALUATIONS
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    farm_id UUID REFERENCES farms(id),
    buyer_id UUID REFERENCES users(id),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. FAVORIS
CREATE TABLE favorites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, farm_id)
);

-- 10. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type ENUM('order_update', 'offer_received', 'offer_response', 'new_product', 'delivery_reminder') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Données contextuelles
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- INDEX POUR PERFORMANCES
CREATE INDEX idx_products_farm ON products(farm_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(is_available, quantity_available);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_farm ON orders(farm_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_farms_location ON farms(latitude, longitude);
*/

// ============================================================================
// MOCK DATA
// ============================================================================
const mockCategories = [
  { id: 1, name: 'Légumes', slug: 'legumes', icon: '🥬' },
  { id: 2, name: 'Fruits', slug: 'fruits', icon: '🍎' },
  { id: 3, name: 'Produits laitiers', slug: 'laitiers', icon: '🧀' },
  { id: 4, name: 'Viandes', slug: 'viandes', icon: '🥩' },
  { id: 5, name: 'Œufs', slug: 'oeufs', icon: '🥚' },
  { id: 6, name: 'Miel & Confitures', slug: 'miel', icon: '🍯' },
];

const mockFarms = [
  {
    id: 'farm-1',
    farmName: 'Ferme du Soleil Levant',
    description: 'Agriculture biologique depuis 3 générations. Spécialisés dans les légumes de saison.',
    city: 'Aix-en-Provence',
    postalCode: '13100',
    certifications: ['Bio', 'HVE'],
    rating: 4.8,
    totalReviews: 127,
    coverImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    distance: 12,
  },
  {
    id: 'farm-2',
    farmName: 'Les Jardins de Marie',
    description: 'Petite exploitation familiale, fruits et légumes cultivés avec amour.',
    city: 'Cassis',
    postalCode: '13260',
    certifications: ['Bio'],
    rating: 4.9,
    totalReviews: 89,
    coverImage: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800',
    distance: 25,
  },
  {
    id: 'farm-3',
    farmName: 'Domaine Saint-Victor',
    description: 'Élevage bovin et production fromagère artisanale.',
    city: 'Aubagne',
    postalCode: '13400',
    certifications: ['Label Rouge', 'AOP'],
    rating: 4.7,
    totalReviews: 203,
    coverImage: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800',
    distance: 18,
  },
];

const mockProducts = [
  {
    id: 'prod-1',
    farmId: 'farm-1',
    farmName: 'Ferme du Soleil Levant',
    name: 'Tomates Cœur de Bœuf',
    description: 'Tomates charnues et parfumées, idéales en salade.',
    category: 'legumes',
    photoUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400',
    unit: 'kg',
    pricePerUnit: 4.50,
    quantityAvailable: 150,
    isOrganic: true,
    bulkDiscountThreshold: 20,
    bulkDiscountPercent: 15,
  },
  {
    id: 'prod-2',
    farmId: 'farm-1',
    farmName: 'Ferme du Soleil Levant',
    name: 'Courgettes Bio',
    description: 'Courgettes tendres, récoltées à maturité.',
    category: 'legumes',
    photoUrl: 'https://images.unsplash.com/photo-1563252722-6434563a985d?w=400',
    unit: 'kg',
    pricePerUnit: 3.20,
    quantityAvailable: 80,
    isOrganic: true,
  },
  {
    id: 'prod-3',
    farmId: 'farm-2',
    farmName: 'Les Jardins de Marie',
    name: 'Fraises Gariguette',
    description: 'Fraises parfumées de plein champ.',
    category: 'fruits',
    photoUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400',
    unit: 'kg',
    pricePerUnit: 8.90,
    quantityAvailable: 45,
    isOrganic: true,
  },
  {
    id: 'prod-4',
    farmId: 'farm-3',
    farmName: 'Domaine Saint-Victor',
    name: 'Fromage de Chèvre Frais',
    description: 'Fromage crémeux au lait cru.',
    category: 'laitiers',
    photoUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400',
    unit: 'piece',
    pricePerUnit: 5.50,
    quantityAvailable: 30,
    isOrganic: false,
  },
  {
    id: 'prod-5',
    farmId: 'farm-3',
    farmName: 'Domaine Saint-Victor',
    name: 'Œufs Fermiers',
    description: 'Poules élevées en plein air, œufs extra-frais.',
    category: 'oeufs',
    photoUrl: 'https://images.unsplash.com/photo-1569288052389-dac9b01c9c05?w=400',
    unit: 'dozen',
    pricePerUnit: 4.80,
    quantityAvailable: 50,
    isOrganic: false,
  },
  {
    id: 'prod-6',
    farmId: 'farm-1',
    farmName: 'Ferme du Soleil Levant',
    name: 'Aubergines Violettes',
    description: 'Aubergines charnues parfaites pour les gratins.',
    category: 'legumes',
    photoUrl: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400',
    unit: 'kg',
    pricePerUnit: 3.80,
    quantityAvailable: 60,
    isOrganic: true,
    bulkDiscountThreshold: 15,
    bulkDiscountPercent: 10,
  },
];

const mockOffers = [
  {
    id: 'offer-1',
    productId: 'prod-1',
    productName: 'Tomates Cœur de Bœuf',
    buyerName: 'Restaurant Le Provençal',
    buyerType: 'restaurant',
    proposedQuantity: 50,
    proposedPricePerUnit: 3.50,
    originalPricePerUnit: 4.50,
    totalProposed: 175,
    message: 'Commande régulière chaque semaine si accord.',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: 'offer-2',
    productId: 'prod-3',
    productName: 'Fraises Gariguette',
    buyerName: 'Pâtisserie Gourmande',
    buyerType: 'restaurant',
    proposedQuantity: 20,
    proposedPricePerUnit: 7.50,
    originalPricePerUnit: 8.90,
    totalProposed: 150,
    message: 'Pour notre production de tartes aux fraises.',
    status: 'counter_offer',
    counterPrice: 8.00,
    createdAt: new Date(Date.now() - 7200000),
  },
];

const mockOrders = [
  {
    id: 'order-1',
    buyerName: 'Jean Dupont',
    items: [
      { name: 'Tomates Cœur de Bœuf', quantity: 3, unit: 'kg', price: 4.50 },
      { name: 'Courgettes Bio', quantity: 2, unit: 'kg', price: 3.20 },
    ],
    totalAmount: 19.90,
    status: 'confirmed',
    deliveryMethod: 'pickup',
    deliveryDate: '2026-03-02',
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: 'order-2',
    buyerName: 'Restaurant La Table',
    items: [
      { name: 'Fromage de Chèvre Frais', quantity: 10, unit: 'pièces', price: 5.50 },
    ],
    totalAmount: 55.00,
    status: 'preparing',
    deliveryMethod: 'delivery',
    deliveryDate: '2026-03-01',
    createdAt: new Date(Date.now() - 172800000),
  },
];

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-stone-200 text-stone-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    organic: 'bg-green-100 text-green-800 border border-green-300',
    info: 'bg-sky-100 text-sky-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const variants = {
    primary: 'bg-[#2D5016] hover:bg-[#1e3a0f] text-white shadow-md hover:shadow-lg',
    secondary: 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300',
    outline: 'border-2 border-[#2D5016] text-[#2D5016] hover:bg-[#2D5016] hover:text-white',
    ghost: 'text-stone-600 hover:bg-stone-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', hover = false }) => (
  <div className={`bg-white rounded-2xl border border-stone-200 overflow-hidden ${hover ? 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300' : 'shadow-sm'} ${className}`}>
    {children}
  </div>
);

const Input = ({ label, icon, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-stone-700 mb-1.5">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">{icon}</span>}
      <input
        className={`w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/20 transition-all ${icon ? 'pl-10' : ''}`}
        {...props}
      />
    </div>
  </div>
);

const Select = ({ label, options, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-stone-700 mb-1.5">{label}</label>}
    <select
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/20 transition-all appearance-none cursor-pointer"
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// ============================================================================
// ICONS (SVG Components)
// ============================================================================
const Icons = {
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Cart: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Location: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Star: ({ filled }) => (
    <svg className={`w-4 h-4 ${filled ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Heart: ({ filled }) => (
    <svg className={`w-5 h-5 ${filled ? 'text-red-500 fill-red-500' : 'text-stone-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Minus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Truck: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M8 17a4 4 0 01-4-4V7a4 4 0 014-4h8a4 4 0 014 4v6a4 4 0 01-4 4M8 17v-3m8 3v-3" />
    </svg>
  ),
  Package: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  MessageCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Home: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Leaf: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
    </svg>
  ),
  Handshake: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  BarChart: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

// ============================================================================
// HEADER COMPONENT
// ============================================================================
const Header = ({ currentView, setCurrentView, userRole, cartCount, setShowCart }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              <h1 className="text-xl font-bold text-[#2D5016] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                TerroirDirect
              </h1>
              <p className="text-[10px] text-stone-500 -mt-1 tracking-wider uppercase">Du producteur à vous</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'home', label: 'Accueil', icon: <Icons.Home /> },
              { id: 'catalog', label: 'Catalogue', icon: <Icons.Package /> },
              { id: 'farms', label: 'Producteurs', icon: <Icons.Location /> },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === item.id
                    ? 'bg-[#2D5016]/10 text-[#2D5016]'
                    : 'text-stone-600 hover:bg-stone-100'
                  }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
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

            <button className="relative p-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition-all hidden sm:block">
              <Icons.Bell />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <button
              onClick={() => setCurrentView(userRole === 'producer' ? 'producer-dashboard' : 'buyer-dashboard')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 transition-all"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#2D5016] to-[#4a7c23] rounded-lg flex items-center justify-center text-white text-sm font-bold">
                JD
              </div>
              <span className="hidden sm:block text-sm font-medium text-stone-700">Mon compte</span>
            </button>

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
            {[
              { id: 'home', label: 'Accueil', icon: <Icons.Home /> },
              { id: 'catalog', label: 'Catalogue', icon: <Icons.Package /> },
              { id: 'farms', label: 'Producteurs', icon: <Icons.Location /> },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setCurrentView(item.id); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${currentView === item.id
                    ? 'bg-[#2D5016]/10 text-[#2D5016]'
                    : 'text-stone-600 hover:bg-stone-100'
                  }`}
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

// ============================================================================
// HOME PAGE
// ============================================================================
const HomePage = ({ setCurrentView, setSelectedCategory }) => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f5f0e8] via-[#e8e0d4] to-[#d4cfc5]">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-64 h-64 bg-[#2D5016]/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#4a7c23]/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full text-sm text-[#2D5016] font-medium shadow-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                3 nouvelles fermes cette semaine
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1a1a1a] leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                Le goût authentique,{' '}
                <span className="text-[#2D5016] relative">
                  directement
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                    <path d="M2 6c50-4 100-4 196 0" stroke="#4a7c23" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>{' '}
                de nos terres
              </h1>

              <p className="text-lg text-stone-600 max-w-lg leading-relaxed">
                Connectez-vous avec les agriculteurs de votre région. Produits frais, circuits courts,
                et la possibilité de négocier directement pour vos volumes importants.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => setCurrentView('catalog')}>
                  Explorer le catalogue
                  <Icons.ChevronRight />
                </Button>
                <Button variant="outline" size="lg" onClick={() => setCurrentView('farms')}>
                  Découvrir les producteurs
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div>
                  <p className="text-2xl font-bold text-[#2D5016]">150+</p>
                  <p className="text-sm text-stone-500">Producteurs</p>
                </div>
                <div className="w-px h-10 bg-stone-300"></div>
                <div>
                  <p className="text-2xl font-bold text-[#2D5016]">2,400+</p>
                  <p className="text-sm text-stone-500">Produits</p>
                </div>
                <div className="w-px h-10 bg-stone-300"></div>
                <div>
                  <p className="text-2xl font-bold text-[#2D5016]">50km</p>
                  <p className="text-sm text-stone-500">Rayon moyen</p>
                </div>
              </div>
            </div>

            <div className="relative hidden md:block">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#2D5016]/20 to-transparent rounded-3xl blur-2xl"></div>
              <div className="relative grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img
                    src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400"
                    alt="Légumes frais"
                    className="rounded-2xl shadow-xl hover:scale-105 transition-transform duration-500"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400"
                    alt="Fromage artisanal"
                    className="rounded-2xl shadow-xl hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="space-y-4 pt-8">
                  <img
                    src="https://images.unsplash.com/photo-1518977676601-b53f82ber44?w=400"
                    alt="Marché fermier"
                    className="rounded-2xl shadow-xl hover:scale-105 transition-transform duration-500"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1595855759920-86582396756a?w=400"
                    alt="Agriculteur"
                    className="rounded-2xl shadow-xl hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-stone-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Parcourir par catégorie
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              Des produits frais et locaux, directement des fermes de votre région
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {mockCategories.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.slug); setCurrentView('catalog'); }}
                className="group relative p-6 bg-gradient-to-br from-[#f5f0e8] to-white rounded-2xl border border-stone-200 hover:border-[#2D5016]/30 hover:shadow-xl transition-all duration-300"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</div>
                <p className="font-semibold text-stone-800">{cat.name}</p>
                <div className="absolute inset-0 bg-[#2D5016]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-[#f9f7f4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                Produits du moment
              </h2>
              <p className="text-stone-600 mt-2">Fraîchement récoltés cette semaine</p>
            </div>
            <Button variant="outline" onClick={() => setCurrentView('catalog')}>
              Voir tout
              <Icons.ChevronRight />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProducts.slice(0, 3).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-stone-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Comment ça marche ?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🔍', title: 'Parcourez', desc: 'Explorez les produits des fermes près de chez vous' },
              { icon: '🤝', title: 'Négociez', desc: 'Faites une offre pour les achats en volume' },
              { icon: '🚚', title: 'Recevez', desc: 'Retrait à la ferme ou livraison à domicile' },
            ].map((step, idx) => (
              <div key={idx} className="relative text-center p-8">
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/4 right-0 w-1/2 border-t-2 border-dashed border-[#2D5016]/30"></div>
                )}
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#2D5016]/10 to-[#4a7c23]/10 rounded-2xl text-4xl mb-6">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">{step.title}</h3>
                <p className="text-stone-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA for Producers */}
      <section className="py-16 bg-gradient-to-br from-[#2D5016] to-[#1e3a0f] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Vous êtes producteur ?
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Rejoignez notre réseau et vendez directement aux particuliers et restaurants de votre région.
            Pas de commission cachée, juste des ventes directes.
          </p>
          <Button variant="secondary" size="lg">
            Créer ma ferme
            <Icons.ChevronRight />
          </Button>
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// PRODUCT CARD COMPONENT
// ============================================================================
const ProductCard = ({ product, onAddToCart, onMakeOffer }) => {
  const [quantity, setQuantity] = useState(1);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <>
      <Card hover className="group">
        <div className="relative overflow-hidden">
          <img
            src={product.photoUrl}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {product.isOrganic && (
              <Badge variant="organic" className="flex items-center gap-1">
                <Icons.Leaf /> Bio
              </Badge>
            )}
            {product.bulkDiscountPercent && (
              <Badge variant="warning">
                -{product.bulkDiscountPercent}% dès {product.bulkDiscountThreshold}{product.unit}
              </Badge>
            )}
          </div>

          {/* Favorite */}
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-all"
          >
            <Icons.Heart filled={isFavorite} />
          </button>

          {/* Farm info overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white text-sm font-medium truncate">{product.farmName}</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-stone-900 text-lg">{product.name}</h3>
            <p className="text-sm text-stone-500 line-clamp-2">{product.description}</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-[#2D5016]">
                {product.pricePerUnit.toFixed(2)}€
                <span className="text-sm font-normal text-stone-500">/{product.unit}</span>
              </p>
              <p className="text-xs text-stone-500">{product.quantityAvailable} {product.unit} disponibles</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="flex items-center border border-stone-300 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 hover:bg-stone-100 rounded-l-lg transition-colors"
              >
                <Icons.Minus />
              </button>
              <span className="px-4 py-2 font-medium text-stone-900 min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 hover:bg-stone-100 rounded-r-lg transition-colors"
              >
                <Icons.Plus />
              </button>
            </div>

            <Button
              className="flex-1"
              onClick={() => onAddToCart && onAddToCart(product, quantity)}
            >
              <Icons.Cart />
              Ajouter
            </Button>
          </div>

          <button
            onClick={() => setShowOfferModal(true)}
            className="w-full py-2.5 border-2 border-dashed border-[#2D5016]/30 rounded-xl text-[#2D5016] font-medium hover:bg-[#2D5016]/5 hover:border-[#2D5016] transition-all flex items-center justify-center gap-2"
          >
            <Icons.Handshake />
            Faire une offre (volume)
          </button>
        </div>
      </Card>

      {/* Offer Modal */}
      {showOfferModal && (
        <OfferModal
          product={product}
          onClose={() => setShowOfferModal(false)}
          onSubmit={(offer) => {
            onMakeOffer && onMakeOffer(offer);
            setShowOfferModal(false);
          }}
        />
      )}
    </>
  );
};

// ============================================================================
// OFFER MODAL (Négociation)
// ============================================================================
const OfferModal = ({ product, onClose, onSubmit }) => {
  const [quantity, setQuantity] = useState(product.bulkDiscountThreshold || 10);
  const [pricePerUnit, setPricePerUnit] = useState(product.pricePerUnit * 0.85);
  const [message, setMessage] = useState('');

  const originalTotal = quantity * product.pricePerUnit;
  const proposedTotal = quantity * pricePerUnit;
  const savings = originalTotal - proposedTotal;
  const discountPercent = ((1 - pricePerUnit / product.pricePerUnit) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-[#2D5016] to-[#4a7c23] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Icons.Handshake />
              </div>
              <div>
                <h2 className="text-xl font-bold">Faire une offre</h2>
                <p className="text-white/80 text-sm">Négociez pour vos achats en volume</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <Icons.Close />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Product summary */}
          <div className="flex gap-4 p-4 bg-stone-50 rounded-xl">
            <img src={product.photoUrl} alt={product.name} className="w-20 h-20 rounded-lg object-cover" />
            <div>
              <h3 className="font-semibold text-stone-900">{product.name}</h3>
              <p className="text-sm text-stone-500">{product.farmName}</p>
              <p className="text-lg font-bold text-[#2D5016] mt-1">
                {product.pricePerUnit.toFixed(2)}€/{product.unit}
              </p>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Quantité souhaitée ({product.unit})
            </label>
            <input
              type="range"
              min={product.bulkDiscountThreshold || 5}
              max={product.quantityAvailable}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full accent-[#2D5016]"
            />
            <div className="flex justify-between text-sm text-stone-500 mt-1">
              <span>{product.bulkDiscountThreshold || 5} {product.unit}</span>
              <span className="font-bold text-[#2D5016] text-lg">{quantity} {product.unit}</span>
              <span>{product.quantityAvailable} {product.unit}</span>
            </div>
          </div>

          {/* Price proposal */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Prix proposé par {product.unit}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.10"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(Number(e.target.value))}
                className="w-full px-4 py-3 pr-12 border border-stone-300 rounded-xl text-xl font-bold text-center focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500">€</span>
            </div>
            <p className="text-sm text-stone-500 mt-1 text-center">
              Prix catalogue : {product.pricePerUnit.toFixed(2)}€
              <span className="text-emerald-600 font-medium ml-2">(-{discountPercent}%)</span>
            </p>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Prix catalogue total</span>
              <span className="text-stone-600 line-through">{originalTotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-stone-900">Votre offre</span>
              <span className="text-2xl font-bold text-[#2D5016]">{proposedTotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Économie potentielle</span>
              <span className="font-medium">{savings.toFixed(2)}€</span>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Message au producteur (optionnel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Commande régulière chaque semaine..."
              rows={3}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl resize-none focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/20"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={() => onSubmit({ quantity, pricePerUnit, message })}>
              Envoyer l'offre
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CATALOG PAGE
// ============================================================================
const CatalogPage = ({ selectedCategory, setSelectedCategory, onAddToCart }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [maxDistance, setMaxDistance] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [onlyOrganic, setOnlyOrganic] = useState(false);

  const filteredProducts = mockProducts.filter(p => {
    if (selectedCategory && selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (onlyOrganic && !p.isOrganic) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      {/* Search Header */}
      <div className="bg-white border-b border-stone-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Icons.Search />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/20"
              />
            </div>

            <div className="flex gap-2">
              <Select
                options={[
                  { value: 'all', label: 'Toutes catégories' },
                  ...mockCategories.map(c => ({ value: c.slug, label: `${c.icon} ${c.name}` }))
                ]}
                value={selectedCategory || 'all'}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="min-w-[180px]"
              />

              <Button
                variant="secondary"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Icons.Filter />
                Filtres
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-stone-50 rounded-xl grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Distance max: {maxDistance}km
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="w-full accent-[#2D5016]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Trier par
                </label>
                <Select
                  options={[
                    { value: 'relevance', label: 'Pertinence' },
                    { value: 'price_asc', label: 'Prix croissant' },
                    { value: 'price_desc', label: 'Prix décroissant' },
                    { value: 'distance', label: 'Distance' },
                  ]}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyOrganic}
                    onChange={(e) => setOnlyOrganic(e.target.checked)}
                    className="w-5 h-5 rounded border-stone-300 text-[#2D5016] focus:ring-[#2D5016]"
                  />
                  <span className="text-sm font-medium text-stone-700 flex items-center gap-1">
                    <Icons.Leaf /> Bio uniquement
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-stone-600">
            <span className="font-semibold text-stone-900">{filteredProducts.length}</span> produits trouvés
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-stone-900 mb-2">Aucun produit trouvé</h3>
            <p className="text-stone-600">Essayez de modifier vos critères de recherche</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// FARMS PAGE
// ============================================================================
const FarmsPage = ({ setCurrentView }) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Nos producteurs locaux
          </h1>
          <p className="text-stone-600">Découvrez les fermes de votre région</p>
        </div>

        <div className="mb-8">
          <Input
            icon={<Icons.Search />}
            placeholder="Rechercher une ferme..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockFarms.map(farm => (
            <Card key={farm.id} hover>
              <div className="relative h-48 overflow-hidden">
                <img
                  src={farm.coverImage}
                  alt={farm.farmName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-bold text-white mb-1">{farm.farmName}</h3>
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Icons.Location />
                    <span>{farm.city} · {farm.distance}km</span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-stone-600 text-sm line-clamp-2">{farm.description}</p>

                <div className="flex flex-wrap gap-2">
                  {farm.certifications.map(cert => (
                    <Badge key={cert} variant="organic">{cert}</Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Icons.Star filled />
                    <span className="font-semibold text-stone-900">{farm.rating}</span>
                    <span className="text-stone-500 text-sm">({farm.totalReviews} avis)</span>
                  </div>

                  <Button variant="outline" size="sm">
                    Voir la ferme
                    <Icons.ChevronRight />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CART SIDEBAR
// ============================================================================
const CartSidebar = ({ isOpen, onClose, items, setItems }) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2D5016]/10 rounded-xl flex items-center justify-center text-[#2D5016]">
              <Icons.Cart />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">Mon panier</h2>
              <p className="text-sm text-stone-500">{items.length} article(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg">
            <Icons.Close />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-lg font-semibold text-stone-900 mb-2">Panier vide</h3>
              <p className="text-stone-600 text-sm">Ajoutez des produits pour commencer</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-stone-50 rounded-xl">
                <img src={item.photoUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                <div className="flex-1">
                  <h4 className="font-medium text-stone-900">{item.name}</h4>
                  <p className="text-sm text-stone-500">{item.farmName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newItems = [...items];
                          if (newItems[idx].quantity > 1) {
                            newItems[idx].quantity--;
                            setItems(newItems);
                          }
                        }}
                        className="w-8 h-8 rounded-lg border border-stone-300 flex items-center justify-center hover:bg-stone-100"
                      >
                        <Icons.Minus />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => {
                          const newItems = [...items];
                          newItems[idx].quantity++;
                          setItems(newItems);
                        }}
                        className="w-8 h-8 rounded-lg border border-stone-300 flex items-center justify-center hover:bg-stone-100"
                      >
                        <Icons.Plus />
                      </button>
                    </div>
                    <p className="font-bold text-[#2D5016]">
                      {(item.price * item.quantity).toFixed(2)}€
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  className="text-stone-400 hover:text-red-500"
                >
                  <Icons.Close />
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-stone-200 space-y-4 bg-white">
            <div className="space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Sous-total</span>
                <span>{subtotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Livraison</span>
                <span className="text-emerald-600">À calculer</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-stone-900 pt-2 border-t">
                <span>Total</span>
                <span>{subtotal.toFixed(2)}€</span>
              </div>
            </div>

            <Button className="w-full" size="lg">
              Valider ma commande
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PRODUCER DASHBOARD
// ============================================================================
const ProducerDashboard = ({ setCurrentView }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { label: 'Ventes du mois', value: '2,450€', change: '+12%', positive: true },
    { label: 'Commandes en cours', value: '8', change: '+3', positive: true },
    { label: 'Offres en attente', value: '3', change: '2 nouvelles', positive: false },
    { label: 'Note moyenne', value: '4.8', change: '', positive: true },
  ];

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
              Tableau de bord
            </h1>
            <p className="text-stone-600">Ferme du Soleil Levant</p>
          </div>

          <Button>
            <Icons.Plus />
            Ajouter un produit
          </Button>
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
          {[
            { id: 'overview', label: 'Aperçu', icon: <Icons.BarChart /> },
            { id: 'products', label: 'Mes produits', icon: <Icons.Package /> },
            { id: 'orders', label: 'Commandes', icon: <Icons.Truck /> },
            { id: 'offers', label: 'Offres', icon: <Icons.Handshake /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                  ? 'bg-[#2D5016] text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
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
                      <Badge variant={
                        offer.status === 'pending' ? 'warning' :
                          offer.status === 'counter_offer' ? 'info' : 'success'
                      }>
                        {offer.status === 'pending' ? 'En attente' :
                          offer.status === 'counter_offer' ? 'Contre-offre envoyée' : 'Acceptée'}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-semibold text-stone-900">{offer.productName}</h3>
                    <p className="text-stone-600">{offer.buyerName}</p>

                    <div className="mt-3 p-3 bg-stone-50 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-stone-500">Quantité</p>
                          <p className="font-semibold">{offer.proposedQuantity} kg</p>
                        </div>
                        <div>
                          <p className="text-stone-500">Prix proposé</p>
                          <p className="font-semibold text-[#2D5016]">{offer.proposedPricePerUnit.toFixed(2)}€/kg</p>
                        </div>
                        <div>
                          <p className="text-stone-500">Total</p>
                          <p className="font-semibold">{offer.totalProposed.toFixed(2)}€</p>
                        </div>
                      </div>
                      <p className="text-sm text-stone-500 mt-2 line-through">
                        Prix catalogue : {offer.originalPricePerUnit.toFixed(2)}€/kg
                        (Total: {(offer.originalPricePerUnit * offer.proposedQuantity).toFixed(2)}€)
                      </p>
                    </div>

                    {offer.message && (
                      <p className="mt-3 text-sm text-stone-600 italic">"{offer.message}"</p>
                    )}
                  </div>

                  {offer.status === 'pending' && (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Button variant="success">
                        <Icons.Check /> Accepter
                      </Button>
                      <Button variant="outline">
                        <Icons.MessageCircle /> Contre-proposer
                      </Button>
                      <Button variant="ghost" className="text-red-600">
                        Refuser
                      </Button>
                    </div>
                  )}

                  {offer.status === 'counter_offer' && (
                    <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                      <p className="text-sm font-medium text-sky-800 mb-1">Votre contre-offre :</p>
                      <p className="text-2xl font-bold text-sky-900">{offer.counterPrice.toFixed(2)}€/kg</p>
                      <p className="text-sm text-sky-600">En attente de réponse</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

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
                  <Badge variant={
                    order.status === 'confirmed' ? 'success' :
                      order.status === 'preparing' ? 'warning' : 'default'
                  }>
                    {order.status === 'confirmed' ? 'Confirmée' :
                      order.status === 'preparing' ? 'En préparation' : order.status}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity} {item.unit} × {item.name}</span>
                      <span className="font-medium">{(item.quantity * item.price).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                  <p className="font-bold text-stone-900">Total : {order.totalAmount.toFixed(2)}€</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Détails</Button>
                    {order.status === 'confirmed' && (
                      <Button size="sm">Préparer</Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

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
                      <p className="text-lg font-bold text-[#2D5016]">{product.pricePerUnit.toFixed(2)}€/{product.unit}</p>
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
                    <p className="font-bold text-[#2D5016]">{order.totalAmount.toFixed(2)}€</p>
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
      </div>
    </div>
  );
};

// ============================================================================
// BUYER DASHBOARD
// ============================================================================
const BuyerDashboard = ({ setCurrentView }) => {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
              Mon compte
            </h1>
            <p className="text-stone-600">Jean Dupont · Particulier</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'orders', label: 'Mes commandes', icon: <Icons.Package /> },
            { id: 'offers', label: 'Mes offres', icon: <Icons.Handshake /> },
            { id: 'favorites', label: 'Favoris', icon: <Icons.Heart filled={false} /> },
            { id: 'settings', label: 'Paramètres', icon: <Icons.Settings /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                  ? 'bg-[#2D5016] text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Badge variant="success">Confirmée</Badge>
                  <h3 className="font-semibold text-stone-900 mt-2">Commande #12345</h3>
                  <p className="text-sm text-stone-500">Ferme du Soleil Levant · Retrait le 02/03/2026</p>
                </div>
                <p className="text-2xl font-bold text-[#2D5016]">19.90€</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">Voir détails</Button>
                <Button variant="ghost" size="sm">Renouveler</Button>
              </div>
            </Card>
          </div>
        )}

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
                <p className="text-2xl font-bold text-sky-900">8.00€/kg au lieu de 8.90€</p>
                <p className="text-sm text-sky-600">Votre offre : 7.50€/kg</p>

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

// ============================================================================
// MAIN APP
// ============================================================================
export default function TerroirDirectApp() {
  const [currentView, setCurrentView] = useState('home');
  const [userRole, setUserRole] = useState('buyer'); // 'buyer' | 'producer'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);

  const handleAddToCart = (product, quantity) => {
    const existingIndex = cartItems.findIndex(item => item.id === product.id);
    if (existingIndex >= 0) {
      const newItems = [...cartItems];
      newItems[existingIndex].quantity += quantity;
      setCartItems(newItems);
    } else {
      setCartItems([...cartItems, { ...product, quantity, price: product.pricePerUnit }]);
    }
    setShowCart(true);
  };

  return (
    <div className="min-h-screen bg-[#f9f7f4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Playfair+Display:wght@400;500;600;700&display=swap');
        
        .animate-in {
          animation: animateIn 0.3s ease-out forwards;
        }
        
        @keyframes animateIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .slide-in-from-right {
          animation: slideInFromRight 0.3s ease-out forwards;
        }
        
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>

      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        userRole={userRole}
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
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

      {/* Role Switcher (Dev only) */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-white rounded-xl shadow-lg border border-stone-200 p-2 flex gap-1">
          <button
            onClick={() => setUserRole('buyer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${userRole === 'buyer' ? 'bg-[#2D5016] text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
          >
            👤 Acheteur
          </button>
          <button
            onClick={() => setUserRole('producer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${userRole === 'producer' ? 'bg-[#2D5016] text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
          >
            🌾 Producteur
          </button>
        </div>
      </div>
    </div>
  );
}