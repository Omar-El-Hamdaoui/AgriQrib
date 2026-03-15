import { useState } from 'react';
import { mockFarms } from '../data/mockData';
import { Icons } from '../components/ui/Icons';
import { Badge, Button, Card, Input } from '../components/ui/primitives';

export const FarmsPage = ({ setCurrentView }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = mockFarms.filter(f =>
    !searchQuery || f.farmName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          {filtered.map(farm => (
            <Card key={farm.id} hover>
              <div className="relative h-48 overflow-hidden">
                <img
                  src={farm.coverImage}
                  alt={farm.farmName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
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
                    Voir la ferme <Icons.ChevronRight />
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
