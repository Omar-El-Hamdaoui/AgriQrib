// pages/CatalogPage.jsx
import { useState } from 'react';
import { mockProducts, mockCategories } from '../data/mockData';
import { Icons } from '../components/ui/Icons';
import { Button, Select } from '../components/ui/primitives';
import { ProductCard } from '../components/features/ProductCard';

export const CatalogPage = ({ selectedCategory, setSelectedCategory, onAddToCart }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy]           = useState('relevance');
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

      {/* Sticky search bar */}
      <div className="bg-white border-b border-stone-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                <Icons.Search />
              </span>
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
                  ...mockCategories.map(c => ({ value: c.slug, label: `${c.icon} ${c.name}` })),
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
                <Icons.Filter /> Filtres
              </Button>
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-stone-50 rounded-xl grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Distance max: {maxDistance}km
                </label>
                <input
                  type="range" min={5} max={100} value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="w-full accent-[#2D5016]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Trier par</label>
                <Select
                  options={[
                    { value: 'relevance',  label: 'Pertinence' },
                    { value: 'price_asc',  label: 'Prix croissant' },
                    { value: 'price_desc', label: 'Prix décroissant' },
                    { value: 'distance',   label: 'Distance' },
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
