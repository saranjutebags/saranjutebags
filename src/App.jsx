import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { ProductProvider } from './contexts/ProductContext';
import { CartProvider } from './contexts/CartContext';
import Header from './components/Header';
import SplashScreen from './components/SplashScreen';
import LandingView from './views/LandingView';
import AuthView from './views/AuthView';
import DashboardView from './views/DashboardView';
import AdminDashboard from './views/AdminDashboard';
import ProductsView from './views/ProductsView';
import ProductView from './views/ProductView';
import CartView from './views/CartView';
import CheckoutView from './views/CheckoutView';
import ProfileView from './views/ProfileView';
import OrdersView from './views/OrdersView';
import OrderDoneView from './views/OrderDoneView';
import OrderInfoView from './views/OrderInfoView';
import CategoriesView from './views/CategoriesView';
import AboutView from './views/AboutView';
import ContactView from './views/ContactView';
import WishlistView from './views/WishlistView';
import PrivacyView from './views/PrivacyView';
import TermsView from './views/TermsView';
import CartToast from './components/CartToast';
import HelpFloatButton from './components/HelpFloatButton';
import CouponPopup from './components/CouponPopup';

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
      <CouponPopup />
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/auth" element={<AuthView />} />
        <Route path="/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
        <Route path="/admin-old" element={<ProtectedAdminRoute><DashboardView /></ProtectedAdminRoute>} />
        <Route path="/products" element={<ProductsView />} />
        <Route path="/product/:id" element={<ProductView />} />
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
    </div>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(false); // Disabled splash screen temporarily

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
    return <SplashScreen onComplete={handleSplashComplete} />;
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
