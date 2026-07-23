import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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
  primaryColor: '#059669',
  secondaryColor: '#10b981',
  surfaceColor: '#ecfdf5',
  addressLine1: '',
  cityStatePin: '',
  gstin: '',
  pan: '',
  phone: '',
  email: 'sales@saranjutebags.co.in',
  invoicePrefix: 'INV',
  website: 'https://saranjutebags.co.in',
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

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [companySettings, setCompanySettings] = useState(() => readJson(STORAGE_KEYS.companySettings, defaultCompanySettings));
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

  // Sync with Firestore if active
  useEffect(() => {
    if (!isFirebaseActive) return;

    const unsubCompany = onSnapshot(doc(db, 'settings', 'company'), (snap) => {
      if (snap.exists()) {
        setCompanySettings(snap.data());
      } else {
        setDoc(doc(db, 'settings', 'company'), defaultCompanySettings);
      }
    });

    const unsubHomepage = onSnapshot(doc(db, 'settings', 'homepage'), (snap) => {
      if (snap.exists()) {
        setHomepage(snap.data());
      } else {
        setDoc(doc(db, 'settings', 'homepage'), defaultHomepage);
      }
    });

    const unsubSecurity = onSnapshot(doc(db, 'settings', 'security'), (snap) => {
      if (snap.exists()) {
        setSecurity(snap.data());
      } else {
        setDoc(doc(db, 'settings', 'security'), defaultSecurity);
      }
    });

    const unsubPopups = onSnapshot(collection(db, 'popups'), (snap) => {
      if (snap.empty) {
        defaultPopups.forEach(p => setDoc(doc(db, 'popups', p.id), p));
      } else {
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        setPopups(docs);
      }
    });

    const unsubBanners = onSnapshot(collection(db, 'banners'), (snap) => {
      if (snap.empty) {
        defaultBanners.forEach(b => setDoc(doc(db, 'banners', b.id), b));
      } else {
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        setBanners(docs);
      }
    });

    const unsubReviews = onSnapshot(collection(db, 'reviews'), (snap) => {
      if (snap.empty) {
        defaultReviews.forEach(r => setDoc(doc(db, 'reviews', r.id), r));
      } else {
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        setReviews(docs);
      }
    });

    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snap) => {
      if (snap.empty) {
        defaultNotifications.forEach(n => setDoc(doc(db, 'notifications', n.id), n));
      } else {
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        setNotifications(docs);
      }
    });

    const unsubLogs = onSnapshot(collection(db, 'activityLogs'), (snap) => {
      if (!snap.empty) {
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        docs.sort((a, b) => b.id.localeCompare(a.id));
        setActivityLogs(docs.slice(0, 100));
      }
    });

    const unsubScrollingTexts = onSnapshot(collection(db, 'scrollingTexts'), (snap) => {
      if (snap.empty) {
        defaultScrollingTexts.forEach(t => setDoc(doc(db, 'scrollingTexts', t.id), t));
      } else {
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        setScrollingTexts(docs);
      }
    });

    const unsubTestProduct = onSnapshot(doc(db, 'settings', 'testProduct'), (snap) => {
      if (snap.exists()) {
        setTestProductSettings(snap.data());
      } else {
        setDoc(doc(db, 'settings', 'testProduct'), defaultTestProductSettings);
      }
    });

    return () => {
      unsubCompany();
      unsubHomepage();
      unsubSecurity();
      unsubPopups();
      unsubBanners();
      unsubReviews();
      unsubNotifications();
      unsubLogs();
      unsubScrollingTexts();
      unsubTestProduct();
    };
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
    if (isFirebaseActive) {
      setDoc(doc(db, 'settings', 'company'), { ...companySettings, ...updates });
    } else {
      setCompanySettings((prev) => ({ ...prev, ...updates }));
    }
    addActivityLog('Updated company settings');
  };
  
  const updateHomepage = (updates) => {
    if (isFirebaseActive) {
      setDoc(doc(db, 'settings', 'homepage'), { ...homepage, ...updates });
    } else {
      setHomepage((prev) => ({ ...prev, ...updates }));
    }
    addActivityLog('Updated homepage configuration');
  };

  const addPopup = (popup) => {
    const id = createId('popup');
    const newPopup = { ...popup, id };
    if (isFirebaseActive) {
      setDoc(doc(db, 'popups', id), newPopup);
    } else {
      setPopups((prev) => [newPopup, ...prev]);
    }
    addActivityLog(`Created popup: ${popup.title}`);
  };
  
  const updatePopup = (popupId, updates) => {
    if (isFirebaseActive) {
      const existing = popups.find(p => p.id === popupId);
      if (existing) {
        setDoc(doc(db, 'popups', popupId), { ...existing, ...updates });
      }
    } else {
      setPopups((prev) => prev.map((popup) => (popup.id === popupId ? { ...popup, ...updates } : popup)));
    }
    addActivityLog('Updated popup settings');
  };
  
  const deletePopup = (popupId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'popups', popupId));
    } else {
      setPopups((prev) => prev.filter((popup) => popup.id !== popupId));
    }
    addActivityLog('Deleted popup');
  };

  const addBanner = (banner) => {
    const id = createId('banner');
    const newBanner = { ...banner, id };
    if (isFirebaseActive) {
      setDoc(doc(db, 'banners', id), newBanner);
    } else {
      setBanners((prev) => [newBanner, ...prev]);
    }
    addActivityLog(`Added banner: ${banner.title}`);
  };
  
  const updateBanner = (bannerId, updates) => {
    if (isFirebaseActive) {
      const existing = banners.find(b => b.id === bannerId);
      if (existing) {
        setDoc(doc(db, 'banners', bannerId), { ...existing, ...updates });
      }
    } else {
      setBanners((prev) => prev.map((banner) => (banner.id === bannerId ? { ...banner, ...updates } : banner)));
    }
    addActivityLog('Updated banner settings');
  };
  
  const deleteBanner = (bannerId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'banners', bannerId));
    } else {
      setBanners((prev) => prev.filter((banner) => banner.id !== bannerId));
    }
    addActivityLog('Deleted banner');
  };

  const addReview = (review) => {
    const id = createId('rev');
    const newReview = { ...review, id };
    if (isFirebaseActive) {
      setDoc(doc(db, 'reviews', id), newReview);
    } else {
      setReviews((prev) => [newReview, ...prev]);
    }
    addActivityLog(`Added customer review for approval`);
  };
  
  const updateReview = (reviewId, updates) => {
    if (isFirebaseActive) {
      const existing = reviews.find(r => r.id === reviewId);
      if (existing) {
        setDoc(doc(db, 'reviews', reviewId), { ...existing, ...updates });
      }
    } else {
      setReviews((prev) => prev.map((review) => (review.id === reviewId ? { ...review, ...updates } : review)));
    }
    addActivityLog('Moderated customer review');
  };
  
  const deleteReview = (reviewId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'reviews', reviewId));
    } else {
      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
    }
    addActivityLog('Deleted customer review');
  };

  const addNotification = (notification) => {
    const id = createId('note');
    const newNotification = { ...notification, id };
    if (isFirebaseActive) {
      setDoc(doc(db, 'notifications', id), newNotification);
    } else {
      setNotifications((prev) => [newNotification, ...prev]);
    }
    addActivityLog(`Sent push notification: ${notification.title}`);
  };
  
  const updateNotification = (noteId, updates) => {
    if (isFirebaseActive) {
      const existing = notifications.find(n => n.id === noteId);
      if (existing) {
        setDoc(doc(db, 'notifications', noteId), { ...existing, ...updates });
      }
    } else {
      setNotifications((prev) => prev.map((note) => (note.id === noteId ? { ...note, ...updates } : note)));
    }
    addActivityLog('Updated notification settings');
  };
  
  const deleteNotification = (noteId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'notifications', noteId));
    } else {
      setNotifications((prev) => prev.filter((note) => note.id !== noteId));
    }
    addActivityLog('Deleted notification history');
  };

  const updateSecurity = (updates) => {
    if (isFirebaseActive) {
      setDoc(doc(db, 'settings', 'security'), { ...security, ...updates });
    } else {
      setSecurity((prev) => ({ ...prev, ...updates }));
    }
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
      setDoc(doc(db, 'scrollingTexts', id), newItem);
    } else {
      setScrollingTexts((prev) => [...prev, newItem]);
    }
    addActivityLog('Added scrolling text');
  };

  const updateScrollingText = (textId, updates) => {
    if (isFirebaseActive) {
      const existing = scrollingTexts.find(t => t.id === textId);
      if (existing) {
        setDoc(doc(db, 'scrollingTexts', textId), { ...existing, ...updates });
      }
    } else {
      setScrollingTexts((prev) => prev.map((t) => (t.id === textId ? { ...t, ...updates } : t)));
    }
    addActivityLog('Updated scrolling text');
  };

  const deleteScrollingText = (textId) => {
    if (isFirebaseActive) {
      deleteDoc(doc(db, 'scrollingTexts', textId));
    } else {
      setScrollingTexts((prev) => prev.filter((t) => t.id !== textId));
    }
    addActivityLog('Deleted scrolling text');
  };

  const updateTestProductSettings = (updates) => {
    setTestProductSettings((prev) => {
      const next = { ...prev, ...updates };
      if (isFirebaseActive) {
        setDoc(doc(db, 'settings', 'testProduct'), next);
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
  }), [banners, companySettings, homepage, notifications, popups, reviews, roles, security, activityLogs, loginHistory, deviceHistory, scrollingTexts, testProductSettings]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};