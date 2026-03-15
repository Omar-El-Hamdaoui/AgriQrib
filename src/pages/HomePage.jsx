import { mockCategories, mockProducts } from '../data/mockData';
import { Icons } from '../components/ui/Icons';
import { Button } from '../components/ui/primitives';
import { ProductCard } from '../components/features/ProductCard';

export const HomePage = ({ setCurrentView, setSelectedCategory }) => (
  <div className="min-h-screen">

    {/* ── Hero ──────────────────────────────────────────────── */}
    <section className="relative overflow-hidden bg-gradient-to-br from-[#f5f0e8] via-[#e8e0d4] to-[#d4cfc5]">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-64 h-64 bg-[#2D5016]/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#4a7c23]/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 relative">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full text-sm text-[#2D5016] font-medium shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              3 nouvelles fermes cette semaine
            </div>

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1a1a1a] leading-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
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
              {[
                { value: '150+', label: 'Producteurs' },
                { value: '2 400+', label: 'Produits' },
                { value: '50km', label: 'Rayon moyen' },
              ].map((stat, idx, arr) => (
                <div key={stat.label} className="flex items-center gap-8">
                  <div>
                    <p className="text-2xl font-bold text-[#2D5016]">{stat.value}</p>
                    <p className="text-sm text-stone-500">{stat.label}</p>
                  </div>
                  {idx < arr.length - 1 && <div className="w-px h-10 bg-stone-300" />}
                </div>
              ))}
            </div>
          </div>

          {/* Hero images */}
          <div className="relative hidden md:block">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#2D5016]/20 to-transparent rounded-3xl blur-2xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <img src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400" alt="Légumes frais" className="rounded-2xl shadow-xl hover:scale-105 transition-transform duration-500" />
                <img src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400" alt="Fromage artisanal" className="rounded-2xl shadow-xl hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="space-y-4 pt-8">
                <img src="https://images.unsplash.com/photo-1595855759920-86582396756a?w=400" alt="Agriculteur" className="rounded-2xl shadow-xl hover:scale-105 transition-transform duration-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── Categories ────────────────────────────────────────── */}
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
              <div className="absolute inset-0 bg-[#2D5016]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </section>

    {/* ── Featured products ─────────────────────────────────── */}
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
            Voir tout <Icons.ChevronRight />
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProducts.slice(0, 3).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>

    {/* ── How it works ──────────────────────────────────────── */}
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
                <div className="hidden md:block absolute top-1/4 right-0 w-1/2 border-t-2 border-dashed border-[#2D5016]/30" />
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

    {/* ── CTA Producteurs ───────────────────────────────────── */}
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
          Créer ma ferme <Icons.ChevronRight />
        </Button>
      </div>
    </section>
  </div>
);
