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
  allOrders: 'saran-jute-all-orders',
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
  const [warehouse, setWarehouse] = useState(null);
  const [domesticShipping, setDomesticShipping] = useState(null);
  const [internationalRates, setInternationalRates] = useState([]);
  const [cartToast, setCartToast] = useState(null);
  const seededDefaults = useRef(false);
  const [coupons, setCoupons] = useState(() => readJson(STORAGE_KEYS.coupons, [
    { id: 'welcome10', code: 'WELCOME10', label: 'Welcome Offer', discount: '10% OFF', active: true, shouldPopup: true },
    { id: 'jute15', code: 'JUTE15', label: 'Bulk Bag Deal', discount: '15% OFF', active: false, shouldPopup: false },
    { id: 'save50', code: 'SAVE50', label: 'Festival Savings', discount: 'Flat ₹50 OFF', active: true, shouldPopup: false },
  ]));

  // Track active Firestore unsubscribers so we can tear down when user changes
  const unsubOrdersRef = useRef(null);
  const unsubAddressesRef = useRef(null);

  // Reduce order item images for Firestore (keep URL images, at most 1 base64 per item)
  const sanitizeForFirestore = (obj) => {
    if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
    if (obj === null || typeof obj !== 'object') return obj;
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;
      if (key === 'images' && Array.isArray(value)) {
        const urls = value.filter(img => img && !img.startsWith('data:'));
        cleaned.images = urls.length > 0 ? urls : (value.length > 0 ? [value[0]] : []);
      } else if (key === 'selectedImage' && typeof value === 'string' && value.startsWith('data:')) {
        const urls = (obj.images || []).filter(img => img && !img.startsWith('data:'));
        cleaned.selectedImage = urls[0] || value;
      } else {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned;
  };

  const orderSorter = (a, b) => {
    const ta = new Date(a.createdAt || a.date).getTime() || 0;
    const tb = new Date(b.createdAt || b.date).getTime() || 0;
    return tb - ta;
  };

  const syncLocalOrders = (nextOrders) => {
    nextOrders.sort(orderSorter);
    setOrders(nextOrders);
  };

  const syncLocalAddresses = (nextAddresses) => {
    setAddresses(nextAddresses);
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

    setOrders([]);
    setAddresses([]);
    setLatestOrder(null);

    if (!isFirebaseActive) return;

    // Subscribe to user-scoped orders: users/{uid}/orders
    unsubOrdersRef.current = onSnapshot(
      collection(db, 'users', uid, 'orders'),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.fromCache) return;
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        docs.sort((a, b) => {
          const ta = new Date(a.createdAt || a.date).getTime() || 0;
          const tb = new Date(b.createdAt || b.date).getTime() || 0;
          return tb - ta;
        });
        setOrders(docs);
      },
      () => {
        setOrders([]);
      }
    );

    // Subscribe to user-scoped addresses: users/{uid}/addresses
    unsubAddressesRef.current = onSnapshot(
      collection(db, 'users', uid, 'addresses'),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.fromCache) return;
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        setAddresses(docs);
      },
      () => {
        setAddresses([]);
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
      if (snap.empty && !seededDefaults.current) {
        seededDefaults.current = true;
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

    const unsubWarehouse = onSnapshot(doc(db, 'settings', 'warehouse'), (snap) => {
      if (snap.exists()) {
        setWarehouse(snap.data());
      } else {
        const defaultWarehouse = {
          lat: 17.433333,
          lng: 78.383333,
          placeId: '',
          name: 'Main Warehouse',
          phone: '+91 9876543210',
          address: 'Mehdipatnam, Hyderabad, Telangana 500028',
          pincode: '500028',
          active: true,
        };
        // Immediately set state with defaults so checkout can proceed;
        // the setDoc write will trigger a re-snapshot that sets it again.
        setWarehouse(defaultWarehouse);
        setDoc(doc(db, 'settings', 'warehouse'), defaultWarehouse).catch(() => undefined);
      }
    }, () => setWarehouse(null));

    const unsubDomestic = onSnapshot(doc(db, 'settings', 'domesticShipping'), (snap) => {
      if (snap.exists()) {
        setDomesticShipping(snap.data());
      } else {
        setDoc(doc(db, 'settings', 'domesticShipping'), {
          baseCharge: 40,
          perKm: 8,
          freeDeliveryAbove: 5000,
        }).catch(() => undefined);
      }
    }, () => setDomesticShipping(null));

    const unsubInternational = onSnapshot(doc(db, 'settings', 'internationalShipping'), (snap) => {
      if (snap.exists()) {
        setInternationalRates(snap.data().rates || []);
      } else {
        const defaultRates = [
          { country: 'USA', code: 'US', ratePerKg: 420, currency: 'USD', minCharge: 1000, estimatedDays: '7-10' },
          { country: 'UK', code: 'GB', ratePerKg: 390, currency: 'GBP', minCharge: 800, estimatedDays: '7-10' },
          { country: 'UAE', code: 'AE', ratePerKg: 220, currency: 'AED', minCharge: 500, estimatedDays: '5-7' },
          { country: 'Australia', code: 'AU', ratePerKg: 450, currency: 'AUD', minCharge: 1000, estimatedDays: '10-14' },
          { country: 'Germany', code: 'DE', ratePerKg: 400, currency: 'EUR', minCharge: 900, estimatedDays: '7-10' },
        ];
        setInternationalRates(defaultRates);
        setDoc(doc(db, 'settings', 'internationalShipping'), { rates: defaultRates }).catch(() => undefined);
      }
    }, () => setInternationalRates([]));

    return () => {
      unsubCoupons();
      unsubPricing();
      unsubWarehouse();
      unsubDomestic();
      unsubInternational();
    };
  }, []);

  useEffect(() => { writeJson(STORAGE_KEYS.cart, cart); }, [cart]);
  useEffect(() => { writeJson(STORAGE_KEYS.wishlist, wishlist); }, [wishlist]);

  // latestOrder is Firebase-only — no localStorage cache

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
    let blocked = false;
    setCart(prev => {
      if (product.stock !== undefined && product.stock <= 0) {
        blocked = true;
        setCartToast({ id: product.id, name: product.name, quantity: 0, error: 'Out of stock' });
        return prev;
      }
      const existingIndex = prev.findIndex(item => item.id === product.id && item.customText === customText && item.customLogo === customLogo);
      if (existingIndex > -1) {
        const newQty = prev[existingIndex].quantity + quantity;
        if (product.stock !== undefined && newQty > product.stock) {
          blocked = true;
          setCartToast({ id: product.id, name: product.name, quantity: 0, error: `Only ${product.stock} available` });
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex].quantity = newQty;
        return updated;
      }
      if (product.stock !== undefined && quantity > product.stock) {
        blocked = true;
        setCartToast({ id: product.id, name: product.name, quantity: 0, error: `Only ${product.stock} available` });
        return prev;
      }
      return [...prev, { ...product, quantity, customText, customLogo }];
    });
    if (!blocked) {
      setCartToast({ id: product.id, name: product.name, quantity });
    }
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

  const addOrder = async (order) => {
    if (!uid) {
      console.warn('addOrder: user not authenticated (uid is null) — order not saved');
      return;
    }

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
      ],
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive) {
      const stripped = sanitizeForFirestore(nextOrder);
      await setDoc(doc(db, 'users', uid, 'orders', order.id), stripped);
      await setDoc(doc(db, 'orders', order.id), stripped).catch(err => console.error('Failed to mirror order to top-level collection:', err));
    }

    triggerOrderNotification(nextOrder, nextOrder.status);
    sendOrderStatusEmail(nextOrder, nextOrder.status).catch(err => console.error('Email send error:', err));
  };

  const updateOrder = async (orderId, updates, existingOrder = null) => {
    const existing = existingOrder || orders.find(order => order.id === orderId);
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
      const stripped = sanitizeForFirestore(nextOrder);
      if (orderUserId) {
        await setDoc(doc(db, 'users', orderUserId, 'orders', orderId), stripped).catch(err => console.error('Failed to update user order:', err));
      }
      await setDoc(doc(db, 'orders', orderId), stripped);
    }

    setLatestOrder(prev => (prev && prev.id === orderId ? nextOrder : prev));

    if (updates.status && updates.status !== existing.status) {
      triggerOrderNotification(nextOrder, updates.status);
      sendOrderStatusEmail(nextOrder, updates.status).catch(err => console.error('Email send error:', err));
    }
  };

  const cancelOrder = async (orderId, cancelReason) => {
    await updateOrder(orderId, {
      status: 'Cancelled',
      cancelReason,
      cancelledAt: new Date().toLocaleString(),
    });
  };

  const deleteOrders = async (orderIds) => {
    if (isFirebaseActive) {
      for (const orderId of orderIds) {
        const existing = orders.find(o => o.id === orderId);
        if (existing?.userId) {
          deleteDoc(doc(db, 'users', existing.userId, 'orders', orderId)).catch(() => undefined);
        }
        await deleteDoc(doc(db, 'orders', orderId));
      }
    }
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

  const updateWarehouse = (updates) => {
    if (isFirebaseActive) {
      setDoc(doc(db, 'settings', 'warehouse'), { ...warehouse, ...updates }).catch(() => undefined);
    } else {
      setWarehouse(prev => prev ? { ...prev, ...updates } : updates);
    }
  };

  const updateDomesticShipping = (updates) => {
    if (isFirebaseActive) {
      setDoc(doc(db, 'settings', 'domesticShipping'), { ...domesticShipping, ...updates }).catch(() => undefined);
    } else {
      setDomesticShipping(prev => prev ? { ...prev, ...updates } : updates);
    }
  };

  const updateInternationalShipping = (rates) => {
    if (isFirebaseActive) {
      setDoc(doc(db, 'settings', 'internationalShipping'), { rates }).catch(() => undefined);
    } else {
      setInternationalRates(rates);
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
    warehouse,
    domesticShipping,
    internationalRates,
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
    deleteOrders,
    updatePricingSettings,
    updateWarehouse,
    updateDomesticShipping,
    updateInternationalShipping,
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
