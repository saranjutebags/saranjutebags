import { motion } from 'framer-motion';
import { Heart, ShoppingBag, ArrowLeft, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const WishlistView = () => {
  const { wishlist, addToCart, toggleWishlist, isInWishlist } = useCart();
  const navigate = useNavigate();

  if (wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16 flex items-center justify-center">
        <div className="text-center glass rounded-3xl p-12 border border-emerald-100">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-8">Save your favorite items for later</p>
          <Link to="/products" className="btn-primary inline-block">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">Your Wishlist</h1>
          <p className="text-gray-600">{wishlist.length} saved items</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {wishlist.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -8 }}
              className="glass rounded-2xl overflow-hidden shadow-lg border border-emerald-100"
            >
              <div className="relative">
                <Link to={`/product/${product.id}`} className="block">
                  <div className="h-64 bg-gradient-to-br from-emerald-50 to-mint-50 flex items-center justify-center p-4">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </Link>
                <button
                  onClick={() => toggleWishlist(product)}
                  className="absolute top-4 right-4 p-2.5 bg-white rounded-full shadow-md hover:bg-red-50 transition-all"
                >
                  <Heart
                    className={`w-5 h-5 ${isInWishlist(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                  />
                </button>
              </div>

              <div className="p-6">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  {product.category}
                </span>
                <Link to={`/product/${product.id}`}>
                  <h3 className="font-bold text-gray-800 text-lg mt-1 mb-2 line-clamp-2 hover:text-emerald-600 transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <div className="flex items-center gap-1 mb-4">
                  <span className="text-2xl font-bold text-emerald-600">₹{product.price}</span>
                  <span className="text-sm text-gray-400 line-through ml-2">₹{product.originalPrice}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => addToCart(product)}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => toggleWishlist(product)}
                    className="btn-secondary px-4 py-3"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistView;
