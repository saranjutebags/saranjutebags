import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { sendOrderStatusNotification } from '../services/notificationService';
import { sendOrderStatusEmail } from '../services/emailService';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const STORAGE_KEYS = {
  cart: 'cart',
  wishlist: 'wishlist',
  coupons: 'saran-jute-coupons',
  latestOrder: 'saran-jute-latest-order',
  pricingSettings: 'saran-jute-pricing-settings',
};

// Per-user storage keys (scoped by uid)
const userStorageKey = (uid, key) => `${key}-${uid}`;

const readJson = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.uid || null;

  const [cart, setCart] = useState(() => readJson(STORAGE_KEYS.cart, []));
  const [wishlist, setWishlist] = useState(() => readJson(STORAGE_KEYS.wishlist, []));

  // User-scoped orders and addresses — start empty, loaded after uid resolves
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [latestOrder, setLatestOrder] = useState(null);

  const [pricingSettings, setPricingSettings] = useState(() => readJson(STORAGE_KEYS.pricingSettings, {
    gstRate: 18,
    shippingCharge: 40,
    freeShippingThreshold: 999,
  }));
  const [cartToast, setCartToast] = useState(null);
  const [coupons, setCoupons] = useState(() => readJson(STORAGE_KEYS.coupons, [
    { id: 'welcome10', code: 'WELCOME10', label: 'Welcome Offer', discount: '10% OFF', active: true, shouldPopup: true },
    { id: 'jute15', code: 'JUTE15', label: 'Bulk Bag Deal', discount: '15% OFF', active: false, shouldPopup: false },
    { id: 'save50', code: 'SAVE50', label: 'Festival Savings', discount: 'Flat ₹50 OFF', active: true, shouldPopup: false },
  ]));

  // Track active Firestore unsubscribers so we can tear down when user changes
  const unsubOrdersRef = useRef(null);
  const unsubAddressesRef = useRef(null);

  const syncLocalOrders = (nextOrders) => {
    setOrders(nextOrders);
    if (uid) writeJson(userStorageKey(uid, 'saran-jute-orders'), nextOrders);
  };

  const syncLocalAddresses = (nextAddresses) => {
    setAddresses(nextAddresses);
    if (uid) writeJson(userStorageKey(uid, 'saran-jute-addresses'), nextAddresses);
  };

  const syncLocalCoupons = (nextCoupons) => {
    setCoupons(nextCoupons);
    writeJson(STORAGE_KEYS.coupons, nextCoupons);
  };

  // ─── Re-subscribe whenever the logged-in user changes ───────────────────────
  useEffect(() => {
    // Tear down previous subscriptions
    if (unsubOrdersRef.current) { unsubOrdersRef.current(); unsubOrdersRef.current = null; }
    if (unsubAddressesRef.current) { unsubAddressesRef.current(); unsubAddressesRef.current = null; }

    if (!uid) {
      // Not logged in — clear user-scoped data
      setOrders([]);
      setAddresses([]);
      setLatestOrder(null);
      return;
    }

    // Load from local storage for this user while Firestore connects
    setOrders(readJson(userStorageKey(uid, 'saran-jute-orders'), []));
    setAddresses(readJson(userStorageKey(uid, 'saran-jute-addresses'), []));
    setLatestOrder(readJson(userStorageKey(uid, 'saran-jute-latest-order'), null));

    if (!isFirebaseActive) return;

    // Subscribe to user-scoped orders: users/{uid}/orders
    unsubOrdersRef.current = onSnapshot(
      collection(db, 'users', uid, 'orders'),
      (snap) => {
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        docs.sort((a, b) => {
          // Sort by createdAt descending if available, else id
          const ta = a.createdAt || a.id || '';
          const tb = b.createdAt || b.id || '';
          return tb.localeCompare(ta);
        });
        setOrders(docs);
        writeJson(userStorageKey(uid, 'saran-jute-orders'), docs);
      },
      (error) => {
        console.warn('Orders sync unavailable; using local fallback.', error?.message || error);
        setOrders(readJson(userStorageKey(uid, 'saran-jute-orders'), []));
      }
    );

    // Subscribe to user-scoped addresses: users/{uid}/addresses
    unsubAddressesRef.current = onSnapshot(
      collection(db, 'users', uid, 'addresses'),
      (snap) => {
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        setAddresses(docs);
        writeJson(userStorageKey(uid, 'saran-jute-addresses'), docs);
      },
      (error) => {
        console.warn('Addresses sync unavailable; using local fallback.', error?.message || error);
        setAddresses(readJson(userStorageKey(uid, 'saran-jute-addresses'), []));
      }
    );

    return () => {
      if (unsubOrdersRef.current) { unsubOrdersRef.current(); unsubOrdersRef.current = null; }
      if (unsubAddressesRef.current) { unsubAddressesRef.current(); unsubAddressesRef.current = null; }
    };
  }, [uid]);

  // ─── Global collections (coupons, pricing) ──────────────────────────────────
  useEffect(() => {
    if (!isFirebaseActive) return;

    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => {
      if (snap.empty) {
        const defaultCoupons = [
          { id: 'welcome10', code: 'WELCOME10', label: 'Welcome Offer', discount: '10% OFF', active: true, shouldPopup: true },
          { id: 'jute15', code: 'JUTE15', label: 'Bulk Bag Deal', discount: '15% OFF', active: false, shouldPopup: false },
          { id: 'save50', code: 'SAVE50', label: 'Festival Savings', discount: 'Flat ₹50 OFF', active: true, shouldPopup: false },
        ];
        defaultCoupons.forEach(c => setDoc(doc(db, 'coupons', c.id), c).catch(() => undefined));
      } else {
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        setCoupons(docs);
      }
    }, (error) => {
      console.warn('Coupons sync unavailable; using local fallback.', error?.message || error);
      setCoupons(readJson(STORAGE_KEYS.coupons, []));
    });

    const unsubPricing = onSnapshot(doc(db, 'settings', 'pricing'), (snap) => {
      if (snap.exists()) {
        setPricingSettings(snap.data());
      } else {
        setDoc(doc(db, 'settings', 'pricing'), {
          gstRate: 18,
          shippingCharge: 40,
          freeShippingThreshold: 999,
        }).catch(() => undefined);
      }
    }, (error) => {
      console.warn('Pricing settings sync unavailable; using cached fallback.', error?.message || error);
      setPricingSettings(readJson(STORAGE_KEYS.pricingSettings, {
        gstRate: 18,
        shippingCharge: 40,
        freeShippingThreshold: 999,
      }));
    });

    return () => {
      unsubCoupons();
      unsubPricing();
    };
  }, []);

  useEffect(() => { writeJson(STORAGE_KEYS.cart, cart); }, [cart]);
  useEffect(() => { writeJson(STORAGE_KEYS.wishlist, wishlist); }, [wishlist]);

  useEffect(() => {
    if (latestOrder && uid) {
      writeJson(userStorageKey(uid, 'saran-jute-latest-order'), latestOrder);
    }
  }, [latestOrder, uid]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.coupons, coupons);
    }
  }, [coupons]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.pricingSettings, pricingSettings);
    }
  }, [pricingSettings]);

  // ─── Cart ────────────────────────────────────────────────────────────────────
  const addToCart = (product, quantity = 1, customText = '', customLogo = '') => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.id === product.id && item.customText === customText && item.customLogo === customLogo);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prev, { ...product, quantity, customText, customLogo }];
    });
    setCartToast({ id: product.id, name: product.name, quantity });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity } : item));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => { setCart([]); };

  // ─── Addresses (user-scoped) ─────────────────────────────────────────────────
  const addAddress = (address) => {
    if (!uid) return;
    const id = address.id || `addr-${Date.now()}`;
    const nextAddress = {
      id,
      isDefault: addresses.length === 0 || address.isDefault,
      ...address,
    };

    const nextAddresses = [
      nextAddress,
      ...addresses.map(item => ({ ...item, isDefault: nextAddress.isDefault ? false : item.isDefault })),
    ];

    if (isFirebaseActive) {
      setDoc(doc(db, 'users', uid, 'addresses', id), nextAddress).catch(() => {
        syncLocalAddresses(nextAddresses);
      });
      if (nextAddress.isDefault) {
        addresses.forEach(a => {
          if (a.id !== id && a.isDefault) {
            setDoc(doc(db, 'users', uid, 'addresses', a.id), { ...a, isDefault: false }).catch(() => undefined);
          }
        });
      }
    } else {
      syncLocalAddresses(nextAddresses);
    }
  };

  const updateAddress = (addressId, updates) => {
    if (!uid) return;
    if (isFirebaseActive) {
      const existing = addresses.find(a => a.id === addressId);
      if (existing) {
        setDoc(doc(db, 'users', uid, 'addresses', addressId), { ...existing, ...updates }).catch(() => {
          syncLocalAddresses(addresses.map(a => a.id === addressId ? { ...a, ...updates } : updates.isDefault ? { ...a, isDefault: false } : a));
        });
      }
    } else {
      setAddresses(prev => prev.map(a => a.id === addressId ? { ...a, ...updates } : updates.isDefault ? { ...a, isDefault: false } : a));
    }
  };

  const removeAddress = (addressId) => {
    if (!uid) return;
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'users', uid, 'addresses', addressId)).catch(() => {
        syncLocalAddresses(addresses.filter(a => a.id !== addressId));
      });
    } else {
      setAddresses(prev => prev.filter(a => a.id !== addressId));
    }
  };

  const setDefaultAddress = (addressId) => {
    if (!uid) return;
    if (isFirebaseActive) {
      addresses.forEach(a => {
        setDoc(doc(db, 'users', uid, 'addresses', a.id), { ...a, isDefault: a.id === addressId }).catch(() => undefined);
      });
    } else {
      setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === addressId })));
    }
  };

  // ─── Orders (user-scoped + also mirror to top-level for admin) ───────────────
  const triggerOrderNotification = (order, status) => {
    sendOrderStatusNotification(order, status).catch(err => console.error('OneSignal Notification error:', err));
  };

  const addOrder = (order) => {
    if (!uid) return;

    const nextOrder = {
      ...order,
      userId: uid,
      userEmail: order.userEmail || order.shippingAddress?.email || '',
      customOrder: order.customOrder || null,
      shippingAddress: {
        ...order.shippingAddress,
        email: order.shippingAddress?.email || order.userEmail || '',
      },
      billingAddress: {
        ...(order.billingAddress || order.shippingAddress),
        email: order.billingAddress?.email || order.shippingAddress?.email || order.userEmail || '',
      },
      paymentDetails: order.paymentDetails || {
        transactionId: `TXN${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: order.paymentMethod === 'COD' ? 'Pending (COD)' : 'Paid',
        gateway: order.paymentMethod === 'COD' ? 'None' : 'Razorpay',
      },
      orderTimeline: order.orderTimeline || [
        { status: 'Placed', timestamp: order.date || new Date().toLocaleString(), note: 'Order placed by customer' },
        { status: 'Confirmed', timestamp: order.date || new Date().toLocaleString(), note: 'Order confirmed automatically' },
      ],
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive) {
      // Save to user-scoped path so user sees only their orders
      setDoc(doc(db, 'users', uid, 'orders', order.id), nextOrder).catch(() => {
        const nextOrders = [nextOrder, ...orders.filter(item => item.id !== nextOrder.id)];
        syncLocalOrders(nextOrders);
      });
      // Also mirror to top-level orders collection for admin visibility
      setDoc(doc(db, 'orders', order.id), nextOrder).catch(() => undefined);
    } else {
      syncLocalOrders([nextOrder, ...orders.filter(item => item.id !== nextOrder.id)]);
    }

    triggerOrderNotification(nextOrder, 'Confirmed');
    sendOrderStatusEmail(nextOrder, 'Confirmed').catch(err => console.error('Email send error:', err));
  };

  const updateOrder = (orderId, updates) => {
    const existing = orders.find(order => order.id === orderId);
    if (!existing) return;

    const newTimeline = [...(existing.orderTimeline || [])];
    let newStatus = existing.status;

    if (updates.status && updates.status !== existing.status) {
      newStatus = updates.status;
      newTimeline.push({
        status: updates.status,
        timestamp: new Date().toLocaleString(),
        note: updates.timelineNote || `Status updated to ${updates.status}`,
      });
    }

    const { timelineNote, ...restUpdates } = updates;
    const nextOrder = {
      ...existing,
      ...restUpdates,
      userEmail: updates.userEmail || existing.userEmail || existing.shippingAddress?.email || '',
      shippingAddress: {
        ...existing.shippingAddress,
        ...updates.shippingAddress,
        email: updates.shippingAddress?.email || existing.shippingAddress?.email || updates.userEmail || existing.userEmail || '',
      },
      billingAddress: {
        ...existing.billingAddress,
        ...updates.billingAddress,
        email: updates.billingAddress?.email || existing.billingAddress?.email || updates.shippingAddress?.email || existing.shippingAddress?.email || updates.userEmail || existing.userEmail || '',
      },
      status: newStatus,
      orderTimeline: newTimeline,
    };

    const orderUserId = existing.userId || uid;

    if (isFirebaseActive) {
      // Update in user-scoped path
      if (orderUserId) {
        setDoc(doc(db, 'users', orderUserId, 'orders', orderId), nextOrder).catch(() => undefined);
      }
      // Update in top-level admin collection
      setDoc(doc(db, 'orders', orderId), nextOrder).catch(() => {
        if (uid) {
          const nextOrders = orders.map(o => o.id === orderId ? nextOrder : o);
          syncLocalOrders(nextOrders);
        }
      });
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? nextOrder : o));
    }

    setLatestOrder(prev => (prev && prev.id === orderId ? nextOrder : prev));

    if (updates.status && updates.status !== existing.status) {
      triggerOrderNotification(nextOrder, updates.status);
      sendOrderStatusEmail(nextOrder, updates.status).catch(err => console.error('Email send error:', err));
    }
  };

  const cancelOrder = (orderId, cancelReason) => {
    updateOrder(orderId, {
      status: 'Cancelled',
      cancelReason,
      cancelledAt: new Date().toLocaleString(),
    });
  };

  // ─── Pricing ─────────────────────────────────────────────────────────────────
  const updatePricingSettings = (updates) => {
    if (isFirebaseActive) {
      setDoc(doc(db, 'settings', 'pricing'), { ...pricingSettings, ...updates }).catch(() => {
        const next = { ...pricingSettings, ...updates };
        setPricingSettings(next);
        writeJson(STORAGE_KEYS.pricingSettings, next);
      });
    } else {
      setPricingSettings(prev => ({ ...prev, ...updates }));
    }
  };

  const calculateOrderPricing = (subtotal, discountAmount = 0) => {
    const shipping = subtotal >= pricingSettings.freeShippingThreshold ? 0 : pricingSettings.shippingCharge;
    const taxableAmount = Math.max(subtotal - discountAmount, 0);
    const gstAmount = Math.round(taxableAmount * (pricingSettings.gstRate / 100) * 100) / 100;
    const grandTotal = Math.round((taxableAmount + shipping + gstAmount) * 100) / 100;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      shipping,
      gstRate: pricingSettings.gstRate,
      gstAmount,
      grandTotal,
    };
  };

  const setLatestOrderItem = (order) => { setLatestOrder(order); };

  const clearOrders = () => {
    if (!uid) return;
    if (isFirebaseActive) {
      orders.forEach(o => {
        deleteDoc(doc(db, 'users', uid, 'orders', o.id)).catch(() => undefined);
      });
    } else {
      setOrders([]);
    }
  };

  // ─── Coupons ─────────────────────────────────────────────────────────────────
  const addCoupon = (coupon) => {
    const id = coupon.id || `coupon-${Date.now()}`;
    const newCoupon = { ...coupon, id };
    if (isFirebaseActive) {
      setDoc(doc(db, 'coupons', id), newCoupon).catch(() => syncLocalCoupons([newCoupon, ...coupons.filter(c => c.id !== id)]));
    } else {
      setCoupons(prev => [newCoupon, ...prev]);
    }
  };

  const updateCoupon = (couponId, updates) => {
    const existing = coupons.find(c => c.id === couponId);
    if (!existing) return;
    const newCoupon = { ...existing, ...updates };
    if (isFirebaseActive) {
      setDoc(doc(db, 'coupons', couponId), newCoupon).catch(() => syncLocalCoupons(coupons.map(c => c.id === couponId ? newCoupon : c)));
    } else {
      setCoupons(prev => prev.map(c => c.id === couponId ? newCoupon : c));
    }
  };

  const deleteCoupon = (couponId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'coupons', couponId)).catch(() => syncLocalCoupons(coupons.filter(c => c.id !== couponId)));
    } else {
      setCoupons(prev => prev.filter(c => c.id !== couponId));
    }
  };

  const toggleCoupon = (couponId) => {
    const coupon = coupons.find(c => c.id === couponId);
    if (coupon) updateCoupon(couponId, { active: !coupon.active });
  };

  const updateCouponCode = (couponId, code) => updateCoupon(couponId, { code });

  const dismissCartToast = () => { setCartToast(null); };

  const getDefaultAddress = () => addresses.find(a => a.isDefault) || addresses[0] || null;

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const existing = prev.find(item => item.id === product.id);
      return existing ? prev.filter(item => item.id !== product.id) : [...prev, product];
    });
  };

  const isInWishlist = (productId) => wishlist.some(item => item.id === productId);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    cart,
    wishlist,
    addresses,
    orders,
    latestOrder,
    cartToast,
    coupons,
    pricingSettings,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    toggleWishlist,
    isInWishlist,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
    addOrder,
    updateOrder,
    cancelOrder,
    updatePricingSettings,
    calculateOrderPricing,
    setLatestOrderItem,
    clearOrders,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCoupon,
    updateCouponCode,
    getDefaultAddress,
    dismissCartToast,
    cartTotal,
    cartCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
