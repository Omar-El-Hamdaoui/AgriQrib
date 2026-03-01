// components/features/ProductCard.jsx
import { useState } from 'react';
import { Icons } from '../ui/Icons';
import { Badge, Button, Card } from '../ui/primitives';
import { OfferModal } from './OfferModal';

export const ProductCard = ({ product, onAddToCart, onMakeOffer }) => {
  const [quantity, setQuantity]         = useState(1);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [isFavorite, setIsFavorite]     = useState(false);

  return (
    <>
      <Card hover className="group">
        {/* Image */}
        <div className="relative overflow-hidden">
          <img
            src={product.photoUrl}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Top badges */}
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

          {/* Farm overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white text-sm font-medium truncate">{product.farmName}</p>
          </div>
        </div>

        {/* Body */}
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
              <p className="text-xs text-stone-500">
                {product.quantityAvailable} {product.unit} disponibles
              </p>
            </div>
          </div>

          {/* Quantity + Add to cart */}
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

          {/* Make offer */}
          <button
            onClick={() => setShowOfferModal(true)}
            className="w-full py-2.5 border-2 border-dashed border-[#2D5016]/30 rounded-xl
              text-[#2D5016] font-medium hover:bg-[#2D5016]/5 hover:border-[#2D5016]
              transition-all flex items-center justify-center gap-2"
          >
            <Icons.Handshake />
            Faire une offre (volume)
          </button>
        </div>
      </Card>

      {/* Offer modal */}
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
