import { Home, ShoppingBag, Package, User, LogIn } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

// App-style tab bar for phones, where the top navigation is collapsed behind a
// hamburger. Every tab rests on a faint brand tint, and the tab whose page is
// open carries the full colour fill.
//
// The fill is a single shared element (one layoutId), so when the route changes
// it slides from the old tab to the new one instead of blinking on and off.
const TabShell = ({ active, children }) => (
  <span
    className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#1B4D3E]/5 py-2 text-[11px] font-semibold transition-all duration-300 active:scale-95 ${
      active ? 'text-white' : 'text-[#3E7A63]'
    }`}
  >
    {active && (
      <motion.span
        layoutId="nav-tab-fill"
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#1B4D3E] to-[#3E7A63] shadow-md"
      />
    )}
    <span className="relative z-10 flex flex-col items-center gap-1">{children}</span>
  </span>
);

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const { user } = useAuth();
  const { cartCount } = useCart();

  // Pages reserve space for this bar through the same measured-height variable
  // the header uses, so nothing sits behind the tabs at any width.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return undefined;
    const publish = () => {
      if (el.offsetHeight > 0) document.documentElement.style.setProperty('--site-bottom-nav-h', `${el.offsetHeight}px`);
    };
    publish();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', publish);
      return () => window.removeEventListener('resize', publish);
    }
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, [location.pathname]);

  if (location.pathname === '/dashboard') return null;

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));
  const profileActive = user && (isActive('/profile') || isActive('/orders') || isActive('/wishlist'));

  const tabs = [
    { path: '/', label: 'Home', Icon: Home },
    { path: '/products', label: 'Products', Icon: Package },
    { path: '/cart', label: 'Cart', Icon: ShoppingBag },
  ];

  return (
    <nav
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden site-bottom-nav"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 items-center gap-1.5 px-2 py-1.5">
        {tabs.map(({ path, label, Icon }) => (
          <Link key={path} to={path} aria-label={label}>
            <TabShell active={isActive(path)}>
              <span className="relative">
                <Icon className="w-5 h-5" />
                {label === 'Cart' && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#1B4D3E] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </TabShell>
          </Link>
        ))}

        {/* Signed-out shoppers get the sign-in screen from the same slot. */}
        <button type="button" onClick={() => navigate(user ? '/profile' : '/auth')} aria-label={user ? 'Profile' : 'Login'}>
          <TabShell active={profileActive}>
            {user ? <User className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            <span>{user ? 'Profile' : 'Login'}</span>
          </TabShell>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
