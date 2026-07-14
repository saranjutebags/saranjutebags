import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

const CartToast = () => {
  const { cartToast, dismissCartToast, cart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!cartToast) {
      return undefined;
    }

    const timer = setTimeout(() => {
      dismissCartToast();
    }, 4000);

    return () => clearTimeout(timer);
  }, [cartToast, dismissCartToast]);

  const handleViewCart = () => {
    dismissCartToast();
    navigate('/cart');
  };

  return (
    <AnimatePresence>
      {cartToast && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-emerald-100 p-5 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="flex items-start gap-4">
            <motion.div 
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center"
            >
              <ShoppingBag className="w-7 h-7 text-white" />
            </motion.div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-lg">Added to cart!</p>
              <p className="text-sm text-gray-600 mt-1">{cartToast.name} x {cartToast.quantity}</p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleViewCart}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium text-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  View Cart ({cart.length})
                </button>
              </div>
            </div>
            <button 
              onClick={dismissCartToast} 
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CartToast;