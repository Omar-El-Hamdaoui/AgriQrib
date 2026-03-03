// components/features/CartSidebar.jsx
import { Icons } from '../ui/Icons';
import { Button } from '../ui/primitives';

export const CartSidebar = ({ isOpen, onClose, items, setItems }) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!isOpen) return null;

  const updateQty = (idx, delta) => {
    const next = [...items];
    next[idx].quantity = Math.max(1, next[idx].quantity + delta);
    setItems(next);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
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

        {/* Items */}
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
                <img
                  src={item.photoUrl}
                  alt={item.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-stone-900">{item.name}</h4>
                  <p className="text-sm text-stone-500">{item.farmName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(idx, -1)}
                        className="w-8 h-8 rounded-lg border border-stone-300 flex items-center justify-center hover:bg-stone-100"
                      >
                        <Icons.Minus />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(idx, 1)}
                        className="w-8 h-8 rounded-lg border border-stone-300 flex items-center justify-center hover:bg-stone-100"
                      >
                        <Icons.Plus />
                      </button>
                    </div>
                    <p className="font-bold text-[#2D5016]">
                      {(item.price * item.quantity).toFixed(2)}DH
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-stone-400 hover:text-red-500"
                >
                  <Icons.Close />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-stone-200 space-y-4 bg-white">
            <div className="space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Sous-total</span>
                <span>{subtotal.toFixed(2)}DH</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Livraison</span>
                <span className="text-emerald-600">À calculer</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-stone-900 pt-2 border-t">
                <span>Total</span>
                <span>{subtotal.toFixed(2)}DH</span>
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
