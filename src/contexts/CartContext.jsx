import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { sendOrderStatusNotification } from '../services/notificationService';
import { sendOrderStatusEmail } from '../services/emailService';
import { useAuth } from './AuthContext';
import {
  fetchCachedDoc,
  fetchCachedCollection,
  invalidateCache,
} from '../utils/firestoreCache';
import {
  setDocSafe,
  hydrateDoc,
  hydrateOrder,
  deleteDocSafe,
  friendlyFirestoreError,
} from '../utils/chunkedFirestore';

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

// localStorage has a hard quota, and a cart line can carry a base64 logo.
// A failed write must never throw out of an effect and take the app down.
const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — the Firestore copy is the durable one */
  }
};

const lineKey = (line) => `${line?.id}::${line?.stylesKey || ''}`;

const lineTotal = (line) => Number(line?.totalStyleQuantity || line?.quantity || 0);

// Set a cart line to an exact unit total. Styled lines store their quantity
// per style, so the difference is absorbed by the last styles while every
// style keeps at least one unit — that keeps the money breakdown honest.
const applyLineQuantity = (line, nextTotal) => {
  const target = Math.max(1, Math.floor(Number(nextTotal) || 1));
  const styles = Array.isArray(line.selectedStyles) ? line.selectedStyles : [];
  if (styles.length === 0) {
    return { ...line, quantity: target, totalStyleQuantity: target };
  }
  const nextStyles = styles.map(s => ({ ...s, quantity: Math.max(1, Math.floor(Number(s.quantity) || 1)) }));
  let delta = target - nextStyles.reduce((sum, s) => sum + s.quantity, 0);
  if (delta > 0) {
    nextStyles[nextStyles.length - 1].quantity += delta;
  } else {
    for (let i = nextStyles.length - 1; i >= 0 && delta < 0; i--) {
      const reducible = nextStyles[i].quantity - 1;
      const take = Math.min(reducible, -delta);
      nextStyles[i].quantity -= take;
      delta += take;
    }
  }
  const total = nextStyles.reduce((sum, s) => sum + s.quantity, 0);
  return {
    ...line,
    selectedStyles: nextStyles.map(s => ({ ...s, total: (Number(s.price) || 0) * s.quantity })),
    quantity: total,
    totalStyleQuantity: total,
  };
};

// Union of two carts by line, keeping the larger quantity per line, so a
// device that still holds a local cart never loses it to the server copy.
const mergeCartLines = (a = [], b = []) => {
  const merged = new Map();
  [...a, ...b].forEach(line => {
    if (!line || line.id === undefined || line.id === null) return;
    const key = lineKey(line);
    const seen = merged.get(key);
    if (!seen || lineTotal(line) > lineTotal(seen)) merged.set(key, line);
  });
  return [...merged.values()];
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
    { id: 'welcome10', code: 'WELCOME10', label: 'Welcome Offer (First Order Only)', discount: '10% OFF', active: true, shouldPopup: true, newUsersOnly: true },
    { id: 'jute15', code: 'JUTE15', label: 'Bulk Bag Deal', discount: '15% OFF', active: false, shouldPopup: false, newUsersOnly: false },
    { id: 'save50', code: 'SAVE50', label: 'Festival Savings', discount: 'Flat ₹50 OFF', active: true, shouldPopup: false, newUsersOnly: false },
  ]));

  // Track active Firestore unsubscribers so we can tear down when user changes
  const unsubOrdersRef = useRef(null);
  const unsubAddressesRef = useRef(null);

  // Rebuild chunked docs (e.g. coupons) so they display normally — the
  // generic chunked-write layer stores oversized fields in subcollection
  // docs and leaves '' placeholders in the main document.
  const hydrateDocList = async (collectionName, docs) => {
    if (!Array.isArray(docs)) return docs;
    const chunked = docs.filter(d => d && d.__chunked);
    if (chunked.length === 0) return docs;
    const results = await Promise.all(
      chunked.map(d => hydrateDoc(doc(db, collectionName, String(d.id)), d).catch(() => null))
    );
    const map = {};
    chunked.forEach((d, i) => { if (results[i]) map[String(d.id)] = results[i]; });
    return docs.map(d => map[String(d.id)] || d);
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
        snap.forEach(d => docs.push({ ref: d.ref, data: d.data() }));
        docs.sort((a, b) => {
          const ta = new Date(a.data.createdAt || a.data.date).getTime() || 0;
          const tb = new Date(b.data.createdAt || b.data.date).getTime() || 0;
          return tb - ta;
        });
        const applyOrders = (hydratedMap) => {
          setOrders(docs.map(x => hydratedMap[String(x.data.id || x.ref.id)] || x.data));
        };
        // Show the raw docs instantly; chunked fields rebuild a moment later.
        applyOrders({});
        const chunked = docs.filter(x => x.data.__chunked);
        if (chunked.length === 0) {
          return;
        }
        // Rebuild chunked orders so uploaded images/logos display normally.
        Promise.all(chunked.map(x => hydrateDoc(x.ref, x.data).catch(() => null)))
          .then(hydrated => {
            const map = {};
            chunked.forEach((x, i) => {
              if (hydrated[i]) map[String(x.data.id || x.ref.id)] = hydrated[i];
            });
            applyOrders(map);
          });
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

  // ─── Global settings: cached one-time reads (no persistent listeners) ───────
  // Coupons, pricing, and shipping settings rarely change — no realtime needed.
  useEffect(() => {
    if (!isFirebaseActive) return;

    let cancelled = false;
    const defaultPricing = { gstRate: 18, shippingCharge: 40, freeShippingThreshold: 999 };
    const defaultWarehouse = {
      lat: 17.433333, lng: 78.383333, placeId: '', name: 'Main Warehouse',
      phone: '+91 9876543210', address: 'Mehdipatnam, Hyderabad, Telangana 500028',
      pincode: '500028', active: true,
    };
    const defaultDomesticShipping = { baseCharge: 40, perKm: 8, freeDeliveryAbove: 5000 };
    const defaultInternationalRates = [
      { country: 'USA', code: 'US', ratePerKg: 420, currency: 'USD', minCharge: 1000, estimatedDays: '7-10' },
      { country: 'UK', code: 'GB', ratePerKg: 390, currency: 'GBP', minCharge: 800, estimatedDays: '7-10' },
      { country: 'UAE', code: 'AE', ratePerKg: 220, currency: 'AED', minCharge: 500, estimatedDays: '5-7' },
      { country: 'Australia', code: 'AU', ratePerKg: 450, currency: 'AUD', minCharge: 1000, estimatedDays: '10-14' },
      { country: 'Germany', code: 'DE', ratePerKg: 400, currency: 'EUR', minCharge: 900, estimatedDays: '7-10' },
    ];
    const defaultCoupons = [
      { id: 'welcome10', code: 'WELCOME10', label: 'Welcome Offer', discount: '10% OFF', active: true, shouldPopup: true },
      { id: 'jute15', code: 'JUTE15', label: 'Bulk Bag Deal', discount: '15% OFF', active: false, shouldPopup: false },
      { id: 'save50', code: 'SAVE50', label: 'Festival Savings', discount: 'Flat ₹50 OFF', active: true, shouldPopup: false },
    ];

    const loadGlobalSettings = async () => {
      const [pricing, warehouse, domestic, international, couponDocs] = await Promise.all([
        fetchCachedDoc(db, 'settings', 'pricing',              { fallback: defaultPricing }),
        fetchCachedDoc(db, 'settings', 'warehouse',            { fallback: defaultWarehouse }),
        fetchCachedDoc(db, 'settings', 'domesticShipping',     { fallback: defaultDomesticShipping }),
        fetchCachedDoc(db, 'settings', 'internationalShipping', { fallback: { rates: defaultInternationalRates } }),
        fetchCachedCollection(db, 'coupons', { fallback: defaultCoupons }),
      ]);

      if (cancelled) return;

      if (pricing)     setPricingSettings(pricing);
      if (warehouse)   setWarehouse(warehouse);
      if (domestic)    setDomesticShipping(domestic);
      if (international) setInternationalRates(international.rates || defaultInternationalRates);
      if (couponDocs)  setCoupons(await hydrateDocList('coupons', couponDocs));
    };

    loadGlobalSettings();
    return () => { cancelled = true; };
  }, []);


  // ─── Cart persistence ──────────────────────────────────────────────────────
  // localStorage keeps the cart on this device (and across a sign-out), while
  // a signed-in customer also gets a Firestore copy at users/{uid}/cart so the
  // cart follows them to another phone or browser.
  const cartLoadedFor = useRef(null);

  useEffect(() => {
    writeJson(STORAGE_KEYS.cart, cart);
    if (uid) writeJson(userStorageKey(uid, 'cart'), cart);
  }, [cart, uid]);

  useEffect(() => {
    if (!uid) { cartLoadedFor.current = null; return; undefined; }
    let cancelled = false;
    // Nothing may be pushed to the server until this merge has finished,
    // otherwise an empty first render could wipe the saved cart.
    cartLoadedFor.current = null;

    const localForUser = readJson(userStorageKey(uid, 'cart'), []);
    const deviceCart = readJson(STORAGE_KEYS.cart, []);

    // Lines are unioned by product + style set, keeping the larger quantity,
    // so a cart held on this device is never lost to the stored copy.
    const mergeIn = (serverItems) => {
      if (cancelled) return;
      setCart(prev => mergeCartLines(mergeCartLines(deviceCart, localForUser), serverItems));
      cartLoadedFor.current = uid;
    };

    if (!isFirebaseActive) {
      mergeIn([]);
      return () => { cancelled = true; };
    }

    getDoc(doc(db, 'users', uid, 'cart', 'cart'))
      .then(snap => mergeIn(snap.exists() ? (snap.data()?.items || []) : []))
      .catch(() => mergeIn([]));

    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    if (!uid || !isFirebaseActive) return undefined;
    if (cartLoadedFor.current !== uid) return undefined;
    // Debounced: quantity taps should not write one document per click.
    const timer = setTimeout(() => {
      setDocSafe(doc(db, 'users', uid, 'cart', 'cart'), {
        id: 'cart',
        userId: uid,
        items: cart,
        updatedAt: Date.now(),
      }).catch(err => console.warn('Cart could not be saved:', err?.message || err));
    }, 700);
    return () => clearTimeout(timer);
  }, [cart, uid]);
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
  const addToCart = (product, quantity = 1, customText = '', customLogo = '', selectedStyles = null, customDescription = '') => {
    let blocked = false;
    let addedQuantity = quantity;
    setCart(prev => {
      const stock = product.stock === undefined || product.stock === null ? Infinity : Number(product.stock);
      if (stock <= 0) {
        blocked = true;
        setCartToast({ id: product.id, name: product.name, quantity: 0, error: 'Out of stock' });
        return prev;
      }
      // Create a unique key for the cart item including styles
      const stylesKey = selectedStyles ? JSON.stringify(selectedStyles.map(s => s.name).sort()) : '';
      const existingIndex = prev.findIndex(item => 
        item.id === product.id && 
        item.customText === customText && 
        item.customLogo === customLogo &&
        item.stylesKey === stylesKey
      );
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        // Never reject the whole add because the cart would exceed stock —
        // top the line up to the largest legal quantity instead.
        const nextTotal = Math.min(lineTotal(existing) + quantity, stock);
        if (nextTotal <= lineTotal(existing)) {
          blocked = true;
          setCartToast({ id: product.id, name: product.name, quantity: 0, error: `Only ${stock} available — already in your cart` });
          return prev;
        }
        addedQuantity = nextTotal - lineTotal(existing);
        const updated = [...prev];
        updated[existingIndex] = applyLineQuantity(existing, nextTotal);
        return updated;
      }
      addedQuantity = Math.min(quantity, stock);
      const newItem = { 
        ...product, 
        quantity, 
        customText, 
        customLogo,
        customDescription,
        selectedStyles: selectedStyles || [],
        stylesKey,
        // Calculate total price based on styles: base price * total quantity across all styles
        totalStyleQuantity: selectedStyles ? selectedStyles.reduce((sum, s) => sum + (s.quantity || 1), 0) : addedQuantity,
        effectivePrice: product.price // base price per unit
      };
      newItem.quantity = addedQuantity;
      // Cart items keep the light inline images only — full-resolution copies
      // would bloat localStorage and every order document.
      delete newItem.fullImages;
      return [...prev, newItem];
    });
    if (!blocked) {
      setCartToast({ id: product.id, name: product.name, quantity: addedQuantity });
    }
  };

  // stylesKey targets one specific cart line, so the same product ordered in
  // two style sets can be adjusted independently.
  const updateQuantity = (productId, quantity, stylesKey = null) => {
    if (quantity <= 0) { removeFromCart(productId, stylesKey); return; }
    setCart(prev => prev.map(item => {
      if (String(item.id) !== String(productId)) return item;
      if (stylesKey !== null && (item.stylesKey || '') !== stylesKey) return item;
      const stock = item.stock === undefined || item.stock === null ? Infinity : Number(item.stock);
      const max = Number.isFinite(stock) ? Math.max(1, stock) : Number.MAX_SAFE_INTEGER;
      const wanted = Math.max(1, Math.floor(Number(quantity) || 1));
      if (wanted > max) {
        setCartToast({ id: item.id, name: item.name, quantity: 0, error: `Only ${max} in stock` });
      }
      return applyLineQuantity(item, Math.min(wanted, max));
    }));
  };

  const removeFromCart = (productId, stylesKey = null) => {
    setCart(prev => prev.filter(item => {
      if (String(item.id) !== String(productId)) return true;
      // Without a line key the caller means "this product, every variant".
      if (stylesKey === null) return false;
      return (item.stylesKey || '') !== stylesKey;
    }));
  };

  const clearCart = () => {
    setCart([]);
    // An ordered cart must not linger in the customer's Firestore copy.
    if (uid && isFirebaseActive) {
      deleteDoc(doc(db, 'users', uid, 'cart', 'cart')).catch(() => undefined);
    }
  };

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
      // Orders keep item thumbnails only. Full-resolution copies are never
      // needed after checkout — dropping them here keeps the order document
      // small and the save instant (no multi-MB chunk writes).
      items: (order.items || []).map(item => {
        if (!item || typeof item !== 'object') return item;
        const light = { ...item };
        delete light.fullImages;
        return light;
      }),
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
      try {
        // setDocSafe splits oversized fields (uploaded logos, images) into
        // chunk subdocuments, so the 1MB document limit can never fail this
        // write AFTER payment has been taken.
        await setDocSafe(doc(db, 'users', uid, 'orders', order.id), nextOrder);
        await setDocSafe(doc(db, 'orders', order.id), nextOrder).catch(err =>
          console.error('Failed to mirror order to top-level collection:', err)
        );
      } catch (err) {
        console.error('Failed to save order:', err);
        throw new Error(friendlyFirestoreError(err, 'order'));
      }
    }

    // Show the order instantly while the realtime listener catches up
    syncLocalOrders([nextOrder, ...orders.filter(o => o.id !== nextOrder.id)]);
    setLatestOrder(nextOrder);

    triggerOrderNotification(nextOrder, nextOrder.status);
    sendOrderStatusEmail(nextOrder, nextOrder.status).catch(err => console.error('Email send error:', err));
  };

  const updateOrder = async (orderId, updates, existingOrder = null, options = {}) => {
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

    // A cancellation only ever needs the cancellation fields. Rewriting the
    // whole document would also re-normalise the addresses and re-chunk the
    // order images — work the security rules (rightly) refuse from a customer,
    // and which nobody wants on a cancel click. So this path patches fields.
    const cancelPatch = options.minimal ? {
      status: newStatus,
      orderTimeline: newTimeline,
      ...(updates.cancelReason !== undefined ? { cancelReason: updates.cancelReason } : {}),
      ...(updates.cancelledAt !== undefined ? { cancelledAt: updates.cancelledAt } : {}),
    } : null;

    if (isFirebaseActive) {
      try {
        if (cancelPatch) {
          try {
            await updateDoc(doc(db, 'orders', orderId), cancelPatch);
          } catch (mirrorErr) {
            // An order that never got its admin mirror must still be
            // cancellable, so only a missing document is tolerated here.
            // Permission problems are re-thrown, never hidden.
            if (!['not-found', 'failed-precondition'].includes(mirrorErr?.code)) throw mirrorErr;
            console.warn('No admin mirror to update for this order:', mirrorErr?.code);
          }
          if (orderUserId) {
            await updateDoc(doc(db, 'users', orderUserId, 'orders', orderId), cancelPatch).catch(err =>
              console.error('Failed to update user order copy:', err)
            );
          }
        } else {
          // If the order was stored chunked, re-attach its chunked data first
          // so the rewrite keeps the customer's uploaded images/logos intact.
          let source = nextOrder;
          if (existing.__chunked) {
            const hydrated = await hydrateOrder(existing, orderUserId);
            source = { ...hydrated, ...nextOrder };
          }
          await setDocSafe(doc(db, 'orders', orderId), source);
          if (orderUserId) {
            await setDocSafe(doc(db, 'users', orderUserId, 'orders', orderId), source).catch(err =>
              console.error('Failed to update user order copy:', err)
            );
          }
        }
      } catch (err) {
        console.error('Failed to update order:', err);
        throw new Error(friendlyFirestoreError(err, 'update'));
      }
    }

    // Reflect the change instantly — admin and customer see it immediately
    syncLocalOrders(orders.map(o => o.id === orderId ? nextOrder : o));

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
    }, null, { minimal: true });
  };

  const deleteOrders = async (orderIds) => {
    if (isFirebaseActive) {
      for (const orderId of orderIds) {
        const existing = orders.find(o => o.id === orderId);
        const orderUserId = existing?.userId || uid;
        if (orderUserId) {
          deleteDocSafe(doc(db, 'users', orderUserId, 'orders', orderId)).catch(() => undefined);
        }
        await deleteDocSafe(doc(db, 'orders', orderId));
      }
    }
    syncLocalOrders(orders.filter(o => !orderIds.includes(o.id)));
  };

  // ─── Pricing ─────────────────────────────────────────────────────────────────
  const updatePricingSettings = (updates) => {
    if (isFirebaseActive) {
      const next = { ...pricingSettings, ...updates };
      setPricingSettings(next);
      invalidateCache('settings/pricing');
      setDoc(doc(db, 'settings', 'pricing'), next).catch(() => {
        writeJson(STORAGE_KEYS.pricingSettings, next);
      });
    } else {
      setPricingSettings(prev => ({ ...prev, ...updates }));
    }
  };

  const updateWarehouse = (updates) => {
    if (isFirebaseActive) {
      const next = warehouse ? { ...warehouse, ...updates } : updates;
      setWarehouse(next);
      invalidateCache('settings/warehouse');
      setDoc(doc(db, 'settings', 'warehouse'), next).catch(() => undefined);
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
        deleteDocSafe(doc(db, 'users', uid, 'orders', o.id)).catch(() => undefined);
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
      invalidateCache('coupons');
      setDocSafe(doc(db, 'coupons', id), newCoupon).catch(() => syncLocalCoupons([newCoupon, ...coupons.filter(c => c.id !== id)]));
    }
    setCoupons(prev => [newCoupon, ...prev]);
  };

  const updateCoupon = (couponId, updates) => {
    const existing = coupons.find(c => c.id === couponId);
    if (!existing) return;
    const newCoupon = { ...existing, ...updates };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'coupons', couponId), newCoupon).catch(() => syncLocalCoupons(coupons.map(c => c.id === couponId ? newCoupon : c)));
    }
    setCoupons(prev => prev.map(c => c.id === couponId ? newCoupon : c));
  };

  const deleteCoupon = (couponId) => {
    if (isFirebaseActive) {
      deleteDocSafe(doc(db, 'coupons', couponId)).catch(() => syncLocalCoupons(coupons.filter(c => c.id !== couponId)));
    }
    setCoupons(prev => prev.filter(c => c.id !== couponId));
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
      if (existing) return prev.filter(item => item.id !== product.id);
      // Store the light copy (inline thumbnails) — not the full-resolution images.
      const light = { ...product };
      delete light.fullImages;
      return [...prev, light];
    });
  };

  const isInWishlist = (productId) => wishlist.some(item => item.id === productId);

  const cartTotal = cart.reduce((sum, item) => {
    // If item has selectedStyles, calculate total based on each style's price * quantity
    if (item.selectedStyles && item.selectedStyles.length > 0) {
      const stylesTotal = item.selectedStyles.reduce((styleSum, style) => {
        return styleSum + (style.price * (style.quantity || 1));
      }, 0);
      return sum + stylesTotal;
    }
    // Fallback for items without styles
    const qty = item.totalStyleQuantity || item.quantity;
    return sum + (item.price * qty);
  }, 0);
  const cartCount = cart.reduce((sum, item) => sum + (item.totalStyleQuantity || item.quantity), 0);

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
