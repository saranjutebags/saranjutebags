import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileDown,
  Heart,
  Home,
  ImagePlus,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Package,
  Palette,
  PieChart,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  ShoppingBag,
  Tag,
  Ticket,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  AlertTriangle,
  Clock3,
  Star,
  Upload,
  Search,
  Moon,
  Sun,
  X,
  Layers,
  Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductContext';
import { useAdmin } from '../contexts/AdminContext';
import { adminFeatureRoadmap, getRoadmapStats, ADMIN_FEATURE_STATUS } from '../data/adminFeatureRoadmap';
import { jsPDF } from 'jspdf';
import { convertFileToBase64, validateImageFile } from '../utils/imageUtils';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'marketing', label: 'Marketing', icon: ImagePlus },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'reports', label: 'Reports', icon: FileDown },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'roadmap', label: 'Roadmap', icon: Palette },
];

const roadmapStatusStyles = {
  [ADMIN_FEATURE_STATUS.done]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [ADMIN_FEATURE_STATUS.partial]: 'bg-amber-100 text-amber-700 border-amber-200',
  [ADMIN_FEATURE_STATUS.pending]: 'bg-rose-100 text-rose-700 border-rose-200',
};

const roadmapStatusLabels = {
  [ADMIN_FEATURE_STATUS.done]: 'Done',
  [ADMIN_FEATURE_STATUS.partial]: 'Partial',
  [ADMIN_FEATURE_STATUS.pending]: 'Pending',
};

const LockIcon = Lock;

const emptyProductDraft = {
  name: '',
  shortDescription: '',
  description: '',
  category: 'Jute Bags',
  subCategory: '',
  price: 0,
  originalPrice: 0,
  stock: 0,
  lowStockAlert: 10,
  material: '',
  dimensions: '',
  weight: '',
  colors: '',
  sizes: '',
  tags: '',
  sku: '',
  barcode: '',
  hsnCode: '',
  brand: '',
  specifications: '',
  images: '',
  videos: '',
  featured: false,
  bestseller: false,
  newArrival: false,
  visible: true,
  archived: false,
  discountPercentage: 0,
  seoTitle: '',
  seoDescription: '',
};

const emptyCategoryDraft = {
  name: '',
  image: '',
  banner: '',
  icon: 'Tag',
  sortOrder: 1,
  featured: true,
  visible: true,
};

const emptyPopupDraft = {
  title: '',
  subtitle: '',
  description: '',
  image: '',
  buttonText: '',
  buttonLink: '/products',
  couponCode: '',
  startDate: '',
  endDate: '',
  priority: 1,
  autoCloseTimer: 0,
  showOnce: false,
  closeButton: true,
  active: true,
};

const emptyBannerDraft = {
  title: '',
  image: '',
  type: 'Desktop Banner',
  animation: 'Fade',
  startDate: '',
  endDate: '',
  active: true,
};

const formatCurrency = (value) => `₹${Number(value || 0).toFixed(2)}`;

const listFromString = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const downloadTextFile = (filename, content, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  downloadTextFile(filename, csv, 'text/csv');
};

const downloadInvoicePdf = (order, companySettings) => {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text(`${companySettings.companyName} - TAX INVOICE`, 14, 18);
  pdf.setFontSize(10);
  pdf.text(companySettings.addressLine1, 14, 28);
  pdf.text(companySettings.cityStatePin, 14, 34);
  pdf.text(`GSTIN : ${companySettings.gstin}`, 14, 40);
  pdf.text(`Phone : ${companySettings.phone}`, 14, 46);
  pdf.text(`Email : ${companySettings.email}`, 14, 52);
  pdf.text(`Invoice No : ${companySettings.invoicePrefix}-${String(order.id).slice(-6)}`, 14, 62);
  pdf.text(`Invoice Date : ${order.date}`, 14, 68);
  pdf.text(`Order ID : ${order.id}`, 14, 74);
  pdf.text(`Payment : ${order.paymentMethod}`, 14, 80);

  let y = 92;
  pdf.text('Items', 14, y);
  y += 8;
  order.items.forEach((item, index) => {
    pdf.text(`${index + 1}. ${item.name} x ${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`, 14, y);
    y += 7;
  });

  const pricing = order.pricing || {
    subtotal: order.subtotal ?? order.total,
    discountAmount: order.discountAmount ?? 0,
    shipping: order.shippingCharge ?? 0,
    gstRate: order.gstRate ?? 0,
    gstAmount: order.gstAmount ?? 0,
    grandTotal: order.grandTotal ?? order.total,
  };

  y += 4;
  pdf.text(`Subtotal: ₹${pricing.subtotal.toFixed(2)}`, 14, y);
  y += 7;
  pdf.text(`Discount: -₹${pricing.discountAmount.toFixed(2)}`, 14, y);
  y += 7;
  pdf.text(`Shipping: ${pricing.shipping === 0 ? 'Free' : `₹${pricing.shipping.toFixed(2)}`}`, 14, y);
  y += 7;
  pdf.text(`${companySettings.taxLabel} (${pricing.gstRate}%): ₹${pricing.gstAmount.toFixed(2)}`, 14, y);
  y += 7;
  pdf.text(`Grand Total: ₹${pricing.grandTotal.toFixed(2)}`, 14, y);
  pdf.save(`${companySettings.invoicePrefix}-${order.id}.pdf`);
};

const MetricCard = ({ label, value, icon: Icon, accent = 'text-emerald-600', isDarkMode }) => (
  <div className={`rounded-2xl p-5 border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'glass border-emerald-100'}`}>
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} text-sm font-medium`}>{label}</p>
        <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-emerald-400' : 'text-gradient'}`}>{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-emerald-100'}`}>
        <Icon className={`w-6 h-6 ${accent}`} />
      </div>
    </div>
  </div>
);

const SvgLineChart = ({ data, isDarkMode }) => {
  if (!data || data.length === 0) return <div className="text-gray-400 py-10 text-center">No data available</div>;
  const width = 500;
  const height = 200;
  const padding = 30;

  const values = data.map(d => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const valRange = maxVal - minVal;

  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (data.length - 1);
    const y = height - padding - ((d.value - minVal) / valRange) * (height - padding * 2);
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + r * (height - padding * 2);
          const gridVal = maxVal - r * valRange;
          return (
            <g key={i} className="opacity-20">
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke={isDarkMode ? '#94a3b8' : '#059669'} strokeWidth={1} strokeDasharray="4 4" />
              <text x={padding - 5} y={y + 4} textAnchor="end" className="text-[9px] font-medium fill-current text-gray-400">{Math.round(gridVal)}</text>
            </g>
          );
        })}

        {/* Shaded Area */}
        {areaD && <path d={areaD} fill="url(#lineGrad)" />}

        {/* Stroke Line */}
        {pathD && (
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer">
            <circle cx={p.x} cy={p.y} r={4} fill="#ffffff" stroke="#10b981" strokeWidth={2.5} className="transition-all hover:r-6" />
            <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
            <title>{`${p.label}: ₹${p.value.toFixed(2)}`}</title>
          </g>
        ))}

        {/* X Axis Labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - 6} textAnchor="middle" className="text-[9px] font-medium fill-current text-gray-400">{p.label}</text>
        ))}
      </svg>
    </div>
  );
};

const SvgBarChart = ({ data, isDarkMode }) => {
  if (!data || data.length === 0) return <div className="text-gray-400 py-10 text-center">No data available</div>;
  const width = 500;
  const height = 200;
  const padding = 30;

  const values = data.map(d => d.value);
  const maxVal = Math.max(...values, 1);
  const barWidth = ((width - padding * 2) / data.length) * 0.7;
  const gap = ((width - padding * 2) / data.length) * 0.3;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + r * (height - padding * 2);
          return (
            <g key={i} className="opacity-10">
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke={isDarkMode ? '#94a3b8' : '#059669'} strokeWidth={1} />
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = padding + i * (barWidth + gap) + gap / 2;
          const barHeight = (d.value / maxVal) * (height - padding * 2);
          const y = height - padding - barHeight;
          return (
            <g key={i} className="group cursor-pointer">
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 4)} rx={4} fill="url(#barGrad)" className="transition-all hover:opacity-90" />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="text-[9px] font-bold fill-current text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">{d.value}</text>
              <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" className="text-[9px] font-medium fill-current text-gray-400">{d.label}</text>
              <title>{`${d.label}: ${d.value}`}</title>
            </g>
          );
        })}
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const SvgPieChart = ({ data, isDarkMode }) => {
  if (!data || data.length === 0) return <div className="text-gray-400 py-10 text-center">No data available</div>;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-gray-400 py-10 text-center">No data available</div>;

  const size = 180;
  const center = size / 2;
  const radius = 70;

  const colors = ['#10b981', '#059669', '#34d399', '#047857', '#6ee7b7', '#059669'];
  let accumulatedAngle = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {data.map((d, i) => {
          const percentage = d.value / total;
          const angle = percentage * 360;

          const x1 = center + radius * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
          const y1 = center + radius * Math.sin((accumulatedAngle - 90) * Math.PI / 180);

          accumulatedAngle += angle;

          const x2 = center + radius * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
          const y2 = center + radius * Math.sin((accumulatedAngle - 90) * Math.PI / 180);

          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathData = [
            `M ${center} ${center}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');

          const sliceColor = colors[i % colors.length];

          return (
            <path key={i} d={pathData} fill={sliceColor} stroke={isDarkMode ? '#1e293b' : '#ffffff'} strokeWidth={2} className="transition-all hover:opacity-90 cursor-pointer">
              <title>{`${d.label}: ${d.value} (${(percentage * 100).toFixed(1)}%)`}</title>
            </path>
          );
        })}
      </svg>
      <div className="space-y-1.5 text-xs max-h-[140px] overflow-y-auto pr-2">
        {data.map((d, i) => {
          const sliceColor = colors[i % colors.length];
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sliceColor }} />
              <span className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-800'}`}>{d.label}</span>
              <span className="text-gray-400">({d.value} - {pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DashboardView = () => {
  const { user, userData, signOut } = useAuth();
  const { coupons, toggleCoupon, updateCouponCode, addCoupon, updateCoupon, deleteCoupon, pricingSettings, updatePricingSettings, orders, updateOrder } = useCart();
  const { products, categories, addProduct, updateProduct, deleteProduct, duplicateProduct, archiveProduct, toggleProductVisibility, updateProductStock, bulkUpdateStock, addInventoryLog, inventoryHistory, addCategory, updateCategory, deleteCategory, toggleCategoryVisibility } = useProducts();
  const { companySettings, homepage, updateCompanySettings, updateHomepage, popups, addPopup, updatePopup, deletePopup, banners, addBanner, updateBanner, deleteBanner, reviews, updateReview, deleteReview, notifications, addNotification, updateNotification, deleteNotification, security, updateSecurity, roles, updateRole, activityLogs, loginHistory, deviceHistory, addActivityLog, addLoginHistory } = useAdmin();
  const navigate = useNavigate();
  const isAdmin = userData?.role === 'admin';
  const [tab, setTab] = useState('overview');
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || '');
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingPopupId, setEditingPopupId] = useState(null);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [productDraft, setProductDraft] = useState(emptyProductDraft);
  const [categoryDraft, setCategoryDraft] = useState(emptyCategoryDraft);
  const [popupDraft, setPopupDraft] = useState(emptyPopupDraft);
  const [bannerDraft, setBannerDraft] = useState(emptyBannerDraft);
  const [notificationDraft, setNotificationDraft] = useState({ title: '', type: 'Offer', message: '', active: true });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [newCouponDraft, setNewCouponDraft] = useState({ code: '', label: '', discount: '', active: true, shouldPopup: false });
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [ordersFilter, setOrdersFilter] = useState('live');
  const [uploadingImage, setUploadingImage] = useState(false);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Protected Admin Route
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const role = (userData?.role || '').toLowerCase();
    if (role === 'customer') {
      navigate('/profile');
    }
  }, [user, userData, navigate]);

  const allowedTabs = useMemo(() => {
    const roleName = (userData?.role || 'admin').toLowerCase();
    if (roleName === 'admin' || roleName === 'super admin' || roleName === 'manager') {
      return tabs;
    }
    if (roleName === 'inventory manager') {
      return tabs.filter(t => ['overview', 'products', 'categories', 'inventory', 'roadmap'].includes(t.id));
    }
    if (roleName === 'order manager') {
      return tabs.filter(t => ['overview', 'orders', 'delivery', 'roadmap'].includes(t.id));
    }
    if (roleName === 'customer support') {
      return tabs.filter(t => ['overview', 'customers', 'reviews', 'roadmap'].includes(t.id));
    }
    return tabs;
  }, [userData]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredOrders = useMemo(() => {
    if (ordersFilter === 'completed') {
      return orders.filter((order) => {
        const status = (order.status || '').toLowerCase();
        return ['delivered', 'cancelled', 'returned', 'refund requested'].includes(status);
      });
    }

    if (ordersFilter === 'all') {
      return orders;
    }

    return orders.filter((order) => {
      const status = (order.status || '').toLowerCase();
      const stage = (order.trackingStage || '').toLowerCase();
      return ['pending', 'placed', 'confirmed', 'packed', 'shipped', 'ontheway', 'out for delivery'].includes(status) || ['confirmed', 'packed', 'shipped', 'ontheway'].includes(stage);
    });
  }, [orders, ordersFilter]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId('');
      return;
    }

    const isSelectedVisible = filteredOrders.some((order) => order.id === selectedOrderId);
    if (!isSelectedVisible) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId) || filteredOrders[0] || null;

  const stats = useMemo(() => {
    const today = new Date();
    const todayString = today.toDateString();
    const monthString = today.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const currentYear = today.getFullYear();

    const normalizedOrders = orders.map((order) => ({
      ...order,
      totalValue: Number(order.pricing?.grandTotal ?? order.grandTotal ?? order.total ?? 0),
      dayKey: new Date(order.date).toDateString(),
      monthKey: new Date(order.date).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      yearKey: new Date(order.date).getFullYear(),
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalRevenue = normalizedOrders.reduce((sum, order) => sum + order.totalValue, 0);
    const todaysRevenue = normalizedOrders.filter((order) => order.dayKey === todayString).reduce((sum, order) => sum + order.totalValue, 0);
    const monthlyRevenue = normalizedOrders.filter((order) => order.monthKey === monthString).reduce((sum, order) => sum + order.totalValue, 0);
    const yearlyRevenue = normalizedOrders.filter((order) => order.yearKey === currentYear).reduce((sum, order) => sum + order.totalValue, 0);
    const pendingOrders = normalizedOrders.filter((order) => ['pending', 'placed'].includes((order.status || '').toLowerCase())).length;
    const confirmedOrders = normalizedOrders.filter((order) => (order.status || '').toLowerCase() === 'confirmed').length;
    const shippedOrders = normalizedOrders.filter((order) => ['packed', 'shipped', 'ontheway', 'delivered'].includes((order.trackingStage || '').toLowerCase())).length;
    const outForDelivery = normalizedOrders.filter((order) => (order.trackingStage || '').toLowerCase() === 'ontheway').length;
    const deliveredOrders = normalizedOrders.filter((order) => (order.trackingStage || '').toLowerCase() === 'delivered').length;
    const cancelledOrders = normalizedOrders.filter((order) => (order.status || '').toLowerCase() === 'cancelled').length;
    const returnedOrders = normalizedOrders.filter((order) => (order.status || '').toLowerCase() === 'returned').length;
    const refundRequests = normalizedOrders.filter((order) => (order.status || '').toLowerCase().includes('refund')).length;
    const codOrders = normalizedOrders.filter((order) => (order.paymentMethod || '').toLowerCase().includes('cod')).length;
    const onlineOrders = normalizedOrders.filter((order) => (order.paymentMethod || '').toLowerCase().includes('online')).length;
    const totalProducts = products.length;
    const lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= product.lowStockAlert).length;
    const outOfStockProducts = products.filter((product) => product.stock <= 0).length;

    const revenueByDay = normalizedOrders.reduce((accumulator, order) => {
      const key = new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      accumulator[key] = (accumulator[key] || 0) + order.totalValue;
      return accumulator;
    }, {});

    const customerMap = new Map();
    normalizedOrders.forEach((order) => {
      const key = order.shippingAddress?.phone || order.shippingAddress?.name || order.id;
      const current = customerMap.get(key) || { orders: 0, spend: 0 };
      customerMap.set(key, { orders: current.orders + 1, spend: current.spend + order.totalValue });
    });
    const totalCustomers = customerMap.size;
    const activeCustomers = [...customerMap.values()].filter((customer) => customer.orders > 0).length;
    const newCustomers = normalizedOrders.length > 0 ? 1 : 0;
    const websiteVisitors = Math.max(orders.length * 18 + products.length * 10, 100);
    const conversionRate = websiteVisitors ? ((orders.length / websiteVisitors) * 100).toFixed(1) : '0.0';

    return {
      totalRevenue,
      todaysRevenue,
      monthlyRevenue,
      yearlyRevenue,
      totalOrders: normalizedOrders.length,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      outForDelivery,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      refundRequests,
      codOrders,
      onlineOrders,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalCustomers,
      activeCustomers,
      newCustomers,
      websiteVisitors,
      conversionRate,
      revenueSeries: Object.entries(revenueByDay).slice(-7).map(([label, value]) => ({ label, value })),
      orderMix: [
        { label: 'Pending', value: pendingOrders },
        { label: 'Shipped', value: shippedOrders },
        { label: 'Delivered', value: deliveredOrders },
        { label: 'Cancelled', value: cancelledOrders },
      ],
      paymentMix: [
        { label: 'COD', value: codOrders },
        { label: 'Online', value: onlineOrders },
      ],
      categoryMix: categories.map((category) => ({
        label: category.name,
        value: products.filter((product) => product.category === category.name).length,
      })),
    };
  }, [categories, orders, products]);

  const statusActions = [
    { label: 'Confirm', updates: { status: 'Confirmed', trackingStage: 'confirmed' } },
    { label: 'Pack', updates: { status: 'Packed', trackingStage: 'packed' } },
    { label: 'Ship', updates: { status: 'Shipped', trackingStage: 'shipped' } },
    { label: 'Out for Delivery', updates: { status: 'Out for Delivery', trackingStage: 'ontheway' } },
    { label: 'Delivered', updates: { status: 'Delivered', trackingStage: 'delivered' } },
    { label: 'Return', updates: { status: 'Returned', trackingStage: 'delivered' } },
    { label: 'Refund', updates: { status: 'Refund Requested', trackingStage: 'delivered' } },
  ];

  const resetProductDraft = () => {
    setProductDraft(emptyProductDraft);
    setEditingProductId(null);
  };

  const resetCategoryDraft = () => {
    setCategoryDraft(emptyCategoryDraft);
    setEditingCategoryId(null);
  };

  const resetPopupDraft = () => {
    setPopupDraft(emptyPopupDraft);
    setEditingPopupId(null);
  };

  const resetBannerDraft = () => {
    setBannerDraft(emptyBannerDraft);
    setEditingBannerId(null);
  };

  const handleProductSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...productDraft,
      price: Number(productDraft.price) || 0,
      originalPrice: Number(productDraft.originalPrice) || 0,
      stock: Number(productDraft.stock) || 0,
      lowStockAlert: Number(productDraft.lowStockAlert) || 0,
      discountPercentage: Number(productDraft.discountPercentage) || 0,
      images: listFromString(productDraft.images),
      videos: listFromString(productDraft.videos),
      colors: listFromString(productDraft.colors),
      sizes: listFromString(productDraft.sizes),
      tags: listFromString(productDraft.tags),
      specifications: listFromString(productDraft.specifications),
      featured: Boolean(productDraft.featured),
      bestseller: Boolean(productDraft.bestseller),
      newArrival: Boolean(productDraft.newArrival),
      visible: Boolean(productDraft.visible),
      archived: Boolean(productDraft.archived),
    };

    if (editingProductId) {
      updateProduct(editingProductId, payload);
    } else {
      addProduct(payload);
    }
    resetProductDraft();
  };

  const handleCategorySubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...categoryDraft,
      sortOrder: Number(categoryDraft.sortOrder) || 1,
      featured: Boolean(categoryDraft.featured),
      visible: Boolean(categoryDraft.visible),
    };

    if (editingCategoryId) {
      updateCategory(editingCategoryId, payload);
    } else {
      addCategory(payload);
    }
    resetCategoryDraft();
  };

  const handlePopupSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...popupDraft,
      priority: Number(popupDraft.priority) || 1,
      autoCloseTimer: Number(popupDraft.autoCloseTimer) || 0,
      active: Boolean(popupDraft.active),
      showOnce: Boolean(popupDraft.showOnce),
      closeButton: Boolean(popupDraft.closeButton),
    };

    if (editingPopupId) {
      updatePopup(editingPopupId, payload);
    } else {
      addPopup(payload);
    }
    resetPopupDraft();
  };

  const handleBannerSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...bannerDraft,
      active: Boolean(bannerDraft.active),
    };

    if (editingBannerId) {
      updateBanner(editingBannerId, payload);
    } else {
      addBanner(payload);
    }
    resetBannerDraft();
  };

  const handleImageUpload = async (event, targetStateSetter) => {
    const file = event.target.files[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      addToast(validation.error, 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const base64 = await convertFileToBase64(file);
      targetStateSetter(base64);
      addToast('Image uploaded successfully');
    } catch (error) {
      addToast('Failed to upload image', 'error');
      console.error('Image upload error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateNotification = (event) => {
    event.preventDefault();
    addNotification(notificationDraft);
    setNotificationDraft({ title: '', type: 'Offer', message: '', active: true });
  };

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={IndianRupee} />
        <MetricCard label="Today's Revenue" value={formatCurrency(stats.todaysRevenue)} icon={BarChart3} />
        <MetricCard label="Monthly Revenue" value={formatCurrency(stats.monthlyRevenue)} icon={PieChart} />
        <MetricCard label="Yearly Revenue" value={formatCurrency(stats.yearlyRevenue)} icon={TrendingUp} />
        <MetricCard label="Total Orders" value={stats.totalOrders} icon={ShoppingBag} />
        <MetricCard label="Pending Orders" value={stats.pendingOrders} icon={Clock3} />
        <MetricCard label="Confirmed Orders" value={stats.confirmedOrders} icon={CheckCircle2} />
        <MetricCard label="Shipped Orders" value={stats.shippedOrders} icon={Truck} />
        <MetricCard label="Out for Delivery" value={stats.outForDelivery} icon={Truck} />
        <MetricCard label="Delivered Orders" value={stats.deliveredOrders} icon={CheckCircle2} />
        <MetricCard label="Cancelled Orders" value={stats.cancelledOrders} icon={AlertTriangle} />
        <MetricCard label="Returned Orders" value={stats.returnedOrders} icon={AlertTriangle} />
        <MetricCard label="Refund Requests" value={stats.refundRequests} icon={AlertTriangle} />
        <MetricCard label="COD Orders" value={stats.codOrders} icon={ShoppingBag} />
        <MetricCard label="Online Orders" value={stats.onlineOrders} icon={ShoppingBag} />
        <MetricCard label="Total Products" value={stats.totalProducts} icon={Boxes} />
        <MetricCard label="Low Stock" value={stats.lowStockProducts} icon={AlertTriangle} />
        <MetricCard label="Out of Stock" value={stats.outOfStockProducts} icon={AlertTriangle} />
        <MetricCard label="Total Customers" value={stats.totalCustomers} icon={Users} />
        <MetricCard label="Active Customers" value={stats.activeCustomers} icon={Users} />
        <MetricCard label="New Customers" value={stats.newCustomers} icon={Users} />
        <MetricCard label="Website Visitors" value={stats.websiteVisitors} icon={Eye} />
        <MetricCard label="Conversion Rate" value={`${stats.conversionRate}%`} icon={ArrowRight} />
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="glass rounded-3xl p-6 border border-emerald-100 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500 font-medium">Revenue Graph</p>
              <h3 className="text-2xl font-bold text-gray-800">Order Analytics</h3>
            </div>
            <BarChart3 className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="grid sm:grid-cols-7 gap-3 items-end h-48">
            {stats.revenueSeries.length === 0 ? (
              <div className="col-span-7 h-full flex items-center justify-center text-gray-400">No revenue data yet</div>
            ) : stats.revenueSeries.map((point, index) => {
              const maxValue = Math.max(...stats.revenueSeries.map((item) => item.value), 1);
              const height = Math.max((point.value / maxValue) * 100, 12);
              return (
                <div key={`${point.label}-${index}`} className="flex flex-col items-center justify-end h-full">
                  <div className="w-full flex-1 flex items-end">
                    <div className="w-full rounded-t-2xl bg-gradient-to-t from-emerald-500 to-emerald-300" style={{ height: `${height}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{point.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border border-emerald-100 space-y-5">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Order Mix</h3>
            {stats.orderMix.map((item) => (
              <div key={item.label} className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-800">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.max(item.value * 20, item.value ? 20 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Payment Mix</h3>
            {stats.paymentMix.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl bg-white border border-gray-100 px-4 py-3 mb-3">
                <span className="text-gray-700 font-medium">{item.label}</span>
                <span className="font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="grid xl:grid-cols-[420px_1fr] gap-6">
      <div className="glass rounded-3xl border border-emerald-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{editingProductId ? 'Edit Product' : 'Add Product'}</h3>
            <p className="text-sm text-gray-500">Manage product title, pricing, images, stock, and SEO.</p>
          </div>
          <button onClick={resetProductDraft} className="text-sm text-emerald-700 font-semibold inline-flex items-center gap-1"><RefreshCw className="w-4 h-4" />Reset</button>
        </div>

        <form onSubmit={handleProductSubmit} className="space-y-4">
          <input value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} placeholder="Product name" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
          <input value={productDraft.shortDescription} onChange={(event) => setProductDraft({ ...productDraft, shortDescription: event.target.value })} placeholder="Short description" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
          <textarea value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} placeholder="Full description" rows={4} className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" />
          <div className="grid md:grid-cols-2 gap-3">
            <input value={productDraft.category} onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })} placeholder="Category" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input value={productDraft.subCategory} onChange={(event) => setProductDraft({ ...productDraft, subCategory: event.target.value })} placeholder="Sub category" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input type="number" value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} placeholder="Selling price" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input type="number" value={productDraft.originalPrice} onChange={(event) => setProductDraft({ ...productDraft, originalPrice: event.target.value })} placeholder="MRP" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input type="number" value={productDraft.stock} onChange={(event) => setProductDraft({ ...productDraft, stock: event.target.value })} placeholder="Stock qty" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input type="number" value={productDraft.lowStockAlert} onChange={(event) => setProductDraft({ ...productDraft, lowStockAlert: event.target.value })} placeholder="Low stock alert" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input value={productDraft.sku} onChange={(event) => setProductDraft({ ...productDraft, sku: event.target.value })} placeholder="SKU" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input value={productDraft.barcode} onChange={(event) => setProductDraft({ ...productDraft, barcode: event.target.value })} placeholder="Barcode" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input value={productDraft.hsnCode} onChange={(event) => setProductDraft({ ...productDraft, hsnCode: event.target.value })} placeholder="HSN code" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input value={productDraft.brand} onChange={(event) => setProductDraft({ ...productDraft, brand: event.target.value })} placeholder="Brand" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input value={productDraft.material} onChange={(event) => setProductDraft({ ...productDraft, material: event.target.value })} placeholder="Material" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input value={productDraft.dimensions} onChange={(event) => setProductDraft({ ...productDraft, dimensions: event.target.value })} placeholder='Dimensions' className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input value={productDraft.weight} onChange={(event) => setProductDraft({ ...productDraft, weight: event.target.value })} placeholder="Weight" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
          </div>
          <textarea value={productDraft.colors} onChange={(event) => setProductDraft({ ...productDraft, colors: event.target.value })} placeholder="Colors comma separated" rows={2} className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" />
          <textarea value={productDraft.sizes} onChange={(event) => setProductDraft({ ...productDraft, sizes: event.target.value })} placeholder="Sizes comma separated" rows={2} className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" />
          <textarea value={productDraft.tags} onChange={(event) => setProductDraft({ ...productDraft, tags: event.target.value })} placeholder="Tags comma separated" rows={2} className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" />
          <textarea value={productDraft.specifications} onChange={(event) => setProductDraft({ ...productDraft, specifications: event.target.value })} placeholder="Specifications comma separated" rows={3} className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" />
          <div className="space-y-2">
            <textarea value={productDraft.images} onChange={(event) => setProductDraft({ ...productDraft, images: event.target.value })} placeholder="Image paths comma separated" rows={2} className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" />
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, (base64) => setProductDraft({ ...productDraft, images: productDraft.images ? `${productDraft.images}, ${base64}` : base64 }))}
                className="hidden"
                id="productImageUpload"
              />
              <label htmlFor="productImageUpload" className="btn-secondary px-4 py-2 cursor-pointer inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploadingImage ? 'Uploading...' : 'Upload Image'}
              </label>
            </div>
          </div>
          <textarea value={productDraft.videos} onChange={(event) => setProductDraft({ ...productDraft, videos: event.target.value })} placeholder="Video links comma separated" rows={2} className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" />
          <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={productDraft.featured} onChange={(event) => setProductDraft({ ...productDraft, featured: event.target.checked })} />Featured</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={productDraft.bestseller} onChange={(event) => setProductDraft({ ...productDraft, bestseller: event.target.checked })} />Bestseller</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={productDraft.newArrival} onChange={(event) => setProductDraft({ ...productDraft, newArrival: event.target.checked })} />New arrival</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={productDraft.visible} onChange={(event) => setProductDraft({ ...productDraft, visible: event.target.checked })} />Visible</label>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input value={productDraft.seoTitle} onChange={(event) => setProductDraft({ ...productDraft, seoTitle: event.target.value })} placeholder="SEO title" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input value={productDraft.seoDescription} onChange={(event) => setProductDraft({ ...productDraft, seoDescription: event.target.value })} placeholder="SEO description" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
          </div>
          <button className="btn-primary px-5 py-3 w-full">{editingProductId ? 'Update Product' : 'Add Product'}</button>
        </form>
      </div>

      <div className="glass rounded-3xl border border-emerald-100 p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Product Catalog</h3>
            <p className="text-sm text-gray-500">Edit, duplicate, archive, hide, or restock products.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-3 pr-3">Product</th>
                <th className="py-3 pr-3">Category</th>
                <th className="py-3 pr-3">Price</th>
                <th className="py-3 pr-3">Stock</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 align-top">
                  <td className="py-4 pr-3">
                    <div className="flex items-center gap-3">
                      <img src={product.images?.[0]} alt={product.name} className="w-14 h-14 object-contain rounded-2xl border border-gray-100 bg-white" />
                      <div>
                        <p className="font-semibold text-gray-800">{product.name}</p>
                        <p className="text-xs text-gray-500">SKU {product.sku} • {product.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-3 text-gray-700">{product.category}</td>
                  <td className="py-4 pr-3 text-gray-700">{formatCurrency(product.price)}<div className="text-xs text-gray-400">MRP {formatCurrency(product.originalPrice)}</div></td>
                  <td className="py-4 pr-3">
                    <div className="flex items-center gap-2">
                      <input type="number" value={product.stock} onChange={(event) => updateProductStock(product.id, event.target.value)} className="w-20 rounded-xl border border-gray-200 px-3 py-2 bg-white" />
                      {product.stock <= product.lowStockAlert && <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Low</span>}
                    </div>
                  </td>
                  <td className="py-4 pr-3">
                    <span className={`text-xs px-3 py-1 rounded-full ${product.archived ? 'bg-gray-100 text-gray-600' : product.visible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {product.archived ? 'Archived' : product.visible ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-4 pr-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => {
                        setEditingProductId(product.id);
                        setProductDraft({
                          ...emptyProductDraft,
                          ...product,
                          colors: (product.colors || []).join(', '),
                          sizes: (product.sizes || []).join(', '),
                          tags: (product.tags || []).join(', '),
                          specifications: (product.specifications || []).join(', '),
                          images: (product.images || []).join(', '),
                          videos: (product.videos || []).join(', '),
                        });
                      }} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 inline-flex items-center gap-1"> <Edit3 className="w-4 h-4" />Edit</button>
                      <button onClick={() => duplicateProduct(product.id)} className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 inline-flex items-center gap-1"><Copy className="w-4 h-4" />Duplicate</button>
                      <button onClick={() => archiveProduct(product.id)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 inline-flex items-center gap-1"><Trash2 className="w-4 h-4" />Archive</button>
                      <button onClick={() => toggleProductVisibility(product.id)} className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 inline-flex items-center gap-1">{product.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{product.visible ? 'Hide' : 'Show'}</button>
                      <button onClick={() => deleteProduct(product.id)} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 inline-flex items-center gap-1"><Trash2 className="w-4 h-4" />Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="grid xl:grid-cols-[360px_1fr] gap-6">
      <div className="glass rounded-3xl border border-emerald-100 p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">{editingCategoryId ? 'Edit Category' : 'Add Category'}</h3>
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <input value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} placeholder="Category name" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
          <div className="space-y-2">
            <input value={categoryDraft.image} onChange={(event) => setCategoryDraft({ ...categoryDraft, image: event.target.value })} placeholder="Category image path" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, (base64) => setCategoryDraft({ ...categoryDraft, image: base64 }))}
                className="hidden"
                id="categoryImageUpload"
              />
              <label htmlFor="categoryImageUpload" className="btn-secondary px-4 py-2 cursor-pointer inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploadingImage ? 'Uploading...' : 'Upload Image'}
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <input value={categoryDraft.banner} onChange={(event) => setCategoryDraft({ ...categoryDraft, banner: event.target.value })} placeholder="Category banner path" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, (base64) => setCategoryDraft({ ...categoryDraft, banner: base64 }))}
                className="hidden"
                id="categoryBannerUpload"
              />
              <label htmlFor="categoryBannerUpload" className="btn-secondary px-4 py-2 cursor-pointer inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploadingImage ? 'Uploading...' : 'Upload Banner'}
              </label>
            </div>
          </div>
          <input value={categoryDraft.icon} onChange={(event) => setCategoryDraft({ ...categoryDraft, icon: event.target.value })} placeholder="Category icon" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
          <input type="number" value={categoryDraft.sortOrder} onChange={(event) => setCategoryDraft({ ...categoryDraft, sortOrder: event.target.value })} placeholder="Sort order" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={categoryDraft.featured} onChange={(event) => setCategoryDraft({ ...categoryDraft, featured: event.target.checked })} />Featured</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={categoryDraft.visible} onChange={(event) => setCategoryDraft({ ...categoryDraft, visible: event.target.checked })} />Visible</label>
          <button className="btn-primary px-5 py-3 w-full">{editingCategoryId ? 'Update Category' : 'Add Category'}</button>
        </form>
      </div>

      <div className="glass rounded-3xl border border-emerald-100 p-6 overflow-hidden">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Category Management</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {categories.map((category) => (
            <div key={category.id} className="rounded-2xl border border-gray-100 bg-white p-4 flex items-center gap-4">
              <img src={category.image} alt={category.name} className="w-16 h-16 object-contain rounded-2xl bg-emerald-50 border border-emerald-100" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-gray-800 truncate">{category.name}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${category.visible ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{category.visible ? 'Visible' : 'Hidden'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Sort order {category.sortOrder}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => {
                    setEditingCategoryId(category.id);
                    setCategoryDraft({ ...emptyCategoryDraft, ...category });
                  }} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 inline-flex items-center gap-1"><Edit3 className="w-4 h-4" />Edit</button>
                  <button onClick={() => toggleCategoryVisibility(category.id)} className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 inline-flex items-center gap-1">{category.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{category.visible ? 'Hide' : 'Show'}</button>
                  <button onClick={() => deleteCategory(category.id)} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 inline-flex items-center gap-1"><Trash2 className="w-4 h-4" />Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="grid xl:grid-cols-[360px_1fr] gap-6">
      <div className="glass rounded-3xl border border-emerald-100 p-6 max-h-[78vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-2xl font-bold text-gray-800">Orders</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'live', label: 'Live' },
              { id: 'completed', label: 'Completed' },
              { id: 'all', label: 'All' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setOrdersFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${ordersFilter === filter.id ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <button key={order.id} onClick={() => setSelectedOrderId(order.id)} className={`w-full text-left rounded-2xl border p-4 ${selectedOrder?.id === order.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white'}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">{order.id}</p>
                  <p className="text-xs text-gray-500">{order.shippingAddress?.name} • {order.date}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
  order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
  order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
  'bg-orange-100 text-orange-700'
}`}>{order.status}</span>
              </div>
            </button>
          ))}
          {filteredOrders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 text-center">
              No orders in this view.
            </div>
          )}
        </div>
      </div>

      {selectedOrder ? (
        <div className="space-y-6">
          <div className="glass rounded-3xl border border-emerald-100 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Order {selectedOrder.id}</h3>
                <p className="text-sm text-gray-500">{selectedOrder.date}</p>
              </div>
              <button onClick={() => downloadInvoicePdf(selectedOrder, companySettings)} className="btn-secondary px-4 py-2 inline-flex items-center gap-2"><Download className="w-4 h-4" />Download Invoice</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="font-semibold text-gray-800 mb-2">Customer</p>
                <p>{selectedOrder.shippingAddress?.name}</p>
                <p>{selectedOrder.shippingAddress?.phone}</p>
                <p>{selectedOrder.shippingAddress?.addressLine1}</p>
                <p>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="font-semibold text-gray-800 mb-2">Payment</p>
                <p>{selectedOrder.paymentMethod}</p>
                <p>Status: {selectedOrder.status}</p>
                <p>Tracking: {selectedOrder.trackingStage}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {statusActions.map((action) => (
                <button key={action.label} onClick={() => updateOrder(selectedOrder.id, action.updates)} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700">{action.label}</button>
              ))}
              <button onClick={() => updateOrder(selectedOrder.id, { status: 'Cancelled', cancelReason: 'Admin cancelled', cancelledAt: new Date().toLocaleString() })} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700">Cancel</button>
            </div>
          </div>

          <div className="glass rounded-3xl border border-emerald-100 p-6">
            <h4 className="text-xl font-bold text-gray-800 mb-4">Ordered Products</h4>
            <div className="space-y-3">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4 bg-white">
                  <img src={item.images?.[0]} alt={item.name} className="w-16 h-16 object-contain rounded-2xl bg-emerald-50 border border-emerald-100" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty {item.quantity} • {formatCurrency(item.price)}</p>
                  </div>
                  <p className="font-bold text-gray-800">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-3xl border border-emerald-100 p-8 text-center text-gray-500">No orders available.</div>
      )}
    </div>
  );

  const customers = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const key = order.shippingAddress?.phone || order.shippingAddress?.name || order.id;
      const existing = map.get(key) || { name: order.shippingAddress?.name || 'Customer', phone: order.shippingAddress?.phone || '-', orders: 0, spend: 0, address: order.shippingAddress };
      const orderTotal = Number(order.pricing?.grandTotal ?? order.grandTotal ?? order.total ?? 0);
      map.set(key, { ...existing, orders: existing.orders + 1, spend: existing.spend + orderTotal });
    });
    return [...map.values()];
  }, [orders]);

  const renderCustomers = () => (
    <div className="glass rounded-3xl border border-emerald-100 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">Customer Management</h3>
          <p className="text-sm text-gray-500">Order history, saved addresses, and spend summary.</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <div key={`${customer.phone}-${customer.name}`} className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="font-semibold text-gray-800">{customer.name}</p>
            <p className="text-sm text-gray-500">{customer.phone}</p>
            <p className="text-sm text-gray-600 mt-2">Orders: {customer.orders}</p>
            <p className="text-sm text-gray-600">Total Purchases: {formatCurrency(customer.spend)}</p>
            <p className="text-xs text-gray-500 mt-2">{customer.address?.addressLine1 || 'No address saved'}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const handleCouponSubmit = (e) => {
    e.preventDefault();
    if (!newCouponDraft.code || !newCouponDraft.discount) return;
    if (editingCouponId) {
      updateCoupon(editingCouponId, newCouponDraft);
      addToast('Coupon updated successfully');
      setEditingCouponId(null);
    } else {
      addCoupon({ ...newCouponDraft, id: `coupon-${Date.now()}` });
      addToast('Coupon added successfully');
    }
    setNewCouponDraft({ code: '', label: '', discount: '', active: true, shouldPopup: false });
  };

  const renderCoupons = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">Coupons &amp; Discounts</h3>
          <p className="text-sm text-gray-500">Create, manage, and activate coupon codes.</p>
        </div>
      </div>

      {/* Create / Edit Coupon Form */}
      <div className="glass rounded-3xl border border-emerald-100 p-6">
        <h4 className="font-bold text-gray-800 mb-4">{editingCouponId ? 'Edit Coupon' : 'Create New Coupon'}</h4>
        <form onSubmit={handleCouponSubmit} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Coupon Code *</label>
            <input
              required
              value={newCouponDraft.code}
              onChange={e => setNewCouponDraft({ ...newCouponDraft, code: e.target.value.toUpperCase() })}
              placeholder="e.g. SAVE20"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white text-sm uppercase font-bold tracking-widest"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Label</label>
            <input
              value={newCouponDraft.label}
              onChange={e => setNewCouponDraft({ ...newCouponDraft, label: e.target.value })}
              placeholder="e.g. Festival Sale"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Discount *</label>
            <input
              required
              value={newCouponDraft.discount}
              onChange={e => setNewCouponDraft({ ...newCouponDraft, discount: e.target.value })}
              placeholder="e.g. 10% OFF or Flat ₹50 OFF"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white text-sm"
            />
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={newCouponDraft.active} onChange={e => setNewCouponDraft({ ...newCouponDraft, active: e.target.checked })} className="w-4 h-4" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={newCouponDraft.shouldPopup} onChange={e => setNewCouponDraft({ ...newCouponDraft, shouldPopup: e.target.checked })} className="w-4 h-4" />
              Show as Popup
            </label>
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" className="btn-primary px-6 py-3">{editingCouponId ? 'Update Coupon' : 'Add Coupon'}</button>
            {editingCouponId && (
              <button type="button" onClick={() => { setEditingCouponId(null); setNewCouponDraft({ code: '', label: '', discount: '', active: true, shouldPopup: false }); }} className="btn-secondary px-6 py-3">Cancel</button>
            )}
          </div>
        </form>
      </div>

      {/* Coupon List */}
      <div className="space-y-3">
        {coupons.length === 0 && (
          <div className="text-center text-gray-400 py-8">No coupons yet. Create one above.</div>
        )}
        {coupons.map((coupon) => (
          <div key={coupon.id} className="rounded-2xl border border-emerald-100 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <code className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">{coupon.code}</code>
                <button onClick={() => navigator.clipboard.writeText(coupon.code)} className="text-sm text-emerald-700 hover:text-emerald-800 flex items-center gap-1"><Copy className="w-3.5 h-3.5" />Copy</button>
                {coupon.shouldPopup && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Popup</span>}
              </div>
              <p className="font-semibold text-gray-800">{coupon.label}</p>
              <p className="text-sm text-gray-600">{coupon.discount}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => toggleCoupon(coupon.id)} className={`px-4 py-2 rounded-xl font-semibold text-sm ${coupon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>{coupon.active ? 'Enabled' : 'Disabled'}</button>
              <button onClick={() => { setEditingCouponId(coupon.id); setNewCouponDraft({ code: coupon.code, label: coupon.label || '', discount: coupon.discount || '', active: coupon.active, shouldPopup: coupon.shouldPopup || false }); }} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm">Edit</button>
              <button onClick={() => deleteCoupon(coupon.id)} className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMarketing = () => (
    <div className="space-y-6">
      <div className="glass rounded-3xl border border-emerald-100 p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Homepage Management</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <input value={homepage.heroTitle} onChange={(event) => updateHomepage({ heroTitle: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Hero title" />
          <input value={homepage.ctaText} onChange={(event) => updateHomepage({ ctaText: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="CTA text" />
          <input value={homepage.ctaLink} onChange={(event) => updateHomepage({ ctaLink: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="CTA link" />
          <input value={homepage.heroSubtitle} onChange={(event) => updateHomepage({ heroSubtitle: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Hero subtitle" />
          <textarea value={homepage.aboutText} onChange={(event) => updateHomepage({ aboutText: event.target.value })} rows={4} className="md:col-span-2 rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" placeholder="About section text" />
          <textarea value={homepage.footerText} onChange={(event) => updateHomepage({ footerText: event.target.value })} rows={3} className="md:col-span-2 rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" placeholder="Footer content" />
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="glass rounded-3xl border border-emerald-100 p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Popup Management</h3>
          <form onSubmit={handlePopupSubmit} className="space-y-3 mb-4">
            <input value={popupDraft.title} onChange={(event) => setPopupDraft({ ...popupDraft, title: event.target.value })} placeholder="Popup title" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <input value={popupDraft.subtitle} onChange={(event) => setPopupDraft({ ...popupDraft, subtitle: event.target.value })} placeholder="Subtitle" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <textarea value={popupDraft.description} onChange={(event) => setPopupDraft({ ...popupDraft, description: event.target.value })} rows={3} placeholder="Description" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" />
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <input value={popupDraft.image} onChange={(event) => setPopupDraft({ ...popupDraft, image: event.target.value })} placeholder="Image path" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, (base64) => setPopupDraft({ ...popupDraft, image: base64 }))}
                    className="hidden"
                    id="popupImageUpload"
                  />
                  <label htmlFor="popupImageUpload" className="btn-secondary px-4 py-2 cursor-pointer inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </label>
                </div>
              </div>
              <input value={popupDraft.couponCode} onChange={(event) => setPopupDraft({ ...popupDraft, couponCode: event.target.value })} placeholder="Coupon code" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <input value={popupDraft.buttonText} onChange={(event) => setPopupDraft({ ...popupDraft, buttonText: event.target.value })} placeholder="Button text" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
              <input value={popupDraft.buttonLink} onChange={(event) => setPopupDraft({ ...popupDraft, buttonLink: event.target.value })} placeholder="Button link" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <input type="number" value={popupDraft.priority} onChange={(event) => setPopupDraft({ ...popupDraft, priority: event.target.value })} placeholder="Priority" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
              <input type="number" value={popupDraft.autoCloseTimer} onChange={(event) => setPopupDraft({ ...popupDraft, autoCloseTimer: event.target.value })} placeholder="Auto close seconds" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={popupDraft.active} onChange={(event) => setPopupDraft({ ...popupDraft, active: event.target.checked })} />Active</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={popupDraft.showOnce} onChange={(event) => setPopupDraft({ ...popupDraft, showOnce: event.target.checked })} />Show once</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={popupDraft.closeButton} onChange={(event) => setPopupDraft({ ...popupDraft, closeButton: event.target.checked })} />Close button</label>
            </div>
            <button className="btn-primary px-4 py-3 w-full">{editingPopupId ? 'Update Popup' : 'Add Popup'}</button>
          </form>
          <div className="space-y-3">
            {popups.map((popup) => (
              <div key={popup.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-800">{popup.title}</p>
                    <p className="text-sm text-gray-600">{popup.subtitle}</p>
                    <p className="text-xs text-gray-500 mt-1">{popup.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${popup.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{popup.active ? 'Active' : 'Disabled'}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => { setEditingPopupId(popup.id); setPopupDraft(popup); }} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700">Edit</button>
                  <button onClick={() => updatePopup(popup.id, { active: !popup.active })} className="px-3 py-2 rounded-xl border border-gray-200">Toggle</button>
                  <button onClick={() => deletePopup(popup.id)} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl border border-emerald-100 p-6 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Banner Management</h3>
            <form onSubmit={handleBannerSubmit} className="space-y-3 mb-4">
              <input value={bannerDraft.title} onChange={(event) => setBannerDraft({ ...bannerDraft, title: event.target.value })} placeholder="Banner title" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
              <div className="space-y-2">
                <input value={bannerDraft.image} onChange={(event) => setBannerDraft({ ...bannerDraft, image: event.target.value })} placeholder="Banner image path" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, (base64) => setBannerDraft({ ...bannerDraft, image: base64 }))}
                    className="hidden"
                    id="bannerImageUpload"
                  />
                  <label htmlFor="bannerImageUpload" className="btn-secondary px-4 py-2 cursor-pointer inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </label>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <input value={bannerDraft.type} onChange={(event) => setBannerDraft({ ...bannerDraft, type: event.target.value })} placeholder="Banner type" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
                <input value={bannerDraft.animation} onChange={(event) => setBannerDraft({ ...bannerDraft, animation: event.target.value })} placeholder="Animation" className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
              </div>
              <div className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bannerDraft.active} onChange={(event) => setBannerDraft({ ...bannerDraft, active: event.target.checked })} />Active</div>
              <button className="btn-primary px-4 py-3 w-full">{editingBannerId ? 'Update Banner' : 'Add Banner'}</button>
            </form>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {banners.map((banner) => (
              <div key={banner.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                <img src={banner.image} alt={banner.title} className="h-32 w-full object-cover rounded-2xl mb-3" />
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-gray-800">{banner.title}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${banner.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{banner.type}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setEditingBannerId(banner.id); setBannerDraft(banner); }} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700">Edit</button>
                  <button onClick={() => updateBanner(banner.id, { active: !banner.active })} className="px-3 py-2 rounded-xl border border-gray-200">Toggle</button>
                  <button onClick={() => deleteBanner(banner.id)} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviews = () => (
    <div className="grid xl:grid-cols-[1fr_360px] gap-6">
      <div className="glass rounded-3xl border border-emerald-100 p-6 space-y-4">
        <h3 className="text-2xl font-bold text-gray-800">Reviews Management</h3>
        {reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-800">{review.customer}</p>
                <p className="text-sm text-gray-600">Rating {review.rating}/5</p>
                <p className="text-sm text-gray-500 mt-2">{review.text}</p>
                {review.reply && <p className="text-sm mt-2 text-emerald-700"><span className="font-semibold">Reply:</span> {review.reply}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${review.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{review.status}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => updateReview(review.id, { status: 'Approved' })} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700">Approve</button>
              <button onClick={() => updateReview(review.id, { status: 'Rejected' })} className="px-3 py-2 rounded-xl border border-gray-200">Reject</button>
              <button onClick={() => updateReview(review.id, { featured: !review.featured })} className="px-3 py-2 rounded-xl border border-gray-200">{review.featured ? 'Unfeature' : 'Feature'}</button>
              <button onClick={() => deleteReview(review.id)} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="glass rounded-3xl border border-emerald-100 p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Notifications</h3>
          <form onSubmit={handleCreateNotification} className="space-y-3">
            <input value={notificationDraft.title} onChange={(event) => setNotificationDraft({ ...notificationDraft, title: event.target.value })} placeholder="Notification title" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white" />
            <select value={notificationDraft.type} onChange={(event) => setNotificationDraft({ ...notificationDraft, type: event.target.value })} className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white">
              <option>Offer</option>
              <option>Discount</option>
              <option>Order Update</option>
              <option>Shipping Update</option>
              <option>Stock Available</option>
              <option>New Product</option>
              <option>Festival Wishes</option>
            </select>
            <textarea value={notificationDraft.message} onChange={(event) => setNotificationDraft({ ...notificationDraft, message: event.target.value })} rows={4} placeholder="Message" className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notificationDraft.active} onChange={(event) => setNotificationDraft({ ...notificationDraft, active: event.target.checked })} />Active</label>
            <button className="btn-primary px-4 py-3 w-full">Send Notification</button>
          </form>
        </div>

        <div className="glass rounded-3xl border border-emerald-100 p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Current Notifications</h3>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{notification.title}</p>
                    <p className="text-sm text-gray-500">{notification.type}</p>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${notification.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{notification.active ? 'Active' : 'Disabled'}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => updateNotification(notification.id, { active: !notification.active })} className="px-3 py-2 rounded-xl border border-gray-200">Toggle</button>
                  <button onClick={() => deleteNotification(notification.id)} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReports = () => {
    const salesRows = [['Order ID', 'Date', 'Customer', 'Status', 'Total'], ...orders.map((order) => [order.id, order.date, order.shippingAddress?.name || '-', order.status, order.pricing?.grandTotal ?? order.grandTotal ?? order.total ?? 0])];
    const productRows = [['Product', 'Category', 'Stock', 'Price'], ...products.map((product) => [product.name, product.category, product.stock, product.price])];
    const customerRows = [['Customer', 'Phone', 'Orders', 'Spend'], ...customers.map((customer) => [customer.name, customer.phone, customer.orders, customer.spend])];

    return (
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="glass rounded-3xl border border-emerald-100 p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Sales Reports</h3>
          <button onClick={() => downloadCsv('sales-report.csv', salesRows)} className="btn-primary px-4 py-3 w-full mb-3">Download Sales CSV</button>
          <button onClick={() => downloadCsv('gst-report.csv', [['Order ID', 'GST', 'Grand Total'], ...orders.map((order) => [order.id, order.gstAmount ?? 0, order.pricing?.grandTotal ?? order.total ?? 0])])} className="btn-secondary px-4 py-3 w-full">Download GST CSV</button>
        </div>
        <div className="glass rounded-3xl border border-emerald-100 p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Catalog Reports</h3>
          <button onClick={() => downloadCsv('product-report.csv', productRows)} className="btn-primary px-4 py-3 w-full mb-3">Download Products CSV</button>
          <button onClick={() => downloadCsv('customer-report.csv', customerRows)} className="btn-secondary px-4 py-3 w-full">Download Customers CSV</button>
        </div>
        <div className="glass rounded-3xl border border-emerald-100 p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Quick Snapshot</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <p>Today's Revenue: {formatCurrency(stats.todaysRevenue)}</p>
            <p>Monthly Revenue: {formatCurrency(stats.monthlyRevenue)}</p>
            <p>Yearly Revenue: {formatCurrency(stats.yearlyRevenue)}</p>
            <p>Total Revenue: {formatCurrency(stats.totalRevenue)}</p>
            <p>Total Orders: {stats.totalOrders}</p>
            <p>Total Products: {stats.totalProducts}</p>
            <p>Total Customers: {stats.totalCustomers}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="grid xl:grid-cols-2 gap-6">
      <div className="glass rounded-3xl border border-emerald-100 p-6 space-y-4">
        <h3 className="text-2xl font-bold text-gray-800">Company & Invoice Settings</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input value={companySettings.companyName} onChange={(event) => updateCompanySettings({ companyName: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Company name" />
          <input value={companySettings.logo} onChange={(event) => updateCompanySettings({ logo: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Logo path" />
          <input value={companySettings.primaryColor} onChange={(event) => updateCompanySettings({ primaryColor: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Primary color" />
          <input value={companySettings.secondaryColor} onChange={(event) => updateCompanySettings({ secondaryColor: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Secondary color" />
          <input value={companySettings.surfaceColor} onChange={(event) => updateCompanySettings({ surfaceColor: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Surface color" />
          <input value={companySettings.addressLine1} onChange={(event) => updateCompanySettings({ addressLine1: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Address line" />
          <input value={companySettings.cityStatePin} onChange={(event) => updateCompanySettings({ cityStatePin: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="City / State / PIN" />
          <input value={companySettings.gstin} onChange={(event) => updateCompanySettings({ gstin: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="GSTIN" />
          <input value={companySettings.pan} onChange={(event) => updateCompanySettings({ pan: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="PAN" />
          <input value={companySettings.phone} onChange={(event) => updateCompanySettings({ phone: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Phone" />
          <input value={companySettings.email} onChange={(event) => updateCompanySettings({ email: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Email" />
          <input value={companySettings.invoicePrefix} onChange={(event) => updateCompanySettings({ invoicePrefix: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Invoice prefix" />
          <input value={companySettings.website} onChange={(event) => updateCompanySettings({ website: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Website" />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <input value={companySettings.facebook} onChange={(event) => updateCompanySettings({ facebook: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Facebook" />
          <input value={companySettings.instagram} onChange={(event) => updateCompanySettings({ instagram: event.target.value })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Instagram" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass rounded-3xl border border-emerald-100 p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Tax & Shipping Settings</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <input type="number" min="0" step="0.1" value={pricingSettings.gstRate} onChange={(event) => updatePricingSettings({ gstRate: Number(event.target.value) || 0 })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="GST %" />
            <input type="number" min="0" value={pricingSettings.shippingCharge} onChange={(event) => updatePricingSettings({ shippingCharge: Number(event.target.value) || 0 })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Shipping charge" />
            <input type="number" min="0" value={pricingSettings.freeShippingThreshold} onChange={(event) => updatePricingSettings({ freeShippingThreshold: Number(event.target.value) || 0 })} className="rounded-2xl border border-gray-200 px-4 py-3 bg-white" placeholder="Free shipping above" />
          </div>
        </div>

        <div className="glass rounded-3xl border border-emerald-100 p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Homepage Shortcuts</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <p>Hero text, about text, footer content, popups, and banners are editable from the Marketing tab.</p>
            <p>Reports export to CSV, while invoice PDFs now use the company settings above.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoles = () => (
    <div className="glass rounded-3xl border border-emerald-100 p-6 space-y-4">
      <h3 className="text-2xl font-bold text-gray-800">Admin Roles</h3>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="font-semibold text-gray-800 mb-3">{role.name}</p>
            <div className="flex flex-wrap gap-2">
              {['View', 'Create', 'Edit', 'Delete', 'Export'].map((permission) => (
                <button key={permission} onClick={() => updateRole(role.id, { permissions: role.permissions.includes(permission) ? role.permissions.filter((item) => item !== permission) : [...role.permissions, permission] })} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${role.permissions.includes(permission) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {permission}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const roadmapStats = useMemo(() => getRoadmapStats(), []);

  const renderRoadmap = () => (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Total Features" value={roadmapStats.total} icon={LayoutDashboard} />
        <MetricCard label="Done" value={roadmapStats.done} icon={CheckCircle2} accent="text-emerald-600" />
        <MetricCard label="Partial" value={roadmapStats.partial} icon={Clock3} accent="text-amber-600" />
        <MetricCard label="Pending" value={roadmapStats.pending} icon={AlertTriangle} accent="text-rose-600" />
      </div>

      <div className="glass rounded-3xl border border-emerald-100 p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Why the dashboard looks like this today</h3>
        <div className="space-y-3 text-sm text-gray-700 max-w-4xl">
          <p>This admin panel is a working UI scaffold, not the full enterprise panel yet. Most modules are editable, but data is saved in browser localStorage instead of Firebase Firestore real time.</p>
          <p>The storefront header still appears above the admin area, charts are simple CSS blocks instead of line/pie chart libraries, and several metrics such as visitors and new customers use placeholder calculations until analytics is connected.</p>
          <p>Delivery carriers, Firebase push notifications, 2FA, activity logs, protected admin routes, and inventory workflows still need backend or Firestore integration.</p>
        </div>
      </div>

      <div className="space-y-4">
        {adminFeatureRoadmap.map((module) => (
          <details key={module.id} className="glass rounded-3xl border border-emerald-100 p-6 group">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{module.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{module.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    {module.items.filter((item) => item.status === ADMIN_FEATURE_STATUS.done).length} done
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                    {module.items.filter((item) => item.status === ADMIN_FEATURE_STATUS.partial).length} partial
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                    {module.items.filter((item) => item.status === ADMIN_FEATURE_STATUS.pending).length} pending
                  </span>
                </div>
              </div>
            </summary>

            <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {module.items.map((item) => (
                <div key={item.name} className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${roadmapStatusStyles[item.status]}`}>
                      {roadmapStatusLabels[item.status]}
                    </span>
                  </div>
                  {item.note && <p className="text-xs text-gray-500 mt-2">{item.note}</p>}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="grid xl:grid-cols-2 gap-6">
      <div className="glass rounded-3xl border border-emerald-100 p-6 space-y-4">
        <h3 className="text-2xl font-bold text-gray-800">Security</h3>
        <label className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4">
          <span>Two-factor authentication</span>
          <input type="checkbox" checked={security.twoFactor} onChange={(event) => updateSecurity({ twoFactor: event.target.checked })} />
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4">
          <span>Activity logs</span>
          <input type="checkbox" checked={security.activityLogs} onChange={(event) => updateSecurity({ activityLogs: event.target.checked })} />
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4">
          <span>Login history</span>
          <input type="checkbox" checked={security.loginHistory} onChange={(event) => updateSecurity({ loginHistory: event.target.checked })} />
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4">
          <span>Device history</span>
          <input type="checkbox" checked={security.deviceHistory} onChange={(event) => updateSecurity({ deviceHistory: event.target.checked })} />
        </label>
        <label className="block rounded-2xl border border-gray-100 bg-white p-4">
          <span className="block mb-2">Session timeout minutes</span>
          <input type="number" value={security.sessionTimeoutMinutes} onChange={(event) => updateSecurity({ sessionTimeoutMinutes: Number(event.target.value) || 0 })} className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white" />
        </label>
      </div>

      <div className="glass rounded-3xl border border-emerald-100 p-6 space-y-4">
        <h3 className="text-2xl font-bold text-gray-800">Pending Security Work</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <p>These toggles are UI placeholders only. Real 2FA, login history, device tracking, activity logs, and session timeout enforcement need Firebase Auth extensions plus Firestore audit collections.</p>
          <p>Admin routes are not locked yet. Only users with role <strong>admin</strong> should reach `/dashboard`, and role permissions should be enforced module by module.</p>
          <button onClick={() => setTab('roadmap')} className="btn-secondary px-4 py-3 inline-flex items-center gap-2">
            <Palette className="w-4 h-4" />
            View Full Feature Roadmap
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (tab) {
      case 'products': return renderProducts();
      case 'categories': return renderCategories();
      case 'orders': return renderOrders();
      case 'customers': return renderCustomers();
      case 'coupons': return renderCoupons();
      case 'marketing': return renderMarketing();
      case 'reviews': return renderReviews();
      case 'reports': return renderReports();
      case 'settings': return renderSettings();
      case 'roles': return renderRoles();
      case 'security': return renderSecurity();
      case 'roadmap': return renderRoadmap();
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col xl:flex-row gap-6">
          <aside className="xl:w-80 glass rounded-3xl border border-emerald-100 p-5 h-fit xl:sticky xl:top-24">
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-emerald-100">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 text-white flex items-center justify-center text-2xl font-bold">{(user?.displayName?.[0] || user?.email?.[0] || 'A').toUpperCase()}</div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{user?.displayName || 'Admin'}</h2>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>

            <nav className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {tabs.map((item) => (
                <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center justify-between gap-3 p-4 rounded-2xl text-left transition-colors ${tab === item.id ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-50 text-gray-700'}`}>
                  <span className="flex items-center gap-3"><item.icon className="w-5 h-5" />{item.label}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </nav>

            <div className="mt-6 space-y-3">
              <button onClick={() => navigate('/products')} className="w-full btn-secondary px-4 py-3 inline-flex items-center justify-center gap-2"><Home className="w-4 h-4" />View Store</button>
              <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl hover:bg-red-50 text-red-600 transition-colors"><LogOut className="w-5 h-5" />Sign Out</button>
            </div>
          </aside>

          <main className="flex-1 space-y-6">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[2rem] border border-emerald-100 p-6 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm text-emerald-700 font-semibold uppercase tracking-[0.24em]">Enterprise Admin Panel</p>
                  <h1 className="text-3xl md:text-4xl font-bold text-gradient mt-2">{tabs.find((item) => item.id === tab)?.label}</h1>
                  <p className="text-gray-600 mt-2 max-w-3xl">
                    {tab === 'roadmap'
                      ? 'Track every admin requirement against what is done, partial, or still pending before Firestore and backend integrations go live.'
                      : 'Editable modules for catalog, orders, content, reports, settings, roles, and security. Open the Roadmap tab for the full enterprise feature checklist.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setTab('overview')} className="btn-secondary px-4 py-3 inline-flex items-center gap-2"><LayoutDashboard className="w-4 h-4" />Overview</button>
                  <button onClick={() => setTab('orders')} className="btn-primary px-4 py-3 inline-flex items-center gap-2"><ShoppingBag className="w-4 h-4" />Orders</button>
                </div>
              </div>
              {renderContent()}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
