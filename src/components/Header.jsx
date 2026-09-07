import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Search,
  ShoppingBag,
  User,
  Heart,
  Home,
  Package,
  Tags,
  Info,
  Phone,
  LogOut,
  Settings,
  LayoutDashboard,
  MapPin,
  Truck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { user, userData, signOut } = useAuth();
  const { companySettings, scrollingTexts } = useAdmin();
  const { cartCount, wishlist, openCart } = useCart();
  const navigate = useNavigate();

  if (location.pathname === '/dashboard') {
    return null;
  }

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/products', label: 'Products' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsProfileOpen(false);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    setSearchOpen(false);
    setMenuOpen(false);
    navigate(`/products?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      {/* Scrolling Announcement Bar */}
      {scrollingTexts && scrollingTexts.filter(t => t.active).length > 0 && (
        <div className="relative w-screen" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
          <div className="bg-forest-600 text-white text-[11px] sm:text-xs font-medium overflow-hidden h-7 sm:h-8 flex items-center">
            <div className="marquee-track flex gap-12 whitespace-nowrap animate-marquee">
              {[...Array(3)].flatMap(() => scrollingTexts.filter(t => t.active)).map((t, i) => (
                <span key={`${t.id}-${i}`} className="px-4">{t.text}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <header
          className={`
            mx-auto flex max-w-[1240px] items-center gap-3 rounded-full border px-3 py-2.5 sm:px-4
            transition-[background-color,border-color,box-shadow] duration-300 ease-premium
            ${scrolled
              ? 'border-white/70 bg-white/75 shadow-glass backdrop-blur-2xl'
              : 'border-transparent bg-transparent'
            }
          `}
        >
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="grid h-10 w-10 place-items-center rounded-full text-forest-800 transition-colors duration-150 ease-premium hover:bg-white/70 lg:hidden"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          <Link to="/" className="flex-shrink-0" aria-label="Saran Jute Bags Home">
            <div className="relative shrink-0">
              <img
                src={companySettings?.logo || '/logo.webp'}
                alt={companySettings?.companyName || 'Saran Jute Bags'}
                className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="h-8 w-8 sm:h-10 sm:w-10 hidden items-center justify-center bg-gradient-to-br from-forest-600 to-forest-700 rounded-xl text-white font-bold text-xs">
                SJB
              </div>
            </div>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200 ease-premium
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500
                    ${isActive
                      ? 'bg-forest-700 text-sand-50'
                      : 'text-ink-soft hover:bg-white/70 hover:text-forest-800'
                    }`
                }>
                  {link.label}
                </NavLink>
              ))}
          </nav>

          <form onSubmit={(e) => { e.preventDefault(); navigate(`/products?q=${encodeURIComponent(query.trim())}`); }} role="search" className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-full border border-ink-line/80 bg-white/70 px-3.5 py-2 backdrop-blur-md transition-colors duration-200 ease-premium focus-within:border-forest-300 md:flex">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jute bags"
              aria-label="Search products"
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
          </form>

          <div className="ml-auto flex items-center gap-0.5 md:ml-2">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="grid h-10 w-10 place-items-center rounded-full text-forest-800 transition-colors duration-150 ease-premium hover:bg-white/70 md:hidden"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>

            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlist.length} items`}
              className="relative hidden h-10 w-10 place-items-center rounded-full text-forest-800 transition-colors duration-150 ease-premium hover:bg-white/70 sm:grid"
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {wishlist.length > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-clay" />
              )}
            </Link>

            <button
              onClick={openCart}
              aria-label={`Cart, ${cartCount} items`}
              className="relative grid h-10 w-10 place-items-center rounded-full text-forest-800 transition-colors duration-150 ease-premium hover:bg-white/70"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-forest-700 px-1 text-[10px] font-bold text-sand-50"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {user ? (
              <Link
                to="/profile"
                aria-label="Profile"
                className="hidden h-10 w-10 place-items-center rounded-full text-forest-800 transition-colors duration-150 ease-premium hover:bg-white/70 sm:grid"
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                to="/auth"
                aria-label="Sign in"
                className="hidden h-10 w-10 place-items-center rounded-full text-forest-800 transition-colors duration-150 ease-premium hover:bg-white/70 sm:grid"
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </header>
      </div>

      {/* Mobile search sheet */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-[85] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setSearchOpen(false)}
              className="absolute inset-0 bg-forest-900/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              className="absolute inset-x-3 top-3 rounded-3xl border border-white/70 bg-white/90 p-3 shadow-lift backdrop-blur-2xl"
            >
              <form onSubmit={(e) => { e.preventDefault(); navigate(`/products?q=${encodeURIComponent(query.trim())}`); setSearchOpen(false); }} role="search" className="flex items-center gap-2">
                <SearchIcon className="ml-2 h-[18px] w-[18px] text-ink-muted" aria-hidden="true" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search jute bags"
                  aria-label="Search products"
                  className="w-full bg-transparent py-2 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-sand-100"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[85] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-forest-900/35 backdrop-blur-sm"
            />
            <motion.nav
              aria-label="Mobile"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="absolute left-0 top-0 flex h-full w-[82%] max-w-xs flex-col border-r border-white/60 bg-white/94 p-5 shadow-lift backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                  <img
                    src={companySettings?.logo || '/logo.webp'}
                    alt={companySettings?.companyName || 'Saran Jute Bags'}
                    className="h-8 w-8 object-contain"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                  />
                  <div className="h-8 w-8 hidden items-center justify-center bg-gradient-to-br from-forest-600 to-forest-700 rounded-xl text-white font-bold text-xs">
                    SJB
                  </div>
                </Link>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-sand-100"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <ul className="mt-8 space-y-1">
                {[...navLinks, { to: '/wishlist', label: 'Wishlist' }, { to: '/profile', label: 'Profile' }].map(
                  (link) => (
                    <li key={link.to}>
                      <NavLink
                        to={link.to}
                        end={link.to === '/'}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `block rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors duration-200 ease-premium
                            ${isActive
                              ? 'bg-forest-50 text-forest-700'
                              : 'text-ink-soft hover:bg-sand-50'
                            }`
                        }>
                        {link.label}
                      </NavLink>
                    </li>
                  ))
                }
              </ul>
              <div className="mt-auto rounded-3xl bg-forest-50 p-4">
                <p className="font-display text-base text-forest-800">
                  Bulk orders welcome
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                  50+ units with your branding, shipped in 7–10 days.
                </p>
                <Link
                  to="/contact"
                  onClick={() => setMenuOpen(false)}
                  className="mt-3 inline-block text-[13px] font-semibold text-forest-500 underline-offset-4 hover:underline"
                >
                  Talk to our team →
                </Link>
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;