import { motion } from 'framer-motion';
import { ArrowRight, Package, Tags, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';

const CategoriesView = () => {
  const { categories, products, loading } = useProducts();
  const navigate = useNavigate();

  // Only show visible admin-created categories, sorted by sortOrder
  const visibleCategories = [...categories]
    .filter(c => c.visible !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const getProductCount = (categoryName) =>
    products.filter(p => p.category === categoryName && p.visible && !p.archived).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-24 sm:pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Heading ── */}
        <div className="text-center mb-12 mt-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 font-semibold mb-4 text-sm">
            <Tags className="w-4 h-4" />
            Product Categories
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient mb-4">Shop by Category</h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
            Browse our product families and jump directly into the catalogue.
          </p>
        </div>

        {/* ── Loading skeletons ── */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-3xl border border-emerald-100 overflow-hidden animate-pulse">
                <div className="h-48 bg-emerald-50" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-10 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleCategories.length === 0 ? (
          /* ── Empty state ── */
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Tags className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No categories yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              The store is being set up. Categories will appear here once the admin adds them.
            </p>
            <Link to="/products" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
              Browse All Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* ── Category Grid ── */}
            <div className={`grid gap-6 ${
              visibleCategories.length === 1
                ? 'max-w-sm mx-auto'
                : visibleCategories.length === 2
                  ? 'sm:grid-cols-2'
                  : 'sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {visibleCategories.map((category, index) => {
                const productCount = getProductCount(category.name);
                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.07 }}
                    whileHover={{ y: -6 }}
                    className="glass rounded-3xl overflow-hidden border border-emerald-100 shadow-lg flex flex-col"
                  >
                    {/* Category image */}
                    <div className="h-48 bg-gradient-to-br from-emerald-50 to-mint-50 flex items-center justify-center p-4 overflow-hidden">
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center">
                          <Package className="w-10 h-10 text-emerald-400" />
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h2 className="text-xl font-bold text-gray-800">{category.name}</h2>
                        {productCount > 0 && (
                          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            {productCount} item{productCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-5 flex-1">
                        {category.description ||
                          `Explore our premium ${category.name.toLowerCase()} crafted for daily use and branding.`}
                      </p>

                      <button
                        onClick={() => navigate(`/products?category=${encodeURIComponent(category.name)}`)}
                        className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Shop {category.name}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ── CTA card ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 glass rounded-3xl p-8 border border-emerald-100 text-center"
            >
              <Package className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Need a custom order?</h3>
              <p className="text-gray-500 text-sm mb-5 max-w-md mx-auto">
                We print logos, names, and custom artwork on any bag type. Great for corporate gifting and events.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/products" className="btn-primary px-6 py-2.5 inline-flex items-center gap-2 text-sm">
                  Browse All Products <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/contact" className="btn-secondary px-6 py-2.5 inline-flex items-center gap-2 text-sm">
                  Contact Us
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default CategoriesView;
