// components/features/OfferModal.jsx
import { useState } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/primitives';

export const OfferModal = ({ product, onClose, onSubmit }) => {
  const [quantity, setQuantity]         = useState(product.bulkDiscountThreshold || 10);
  const [pricePerUnit, setPricePerUnit] = useState(product.pricePerUnit * 0.85);
  const [message, setMessage]           = useState('');

  const originalTotal  = quantity * product.pricePerUnit;
  const proposedTotal  = quantity * pricePerUnit;
  const savings        = originalTotal - proposedTotal;
  const discountPercent = ((1 - pricePerUnit / product.pricePerUnit) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">

        {/* Modal header */}
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
            <img
              src={product.photoUrl}
              alt={product.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-semibold text-stone-900">{product.name}</h3>
              <p className="text-sm text-stone-500">{product.farmName}</p>
              <p className="text-lg font-bold text-[#2D5016] mt-1">
                {product.pricePerUnit.toFixed(2)}€/{product.unit}
              </p>
            </div>
          </div>

          {/* Quantity slider */}
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

          {/* Price input */}
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
            <Button
              className="flex-1"
              onClick={() => onSubmit({ quantity, pricePerUnit, message })}
            >
              Envoyer l'offre
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
