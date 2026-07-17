import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, Star, Search, Package } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { useCart } from '../contexts/CartContext';

const ProductsView = () => {
  const { products, categories, loading } = useProducts();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Allow pre-selecting a category from the URL: /products?category=Jute+Bags
  const params = new URLSearchParams(location.search);
  const preselected = params.get('category') || 'All';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(preselected);

  // Keep selectedCategory in sync if the URL changes (e.g. navigating from Categories page)
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setSelectedCategory(p.get('category') || 'All');
  }, [location.search]);

  // Only show visible admin-created categories
  const visibleCategories = categories.filter(c => c.visible !== false);

  const filteredProducts = products.filter(product => {
    if (!product.visible || product.archived) return false;
    const matchesSearch =
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">

        {/* ── Heading ── */}
        <div className="text-center mb-10 mt-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient mb-3">Our Products</h1>
          <p className="text-gray-600">Discover our range of premium sustainable bags</p>
        </div>

        {/* ── Search + Category Filters ── */}
        <div className="glass rounded-2xl p-4 sm:p-6 mb-8 border border-emerald-100">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap text-sm transition-all shrink-0 ${
                  selectedCategory === 'All'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-emerald-50 border border-gray-200'
                }`}
              >
                All
              </button>

              {loading && visibleCategories.length === 0
                ? [1, 2, 3].map(i => (
                    <div key={i} className="px-10 py-2.5 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                  ))
                : visibleCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap text-sm transition-all shrink-0 ${
                        selectedCategory === cat.name
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-emerald-50 border border-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="rounded-2xl border border-emerald-100 overflow-hidden animate-pulse">
                <div className="h-52 bg-emerald-50" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-8 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          /* No products added by admin yet */
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Package className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No products yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              The store is being set up. Products will appear here once the admin adds them.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Products exist but none match current search/filter */
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🌿</div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">No results found</h3>
            <p className="text-sm text-gray-500 mb-6">Try a different search term or category.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="btn-secondary px-6 py-2.5 text-sm"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ y: -4 }}
                className="glass rounded-2xl overflow-hidden shadow-lg border border-emerald-100 flex flex-col"
              >
                {/* Image */}
                <div className="relative">
                  <Link to={`/product/${product.id}`} className="block">
                    <div className="h-48 sm:h-52 bg-gradient-to-br from-emerald-50 to-mint-50 flex items-center justify-center p-3">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="h-full w-full object-contain" />
                      ) : (
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                          <Package className="w-8 h-8 text-emerald-400" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleWishlist(product)}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-all"
                  >
                    <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
                  </button>
                  {product.discountPercentage > 0 && (
                    <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      -{product.discountPercentage}%
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                    {product.category}
                  </span>
                  <Link to={`/product/${product.id}`}>
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base mt-1 mb-2 line-clamp-2 hover:text-emerald-600 transition-colors leading-snug">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Rating */}
                  {product.rating > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'fill-current' : ''}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">({product.reviews || 0})</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-3 mt-auto">
                    <span className="text-lg sm:text-xl font-bold text-emerald-600">₹{product.price}</span>
                    {product.originalPrice > product.price && (
                      <span className="text-xs text-gray-400 line-through">₹{product.originalPrice}</span>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      onClick={() => addToCart(product)}
                      className="flex-1 btn-primary py-2 sm:py-2.5 flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-semibold whitespace-nowrap min-w-0"
                    >
                      <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span className="truncate">Add to Cart</span>
                    </button>
                    <button
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="btn-secondary px-2 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-sm font-semibold shrink-0 whitespace-nowrap"
                    >
                      View
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsView;
