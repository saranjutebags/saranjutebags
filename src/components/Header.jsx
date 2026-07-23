import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  ShoppingBag, 
  User, 
  Search, 
  Heart, 
  Home, 
  Package, 
  Tags, 
  Info, 
  Phone,
  LogOut,
  Settings,
  LayoutDashboard,
  MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, userData, signOut } = useAuth();
  const { companySettings } = useAdmin();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  if (location.pathname === '/dashboard') {
    return null;
  }

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Categories', path: '/categories', icon: Tags },
    { name: 'About', path: '/about', icon: Info },
    { name: 'Contact', path: '/contact', icon: Phone },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsProfileOpen(false);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-40 glass shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:scale-105 transition-transform min-w-0 shrink-0">
            <div className="relative shrink-0">
              <img 
                src={companySettings?.logo || '/logo.webp'} 
                alt={companySettings?.companyName || 'Saran Jute Bags'} 
                className="h-9 w-9 sm:h-12 sm:w-12 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="h-9 w-9 sm:h-12 sm:w-12 hidden items-center justify-center bg-gradient-to-br from-emerald-500 to-forest-500 rounded-xl text-white font-bold text-xs">
                SJB
              </div>
            </div>
            <span className="text-xs sm:text-base lg:text-xl font-bold text-gradient truncate max-w-[160px] sm:max-w-[200px] lg:max-w-none">
              {companySettings?.companyName || 'Saran Jute Bags'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-4 py-2 text-gray-700 hover:text-emerald-600 font-medium transition-all hover:bg-emerald-50 rounded-lg"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-0.5 sm:space-x-2 shrink-0">
            <button className="hidden sm:block p-1.5 sm:p-2 hover:bg-emerald-50 rounded-full transition-colors">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </button>

            <button 
              onClick={() => navigate('/wishlist')}
              className="p-1.5 sm:p-2 hover:bg-emerald-50 rounded-full transition-colors relative"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </button>

            <button 
              onClick={() => navigate('/cart')}
              className="p-1.5 sm:p-2 hover:bg-emerald-50 rounded-full transition-colors relative"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center font-bold shadow-lg">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-1 sm:space-x-2 px-1 sm:px-3 py-1 sm:py-2 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-forest-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md text-xs sm:text-sm shrink-0">
                    {(user.displayName || user.email)?.[0]?.toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-800">
                      Hi, {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                    </p>
                  </div>
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-64 glass rounded-xl shadow-xl border border-emerald-100 py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-emerald-100">
                        <p className="font-semibold text-gray-800">{user.displayName || 'User'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <div className="py-2">
                        <button
                          onClick={() => {
                            navigate('/profile');
                            setIsProfileOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-emerald-50 transition-colors flex items-center space-x-3"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          <span>Dashboard</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/profile');
                            setIsProfileOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-emerald-50 transition-colors flex items-center space-x-3"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Edit Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/orders');
                            setIsProfileOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-emerald-50 transition-colors flex items-center space-x-3"
                        >
                          <Package className="w-4 h-4" />
                          <span>Orders</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/profile');
                            setIsProfileOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-emerald-50 transition-colors flex items-center space-x-3"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>Addresses</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors flex items-center space-x-3"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="btn-primary text-xs sm:text-sm px-2 sm:px-5 py-1.5 sm:py-2.5 flex items-center space-x-1"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-1.5 sm:p-2 hover:bg-emerald-50 rounded-full transition-colors"
            >
              {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-emerald-100"
          >
            <div className="px-4 py-6 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
              {!user && (
                <button
                  onClick={() => {
                    navigate('/auth');
                    setIsOpen(false);
                  }}
                  className="btn-primary w-full mt-4 py-3"
                >
                  Login / Sign Up
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
