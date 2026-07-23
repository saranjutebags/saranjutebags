import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { ProductProvider } from './contexts/ProductContext';
import { CartProvider } from './contexts/CartContext';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import CartToast from './components/CartToast';
import HelpFloatButton from './components/HelpFloatButton';

// Eagerly-loaded small views
import LandingView from './views/LandingView';
import AuthView from './views/AuthView';
import ProductsView from './views/ProductsView';
import CategoriesView from './views/CategoriesView';
import AboutView from './views/AboutView';
import ContactView from './views/ContactView';
import PrivacyView from './views/PrivacyView';
import TermsView from './views/TermsView';
import CartView from './views/CartView';
import WishlistView from './views/WishlistView';

// Lazy-loaded heavy views — loaded only when the user navigates to them
const SplashScreen = lazy(() => import('./components/SplashScreen'));
const ProductView = lazy(() => import('./views/ProductView'));
const CheckoutView = lazy(() => import('./views/CheckoutView'));
const ProfileView = lazy(() => import('./views/ProfileView'));
const OrdersView = lazy(() => import('./views/OrdersView'));
const OrderDoneView = lazy(() => import('./views/OrderDoneView'));
const OrderInfoView = lazy(() => import('./views/OrderInfoView'));
const AdminDashboard = lazy(() => import('./views/AdminDashboard'));
const DashboardView = lazy(() => import('./views/DashboardView'));

// Minimal fallback while heavy views load
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      <span className="text-emerald-600 font-medium text-sm">Loading…</span>
    </div>
  </div>
);

const allowedAdminRoles = new Set(['admin', 'super admin', 'manager', 'inventory manager', 'order manager', 'customer support']);

const ProtectedAdminRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold">Loading dashboard…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const role = (userData?.role || '').toLowerCase();
  if (role === 'customer') {
    return <Navigate to="/profile" replace />;
  }

  if (!allowedAdminRoles.has(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppShell = () => {
  const { companySettings } = useAdmin();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', companySettings?.primaryColor || '#059669');
    root.style.setProperty('--brand-secondary', companySettings?.secondaryColor || '#10b981');
    root.style.setProperty('--brand-surface', companySettings?.surfaceColor || '#ecfdf5');
  }, [companySettings]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${companySettings?.surfaceColor || '#ecfdf5'} 0%, #ffffff 50%, ${companySettings?.secondaryColor || '#dcfce7'} 100%)`,
      }}
    >
      <Header />
      <CartToast />
      <HelpFloatButton />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingView />} />
          <Route path="/auth" element={<AuthView />} />
          <Route path="/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="/admin-old" element={<ProtectedAdminRoute><DashboardView /></ProtectedAdminRoute>} />
          <Route path="/products" element={<ProductsView />} />
          {/* Slug-based product URL (shareable by name) */}
          <Route path="/product/:slug" element={<ProductView />} />
          <Route path="/cart" element={<CartView />} />
          <Route path="/checkout" element={<CheckoutView />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/orders" element={<OrdersView />} />
          <Route path="/orders/:id" element={<OrderInfoView />} />
          <Route path="/order-done" element={<OrderDoneView />} />
          <Route path="/wishlist" element={<WishlistView />} />
          <Route path="/categories" element={<CategoriesView />} />
          <Route path="/about" element={<AboutView />} />
          <Route path="/contact" element={<ContactView />} />
          <Route path="/privacy" element={<PrivacyView />} />
          <Route path="/terms" element={<TermsView />} />
        </Routes>
      </Suspense>
    </div>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return (
      <Suspense fallback={<PageLoader />}>
        <SplashScreen onComplete={handleSplashComplete} />
      </Suspense>
    );
  }

  return (
    <AuthProvider>
      <AdminProvider>
        <ProductProvider>
          <CartProvider>
            <Router>
              <AppShell />
            </Router>
          </CartProvider>
        </ProductProvider>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;
