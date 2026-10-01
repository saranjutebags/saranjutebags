import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import {
  fetchCachedDoc,
  fetchCachedCollection,
  invalidateCache,
  setCache,
} from '../utils/firestoreCache';
import { setDocSafe, hydrateDoc, deleteDocSafe } from '../utils/chunkedFirestore';

const AdminContext = createContext();

const STORAGE_KEYS = {
  companySettings: 'saran-jute-company-settings',
  homepage: 'saran-jute-homepage-settings',
  popups: 'saran-jute-popups',
  banners: 'saran-jute-banners',
  reviews: 'saran-jute-reviews',
  notifications: 'saran-jute-notifications',
  security: 'saran-jute-security-settings',
  roles: 'saran-jute-admin-roles',
  scrollingTexts: 'saran-jute-scrolling-texts',
  testProductSettings: 'saran-jute-test-product-settings',
};

const defaultTestProductSettings = {
  enabled: false,
  id: 'test-demo-product',
  name: 'Demo Test Product (Razorpay Testing)',
  price: 1.00,
  gstAmount: 0.18,
  deliveryFee: 0.00,
  category: 'Jute Bags',
  image: '/Jute-Bags-1.webp',
  images: ['/Jute-Bags-1.webp'],
  description: 'Test demo product for testing Razorpay payments. Manual pricing assigned by Admin.',
  sku: 'DEMO-TEST',
  isTestProduct: true,
  stock: 999,
  visible: true,
  archived: false,
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

const defaultCompanySettings = {
  companyName: 'Saran Jute Bags',
  logo: '/logo.webp',
  primaryColor: '#1B4D3E',
  secondaryColor: '#3E7A63',
  surfaceColor: '#EEF4F1',
  addressLine1: '12-2-421/4 Alapathi Nagar Guddimalkapur',
  cityStatePin: 'Hyderabad, Telangana 500028',
  gstin: '',
  pan: '',
  phone: '',
  email: 'sales@saranjutebags.co.in',
  invoicePrefix: 'INV',
  website: 'https://saranjutebags.in',
  facebook: '',
  instagram: '',
  taxLabel: 'GST',
};

const defaultHomepage = {
  heroTitle: 'Premium Jute Bags for Modern Brands',
  heroSubtitle: 'Eco-friendly bags, custom branding, fast support, and polished presentation.',
  ctaText: 'Shop Now',
  ctaLink: '/products',
  aboutText: 'Saran Jute Bags builds durable, sustainable carry solutions for retail, corporate gifting, and everyday use.',
  footerText: 'Saran Jute Bags. Sustainable packaging that feels premium.',
};

const defaultPopups = [];

const defaultBanners = [];

const defaultReviews = [
  { id: 'rev-1', customer: 'Asha', rating: 5, text: 'Great quality and quick support.', status: 'Approved', featured: true, reply: 'Thank you!' },
  { id: 'rev-2', customer: 'Rahul', rating: 4, text: 'Very good customization.', status: 'Pending', featured: false, reply: '' },
];

const defaultNotifications = [
  { id: 'note-1', title: 'Welcome Offer', type: 'Offer', message: 'Use WELCOME10 for 10% off.', active: false },
];

const defaultScrollingTexts = [];

const defaultSecurity = {
  twoFactor: false,
  activityLogs: true,
  loginHistory: true,
  deviceHistory: true,
  sessionTimeoutMinutes: 30,
};

const defaultRoles = [
  { id: 'role-1', name: 'Super Admin', permissions: ['View', 'Create', 'Edit', 'Delete', 'Export'] },
  { id: 'role-2', name: 'Admin', permissions: ['View', 'Create', 'Edit', 'Delete'] },
  { id: 'role-3', name: 'Manager', permissions: ['View', 'Create', 'Edit'] },
  { id: 'role-4', name: 'Inventory Manager', permissions: ['View', 'Edit'] },
  { id: 'role-5', name: 'Order Manager', permissions: ['View', 'Edit'] },
  { id: 'role-6', name: 'Customer Support', permissions: ['View', 'Edit'] },
];

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// The previous default brand green (#059669) is migrated automatically to the
// current deep evergreen so every existing visitor and stored settings doc
// picks up the new brand color without any manual step.
const LEGACY_PRIMARY = '#059669';
const BRAND_PRIMARY = '#1B4D3E';
const BRAND_SECONDARY = '#3E7A63';
const BRAND_SURFACE = '#EEF4F1';

const normalizeCompanyColors = (data) => {
  if (!data || data.primaryColor !== LEGACY_PRIMARY) return data;
  return { ...data, primaryColor: BRAND_PRIMARY, secondaryColor: BRAND_SECONDARY, surfaceColor: BRAND_SURFACE };
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [companySettings, setCompanySettings] = useState(() => normalizeCompanyColors(readJson(STORAGE_KEYS.companySettings, defaultCompanySettings)));
  const [homepage, setHomepage] = useState(() => readJson(STORAGE_KEYS.homepage, defaultHomepage));
  const [popups, setPopups] = useState(() => readJson(STORAGE_KEYS.popups, defaultPopups));
  const [banners, setBanners] = useState(() => readJson(STORAGE_KEYS.banners, defaultBanners));
  const [reviews, setReviews] = useState(() => readJson(STORAGE_KEYS.reviews, defaultReviews));
  const [notifications, setNotifications] = useState(() => readJson(STORAGE_KEYS.notifications, defaultNotifications));
  const [security, setSecurity] = useState(() => readJson(STORAGE_KEYS.security, defaultSecurity));
  const [roles, setRoles] = useState(() => readJson(STORAGE_KEYS.roles, defaultRoles));
  const [scrollingTexts, setScrollingTexts] = useState(() => readJson(STORAGE_KEYS.scrollingTexts, defaultScrollingTexts));
  const [testProductSettings, setTestProductSettings] = useState(() => readJson(STORAGE_KEYS.testProductSettings, defaultTestProductSettings));
  const [activityLogs, setActivityLogs] = useState(() => readJson('saran-jute-activity-logs', [
    { id: 'log-1', timestamp: new Date(Date.now() - 3600000).toLocaleString(), action: 'Admin panel initialized', user: 'system' },
    { id: 'log-2', timestamp: new Date().toLocaleString(), action: 'Security settings updated', user: 'saranjutebags@gmail.com' }
  ]));
  const [loginHistory, setLoginHistory] = useState(() => readJson('saran-jute-login-history', [
    { id: 'lh-1', timestamp: new Date(Date.now() - 7200000).toLocaleString(), email: 'saranjutebags@gmail.com', status: 'Success', device: 'Chrome on Windows' },
    { id: 'lh-2', timestamp: new Date().toLocaleString(), email: 'saranjutebags@gmail.com', status: 'Success', device: 'Chrome on Windows' }
  ]));
  const [deviceHistory, setDeviceHistory] = useState(() => readJson('saran-jute-device-history', [
    { id: 'dev-1', lastLogin: new Date().toLocaleString(), device: 'Chrome on Windows', ip: '127.0.0.1', active: true }
  ]));

  // ─── Chunked-doc hydration ──────────────────────────────────────────────────
  // setDocSafe stores oversized fields (uploaded images) in a `chunks`
  // subcollection and leaves '' placeholders in the main doc. These helpers
  // rebuild the full values so admin data renders normally.
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

  const hydrateSingleDoc = async (collectionPath, docId, data) => {
    if (!data || !data.__chunked) return data;
    const hydrated = await hydrateDoc(doc(db, collectionPath, docId), data);
    return hydrated || data;
  };

  // ─── Load settings via cached one-time reads (no persistent listeners) ──────
  // This replaces 10 realtime listeners with a single parallel fetch.
  // Data is cached in memory + localStorage so repeated mounts are free.
  useEffect(() => {
    if (!isFirebaseActive) return;

    let cancelled = false;

    const loadSettings = async () => {
      const [
        company,
        homepageData,
        securityData,
        popupsData,
        bannersData,
        reviewsData,
        notificationsData,
        scrollingTextsData,
        testProductData,
      ] = await Promise.all([
        fetchCachedDoc(db, 'settings', 'company',   { fallback: defaultCompanySettings }),
        fetchCachedDoc(db, 'settings', 'homepage',  { fallback: defaultHomepage }),
        fetchCachedDoc(db, 'settings', 'security',  { fallback: defaultSecurity }),
        fetchCachedCollection(db, 'popups',          { fallback: defaultPopups }),
        fetchCachedCollection(db, 'banners',         { fallback: defaultBanners }),
        fetchCachedCollection(db, 'reviews',         { fallback: defaultReviews }),
        fetchCachedCollection(db, 'notifications',   { fallback: defaultNotifications }),
        fetchCachedCollection(db, 'scrollingTexts',  { fallback: defaultScrollingTexts }),
        fetchCachedDoc(db, 'settings', 'testProduct', { fallback: defaultTestProductSettings }),
      ]);

      if (cancelled) return;

      if (company) {
        const hydrated = await hydrateSingleDoc('settings', 'company', company);
        const normalized = normalizeCompanyColors(hydrated);
        setCompanySettings(normalized);
        // Persist the color migration back to Firestore when permitted.
        if (normalized !== hydrated) {
          setDocSafe(doc(db, 'settings', 'company'), normalized, { keepDataUrls: true }).catch(() => undefined);
        }
      }
      if (homepageData)     setHomepage(await hydrateSingleDoc('settings', 'homepage', homepageData));
      if (securityData)     setSecurity(await hydrateSingleDoc('settings', 'security', securityData));
      if (popupsData)       setPopups(await hydrateDocList('popups', popupsData));
      if (bannersData)      setBanners(await hydrateDocList('banners', bannersData));
      if (reviewsData)      setReviews(await hydrateDocList('reviews', reviewsData));
      if (notificationsData) setNotifications(await hydrateDocList('notifications', notificationsData));
      if (scrollingTextsData) setScrollingTexts(await hydrateDocList('scrollingTexts', scrollingTextsData));
      if (testProductData)  setTestProductSettings(await hydrateSingleDoc('settings', 'testProduct', testProductData));
    };

    loadSettings();
    return () => { cancelled = true; };
  }, []);

  // ─── Admin-only: expose a function to attach realtime listeners ──────────────
  // Only called from the admin dashboard (ProtectedAdminRoute), not globally.
  const subscribeAdminRealtime = useCallback((onUpdate) => {
    if (!isFirebaseActive) return () => {};

    const unsubs = [
      onSnapshot(doc(db, 'settings', 'company'), (snap) => {
        if (!snap.exists()) return;
        hydrateSingleDoc('settings', 'company', snap.data()).then((data) => {
          const normalized = normalizeCompanyColors(data);
          setCompanySettings(normalized);
          setCache('settings/company', normalized);
          if (normalized !== data) {
            setDocSafe(doc(db, 'settings', 'company'), normalized, { keepDataUrls: true }).catch(() => undefined);
          }
          onUpdate?.('company', normalized);
        });
      }),
      onSnapshot(doc(db, 'settings', 'homepage'), (snap) => {
        if (!snap.exists()) return;
        hydrateSingleDoc('settings', 'homepage', snap.data()).then((data) => {
          setHomepage(data);
          setCache('settings/homepage', data);
        });
      }),
      onSnapshot(doc(db, 'settings', 'security'), (snap) => {
        if (!snap.exists()) return;
        hydrateSingleDoc('settings', 'security', snap.data()).then((data) => {
          setSecurity(data);
          setCache('settings/security', data);
        });
      }),
      onSnapshot(collection(db, 'popups'), (snap) => {
        const docs = [];
        snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
        hydrateDocList('popups', docs).then((hydrated) => {
          setPopups(hydrated);
          setCache('popups', hydrated);
        });
      }),
      onSnapshot(collection(db, 'banners'), (snap) => {
        const docs = [];
        snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
        hydrateDocList('banners', docs).then((hydrated) => {
          setBanners(hydrated);
          setCache('banners', hydrated);
        });
      }),
      onSnapshot(collection(db, 'reviews'), (snap) => {
        const docs = [];
        snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
        hydrateDocList('reviews', docs).then((hydrated) => {
          setReviews(hydrated);
          setCache('reviews', hydrated);
        });
      }),
      onSnapshot(collection(db, 'notifications'), (snap) => {
        const docs = [];
        snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
        hydrateDocList('notifications', docs).then((hydrated) => {
          setNotifications(hydrated);
          setCache('notifications', hydrated);
        });
      }),
      onSnapshot(collection(db, 'activityLogs'), (snap) => {
        if (!snap.empty) {
          const docs = [];
          snap.forEach(d => docs.push(d.data()));
          docs.sort((a, b) => b.id.localeCompare(a.id));
          setActivityLogs(docs.slice(0, 100));
        }
      }),
      onSnapshot(collection(db, 'scrollingTexts'), (snap) => {
        const docs = [];
        snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
        hydrateDocList('scrollingTexts', docs).then((hydrated) => {
          setScrollingTexts(hydrated);
          setCache('scrollingTexts', hydrated);
        });
      }),
      onSnapshot(doc(db, 'settings', 'testProduct'), (snap) => {
        if (!snap.exists()) return;
        hydrateSingleDoc('settings', 'testProduct', snap.data()).then((data) => {
          setTestProductSettings(data);
          setCache('settings/testProduct', data);
        });
      }),
    ];

    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.companySettings, companySettings);
    }
  }, [companySettings]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.homepage, homepage);
    }
  }, [homepage]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.popups, popups);
    }
  }, [popups]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.banners, banners);
    }
  }, [banners]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.reviews, reviews);
    }
  }, [reviews]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.notifications, notifications);
    }
  }, [notifications]);

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.security, security);
    }
  }, [security]);

  useEffect(() => writeJson(STORAGE_KEYS.roles, roles), [roles]);
  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.scrollingTexts, scrollingTexts);
    }
  }, [scrollingTexts]);
  useEffect(() => writeJson('saran-jute-activity-logs', activityLogs), [activityLogs]);
  useEffect(() => writeJson('saran-jute-login-history', loginHistory), [loginHistory]);
  useEffect(() => writeJson('saran-jute-device-history', deviceHistory), [deviceHistory]);

  const addActivityLog = (action, userEmail = 'saranjutebags@gmail.com') => {
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      action,
      user: userEmail,
    };
    setActivityLogs((prev) => [newLog, ...prev]);
    if (isFirebaseActive) {
      setDoc(doc(db, 'activityLogs', newLog.id), newLog).catch(err => console.error('Failed to save activity log:', err));
    }
  };

  const addLoginHistory = (email, status, device = 'Chrome on Windows') => {
    const newHistory = {
      id: `lh-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      email,
      status,
      device,
    };
    setLoginHistory((prev) => [newHistory, ...prev]);

    setDeviceHistory((prev) => {
      const exists = prev.find(d => d.device === device);
      if (exists) {
        return prev.map(d => d.device === device ? { ...d, lastLogin: new Date().toLocaleString(), active: true } : d);
      }
      return [{ id: `dev-${Date.now()}`, lastLogin: new Date().toLocaleString(), device, ip: '127.0.0.1', active: true }, ...prev];
    });
  };

  const updateCompanySettings = (updates) => {
    const next = { ...companySettings, ...updates };
    if (isFirebaseActive) {
      invalidateCache('settings/company');
      setDocSafe(doc(db, 'settings', 'company'), next, { keepDataUrls: true }).catch(() => undefined);
    }
    setCompanySettings(next);
    addActivityLog('Updated company settings');
  };
  
  const updateHomepage = (updates) => {
    const next = { ...homepage, ...updates };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'settings', 'homepage'), next, { keepDataUrls: true }).catch(() => undefined);
    }
    setHomepage(next);
    addActivityLog('Updated homepage configuration');
  };

  const addPopup = (popup) => {
    const id = createId('popup');
    const newPopup = { ...popup, id };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'popups', id), newPopup, { keepDataUrls: true }).catch(() => undefined);
    }
    setPopups((prev) => [newPopup, ...prev]);
    addActivityLog(`Created popup: ${popup.title}`);
  };
  
  const updatePopup = (popupId, updates) => {
    const existing = popups.find(p => p.id === popupId);
    if (!existing) return;
    const next = { ...existing, ...updates };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'popups', popupId), next, { keepDataUrls: true }).catch(() => undefined);
    }
    setPopups((prev) => prev.map((popup) => (popup.id === popupId ? next : popup)));
    addActivityLog('Updated popup settings');
  };
  
  const deletePopup = (popupId) => {
    if (isFirebaseActive) {
      deleteDocSafe(doc(db, 'popups', popupId)).catch(() => undefined);
    }
    setPopups((prev) => prev.filter((popup) => popup.id !== popupId));
    addActivityLog('Deleted popup');
  };

  const addBanner = (banner) => {
    const id = createId('banner');
    const newBanner = { ...banner, id };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'banners', id), newBanner, { keepDataUrls: true }).catch(() => undefined);
    }
    setBanners((prev) => [newBanner, ...prev]);
    addActivityLog(`Added banner: ${banner.title}`);
  };
  
  const updateBanner = (bannerId, updates) => {
    const existing = banners.find(b => b.id === bannerId);
    if (!existing) return;
    const next = { ...existing, ...updates };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'banners', bannerId), next, { keepDataUrls: true }).catch(() => undefined);
    }
    setBanners((prev) => prev.map((banner) => (banner.id === bannerId ? next : banner)));
    addActivityLog('Updated banner settings');
  };
  
  const deleteBanner = (bannerId) => {
    if (isFirebaseActive) {
      deleteDocSafe(doc(db, 'banners', bannerId)).catch(() => undefined);
    }
    setBanners((prev) => prev.filter((banner) => banner.id !== bannerId));
    addActivityLog('Deleted banner');
  };

  const addReview = (review) => {
    const id = createId('rev');
    const newReview = { ...review, id };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'reviews', id), newReview, { keepDataUrls: true }).catch(() => undefined);
    }
    setReviews((prev) => [newReview, ...prev]);
    addActivityLog(`Added customer review for approval`);
  };
  
  const updateReview = (reviewId, updates) => {
    const existing = reviews.find(r => r.id === reviewId);
    if (!existing) return;
    const next = { ...existing, ...updates };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'reviews', reviewId), next, { keepDataUrls: true }).catch(() => undefined);
    }
    setReviews((prev) => prev.map((review) => (review.id === reviewId ? next : review)));
    addActivityLog('Moderated customer review');
  };
  
  const deleteReview = (reviewId) => {
    if (isFirebaseActive) {
      deleteDocSafe(doc(db, 'reviews', reviewId)).catch(() => undefined);
    }
    setReviews((prev) => prev.filter((review) => review.id !== reviewId));
    addActivityLog('Deleted customer review');
  };

  const addNotification = (notification) => {
    const id = createId('note');
    const newNotification = { ...notification, id };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'notifications', id), newNotification).catch(() => undefined);
    }
    setNotifications((prev) => [newNotification, ...prev]);
    addActivityLog(`Sent push notification: ${notification.title}`);
  };
  
  const updateNotification = (noteId, updates) => {
    const existing = notifications.find(n => n.id === noteId);
    if (!existing) return;
    const next = { ...existing, ...updates };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'notifications', noteId), next).catch(() => undefined);
    }
    setNotifications((prev) => prev.map((note) => (note.id === noteId ? next : note)));
    addActivityLog('Updated notification settings');
  };
  
  const deleteNotification = (noteId) => {
    if (isFirebaseActive) {
      deleteDocSafe(doc(db, 'notifications', noteId)).catch(() => undefined);
    }
    setNotifications((prev) => prev.filter((note) => note.id !== noteId));
    addActivityLog('Deleted notification history');
  };

  const updateSecurity = (updates) => {
    const next = { ...security, ...updates };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'settings', 'security'), next).catch(() => undefined);
    }
    setSecurity(next);
    addActivityLog('Updated security preferences');
  };
  
  const updateRole = (roleId, updates) => {
    setRoles((prev) => prev.map((role) => (role.id === roleId ? { ...role, ...updates } : role)));
    addActivityLog('Updated role permissions');
  };

  const addScrollingText = (text) => {
    const id = `scroll-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const newItem = { id, text, active: true };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'scrollingTexts', id), newItem).catch(() => undefined);
    }
    setScrollingTexts((prev) => [...prev, newItem]);
    addActivityLog('Added scrolling text');
  };

  const updateScrollingText = (textId, updates) => {
    const existing = scrollingTexts.find(t => t.id === textId);
    if (!existing) return;
    const next = { ...existing, ...updates };
    if (isFirebaseActive) {
      setDocSafe(doc(db, 'scrollingTexts', textId), next).catch(() => undefined);
    }
    setScrollingTexts((prev) => prev.map((t) => (t.id === textId ? next : t)));
    addActivityLog('Updated scrolling text');
  };

  const deleteScrollingText = (textId) => {
    if (isFirebaseActive) {
      deleteDocSafe(doc(db, 'scrollingTexts', textId)).catch(() => undefined);
    }
    setScrollingTexts((prev) => prev.filter((t) => t.id !== textId));
    addActivityLog('Deleted scrolling text');
  };

  const updateTestProductSettings = (updates) => {
    setTestProductSettings((prev) => {
      const next = { ...prev, ...updates };
      if (isFirebaseActive) {
        setDocSafe(doc(db, 'settings', 'testProduct'), next).catch(() => undefined);
      } else {
        writeJson(STORAGE_KEYS.testProductSettings, next);
      }
      return next;
    });
    addActivityLog('Updated Test Demo Product settings');
  };

  useEffect(() => {
    if (!isFirebaseActive) {
      writeJson(STORAGE_KEYS.testProductSettings, testProductSettings);
    }
  }, [testProductSettings]);

  const value = useMemo(() => ({
    companySettings,
    homepage,
    popups,
    banners,
    reviews,
    notifications,
    security,
    roles,
    activityLogs,
    loginHistory,
    deviceHistory,
    testProductSettings,
    updateTestProductSettings,
    addActivityLog,
    addLoginHistory,
    updateCompanySettings,
    updateHomepage,
    subscribeAdminRealtime,
    addPopup,
    updatePopup,
    deletePopup,
    addBanner,
    updateBanner,
    deleteBanner,
    addReview,
    updateReview,
    deleteReview,
    addNotification,
    updateNotification,
    deleteNotification,
    updateSecurity,
    updateRole,
    scrollingTexts,
    addScrollingText,
    updateScrollingText,
    deleteScrollingText,
  }), [banners, companySettings, homepage, notifications, popups, reviews, roles, security, activityLogs, loginHistory, deviceHistory, scrollingTexts, testProductSettings, subscribeAdminRealtime]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};