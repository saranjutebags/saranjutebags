import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { useCart } from '../contexts/CartContext';
import { useAdmin } from '../contexts/AdminContext';
import { db } from '../firebase/config';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { convertFileToBase64, validateImageFile } from '../utils/imageUtils';
import { sendOrderStatusEmail } from '../services/emailService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Upload,
  Save,
  X,
  ChevronRight,
  Home,
  Bell,
  Palette,
  Ticket,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Eye,
  Download,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  AlertCircle,
  Tags,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory, toggleCategoryVisibility } = useProducts();
  const { orders, updateOrder } = useCart();
  const { companySettings, updateCompanySettings, banners, addBanner, updateBanner, deleteBanner } = useAdmin();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [activeOrderFilter, setActiveOrderFilter] = useState('all');
  const [activeDateFilter, setActiveDateFilter] = useState('this-month');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [analyticsFilter, setAnalyticsFilter] = useState('this-month');
  const [analyticsFrom, setAnalyticsFrom] = useState('');
  const [analyticsTo, setAnalyticsTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
    description: '',
    images: '',
    sku: '',
  });

  // Order notifications
  const [newOrderPopup, setNewOrderPopup] = useState(false);
  const [cancelledOrderPopup, setCancelledOrderPopup] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [processedCancelledOrders, setProcessedCancelledOrders] = useState(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const newOrderAudioRef = useRef(null);
  const cancelledOrderAudioRef = useRef(null);
  const previousOrderStatusesRef = useRef({});

  // Admin cancellation reason
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(null);
  const [adminCancelReason, setAdminCancelReason] = useState('');

  // Popups
  const [popups, setPopups] = useState([]);
  const [editingPopup, setEditingPopup] = useState(null);
  const [popupForm, setPopupForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    image: '',
    buttonText: '',
    buttonLink: '',
    couponCode: '',
    priority: 1,
    active: true,
  });

  // Banners
  const [banners, setBanners] = useState([]);
  const [editingBanner, setEditingBanner] = useState(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    image: '',
    type: 'Desktop',
    animation: 'Fade',
    active: true,
  });

  // Coupons
  const [coupons, setCoupons] = useState([]);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    label: '',
    discount: '',
    discountType: 'percentage',
    minOrder: 0,
    maxDiscount: 0,
    active: true,
    shouldPopup: false,
  });

  // Order details modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Theme
  const [themeColors, setThemeColors] = useState({
    primary: companySettings?.primaryColor || '#059669',
    secondary: companySettings?.secondaryColor || '#10b981',
    surface: companySettings?.surfaceColor || '#ecfdf5',
  });

  // Category form state
  const emptyCategoryForm = { name: '', image: '', description: '', sortOrder: '', visible: true, featured: false };
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [categoryImageUploading, setCategoryImageUploading] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'popups', label: 'Popups', icon: Bell },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'coupons', label: 'Coupons', icon: Ticket },
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // Load data from Firestore
  useEffect(() => {
    const unsubPopups = onSnapshot(collection(db, 'popups'), (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setPopups(docs);
    });

    const unsubBanners = onSnapshot(collection(db, 'banners'), (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setBanners(docs);
    });

    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setCoupons(docs);
    });

    return () => {
      unsubPopups();
      unsubBanners();
      unsubCoupons();
    };
  }, []);

  // Order notification system
  useEffect(() => {
    const currentOrderStatuses = {};
    let newPendingCount = 0;

    orders.forEach(order => {
      currentOrderStatuses[order.id] = order.status;
      if (order.status === 'Pending' || order.status === 'Confirmed') {
        newPendingCount++;
      }
    });

    // Check for new orders (status became Pending/Confirmed)
    orders.forEach(order => {
      if (!previousOrderStatusesRef.current[order.id] && 
          (order.status === 'Pending' || order.status === 'Confirmed')) {
        setNewOrderCount(newPendingCount);
        setNewOrderPopup(true);
      }
      // Check for new cancelled orders that aren't processed yet
      if (previousOrderStatusesRef.current[order.id] && 
          previousOrderStatusesRef.current[order.id] !== 'Cancelled' && 
          order.status === 'Cancelled' && 
          !processedCancelledOrders.has(order.id)) {
        setCancelledOrderPopup(true);
        setProcessedCancelledOrders(prev => new Set([...prev, order.id]));
      }
    });

    previousOrderStatusesRef.current = currentOrderStatuses;
    setNewOrderCount(newPendingCount);
  }, [orders, processedCancelledOrders]);

  // New order sound loop
  useEffect(() => {
    if (newOrderPopup && soundEnabled && newOrderAudioRef.current) {
      newOrderAudioRef.current.loop = true;
      newOrderAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    } else if (newOrderAudioRef.current) {
      newOrderAudioRef.current.pause();
      newOrderAudioRef.current.currentTime = 0;
    }
  }, [newOrderPopup, soundEnabled]);

  // Cancelled order sound loop
  useEffect(() => {
    if (cancelledOrderPopup && soundEnabled && cancelledOrderAudioRef.current) {
      cancelledOrderAudioRef.current.loop = true;
      cancelledOrderAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    } else if (cancelledOrderAudioRef.current) {
      cancelledOrderAudioRef.current.pause();
      cancelledOrderAudioRef.current.currentTime = 0;
    }
  }, [cancelledOrderPopup, soundEnabled]);

  const handleCloseNewOrderPopup = () => {
    setNewOrderPopup(false);
    if (newOrderAudioRef.current) {
      newOrderAudioRef.current.pause();
      newOrderAudioRef.current.currentTime = 0;
    }
  };

  const handleCloseCancelledOrderPopup = () => {
    setCancelledOrderPopup(false);
    if (cancelledOrderAudioRef.current) {
      cancelledOrderAudioRef.current.pause();
      cancelledOrderAudioRef.current.currentTime = 0;
    }
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newImages = [];
      for (const file of files) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          showMessage(validation.error, 'error');
          continue;
        }
        const base64 = await convertFileToBase64(file);
        newImages.push(base64);
      }
      
      setProductForm(prev => {
        const existingImages = prev.images ? prev.images.split(',').map(img => img.trim()).filter(img => img) : [];
        return {
          ...prev,
          images: [...existingImages, ...newImages].join(', ')
        };
      });
      showMessage(`${newImages.length} image(s) uploaded successfully`);
    } catch (error) {
      showMessage('Failed to upload image(s)', 'error');
    }
  };

  const handleSaveProduct = async () => {
    setLoading(true);
    try {
      const productData = {
        ...productForm,
        price: Number(productForm.price) || 0,
        stock: Number(productForm.stock) || 0,
        images: productForm.images.split(',').map(img => img.trim()),
        visible: true,
        featured: false,
        bestseller: false,
        newArrival: false,
        createdAt: new Date().toISOString(),
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        showMessage('Product updated successfully');
      } else {
        await addProduct(productData);
        showMessage('Product added successfully');
      }

      setEditingProduct(null);
      setProductForm({
        name: '',
        price: '',
        stock: '',
        category: '',
        description: '',
        images: '',
        sku: '',
      });
    } catch (error) {
      showMessage('Failed to save product', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      price: product.price || '',
      stock: product.stock || '',
      category: product.category || '',
      description: product.description || '',
      images: Array.isArray(product.images) ? product.images.join(', ') : product.images || '',
      sku: product.sku || '',
    });
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await deleteProduct(id);
      showMessage('Product deleted successfully');
    } catch (error) {
      showMessage('Failed to delete product', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status, cancelReason = '') => {
    try {
      const order = orders.find(o => o.id === orderId);
      const updateData = { status };
      if (status === 'Cancelled') {
        updateData.cancelReason = cancelReason;
        updateData.cancelledAt = new Date().toLocaleString();
      }
      await updateOrder(orderId, updateData);
      
      if (order) {
        const emailResult = await sendOrderStatusEmail(order, status);
        if (emailResult.success) {
          console.log('Email sent successfully');
        } else {
          console.error('Email failed:', emailResult.error);
          showMessage(`Order updated but email failed: ${emailResult.error}`, 'warning');
        }
      }
      
      showMessage(`Order status updated to ${status}`);
    } catch (error) {
      console.error('Order update error:', error);
      showMessage('Failed to update order status', 'error');
    }
  };

  // Popup handlers
  const handleSavePopup = async () => {
    setLoading(true);
    try {
      const id = editingPopup?.id || `popup-${Date.now()}`;
      const popupData = { ...popupForm, id };
      
      await setDoc(doc(db, 'popups', id), popupData);
      showMessage(editingPopup ? 'Popup updated successfully' : 'Popup added successfully');
      
      setEditingPopup(null);
      setPopupForm({
        title: '',
        subtitle: '',
        description: '',
        image: '',
        buttonText: '',
        buttonLink: '',
        couponCode: '',
        priority: 1,
        active: true,
      });
    } catch (error) {
      showMessage('Failed to save popup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePopup = async (id) => {
    if (!confirm('Delete this popup?')) return;
    try {
      await deleteDoc(doc(db, 'popups', id));
      showMessage('Popup deleted successfully');
    } catch (error) {
      showMessage('Failed to delete popup', 'error');
    }
  };

  // Banner handlers
  const handleSaveBanner = async () => {
    setLoading(true);
    try {
      const id = editingBanner?.id || `banner-${Date.now()}`;
      const bannerData = { 
        ...bannerForm, 
        id,
        createdAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'banners', id), bannerData, { merge: true });
      showMessage(editingBanner ? 'Banner updated successfully' : 'Banner added successfully');
      
      setEditingBanner(null);
      setBannerForm({
        title: '',
        image: '',
        type: 'Desktop',
        animation: 'Fade',
        active: true,
      });
    } catch (error) {
      console.error('Banner save error:', error);
      showMessage('Failed to save banner', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
      showMessage('Banner deleted successfully');
    } catch (error) {
      showMessage('Failed to delete banner', 'error');
    }
  };

  // Coupon handlers
  const handleSaveCoupon = async () => {
    setLoading(true);
    try {
      const id = editingCoupon?.id || `coupon-${Date.now()}`;
      const couponData = { 
        ...couponForm, 
        id,
        discount: Number(couponForm.discount),
        minOrder: Number(couponForm.minOrder),
        maxDiscount: Number(couponForm.maxDiscount),
      };
      
      await setDoc(doc(db, 'coupons', id), couponData);
      showMessage(editingCoupon ? 'Coupon updated successfully' : 'Coupon added successfully');
      
      setEditingCoupon(null);
      setCouponForm({
        code: '',
        label: '',
        discount: '',
        discountType: 'percentage',
        minOrder: 0,
        maxDiscount: 0,
        active: true,
        shouldPopup: false,
      });
    } catch (error) {
      showMessage('Failed to save coupon', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
      showMessage('Coupon deleted successfully');
    } catch (error) {
      showMessage('Failed to delete coupon', 'error');
    }
  };

  // Theme handler
  const handleSaveTheme = async () => {
    setLoading(true);
    try {
      await updateCompanySettings({
        primaryColor: themeColors.primary,
        secondaryColor: themeColors.secondary,
        surfaceColor: themeColors.surface,
      });
      showMessage('Theme saved successfully');
      
      // Apply theme immediately
      document.documentElement.style.setProperty('--brand-primary', themeColors.primary);
      document.documentElement.style.setProperty('--brand-secondary', themeColors.secondary);
      document.documentElement.style.setProperty('--brand-surface', themeColors.surface);
    } catch (error) {
      showMessage('Failed to save theme', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await updateCompanySettings(companySettings);
      showMessage('Settings saved successfully');
    } catch (error) {
      showMessage('Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadAdminInvoicePdf = async (order) => {
    // Create a temporary div to render the invoice
    const tempDiv = document.createElement('div');
    tempDiv.id = 'admin-invoice-content';
    document.body.appendChild(tempDiv);
    
    // Render invoice HTML into tempDiv
    const orderPricing = order.pricing || {
      subtotal: order.subtotal ?? order.total,
      discountAmount: order.discountAmount ?? 0,
      shipping: order.shippingCharge ?? 0,
      gstRate: order.gstRate ?? 0,
      gstAmount: order.gstAmount ?? 0,
      grandTotal: order.grandTotal ?? order.total,
    };
    
    tempDiv.innerHTML = `
      <div class="bg-white p-8 max-w-2xl mx-auto" style="font-family: 'Arial', sans-serif;">
        <div style="background: linear-gradient(135deg, #0F766E, #16A34A); padding: 35px; border-radius: 14px; margin-bottom: 30px;">
          <h1 style="margin: 0; color: #fff; font-size: 30px;">${companySettings.companyName}</h1>
          <p style="margin-top: 8px; color: #E8FFF4; font-size: 15px;">Premium Eco-Friendly Packaging Solutions</p>
        </div>
        <div style="margin-bottom: 30px;">
          <p><strong>Invoice No:</strong> ${companySettings.invoicePrefix || 'INV'}-${order.id.slice(-6)}</p>
          <p><strong>Invoice Date:</strong> ${order.date}</p>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        </div>
        <div style="margin-bottom: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; color: #222;">Bill To:</h3>
          <p style="margin: 5px 0;"><strong>${order.shippingAddress.name}</strong></p>
          <p style="margin: 5px 0;">${order.shippingAddress.addressLine1}</p>
          <p style="margin: 5px 0;">${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</p>
          <p style="margin: 5px 0;">Phone: ${order.shippingAddress.phone}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 12px; text-align: left; border: 1px solid #ececec;">Item</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #ececec;">Qty</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ececec;">Price</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ececec;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td style="padding: 12px; border: 1px solid #ececec;">${item.name}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #ececec;">${item.quantity}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ececec;">₹${item.price}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ececec;">₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Subtotal:</span>
            <span>₹${orderPricing.subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Discount:</span>
            <span>-₹${orderPricing.discountAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Shipping:</span>
            <span>${orderPricing.shipping === 0 ? 'Free' : `₹${orderPricing.shipping.toFixed(2)}`}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>GST (${orderPricing.gstRate}%):</span>
            <span>₹${orderPricing.gstAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 20px; padding-top: 20px; border-top: 2px solid #16A34A; font-weight: bold; font-size: 18px;">
            <span>Grand Total:</span>
            <span>₹${orderPricing.grandTotal.toFixed(2)}</span>
          </div>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 10px 0;">Need help? Contact us at <strong>${companySettings.email}</strong></p>
          <p style="margin: 10px 0;">GSTIN: ${companySettings.gstin}</p>
          <p style="margin: 20px 0;">© 2026 ${companySettings.companyName} - Sustainable Packaging • Quality • Trust</p>
        </div>
      </div>
    `;

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${companySettings.invoicePrefix || 'INV'}-${order.id}.pdf`);
    } catch (error) {
      console.error('Admin invoice download error:', error);
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getOrderCounts = () => {
    const counts = {
      total: orders.length,
      pending: 0,
      confirmed: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };

    orders.forEach(order => {
      const status = order.status?.toLowerCase() || 'pending';
      if (status === 'pending') counts.pending++;
      else if (status === 'confirmed') counts.confirmed++;
      else if (status === 'packed') counts.packed++;
      else if (status === 'shipped') counts.shipped++;
      else if (status === 'delivered') counts.delivered++;
      else if (status === 'cancelled') counts.cancelled++;
    });

    return counts;
  };

  const filterOrdersByDate = (ordersList, filter, customFrom, customTo) => {
    const now = new Date();
    return ordersList.filter(order => {
      let orderDate;
      try {
        if (order.createdAt) {
          orderDate = new Date(order.createdAt);
        } else {
          orderDate = new Date(order.date);
        }
        if (isNaN(orderDate)) return true;
      } catch {
        return true;
      }

      switch (filter) {
        case 'today':
          return orderDate.toDateString() === now.toDateString();
        case 'this-week': {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return orderDate >= weekAgo;
        }
        case 'this-month':
          return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        case 'this-year':
          return orderDate.getFullYear() === now.getFullYear();
        case 'custom': {
          const from = customFrom ? new Date(customFrom) : null;
          const to = customTo ? new Date(customTo + 'T23:59:59') : null;
          if (from && to) return orderDate >= from && orderDate <= to;
          if (from) return orderDate >= from;
          if (to) return orderDate <= to;
          return true;
        }
        default:
          return true;
      }
    });
  };

  const getFilteredOrders = () => {
    let filtered = orders;
    if (activeOrderFilter !== 'all') {
      filtered = filtered.filter(order => 
        order.status?.toLowerCase() === activeOrderFilter.toLowerCase()
      );
    }
    filtered = filterOrdersByDate(filtered, activeDateFilter, customDateFrom, customDateTo);
    return filtered;
  };

  const orderCounts = getOrderCounts();
  const filteredOrders = getFilteredOrders();

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <StatCard 
          label="Total Orders" 
          value={orderCounts.total} 
          icon={ShoppingCart} 
          color="bg-blue-500" 
        />
        <StatCard 
          label="Pending" 
          value={orderCounts.pending} 
          icon={Clock} 
          color="bg-yellow-500" 
          isNew={orderCounts.pending > 0}
        />
        <StatCard 
          label="Confirmed" 
          value={orderCounts.confirmed} 
          icon={CheckCircle} 
          color="bg-green-500" 
          isNew={orderCounts.confirmed > 0}
        />
        <StatCard 
          label="Packed" 
          value={orderCounts.packed} 
          icon={Package} 
          color="bg-indigo-500" 
        />
        <StatCard 
          label="Shipped" 
          value={orderCounts.shipped} 
          icon={Truck} 
          color="bg-purple-500" 
        />
        <StatCard 
          label="Delivered" 
          value={orderCounts.delivered} 
          icon={CheckCircle} 
          color="bg-emerald-500" 
        />
        <StatCard 
          label="Cancelled" 
          value={orderCounts.cancelled} 
          icon={XCircle} 
          color="bg-red-500" 
        />
        <StatCard 
          label="Total Products" 
          value={products.length} 
          icon={Package} 
          color="bg-cyan-500" 
        />
        <StatCard 
          label="Revenue" 
          value={`₹${orders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + (o.total || o.grandTotal || 0), 0).toLocaleString()}`} 
          icon={LayoutDashboard} 
          color="bg-pink-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Orders">
          <div className="space-y-3">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{order.id}</p>
                  <p className="text-sm text-gray-500">{order.date}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                  order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{order.status}</span>
              </div>
            ))}
            {orders.length === 0 && <p className="text-gray-500 text-center py-4">No orders yet</p>}
          </div>
        </Card>

        <Card title="Low Stock Products">
          <div className="space-y-3">
            {products.filter(p => p.stock <= 5).map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">{product.stock} left</span>
              </div>
            ))}
            {products.filter(p => p.stock <= 5).length === 0 && <p className="text-gray-500 text-center py-4">All products in stock</p>}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6">
      <Card title={editingProduct ? 'Edit Product' : 'Add New Product'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            placeholder="Enter product name"
          />
          <Input
            label="SKU"
            value={productForm.sku}
            onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
            placeholder="Enter SKU"
          />
          <Input
            label="Price (₹)"
            type="number"
            value={productForm.price}
            onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
            placeholder="Enter price"
          />
          <Input
            label="Stock"
            type="number"
            value={productForm.stock}
            onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
            placeholder="Enter stock quantity"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Select a category —</option>
              {categories.filter(c => c.visible !== false).map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No categories yet. Add categories first from the Categories tab.</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Images</label>
            <textarea
              value={productForm.images}
              onChange={(e) => setProductForm({ ...productForm, images: e.target.value })}
              placeholder="Image URLs (comma separated)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="imageUpload"
              />
              <label htmlFor="imageUpload" className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload Image(s)
              </label>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={productForm.description}
            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
            placeholder="Enter product description"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSaveProduct}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
          </button>
          {editingProduct && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductForm({ name: '', price: '', stock: '', category: '', description: '', images: '', sku: '' });
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </Card>

      <Card title="Product List">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">SKU</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Stock</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] && (
                        <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-cover rounded" />
                      )}
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="p-3">{product.sku}</td>
                  <td className="p-3">₹{product.price}</td>
                  <td className="p-3">
                    <span className={product.stock <= 5 ? 'text-red-600 font-medium' : ''}>{product.stock}</span>
                  </td>
                  <td className="p-3">{product.category}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-gray-500 text-center py-8">No products yet</p>}
        </div>
      </Card>
    </div>
  );

  const renderCategories = () => {
    const handleCategoryImageUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setCategoryImageUploading(true);
        const validation = validateImageFile(file);
        if (!validation.valid) { showMessage(validation.error, 'error'); return; }
        const base64 = await convertFileToBase64(file);
        setCategoryForm(prev => ({ ...prev, image: base64 }));
        showMessage('Image uploaded');
      } catch { showMessage('Image upload failed', 'error'); }
      finally { setCategoryImageUploading(false); }
    };

    const handleSaveCategory = async () => {
      if (!categoryForm.name.trim()) { showMessage('Category name is required', 'error'); return; }
      setLoading(true);
      try {
        const data = {
          ...categoryForm,
          name: categoryForm.name.trim(),
          sortOrder: Number(categoryForm.sortOrder) || (categories.length + 1),
          visible: Boolean(categoryForm.visible),
          featured: Boolean(categoryForm.featured),
        };
        if (editingCategory) {
          await updateCategory(editingCategory.id, data);
          showMessage('Category updated');
        } else {
          await addCategory(data);
          showMessage('Category added');
        }
        setEditingCategory(null);
        setCategoryForm(emptyCategoryForm);
      } catch { showMessage('Failed to save category', 'error'); }
      finally { setLoading(false); }
    };

    const handleDeleteCategory = async (id) => {
      const inUse = products.some(p => {
        const cat = categories.find(c => c.id === id);
        return cat && p.category === cat.name;
      });
      if (inUse && !confirm('This category is used by products. Delete anyway?')) return;
      if (!inUse && !confirm('Delete this category?')) return;
      try {
        await deleteCategory(id);
        showMessage('Category deleted');
      } catch { showMessage('Failed to delete category', 'error'); }
    };

    return (
      <div className="space-y-6">
        {/* Form */}
        <Card title={editingCategory ? 'Edit Category' : 'Add New Category'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Category Name *"
              value={categoryForm.name}
              onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="e.g. Jute Bags"
            />
            <Input
              label="Sort Order"
              type="number"
              value={categoryForm.sortOrder}
              onChange={e => setCategoryForm({ ...categoryForm, sortOrder: e.target.value })}
              placeholder="1"
            />
            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Category Image</label>
              {categoryForm.image && (
                <div className="relative inline-block">
                  <img src={categoryForm.image} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-gray-200" />
                  <button onClick={() => setCategoryForm({ ...categoryForm, image: '' })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-3 items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCategoryImageUpload}
                  className="hidden"
                  id="catImageUpload"
                />
                <label htmlFor="catImageUpload" className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer text-sm">
                  <Upload className="w-4 h-4" />
                  {categoryImageUploading ? 'Uploading…' : 'Upload Image'}
                </label>
                <span className="text-xs text-gray-400">or paste URL below</span>
              </div>
              <input
                type="text"
                value={categoryForm.image}
                onChange={e => setCategoryForm({ ...categoryForm, image: e.target.value })}
                placeholder="https://... or leave blank"
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={categoryForm.description}
                onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Short description shown on the categories page"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={categoryForm.visible} onChange={e => setCategoryForm({ ...categoryForm, visible: e.target.checked })} />
              <span className="text-sm font-medium text-gray-700">Visible to customers</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={categoryForm.featured} onChange={e => setCategoryForm({ ...categoryForm, featured: e.target.checked })} />
              <span className="text-sm font-medium text-gray-700">Featured on homepage</span>
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSaveCategory}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving…' : editingCategory ? 'Update Category' : 'Add Category'}
            </button>
            {editingCategory && (
              <button
                onClick={() => { setEditingCategory(null); setCategoryForm(emptyCategoryForm); }}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </Card>

        {/* List */}
        <Card title={`Category List (${categories.length})`}>
          {categories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Tags className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No categories yet</p>
              <p className="text-sm mt-1">Add categories above — they will appear in the product form and on user-facing pages.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(cat => {
                const productCount = products.filter(p => p.category === cat.name).length;
                return (
                  <div key={cat.id} className={`rounded-xl border p-4 flex gap-3 ${cat.visible ? 'border-emerald-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-gray-100" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Tags className="w-6 h-6 text-emerald-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-gray-800 truncate">{cat.name}</p>
                        <div className="flex gap-1 shrink-0">
                          {cat.featured && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-semibold">Featured</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${cat.visible ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                            {cat.visible ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{productCount} product{productCount !== 1 ? 's' : ''}</p>
                      {cat.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{cat.description}</p>}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, image: cat.image || '', description: cat.description || '', sortOrder: cat.sortOrder || '', visible: cat.visible !== false, featured: Boolean(cat.featured) }); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleCategoryVisibility(cat.id)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          title={cat.visible ? 'Hide' : 'Show'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderOrders = () => (
    <div className="space-y-6">
      {/* Order filters */}
      <Card title="Orders">
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveOrderFilter(filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeOrderFilter === filter
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
              {filter !== 'all' && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {orderCounts[filter]}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Date filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'today', 'this-week', 'this-month', 'this-year', 'custom'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveDateFilter(filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeDateFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'all' ? 'All Time' : 
               filter === 'today' ? 'Today' : 
               filter === 'this-week' ? 'This Week' :
               filter === 'this-month' ? 'This Month' :
               filter === 'this-year' ? 'This Year' : 'Custom Range'}
            </button>
          ))}
        </div>
        {activeDateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={customDateFrom}
                onChange={e => setCustomDateFrom(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={customDateTo}
                onChange={e => setCustomDateTo(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            {(customDateFrom || customDateTo) && (
              <button
                onClick={() => { setCustomDateFrom(''); setCustomDateTo(''); }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 bg-white border border-gray-200 rounded-lg"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Order ID</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Total</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{order.id}</td>
                  <td className="p-3">{order.date}</td>
                  <td className="p-3">{order.shippingAddress?.name || 'N/A'}</td>
                  <td className="p-3">₹{order.total || order.grandTotal || 0}</td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{order.status}</span>
                      {order.status === 'Cancelled' && order.cancelReason && (
                        <p className="text-xs text-gray-500">Reason: {order.cancelReason}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <select
                        value={order.status}
                        onChange={(e) => {
                          if (e.target.value === 'Cancelled') {
                            setShowCancelReasonModal(order.id);
                            setAdminCancelReason('');
                          } else {
                            handleUpdateOrderStatus(order.id, e.target.value);
                          }
                        }}
                        className="p-2 border rounded-lg"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Packed">Packed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && <p className="text-gray-500 text-center py-8">No orders found</p>}
        </div>
      </Card>
    </div>
  );

  const renderAnalytics = () => {
    const now = new Date();

    const getStats = (filter, from, to) => {
      const filtered = filterOrdersByDate(orders, filter, from, to);
      const delivered = filtered.filter(o => o.status === 'Delivered');
      const cancelled = filtered.filter(o => o.status === 'Cancelled');
      const revenue = delivered.reduce((sum, o) => sum + (o.total || o.grandTotal || 0), 0);
      return {
        orders: filtered.length,
        delivered: delivered.length,
        cancelled: cancelled.length,
        revenue
      };
    };
    
    const todayStats = getStats('today');
    const weekStats = getStats('this-week');
    const monthStats = getStats('this-month');
    const yearStats = getStats('this-year');
    const allTimeStats = getStats('all');
    const customStats = getStats('custom', analyticsFrom, analyticsTo);

    return (
      <div className="space-y-6">
        <Card title="Analytics Overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <StatCard 
              label="Today's Orders" 
              value={todayStats.orders} 
              icon={ShoppingCart} 
              color="bg-blue-500" 
            />
            <StatCard 
              label="Today's Revenue" 
              value={`₹${todayStats.revenue.toLocaleString()}`} 
              icon={LayoutDashboard} 
              color="bg-green-500" 
            />
            <StatCard 
              label="This Month Orders" 
              value={monthStats.orders} 
              icon={Package} 
              color="bg-purple-500" 
            />
            <StatCard 
              label="This Month Revenue" 
              value={`₹${monthStats.revenue.toLocaleString()}`} 
              icon={Truck} 
              color="bg-pink-500" 
            />
            <StatCard 
              label="This Year Cancelled" 
              value={yearStats.cancelled} 
              icon={XCircle} 
              color="bg-red-500" 
            />
          </div>
        </Card>

        {/* Custom Date Range Analytics */}
        <Card title="Custom Date Range Analytics">
          <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-sm font-semibold text-emerald-800">Select Range:</span>
            <div className="flex flex-wrap gap-2">
              {['today', 'this-week', 'this-month', 'this-year', 'all', 'custom'].map(f => (
                <button
                  key={f}
                  onClick={() => setAnalyticsFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    analyticsFilter === f ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  {f === 'all' ? 'All Time' : f === 'this-week' ? 'This Week' : f === 'this-month' ? 'This Month' : f === 'this-year' ? 'This Year' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {analyticsFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 mt-2 w-full">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <input
                    type="date"
                    value={analyticsFrom}
                    onChange={e => setAnalyticsFrom(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <input
                    type="date"
                    value={analyticsTo}
                    onChange={e => setAnalyticsTo(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                {(analyticsFrom || analyticsTo) && (
                  <button
                    onClick={() => { setAnalyticsFrom(''); setAnalyticsTo(''); }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 bg-white border border-gray-200 rounded-lg"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-700 font-medium mb-1">Orders</p>
              <p className="text-3xl font-bold text-blue-800">{customStats.orders}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-green-700 font-medium mb-1">Delivered</p>
              <p className="text-3xl font-bold text-green-800">{customStats.delivered}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm text-red-700 font-medium mb-1">Cancelled</p>
              <p className="text-3xl font-bold text-red-800">{customStats.cancelled}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <p className="text-sm text-purple-700 font-medium mb-1">Revenue</p>
              <p className="text-3xl font-bold text-purple-800">₹{customStats.revenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Orders by Period">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="text-gray-700 font-medium">Today</span>
                <span className="text-2xl font-bold text-blue-600">{todayStats.orders}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="text-gray-700 font-medium">This Week</span>
                <span className="text-2xl font-bold text-purple-600">{weekStats.orders}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="text-gray-700 font-medium">This Month</span>
                <span className="text-2xl font-bold text-emerald-600">{monthStats.orders}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="text-gray-700 font-medium">This Year</span>
                <span className="text-2xl font-bold text-orange-600">{yearStats.orders}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="text-gray-700 font-medium">All Time</span>
                <span className="text-2xl font-bold text-gray-800">{allTimeStats.orders}</span>
              </div>
            </div>
          </Card>

          <Card title="Revenue & Status">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="text-gray-700 font-medium">Delivered Orders (Month)</span>
                <span className="text-2xl font-bold text-green-600">{monthStats.delivered}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="text-gray-700 font-medium">Cancelled Orders (Month)</span>
                <span className="text-2xl font-bold text-red-600">{monthStats.cancelled}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="text-gray-700 font-medium">Revenue (Month)</span>
                <span className="text-2xl font-bold text-blue-600">₹{monthStats.revenue.toLocaleString()}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="text-gray-700 font-medium">Revenue (Year)</span>
                <span className="text-2xl font-bold text-purple-600">₹{yearStats.revenue.toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderCustomers = () => (
    <Card title="Customers">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order, index) => (
          <div key={`${order.shippingAddress?.phone}-${index}`} className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium">{order.shippingAddress?.name || 'Customer'}</p>
            <p className="text-sm text-gray-500">{order.shippingAddress?.phone || 'N/A'}</p>
            <p className="text-sm text-gray-500 mt-2">{order.shippingAddress?.addressLine1 || 'No address'}</p>
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500 text-center py-8">No customers yet</p>}
      </div>
    </Card>
  );

  const renderSettings = () => (
    <Card title="Company Settings">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Company Name"
          value={companySettings.companyName || ''}
          onChange={(e) => updateCompanySettings({ companyName: e.target.value })}
        />
        <Input
          label="Phone"
          value={companySettings.phone || ''}
          onChange={(e) => updateCompanySettings({ phone: e.target.value })}
        />
        <Input
          label="Email"
          value={companySettings.email || ''}
          onChange={(e) => updateCompanySettings({ email: e.target.value })}
        />
        <Input
          label="GSTIN"
          value={companySettings.gstin || ''}
          onChange={(e) => updateCompanySettings({ gstin: e.target.value })}
        />
        <Input
          label="Address"
          value={companySettings.addressLine1 || ''}
          onChange={(e) => updateCompanySettings({ addressLine1: e.target.value })}
        />
        <Input
          label="City, State, PIN"
          value={companySettings.cityStatePin || ''}
          onChange={(e) => updateCompanySettings({ cityStatePin: e.target.value })}
        />
      </div>
      <button
        onClick={handleSaveSettings}
        disabled={loading}
        className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {loading ? 'Saving...' : 'Save Settings'}
      </button>
    </Card>
  );

  const renderPopups = () => (
    <div className="space-y-6">
      <Card title={editingPopup ? 'Edit Popup' : 'Add New Popup'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title"
            value={popupForm.title}
            onChange={(e) => setPopupForm({ ...popupForm, title: e.target.value })}
          />
          <Input
            label="Subtitle"
            value={popupForm.subtitle}
            onChange={(e) => setPopupForm({ ...popupForm, subtitle: e.target.value })}
          />
          <Input
            label="Button Text"
            value={popupForm.buttonText}
            onChange={(e) => setPopupForm({ ...popupForm, buttonText: e.target.value })}
          />
          <Input
            label="Button Link"
            value={popupForm.buttonLink}
            onChange={(e) => setPopupForm({ ...popupForm, buttonLink: e.target.value })}
          />
          <Input
            label="Coupon Code"
            value={popupForm.couponCode}
            onChange={(e) => setPopupForm({ ...popupForm, couponCode: e.target.value })}
          />
          <Input
            label="Priority"
            type="number"
            value={popupForm.priority}
            onChange={(e) => setPopupForm({ ...popupForm, priority: Number(e.target.value) })}
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={popupForm.description}
            onChange={(e) => setPopupForm({ ...popupForm, description: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700">Image</label>
          <textarea
            value={popupForm.image}
            onChange={(e) => setPopupForm({ ...popupForm, image: e.target.value })}
            placeholder="Image URL"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  const base64 = await convertFileToBase64(file);
                  setPopupForm({ ...popupForm, image: base64 });
                }
              }}
              className="hidden"
              id="popupImageUpload"
            />
            <label htmlFor="popupImageUpload" className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload Image
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={popupForm.active}
              onChange={(e) => setPopupForm({ ...popupForm, active: e.target.checked })}
            />
            Active
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSavePopup}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : editingPopup ? 'Update Popup' : 'Add Popup'}
          </button>
          {editingPopup && (
            <button
              onClick={() => {
                setEditingPopup(null);
                setPopupForm({ title: '', subtitle: '', description: '', image: '', buttonText: '', buttonLink: '', couponCode: '', priority: 1, active: true });
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </Card>

      <Card title="Popup List">
        <div className="space-y-3">
          {popups.map(popup => (
            <div key={popup.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                {popup.image && <img src={popup.image} alt={popup.title} className="w-16 h-16 object-cover rounded" />}
                <div>
                  <p className="font-medium">{popup.title}</p>
                  <p className="text-sm text-gray-500">{popup.subtitle}</p>
                  <span className={`px-2 py-1 rounded text-xs ${popup.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {popup.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingPopup(popup); setPopupForm(popup); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeletePopup(popup.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {popups.length === 0 && <p className="text-gray-500 text-center py-8">No popups yet</p>}
        </div>
      </Card>
    </div>
  );

  const renderBanners = () => (
    <div className="space-y-6">
      <Card title={editingBanner ? 'Edit Banner' : 'Add New Banner'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title"
            value={bannerForm.title}
            onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
          />
          <select
            value={bannerForm.type}
            onChange={(e) => setBannerForm({ ...bannerForm, type: e.target.value })}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="Desktop">Desktop</option>
            <option value="Mobile">Mobile</option>
          </select>
          <select
            value={bannerForm.animation}
            onChange={(e) => setBannerForm({ ...bannerForm, animation: e.target.value })}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="Fade">Fade</option>
            <option value="Slide">Slide</option>
            <option value="Zoom">Zoom</option>
          </select>
        </div>
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700">Image</label>
          <textarea
            value={bannerForm.image}
            onChange={(e) => setBannerForm({ ...bannerForm, image: e.target.value })}
            placeholder="Image URL"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  const base64 = await convertFileToBase64(file);
                  setBannerForm({ ...bannerForm, image: base64 });
                }
              }}
              className="hidden"
              id="bannerImageUpload"
            />
            <label htmlFor="bannerImageUpload" className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload Image
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={bannerForm.active}
              onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })}
            />
            Active
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSaveBanner}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : editingBanner ? 'Update Banner' : 'Add Banner'}
          </button>
          {editingBanner && (
            <button
              onClick={() => {
                setEditingBanner(null);
                setBannerForm({ title: '', image: '', type: 'Desktop', animation: 'Fade', active: true });
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </Card>

      <Card title="Banner List">
        <div className="space-y-3">
          {banners.map(banner => (
            <div key={banner.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                {banner.image && <img src={banner.image} alt={banner.title} className="w-32 h-20 object-cover rounded" />}
                <div>
                  <p className="font-medium">{banner.title}</p>
                  <p className="text-sm text-gray-500">{banner.type} • {banner.animation}</p>
                  <span className={`px-2 py-1 rounded text-xs ${banner.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {banner.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingBanner(banner); setBannerForm(banner); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteBanner(banner.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {banners.length === 0 && <p className="text-gray-500 text-center py-8">No banners yet</p>}
        </div>
      </Card>
    </div>
  );

  const renderCoupons = () => (
    <div className="space-y-6">
      <Card title={editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Coupon Code"
            value={couponForm.code}
            onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
          />
          <Input
            label="Label"
            value={couponForm.label}
            onChange={(e) => setCouponForm({ ...couponForm, label: e.target.value })}
          />
          <Input
            label="Discount Value"
            type="number"
            value={couponForm.discount}
            onChange={(e) => setCouponForm({ ...couponForm, discount: e.target.value })}
          />
          <select
            value={couponForm.discountType}
            onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="flat">Flat Amount (₹)</option>
          </select>
          <Input
            label="Minimum Order Value"
            type="number"
            value={couponForm.minOrder}
            onChange={(e) => setCouponForm({ ...couponForm, minOrder: e.target.value })}
          />
          <Input
            label="Maximum Discount"
            type="number"
            value={couponForm.maxDiscount}
            onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
          />
        </div>
        <div className="mt-4 flex gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={couponForm.active}
              onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked })}
            />
            Active
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={couponForm.shouldPopup}
              onChange={(e) => setCouponForm({ ...couponForm, shouldPopup: e.target.checked })}
            />
            Show as Popup
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSaveCoupon}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Add Coupon'}
          </button>
          {editingCoupon && (
            <button
              onClick={() => {
                setEditingCoupon(null);
                setCouponForm({ code: '', label: '', discount: '', discountType: 'percentage', minOrder: 0, maxDiscount: 0, active: true, shouldPopup: false });
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </Card>

      <Card title="Coupon List">
        <div className="space-y-3">
          {coupons.map(coupon => (
            <div key={coupon.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-lg">{coupon.code}</p>
                <p className="text-sm text-gray-500">{coupon.label}</p>
                <p className="text-sm font-semibold text-blue-600">
                  {coupon.discountType === 'percentage' ? `${coupon.discount}% off` : `₹${coupon.discount} off`}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {coupon.active ? 'Active' : 'Inactive'}
                  </span>
                  {coupon.shouldPopup && <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-700">Popup</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingCoupon(coupon); setCouponForm(coupon); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteCoupon(coupon.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <p className="text-gray-500 text-center py-8">No coupons yet</p>}
        </div>
      </Card>
    </div>
  );

  const renderTheme = () => (
    <Card title="Theme Colors">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={themeColors.primary}
              onChange={(e) => setThemeColors({ ...themeColors, primary: e.target.value })}
              className="w-16 h-12 rounded cursor-pointer"
            />
            <input
              type="text"
              value={themeColors.primary}
              onChange={(e) => setThemeColors({ ...themeColors, primary: e.target.value })}
              className="flex-1 p-3 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={themeColors.secondary}
              onChange={(e) => setThemeColors({ ...themeColors, secondary: e.target.value })}
              className="w-16 h-12 rounded cursor-pointer"
            />
            <input
              type="text"
              value={themeColors.secondary}
              onChange={(e) => setThemeColors({ ...themeColors, secondary: e.target.value })}
              className="flex-1 p-3 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Surface Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={themeColors.surface}
              onChange={(e) => setThemeColors({ ...themeColors, surface: e.target.value })}
              className="w-16 h-12 rounded cursor-pointer"
            />
            <input
              type="text"
              value={themeColors.surface}
              onChange={(e) => setThemeColors({ ...themeColors, surface: e.target.value })}
              className="flex-1 p-3 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>
      <div className="mt-6 p-6 rounded-lg border-2 border-dashed border-gray-300" style={{ backgroundColor: themeColors.surface }}>
        <h3 style={{ color: themeColors.primary }} className="text-xl font-bold mb-2">Preview</h3>
        <button style={{ backgroundColor: themeColors.primary }} className="px-4 py-2 text-white rounded mr-2">Primary Button</button>
        <button style={{ backgroundColor: themeColors.secondary }} className="px-4 py-2 text-white rounded">Secondary Button</button>
      </div>
      <button
        onClick={handleSaveTheme}
        disabled={loading}
        className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {loading ? 'Saving...' : 'Save Theme'}
      </button>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Audio elements */}
      <audio ref={newOrderAudioRef} src="/neworder.mpeg" preload="auto" />
      <audio ref={cancelledOrderAudioRef} src="/cancelled.mpeg" preload="auto" />

      {/* New Order Popup */}
      <AnimatePresence>
        {newOrderPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleCloseNewOrderPopup}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border-2 border-emerald-500"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Bell className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">New Order Alert!</h2>
                <p className="text-gray-600 mb-4">You have {newOrderCount} pending order{newOrderCount > 1 ? 's' : ''}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { handleCloseNewOrderPopup(); setActiveTab('orders'); }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 font-medium transition-all"
                  >
                    View Orders
                  </button>
                  <button
                    onClick={handleCloseNewOrderPopup}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancelled Order Popup */}
      <AnimatePresence>
        {cancelledOrderPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleCloseCancelledOrderPopup}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border-2 border-red-500"
            >
              <div className="text-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    boxShadow: ['0 0 0 0 rgba(239, 68, 68, 0.7)', '0 0 0 20px rgba(239, 68, 68, 0)', '0 0 0 0 rgba(239, 68, 68, 0)']
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <XCircle className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Cancelled!</h2>
                <p className="text-gray-600 mb-4">A new order has been cancelled!</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { handleCloseCancelledOrderPopup(); setActiveTab('orders'); }}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 font-medium transition-all"
                  >
                    View Orders
                  </button>
                  <button
                    onClick={handleCloseCancelledOrderPopup}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedOrder(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Order Details</h2>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-semibold text-lg">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-semibold">{selectedOrder.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      selectedOrder.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                      selectedOrder.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{selectedOrder.status}</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-semibold">{selectedOrder.paymentMethod}</p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-lg mb-3">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <p><span className="text-gray-500">Name:</span> {selectedOrder.shippingAddress?.name}</p>
                    <p><span className="text-gray-500">Phone:</span> {selectedOrder.shippingAddress?.phone}</p>
                    <p><span className="text-gray-500">Email:</span> {selectedOrder.shippingAddress?.email}</p>
                    <p className="md:col-span-2">
                      <span className="text-gray-500">Address:</span> {selectedOrder.shippingAddress?.addressLine1}, {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                    </p>
                  </div>
                </div>

                {/* Custom Order Info */}
                {selectedOrder.customOrder && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <h3 className="font-semibold text-lg mb-3 text-emerald-800">Custom Order Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedOrder.customOrder.customerName && (
                        <p><span className="text-gray-500">Customer Name:</span> {selectedOrder.customOrder.customerName}</p>
                      )}
                      {selectedOrder.customOrder.nameOnBag && (
                        <p><span className="text-gray-500">Name on Bag:</span> {selectedOrder.customOrder.nameOnBag}</p>
                      )}
                      {selectedOrder.customOrder.bagType && (
                        <p><span className="text-gray-500">Bag Type:</span> {selectedOrder.customOrder.bagType}</p>
                      )}
                      {selectedOrder.customOrder.quantity && (
                        <p><span className="text-gray-500">Quantity:</span> {selectedOrder.customOrder.quantity}</p>
                      )}
                    </div>
                    {selectedOrder.customOrder.description && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-500 mb-1">Description:</p>
                        <p className="bg-white p-3 rounded-lg border border-emerald-200">{selectedOrder.customOrder.description}</p>
                      </div>
                    )}
                    {selectedOrder.customOrder.customImage && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-500 mb-2">Custom Image:</p>
                        <div className="flex flex-wrap items-center gap-4">
                          <img 
                            src={selectedOrder.customOrder.customImage} 
                            alt="Custom" 
                            className="w-32 h-32 object-contain rounded-lg border border-emerald-200 bg-white" 
                          />
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = selectedOrder.customOrder.customImage;
                              link.download = `custom-order-${selectedOrder.id}.png`;
                              link.click();
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download Image
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Ordered Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                        {item.images?.[0] && (
                          <img src={item.images[0]} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity} × ₹{item.price}</p>
                        </div>
                        <p className="font-semibold">₹{item.price * item.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-lg mb-3">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium">₹{selectedOrder.pricing?.subtotal || selectedOrder.subtotal || selectedOrder.total}</span>
                    </div>
                    {selectedOrder.pricing?.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Discount</span>
                        <span className="font-medium text-red-600">-₹{selectedOrder.pricing.discountAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shipping</span>
                      <span className="font-medium">{selectedOrder.pricing?.shipping === 0 ? 'Free' : `₹${selectedOrder.pricing?.shipping || selectedOrder.shippingCharge || 0}`}</span>
                    </div>
                    {selectedOrder.pricing?.gstAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">GST ({selectedOrder.pricing?.gstRate || 18}%)</span>
                        <span className="font-medium">₹{selectedOrder.pricing.gstAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="font-bold text-lg">Total</span>
                      <span className="font-bold text-lg text-emerald-600">₹{selectedOrder.pricing?.grandTotal || selectedOrder.grandTotal || selectedOrder.total}</span>
                    </div>
                  </div>
                </div>

                {/* Cancel Reason (if applicable) */}
                {selectedOrder.status === 'Cancelled' && selectedOrder.cancelReason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="font-semibold text-red-800 mb-2">Cancellation Reason</h3>
                    <p className="text-red-700">{selectedOrder.cancelReason}</p>
                    {selectedOrder.cancelledAt && (
                      <p className="text-sm text-red-600 mt-1">Cancelled at: {selectedOrder.cancelledAt}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => downloadAdminInvoicePdf(selectedOrder)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Invoice
                </button>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => {
                    if (e.target.value === 'Cancelled') {
                      setShowCancelReasonModal(selectedOrder.id);
                      setAdminCancelReason('');
                      setSelectedOrder(null);
                    } else {
                      handleUpdateOrderStatus(selectedOrder.id, e.target.value);
                      setSelectedOrder(null);
                    }
                  }}
                  className="flex-1 min-w-[200px] p-3 border border-gray-300 rounded-lg"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  Close
                </button>
              </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Reason Modal */}
      <AnimatePresence>
        {showCancelReasonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCancelReasonModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Cancel Order</h2>
                <button onClick={() => setShowCancelReasonModal(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cancellation Reason
                  </label>
                  <textarea
                    value={adminCancelReason}
                    onChange={(e) => setAdminCancelReason(e.target.value)}
                    placeholder="Enter reason for cancellation..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelReasonModal(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (adminCancelReason.trim()) {
                        handleUpdateOrderStatus(showCancelReasonModal, 'Cancelled', adminCancelReason);
                        setShowCancelReasonModal(null);
                      }
                    }}
                    disabled={!adminCancelReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all"
                  >
                    Confirm Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg hover:bg-gray-100"
              title={soundEnabled ? 'Sound On' : 'Sound Off'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <span className="text-gray-600 hidden sm:block">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl shadow-sm p-4 space-y-2 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
            <button
              onClick={() => navigate('/products')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              <Home className="w-5 h-5" />
              <span>View Store</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${message.includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}

          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'categories' && renderCategories()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'orders' && renderOrders()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'popups' && renderPopups()}
          {activeTab === 'banners' && renderBanners()}
          {activeTab === 'coupons' && renderCoupons()}
          {activeTab === 'theme' && renderTheme()}
          {activeTab === 'settings' && renderSettings()}
        </main>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, isNew = false }) => (
  <motion.div 
    className={`bg-white rounded-xl shadow-sm p-6 ${isNew ? 'relative overflow-hidden' : ''}`}
    animate={isNew ? { 
      boxShadow: ['0 0 0 0 rgba(245, 158, 11, 0.7)', '0 0 0 10px rgba(245, 158, 11, 0)', '0 0 0 0 rgba(245, 158, 11, 0.7)']
    } : {}}
    transition={isNew ? { duration: 2, repeat: Infinity } : {}}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
      <div className={`p-3 ${color} rounded-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    {isNew && (
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-400" />
    )}
  </motion.div>
);

const Card = ({ title, children }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
    {children}
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      {...props}
    />
  </div>
);

export default AdminDashboard;
