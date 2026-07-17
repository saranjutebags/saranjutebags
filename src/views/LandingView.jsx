import { motion } from 'framer-motion';
import {
  ArrowRight, MapPin, Star, ShoppingBag, Leaf, Globe, Truck, Shield,
  Award, Zap, ChevronRight, Instagram, Facebook, Twitter, Mail, Phone, Heart, Package
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { useCart } from '../contexts/CartContext';
import HomeSlideshow from '../components/HomeSlideshow';

const branches = [
  {
    name: 'Mehdipatnam, Hyderabad',
    address: '12-2-826/A/21, Priyanka College Lane, LIC Colony, Hyderabad, Telangana 500028',
    mapLink: 'https://maps.app.goo.gl/dUEb8NMfGW98KdEf8',
  },

  {
    name: 'Vijayawada, Andhra Pradesh',
    address: '40-5-5/3, Sri Natrajan Guljar Rd, Brindavan Colony, Vijayawada, Andhra Pradesh 520010',
    mapLink: 'https://maps.app.goo.gl/5fqe35xDztoFGixF6',
  },
];

const whyChooseUs = [
  { icon: Leaf,   title: '100% Eco-Friendly',    desc: 'Biodegradable and sustainable materials' },
  { icon: Truck,  title: 'Fast Delivery',         desc: 'Worldwide shipping available' },
  { icon: Shield, title: 'Premium Quality',       desc: 'High-grade laminated jute' },
  { icon: Globe,  title: 'Custom Branding',       desc: 'Personalize with your logo' },
  { icon: Award,  title: '14+ Years Experience',  desc: 'Trusted by thousands' },
  { icon: Zap,    title: 'Bulk Orders',           desc: 'Corporate gifting solutions' },
];

const LandingView = () => {
  const { products, categories, getFeaturedProducts, loading } = useProducts();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const navigate = useNavigate();

  const featuredProducts = getFeaturedProducts();
  // Only show visible, admin-created categories on the homepage
  const visibleCategories = categories.filter(c => c.visible !== false);

  return (
    <div className="pt-32 sm:pt-36">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-500 to-emerald-800" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_40%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="inline-block mb-4">
                <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
                  🌿 Eco-Friendly &amp; Sustainable
                </span>
              </motion.div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Premium Sustainable<br />
                <span className="text-yellow-300">Bags for Tomorrow</span>
              </h1>
              <p className="text-lg md:text-xl text-emerald-50 mb-8 max-w-lg">
                Saran Jute Bags — trusted partner for premium jute, cotton, and canvas bags. Established 2010, delivering quality worldwide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/products" className="btn-primary bg-white text-emerald-700 hover:bg-yellow-300 hover:text-emerald-800 px-8 py-4 text-lg font-bold shadow-2xl inline-flex items-center justify-center gap-2">
                  Shop Now <ArrowRight className="w-5 h-5" />
                </Link>
                <button onClick={() => navigate('/categories')} className="btn-secondary border-white text-white hover:bg-white hover:text-emerald-700 px-8 py-4 text-lg font-bold">
                  Explore Collection
                </button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="relative">
              <div className="absolute -inset-8 bg-white/10 rounded-3xl blur-2xl" />
              <div className="relative rounded-3xl overflow-hidden h-64 sm:h-72 lg:h-80">
                <HomeSlideshow height="h-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ── Shop by Category (live from Firestore) ────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">Shop by Category</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Discover our range of eco-friendly bags crafted with sustainable materials</p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-3xl border border-emerald-100 overflow-hidden animate-pulse">
                  <div className="h-56 bg-emerald-50" />
                  <div className="p-6 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Package className="w-14 h-14 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Categories coming soon</p>
              <p className="text-sm mt-1">The admin is setting up the store. Check back shortly.</p>
            </div>
          ) : (
            <div className={`grid gap-8 ${visibleCategories.length === 1 ? 'max-w-sm mx-auto' : visibleCategories.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {visibleCategories.slice(0, 6).map((cat, index) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ y: -8 }}
                  className="glass rounded-3xl overflow-hidden shadow-xl border border-emerald-100 cursor-pointer"
                  onClick={() => navigate('/products')}
                >
                  <div className="h-56 bg-gradient-to-br from-emerald-50 to-mint-50 flex items-center justify-center p-6 overflow-hidden">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="h-full w-full object-contain" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center">
                        <Package className="w-10 h-10 text-emerald-500" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{cat.name}</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      {cat.description || `Explore premium sustainable ${cat.name.toLowerCase()} crafted for daily use and branding.`}
                    </p>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1 text-sm">
                      Shop Now <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {visibleCategories.length > 0 && (
            <div className="text-center mt-10">
              <Link to="/categories" className="btn-secondary px-8 py-3 inline-flex items-center gap-2">
                View All Categories <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>


      {/* ── Featured Products (live from Firestore) ───────────────── */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">Featured Products</h2>
            <p className="text-gray-600">Handpicked premium bags for you</p>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-2xl border border-emerald-100 overflow-hidden animate-pulse">
                  <div className="h-48 bg-emerald-50" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <ShoppingBag className="w-14 h-14 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Products coming soon</p>
              <p className="text-sm mt-1">The admin is adding products. Check back shortly.</p>
              <Link to="/products" className="btn-primary mt-6 inline-flex items-center gap-2 px-6 py-3">
                Browse All Products <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.slice(0, 4).map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    whileHover={{ y: -6 }}
                    className="glass rounded-2xl overflow-hidden shadow-lg border border-emerald-100"
                  >
                    <div className="relative h-52 bg-gradient-to-br from-emerald-50 to-mint-50 flex items-center justify-center p-4">
                      <Link to={`/product/${product.id}`} className="block w-full h-full flex items-center justify-center">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="h-full w-full object-contain" />
                        ) : (
                          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center">
                            <Package className="w-10 h-10 text-emerald-400" />
                          </div>
                        )}
                      </Link>
                      <button
                        onClick={() => toggleWishlist(product)}
                        className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
                      </button>
                    </div>
                    <div className="p-4">
                      <Link to={`/product/${product.id}`}>
                        <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2 hover:text-emerald-600 transition-colors text-sm">{product.name}</h3>
                      </Link>
                      <div className="flex items-center gap-1 mb-3">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating || 0) ? 'fill-current' : ''}`} />)}
                        </div>
                        <span className="text-xs text-gray-400">({product.reviews || 0})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold text-emerald-600">₹{product.price}</span>
                          {product.originalPrice > product.price && (
                            <span className="text-xs text-gray-400 line-through ml-1">₹{product.originalPrice}</span>
                          )}
                        </div>
                        <button onClick={() => addToCart(product)} className="p-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:shadow-lg transition-all">
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="text-center mt-10">
                <Link to="/products" className="btn-primary px-8 py-3 inline-flex items-center gap-2">
                  View All Products <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>


      {/* ── CTA Banner ────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Globe className="w-14 h-14 text-white mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Eco-Friendly Brand Promotion Made Easy</h2>
          <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
            Promote your brand and increase sales 2× with customised products. Worldwide delivery available.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/products')} className="btn-primary bg-white text-emerald-700 hover:bg-yellow-300 hover:text-emerald-800 px-8 py-4 text-lg font-bold">
              Order Now
            </button>
            <button onClick={() => navigate('/contact')} className="btn-secondary border-white text-white hover:bg-white hover:text-emerald-700 px-8 py-4 text-lg font-bold">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ─────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">Why Choose Us</h2>
            <p className="text-gray-600">Reasons why customers love Saran Jute Bags</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyChooseUs.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="glass rounded-2xl p-6 text-center border border-emerald-100"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ── About ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-6">About Saran Jute Bags</h2>
              <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                Saran Jute Bags, established in <span className="font-bold text-emerald-600">August 2010</span>, is one of India's leading manufacturers, exporters, and wholesalers of jute bags, canvas bags, cotton bags, and other jute products.
              </p>
              <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                All jute goods are made from high-grade laminated jute to ensure great quality. Our skilled professionals handle every manufacturing step in compliance with industry standards.
              </p>
              <Link to="/about" className="btn-secondary px-6 py-3 inline-flex items-center gap-2 mt-2">
                Learn More <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="grid grid-cols-2 gap-5">
              {[{ number: '14+', label: 'Years Experience' }, { number: '1000+', label: 'Products' }, { number: '5000+', label: 'Happy Clients' }, { number: '3', label: 'Branches' }].map((stat, i) => (
                <div key={i} className="glass rounded-2xl p-6 text-center border border-emerald-100">
                  <div className="text-4xl font-bold text-gradient mb-1">{stat.number}</div>
                  <div className="text-gray-600 font-medium text-sm">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Our Branches ──────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">Our Branches</h2>
            <p className="text-gray-600">Visit us at our locations</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 justify-center">
            {branches.map((branch, index) => (
              <motion.div
                key={branch.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="glass rounded-2xl p-6 border border-emerald-100"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1">{branch.name}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{branch.address}</p>
                  </div>
                </div>
                <a href={branch.mapLink} target="_blank" rel="noopener noreferrer" className="btn-primary w-full text-center py-2.5 block text-sm">
                  Get Directions
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.webp" alt="Saran Jute Bags" className="h-10 w-10 object-contain" />
                <span className="text-lg font-bold">Saran Jute Bags</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">Premium sustainable bags for a better tomorrow. Established August 2010.</p>
              <div className="flex gap-3">
                {[Facebook, Instagram, Twitter].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                {[['Home', '/'], ['Products', '/products'], ['Categories', '/categories'], ['About', '/about'], ['Contact', '/contact']].map(([label, path]) => (
                  <li key={label}><Link to={path} className="text-gray-400 hover:text-emerald-400 transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Categories</h4>
              <ul className="space-y-2 text-sm">
                {visibleCategories.slice(0, 5).map(cat => (
                  <li key={cat.id}><Link to="/products" className="text-gray-400 hover:text-emerald-400 transition-colors">{cat.name}</Link></li>
                ))}
                {visibleCategories.length === 0 && <li className="text-gray-600 text-xs">Categories loading…</li>}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-gray-400"><MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span>12-2-420/14 Alapati Nagar Road, Gudi Malkapur, Mehdipatnam, Hyderabad, Telangana 500028</span></li>
                <li className="flex items-center gap-2 text-gray-400"><Phone className="w-4 h-4 text-emerald-500 shrink-0" /><span>+91 9866027027 / +91 9701000234</span></li>
                <li className="flex items-center gap-2 text-gray-400"><Mail className="w-4 h-4 text-emerald-500 shrink-0" /><span>saranjutebags@gmail.com</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-sm">&copy; 2026 Saran Jute Bags. All rights reserved.</p>
            <div className="flex gap-4 text-sm">
              <Link to="/privacy" className="text-gray-400 hover:text-emerald-400 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-gray-400 hover:text-emerald-400 transition-colors">Terms of Service</Link>
            </div>
            <p className="text-gray-500 text-sm">
              Developed by <a href="https://csytech.vercel.app" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">@Csy Tech Solutions</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
