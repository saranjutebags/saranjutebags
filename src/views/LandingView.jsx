import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  MapPin, 
  Star, 
  ShoppingBag, 
  Leaf, 
  Globe, 
  Truck, 
  Shield,
  Award,
  Zap,
  ChevronRight,
  Instagram,
  Facebook,
  Twitter,
  Mail,
  Phone,
  Heart
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useProducts } from '../contexts/ProductContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import HomeSlideshow from '../components/HomeSlideshow';

const LandingView = () => {
  const { products, categories, getFeaturedProducts, getBestsellers } = useProducts();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const featuredProducts = getFeaturedProducts();
  const bestsellers = getBestsellers();

  const branches = [
    {
      name: 'Mehdipatnam, Hyderabad',
      address: '12-2-826/A/21, Priyanka College Lane, near State Bank of India, LIC Colony, Vivekananda Colony, Santosh Nagar, Mehdipatnam, Hyderabad, Telangana 500028',
      mapLink: 'https://maps.app.goo.gl/dUEb8NMfGW98KdEf8',
    },
    {
      name: 'Secunderabad',
      address: 'Shop No 1, 4-5, Mahatma Gandhi Rd, opp. Mahatma Gandhi Statue, Kandoji Bazar, Nallagutta, Ramgopalpet, Secunderabad, Hyderabad, Telangana 500003',
      mapLink: 'https://maps.app.goo.gl/VpQb2iRUEUefj1fs5',
    },
    {
      name: 'Vijayawada, Andhra Pradesh',
      address: '40-5-5/3, Sri Natrajan Guljar Rd, beside Makers of milkshakes, near Mahesh Communictaions, Brindavan Colony, Sriram Nagar, Vijayawada, Andhra Pradesh 520010',
      mapLink: 'https://maps.app.goo.gl/5fqe35xDztoFGixF6',
    },
  ];

  const whyChooseUs = [
    { icon: Leaf, title: '100% Eco-Friendly', desc: 'Biodegradable and sustainable materials' },
    { icon: Truck, title: 'Fast Delivery', desc: 'Worldwide shipping available' },
    { icon: Shield, title: 'Premium Quality', desc: 'High-grade laminated jute' },
    { icon: Globe, title: 'Custom Branding', desc: 'Personalize with your logo' },
    { icon: Award, title: '14+ Years Experience', desc: 'Trusted by thousands' },
    { icon: Zap, title: 'Bulk Orders', desc: 'Corporate gifting solutions' },
  ];

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-500 to-forest-600" />
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.14),transparent_30%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-block mb-4"
              >
                <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
                  🌿 Eco-Friendly & Sustainable
                </span>
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Premium Sustainable
                <br />
                <span className="text-yellow-300">Bags for Tomorrow</span>
              </h1>
              
              <p className="text-lg md:text-xl text-emerald-50 mb-8 max-w-lg">
                Saran Jute Bags - Your trusted partner for premium jute, cotton, and canvas bags. Established in 2010, delivering quality worldwide.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/products" 
                  className="btn-primary bg-white text-emerald-700 hover:bg-yellow-300 hover:text-emerald-800 px-8 py-4 text-lg font-bold shadow-2xl"
                >
                  Shop Now
                  <ArrowRight className="w-5 h-5 inline-block ml-2" />
                </Link>
                <button 
                  onClick={() => navigate('/categories')}
                  className="btn-secondary border-white text-white hover:bg-white hover:text-emerald-700 px-8 py-4 text-lg font-bold"
                >
                  Explore Collection
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-8 bg-white/10 rounded-3xl blur-2xl" />
              <div className="relative rounded-3xl overflow-hidden h-80">
                <HomeSlideshow height="h-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">Our Products</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Discover our range of eco-friendly bags crafted with sustainable materials</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Jute Bags',
                description: 'Eco-friendly jute bags manufactured in Hyderabad, India. Biodegradable and sustainable.',
                image: '/Jute-Bags-1.webp',
              },
              {
                title: 'Cotton Bags',
                description: 'Reusable cotton bags made from sustainable fabric. Durable and perfect for daily use.',
                image: '/canvas-bags.webp',
              },
              {
                title: 'Canvas Bags',
                description: 'Premium canvas bags for sustainability and reusability. Heavy-duty and long-lasting.',
                image: '/Canvas-tote-bag.webp',
              },
            ].map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className="glass rounded-3xl overflow-hidden shadow-xl border border-emerald-100 product-card"
              >
                <div className="h-64 bg-gradient-to-br from-emerald-50 to-mint-50 flex items-center justify-center p-6">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">{category.title}</h3>
                  <p className="text-gray-600 mb-6">{category.description}</p>
                  <button 
                    onClick={() => navigate('/products')}
                    className="text-emerald-600 font-semibold flex items-center hover:text-emerald-700 transition-colors"
                  >
                    Learn More
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-6">About Saran Jute Bags</h2>
              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                Saran Jute Bags, established in <span className="font-bold text-emerald-600">August 2010</span>, is one of India's leading manufacturers, exporters, and wholesalers of jute bags, canvas bags, cotton bags, and other jute products.
              </p>
              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                Manufacturer of high-quality jute bags suitable for both daily use and advertising purposes. All jute goods are made from high-grade fabric – laminated jute – to ensure great quality.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed">
                Our skilled professionals handle the production procedures, making sure that every manufacturing step complies with industry requirements.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-6"
            >
              {[
                { number: '14+', label: 'Years Experience' },
                { number: '1000+', label: 'Products' },
                { number: '5000+', label: 'Happy Clients' },
                { number: '3', label: 'Branches' },
              ].map((stat, index) => (
                <div key={index} className="glass rounded-2xl p-6 text-center border border-emerald-100">
                  <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">{stat.number}</div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">Featured Products</h2>
            <p className="text-gray-600">Handpicked premium bags for you</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.slice(0, 4).map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="glass rounded-2xl overflow-hidden shadow-lg border border-emerald-100 product-card"
              >
                <Link to={`/product/${product.id}`} className="block relative h-56 bg-gradient-to-br from-emerald-50 to-mint-50 flex items-center justify-center p-4">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-contain"
                  />
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleWishlist(product);
                    }}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                  >
                    <Heart 
                      className={`w-5 h-5 ${isInWishlist(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} 
                    />
                  </button>
                </Link>
                <div className="p-6">
                  <Link to={`/product/${product.id}`}>
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 hover:text-emerald-600 transition-colors">{product.name}</h3>
                  </Link>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">({product.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-emerald-600">₹{product.price}</span>
                      <span className="text-sm text-gray-400 line-through ml-2">₹{product.originalPrice}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        className="p-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:shadow-lg transition-all"
                      >
                        <ShoppingBag className="w-5 h-5" />
                      </button>
                      <Link
                        to={`/product/${product.id}`}
                        className="px-4 py-3 rounded-xl bg-white border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Eco-Friendly Promotion */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Globe className="w-16 h-16 text-white mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Eco-Friendly Brand Promotion Made Easy
          </h2>
          <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
            Promote your brand and increase your sales 2x with Customized Products. World Wide Delivery available.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/products')}
              className="btn-primary bg-white text-emerald-700 hover:bg-yellow-300 hover:text-emerald-800 px-8 py-4 text-lg font-bold"
            >
              Order Now
            </button>
            <button 
              onClick={() => navigate('/products')}
              className="btn-secondary border-white text-white hover:bg-white hover:text-emerald-700 px-8 py-4 text-lg font-bold"
            >
              Explore Products
            </button>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">Why Choose Us</h2>
            <p className="text-gray-600">Reasons why customers love us</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whyChooseUs.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass rounded-2xl p-8 text-center border border-emerald-100"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Branches */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">Our Branches</h2>
            <p className="text-gray-600">Visit us at our locations</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {branches.map((branch, index) => (
              <motion.div
                key={branch.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-2xl p-8 border border-emerald-100"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg mb-2">{branch.name}</h3>
                    <p className="text-gray-600 text-sm">{branch.address}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <a
                    href={branch.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 btn-primary text-center py-3"
                  >
                    Get Directions
                  </a>
                  <button className="btn-secondary flex items-center justify-center gap-2 px-4 py-3">
                    <Star className="w-4 h-4" />
                    Review Us
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <img src="/logo.webp" alt="Saran Jute Bags" className="h-12 w-12 object-contain" />
                <span className="text-xl font-bold">Saran Jute Bags</span>
              </div>
              <p className="text-gray-400 mb-6">
                Premium sustainable bags for a better tomorrow. Established in August 2010.
              </p>
              <div className="flex gap-4">
                {[Facebook, Instagram, Twitter].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Quick Links</h4>
              <ul className="space-y-3">
                {['Home', 'Products', 'About', 'Contact'].map((item) => (
                  <li key={item}>
                    <Link to={item === 'Home' ? '/' : `/${item.toLowerCase()}`} className="text-gray-400 hover:text-emerald-400 transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Products</h4>
              <ul className="space-y-3">
                {['Jute Bags', 'Cotton Bags', 'Canvas Bags', 'Custom Orders'].map((item) => (
                  <li key={item}>
                    <Link to="/products" className="text-gray-400 hover:text-emerald-400 transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Contact Us</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-gray-400">
                  <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />
                  <span>Hyderabad, Telangana, India</span>
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <Phone className="w-5 h-5 text-emerald-500" />
                  <span>+91 XXXXXXXXXX</span>
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <Mail className="w-5 h-5 text-emerald-500" />
                  <span>info@saranjutebags.co.in</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-400 text-sm">
                &copy; 2024 Saran Jute Bags. All rights reserved.
              </p>
              <p className="text-gray-400 text-sm">
                Developed by <a href="https://csytech.vercel.app" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">@Csy Tech Solutions</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
