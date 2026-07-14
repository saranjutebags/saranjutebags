import { createContext, useContext, useState, useEffect } from 'react';
import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { sendOrderStatusNotification } from '../services/notificationService';
import { sendOrderStatusEmail } from '../services/emailService';

const CartContext = createContext();

const STORAGE_KEYS = {
  cart: 'cart',
  wishlist: 'wishlist',
  orders: 'saran-jute-orders',
  addresses: 'saran-jute-addresses',
  coupons: 'saran-jute-coupons',
  latestOrder: 'saran-jute-latest-order',
  pricingSettings: 'saran-jute-pricing-settings',
};

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
  const [cart, setCart] = useState(() => {
    return readJson(STORAGE_KEYS.cart, []);
  });

  const [wishlist, setWishlist] = useState(() => {
    return readJson(STORAGE_KEYS.wishlist, []);
  });

  const [addresses, setAddresses] = useState(() => readJson(STORAGE_KEYS.addresses, []));
  const [orders, setOrders] = useState(() => readJson(STORAGE_KEYS.orders, []));
  const [latestOrder, setLatestOrder] = useState(() => readJson(STORAGE_KEYS.latestOrder, null));

  const syncLocalOrders = (nextOrders) => {
    setOrders(nextOrders);
    writeJson(STORAGE_KEYS.orders, nextOrders);
  };

  const syncLocalAddresses = (nextAddresses) => {
    setAddresses(nextAddresses);
    writeJson(STORAGE_KEYS.addresses, nextAddresses);
  };

  const syncLocalCoupons = (nextCoupons) => {
    setCoupons(nextCoupons);
    writeJson(STORAGE_KEYS.coupons, nextCoupons);
  };
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

  // Sync with Firestore if active
  useEffect(() => {
    if (!isFirebaseActive) return;

    // A. Orders
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const docs = [];
      snap.forEach(d => docs.push(d.data()));
      docs.sort((a, b) => b.id.localeCompare(a.id));
      setOrders(docs);
    }, (error) => {
      console.warn('Orders sync unavailable; using local fallback.', error?.message || error);
      setOrders(readJson(STORAGE_KEYS.orders, []));
    });

    // B. Addresses
    const unsubAddresses = onSnapshot(collection(db, 'addresses'), (snap) => {
      const docs = [];
      snap.forEach(d => docs.push(d.data()));
      setAddresses(docs);
    }, (error) => {
      console.warn('Addresses sync unavailable; using local fallback.', error?.message || error);
      setAddresses(readJson(STORAGE_KEYS.addresses, []));
    });

    // C. Coupons
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

    // D. Pricing Settings
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
      unsubOrders();
      unsubAddresses();
      unsubCoupons();
      unsubPricing();
    };
  }, []);

  useEffect(() => {
    writeJson(STORAGE_KEYS.cart, cart);
  }, [cart]);

  useEffect(() => {
    writeJson(STORAGE_KEYS.wishlist, wishlist);
  }, [wishlist]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.addresses, addresses);
    }
  }, [addresses]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.orders, orders);
    }
  }, [orders]);

  useEffect(() => {
    if (latestOrder) {
      writeJson(STORAGE_KEYS.latestOrder, latestOrder);
    } else {
      localStorage.removeItem(STORAGE_KEYS.latestOrder);
    }
  }, [latestOrder]);

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
    setCartToast({
      id: product.id,
      name: product.name,
      quantity,
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => 
      prev.map(item => 
        item.id === productId 
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const addAddress = (address) => {
    const id = address.id || `addr-${Date.now()}`;
    const nextAddress = {
      id,
      isDefault: addresses.length === 0 || address.isDefault,
      ...address,
    };

    if (isFirebaseActive) {
      const nextAddresses = [
        nextAddress,
        ...addresses.map(item => ({ ...item, isDefault: nextAddress.isDefault ? false : item.isDefault })),
      ];

      setDoc(doc(db, 'addresses', id), nextAddress)
        .catch(() => {
          syncLocalAddresses(nextAddresses);
        });

      if (nextAddress.isDefault) {
        addresses.forEach(a => {
          if (a.id !== id && a.isDefault) {
            setDoc(doc(db, 'addresses', a.id), { ...a, isDefault: false }).catch(() => undefined);
          }
        });
      }
    } else {
      setAddresses(prev => {
        const next = [
          nextAddress,
          ...prev.map(item => ({ ...item, isDefault: nextAddress.isDefault ? false : item.isDefault })),
        ];
        return next;
      });
    }
  };

  const updateAddress = (addressId, updates) => {
    if (isFirebaseActive) {
      const existing = addresses.find(a => a.id === addressId);
      if (existing) {
        setDoc(doc(db, 'addresses', addressId), { ...existing, ...updates }).catch(() => {
          const nextAddresses = addresses.map(address => (
            address.id === addressId
              ? { ...address, ...updates }
              : updates.isDefault
                ? { ...address, isDefault: false }
                : address
          ));
          syncLocalAddresses(nextAddresses);
        });
      }
    } else {
      setAddresses(prev => prev.map(address => (
        address.id === addressId
          ? { ...address, ...updates }
          : updates.isDefault
            ? { ...address, isDefault: false }
            : address
      )));
    }
  };

  const removeAddress = (addressId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'addresses', addressId)).catch(() => {
        syncLocalAddresses(addresses.filter(address => address.id !== addressId));
      });
    } else {
      setAddresses(prev => prev.filter(address => address.id !== addressId));
    }
  };

  const setDefaultAddress = (addressId) => {
    if (isFirebaseActive) {
      addresses.forEach(address => {
        setDoc(doc(db, 'addresses', address.id), {
          ...address,
          isDefault: address.id === addressId,
        }).catch(() => undefined);
      });
    } else {
      setAddresses(prev => prev.map(address => ({
        ...address,
        isDefault: address.id === addressId,
      })));
    }
  };

  const triggerOrderNotification = (order, status) => {
    sendOrderStatusNotification(order, status).catch(err => console.error('OneSignal Notification error:', err));
  };

  const addOrder = (order) => {
    const nextOrder = {
      ...order,
      userEmail: order.userEmail || order.shippingAddress?.email || order.billingAddress?.email || '',
      shippingAddress: {
        ...order.shippingAddress,
        email: order.shippingAddress?.email || order.userEmail || order.billingAddress?.email || '',
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
    };

    if (isFirebaseActive) {
      setDoc(doc(db, 'orders', order.id), nextOrder).catch(() => {
        const nextOrders = [nextOrder, ...orders.filter(item => item.id !== nextOrder.id)];
        syncLocalOrders(nextOrders);
      });
    } else {
      setOrders(prev => [nextOrder, ...prev]);
    }

    triggerOrderNotification(nextOrder, 'Confirmed');
    sendOrderStatusEmail(nextOrder, 'Confirmed').catch(err => console.error('Email send error:', err));
  };

  const updateOrder = (orderId, updates) => {
    const existing = orders.find(order => order.id === orderId);
    if (!existing) return;

    const newTimeline = [...(existing.orderTimeline || [])];
    let newStatus = existing.status;
    let newTrackingStage = existing.trackingStage;

    if (updates.status && updates.status !== existing.status) {
      newStatus = updates.status;
      newTimeline.push({
        status: updates.status,
        timestamp: new Date().toLocaleString(),
        note: updates.timelineNote || `Status updated to ${updates.status}`,
      });
    }

    if (updates.trackingStage) {
      newTrackingStage = updates.trackingStage;
    }

    const { timelineNote, ...restUpdates } = updates;
    const nextOrder = {
      ...existing,
      ...restUpdates,
      userEmail: updates.userEmail || existing.userEmail || existing.shippingAddress?.email || existing.billingAddress?.email || '',
      shippingAddress: {
        ...existing.shippingAddress,
        ...updates.shippingAddress,
        email:
          updates.shippingAddress?.email ||
          existing.shippingAddress?.email ||
          updates.userEmail ||
          existing.userEmail ||
          '',
      },
      billingAddress: {
        ...existing.billingAddress,
        ...updates.billingAddress,
        email:
          updates.billingAddress?.email ||
          existing.billingAddress?.email ||
          updates.shippingAddress?.email ||
          existing.shippingAddress?.email ||
          updates.userEmail ||
          existing.userEmail ||
          '',
      },
      status: newStatus,
      trackingStage: newTrackingStage,
      orderTimeline: newTimeline,
    };

    if (isFirebaseActive) {
      setDoc(doc(db, 'orders', orderId), nextOrder).catch(() => {
        const nextOrders = orders.map(order => order.id === orderId ? nextOrder : order);
        syncLocalOrders(nextOrders);
      });
    } else {
      setOrders(prev => prev.map(order => order.id === orderId ? nextOrder : order));
    }

    setLatestOrder(prev => (prev && prev.id === orderId ? nextOrder : prev));

    if (updates.status && updates.status !== existing.status) {
      triggerOrderNotification(nextOrder, updates.status);
      sendOrderStatusEmail(nextOrder, updates.status).catch(err => console.error('Email send error:', err));
    }
  };

  const cancelOrder = (orderId, cancelReason) => {
    const cancelledAt = new Date().toLocaleString();
    updateOrder(orderId, {
      status: 'Cancelled',
      cancelReason,
      cancelledAt,
    });
  };

  const updatePricingSettings = (updates) => {
    if (isFirebaseActive) {
      setDoc(doc(db, 'settings', 'pricing'), { ...pricingSettings, ...updates }).catch(() => {
        const nextPricing = { ...pricingSettings, ...updates };
        setPricingSettings(nextPricing);
        writeJson(STORAGE_KEYS.pricingSettings, nextPricing);
      });
    } else {
      setPricingSettings(prev => ({
        ...prev,
        ...updates,
      }));
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

  const setLatestOrderItem = (order) => {
    setLatestOrder(order);
  };

  const clearOrders = () => {
    if (isFirebaseActive) {
      orders.forEach(o => deleteDoc(doc(db, 'orders', o.id)));
    } else {
      setOrders([]);
    }
  };

  const addCoupon = (coupon) => {
    const id = coupon.id || `coupon-${Date.now()}`;
    const newCoupon = { ...coupon, id };
    if (isFirebaseActive) {
      setDoc(doc(db, 'coupons', id), newCoupon).catch(() => {
        const nextCoupons = [newCoupon, ...coupons.filter(item => item.id !== id)];
        syncLocalCoupons(nextCoupons);
      });
    } else {
      setCoupons(prev => [newCoupon, ...prev]);
    }
  };

  const updateCoupon = (couponId, updates) => {
    const existing = coupons.find(c => c.id === couponId);
    if (!existing) return;
    const newCoupon = { ...existing, ...updates };
    if (isFirebaseActive) {
      setDoc(doc(db, 'coupons', couponId), newCoupon).catch(() => {
        const nextCoupons = coupons.map(c => c.id === couponId ? newCoupon : c);
        syncLocalCoupons(nextCoupons);
      });
    } else {
      setCoupons(prev => prev.map(c => c.id === couponId ? newCoupon : c));
    }
  };

  const deleteCoupon = (couponId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'coupons', couponId)).catch(() => {
        syncLocalCoupons(coupons.filter(c => c.id !== couponId));
      });
    } else {
      setCoupons(prev => prev.filter(c => c.id !== couponId));
    }
  };

  const toggleCoupon = (couponId) => {
    const coupon = coupons.find(c => c.id === couponId);
    if (coupon) {
      updateCoupon(couponId, { active: !coupon.active });
    }
  };

  const updateCouponCode = (couponId, code) => {
    updateCoupon(couponId, { code });
  };

  const dismissCartToast = () => {
    setCartToast(null);
  };

  const getDefaultAddress = () => addresses.find(address => address.isDefault) || addresses[0] || null;

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.filter(item => item.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.id === productId);
  };

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
