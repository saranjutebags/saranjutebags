import { motion } from 'framer-motion';
import { ArrowRight, Package, Tags } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';

const CategoriesView = () => {
  const { categories } = useProducts();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 font-semibold mb-4">
            <Tags className="w-4 h-4" />
            Product Categories
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">Shop by Category</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">Browse the main bag families and jump directly into the product catalog.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass rounded-3xl p-8 border border-emerald-100 shadow-lg"
            >
              <div className="h-56 rounded-2xl bg-gradient-to-br from-emerald-50 to-mint-50 flex items-center justify-center mb-6">
                <img src={category.image} alt={category.name} className="h-full w-full object-contain p-4" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{category.name}</h2>
              <p className="text-gray-600 mb-6">Explore premium sustainable {category.name.toLowerCase()} crafted for daily use and branding.</p>
              <button onClick={() => navigate('/products')} className="btn-primary px-5 py-3 flex items-center gap-2">
                Explore Products
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 glass rounded-3xl p-8 border border-emerald-100 text-center">
          <Package className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Need custom orders?</h3>
          <p className="text-gray-600 mb-6">Use the product page or contact us for bulk and branded requests.</p>
          <button onClick={() => navigate('/contact')} className="btn-secondary px-5 py-3">Contact Us</button>
        </div>
      </div>
    </div>
  );
};

export default CategoriesView;