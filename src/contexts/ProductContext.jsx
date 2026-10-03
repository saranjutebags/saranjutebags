import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { db, auth, isFirebaseActive } from '../firebase/config';
import {
  collection, doc, setDoc, deleteDoc, getDoc, updateDoc,
  query, where, orderBy, limit, startAfter, getDocs, onSnapshot,
} from 'firebase/firestore';
import { useAdmin } from './AdminContext';
import { slugify } from '../utils/slugify';
import {
  fetchCachedDoc,
  fetchCachedCollection,
  getCached,
  setCache,
  invalidateCache,
  invalidateByPrefix,
} from '../utils/firestoreCache';
import { setDocSafe, hydrateDoc, deleteDocSafe, saveProductImages, loadProductImages, deleteProductImagesSafe, deleteChunkSubdocs } from '../utils/chunkedFirestore';
import { recompressDataUrl } from '../utils/imageUtils';

const ProductContext = createContext();

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Jute Bags', image: '/Jute-Bags-1.webp', banner: '/Jute-Bags-1.webp', icon: 'Bag', featured: true, visible: true, sortOrder: 1 },
  { id: 2, name: 'Cotton Bags', image: '/canvas-bags.webp', banner: '/canvas-bags.webp', icon: 'Shirt', featured: true, visible: true, sortOrder: 2 },
  { id: 3, name: 'Canvas Bags', image: '/Canvas-tote-bag.webp', banner: '/Canvas-tote-bag.webp', icon: 'Box', featured: true, visible: true, sortOrder: 3 },
];

const createProductId = () => `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const createCategoryId = () => `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ─── slug → doc-id index (localStorage) ──────────────────────────────────────
// Products created before the `slug` field existed are only discoverable via a
// full collection scan. After the first successful scan we persist the mapping
// so every later lookup becomes a fast direct doc read.
const SLUG_INDEX_KEY = 'sjb_product_slug_index';
const readSlugIndex = () => {
  try {
    const stored = localStorage.getItem(SLUG_INDEX_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};
const writeSlugIndex = (map) => {
  try {
    localStorage.setItem(SLUG_INDEX_KEY, JSON.stringify(map));
  } catch { /* storage full */ }
};

// Bump the lightweight catalog version doc so open storefronts refresh their
// product list immediately after an admin write.
const bumpCatalogVersion = () => {
  if (!isFirebaseActive) return;
  setDoc(doc(db, 'settings', 'catalogVersion'), {
    version: Date.now(),
    updatedAt: new Date().toISOString(),
  }).catch(() => { /* non-fatal */ });
};

// Deduplicate concurrent single-product lookups for the same slug/id.
const singleProductInflight = new Map();

// ─── Light-document image store ───────────────────────────────────────────────
// Product docs keep small thumbnails inline so lists load in milliseconds; the
// full-resolution originals live in `products/{id}/images/*` chunk docs.
// Legacy products (full-size base64 inline) are detected by image size and
// normalized in the background — thumbnails written to the doc, originals moved
// to chunks — so every later page load is fast for every visitor.
const HEAVY_IMAGE_CHARS = 30000; // base64 images larger than ~30KB are moved out of the doc
const THUMB_OPTS = { quality: 0.55, maxWidth: 300 };

const isDataUrlImage = (img) => typeof img === 'string' && img.startsWith('data:');
const isHeavyProduct = (product) =>
  Boolean(product) && ((product.images || []).some(img => isDataUrlImage(img) && img.length > HEAVY_IMAGE_CHARS) || product.__chunked);

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

export const ProductProvider = ({ children }) => {
  const PAGE_SIZE = 20; // Load 20 products per page
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);
  const allProductsLoadedRef = useRef(false);
  const lastCatalogVersionRef = useRef(null);

  // ─── Chunked-doc hydration ──────────────────────────────────────────────────
  // Documents saved via setDocSafe keep oversized fields (images, logos) in a
  // `chunks` subcollection and only a '' placeholder in the main doc. These
  // helpers rebuild the full values so products/categories render normally.
  const hydrateProductList = async (docs) => {
    const chunked = (docs || []).filter(d => d && d.__chunked);
    if (chunked.length === 0) return docs;
    const results = await Promise.all(
      chunked.map(d => hydrateDoc(doc(db, 'products', String(d.id)), d).catch(() => null))
    );
    const map = {};
    chunked.forEach((d, i) => { if (results[i]) map[String(d.id)] = results[i]; });
    return (docs || []).map(d => map[String(d.id)] || d);
  };

  const hydrateCategoryList = async (docs) => {
    const chunked = (docs || []).filter(d => d && d.__chunked);
    if (chunked.length === 0) return docs;
    const results = await Promise.all(
      chunked.map(d => hydrateDoc(doc(db, 'categories', String(d.id)), d).catch(() => null))
    );
    const map = {};
    chunked.forEach((d, i) => { if (results[i]) map[String(d.id)] = results[i]; });
    return (docs || []).map(d => map[String(d.id)] || d);
  };

  // ─── Full-image hydration (single product) ─────────────────────────────────
  // Rebuild a product with its full-resolution images attached as `fullImages`,
  // so detail views render at full quality while lists stay light.
  const hydrateFullImages = async (data) => {
    if (!data || !isFirebaseActive) return data;
    let hydrated = data;
    if (data.__chunked) {
      hydrated = (await hydrateDoc(doc(db, 'products', String(data.id)), data).catch(() => null)) || data;
    }
    if (hydrated && hydrated.imagesInChunks && !hydrated.fullImages) {
      const full = await loadProductImages(String(hydrated.id)).catch(() => null);
      if (full && full.length > 0) hydrated = { ...hydrated, fullImages: full };
    }
    return hydrated;
  };

  // ─── Legacy image normalization ─────────────────────────────────────────────
  // Old products embed full-size base64 images in the doc, which makes every
  // list fetch slow. Normalizing moves the originals into image chunks and
  // keeps only thumbnails in the doc. Runs in the background (throttled) and
  // fails silently when the current user has no write permission.
  const normalizeProductImages = async (product) => {
    if (!isFirebaseActive || !product || !product.id) return null;
    try {
      let source = product;
      if (product.__chunked) {
        source = (await hydrateDoc(doc(db, 'products', String(product.id)), product).catch(() => null)) || product;
      }
      const originals = (source.fullImages || source.images || []).filter(isDataUrlImage);
      if (originals.length === 0) return null;
      const heavy = originals.some(img => img.length > HEAVY_IMAGE_CHARS) || product.__chunked;
      if (!heavy) return null;

      const thumbs = await Promise.all(
        originals.map(img => recompressDataUrl(img, THUMB_OPTS))
      );
      await saveProductImages(String(source.id), originals);

      const docData = { ...source };
      delete docData.fullImages;
      delete docData.__chunked;
      docData.images = thumbs;
      docData.imagesInChunks = true;
      docData.fullImagesCount = originals.length;
      await setDoc(doc(db, 'products', String(source.id)), docData);
      await deleteChunkSubdocs(doc(db, 'products', String(source.id)));
      return docData;
    } catch (err) {
      console.warn('[Products] normalizeProductImages failed for', product.id, ':', err?.message || err);
      return null;
    }
  };

  // Throttled background queue — normalizes a few legacy products at a time so
  // the storefront never waits for it and Firestore writes stay gentle.
  const normalizeQueueRef = useRef([]);
  const normalizingRef = useRef(false);
  const queuedNormalizeRef = useRef(new Set());

  const processNormalizeQueue = async () => {
    if (normalizingRef.current) return;
    normalizingRef.current = true;
    while (normalizeQueueRef.current.length > 0) {
      const product = normalizeQueueRef.current.shift();
      const normalized = await normalizeProductImages(product);
      if (normalized) {
        setProducts(prev => prev.map(p => (String(p.id) === String(product.id) ? normalized : p)));
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    normalizingRef.current = false;
  };

  const queueNormalize = (product) => {
    if (!product || !product.id || !isHeavyProduct(product)) return;
    if (queuedNormalizeRef.current.has(String(product.id))) return;
    queuedNormalizeRef.current.add(String(product.id));
    normalizeQueueRef.current.push(product);
    processNormalizeQueue();
  };

  // Admin trigger: normalize every legacy product in one pass (with progress).
  const optimizeAllProducts = async (onProgress) => {
    if (!isFirebaseActive) return { optimized: 0, total: 0 };
    const snap = await getDocs(collection(db, 'products'));
    const docs = [];
    snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
    let optimized = 0;
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      onProgress?.(i + 1, docs.length, d.name || d.id);
      if (isHeavyProduct(d)) {
        const normalized = await normalizeProductImages(d);
        if (normalized) {
          optimized++;
          setProducts(prev => prev.map(p => (String(p.id) === String(d.id) ? normalized : p)));
        }
        await new Promise(r => setTimeout(r, 800));
      }
    }
    if (optimized > 0) {
      invalidateCache('products');
      bumpCatalogVersion();
      refreshProducts({ silent: true });
    }
    return { optimized, total: docs.length };
  };

  // ─── Initial product load: cached-first, paginated one-time read ────────────
  // Categories and the first product page are fetched IN PARALLEL so neither
  // waits for the other. Cached data renders instantly while the network
  // refresh happens in the background.
  useEffect(() => {
    if (!isFirebaseActive) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const initialLoad = async () => {
      setLoading(true);
      let hadCache = false;
      try {
        // Check memory/localStorage cache first
        const cachedProducts = getCached('products');
        const cachedCategories = getCached('categories');

        if (cachedProducts) {
          hadCache = true;
          setProducts(await hydrateProductList(cachedProducts));
          setLoading(false);
          setProductsError(false);
          if (cachedProducts.length < PAGE_SIZE) {
            setHasMore(false);
            allProductsLoadedRef.current = true;
          }
        }

        if (cachedCategories) {
          setCategories(await hydrateCategoryList(cachedCategories));
        }

        // Fetch categories + first product page in parallel
        const [catDocs, prodSnap] = await Promise.all([
          !cachedCategories
            ? getDocs(collection(db, 'categories')).then(snap => {
                const docs = [];
                snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
                return docs;
              })
            : Promise.resolve(null),
          !cachedProducts
            ? getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE)))
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        // Categories
        if (catDocs !== null) {
          const hydratedCats = await hydrateCategoryList(catDocs);
          const sorted = hydratedCats.length > 0
            ? hydratedCats.sort((a, b) => a.sortOrder - b.sortOrder)
            : DEFAULT_CATEGORIES;
          setCategories(sorted);
          setCache('categories', sorted);
        }

        // Products (first page)
        if (prodSnap !== null) {
          const docs = [];
          prodSnap.forEach(d => docs.push({ ...d.data(), id: d.id }));
          const hydratedDocs = await hydrateProductList(docs);

          setProducts(hydratedDocs);
          setCache('products', hydratedDocs, 3 * 60 * 1000);
          setHasMore(docs.length === PAGE_SIZE);
          if (docs.length > 0) {
            lastDocRef.current = prodSnap.docs[prodSnap.docs.length - 1];
            allProductsLoadedRef.current = false;
          } else {
            allProductsLoadedRef.current = true;
          }

          // Kick off background normalization of legacy heavy products so
          // future page loads are fast for everyone. Fails silently when the
          // current visitor has no write permission.
          setTimeout(() => {
            hydratedDocs.forEach(d => queueNormalize(d));
          }, 2500);
        }

        setProductsError(false);
      } catch (err) {
        console.warn('[Products] Initial load failed:', err?.message || err);
        if (!hadCache) setProductsError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initialLoad();
    return () => { cancelled = true; };
  }, []);

  // ─── Realtime catalog version ───────────────────────────────────────────────
  // One tiny doc listener. When an admin adds/updates/deletes a product, the
  // version bumps and every open storefront silently refreshes its first page —
  // no full page reload needed.
  useEffect(() => {
    if (!isFirebaseActive) return;

    const unsub = onSnapshot(
      doc(db, 'settings', 'catalogVersion'),
      (snap) => {
        if (snap.metadata && snap.metadata.fromCache) return; // wait for server truth
        const version = snap.exists() ? (snap.data().version || 0) : 0;
        if (lastCatalogVersionRef.current === null) {
          lastCatalogVersionRef.current = version;
          return;
        }
        if (version !== lastCatalogVersionRef.current) {
          lastCatalogVersionRef.current = version;
          refreshProducts({ silent: true });
        }
      },
      (err) => console.warn('[Products] catalogVersion listener failed:', err?.message || err)
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Load more products (pagination) ────────────────────────────────────────
  const loadMoreProducts = useCallback(async () => {
    if (!isFirebaseActive || loadingMore || !hasMore || allProductsLoadedRef.current) return;

    setLoadingMore(true);
    try {
      const q = lastDocRef.current
        ? query(
            collection(db, 'products'),
            orderBy('createdAt', 'desc'),
            startAfter(lastDocRef.current),
            limit(PAGE_SIZE)
          )
        : query(
            collection(db, 'products'),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE)
          );

      const snap = await getDocs(q);
      const newDocs = await hydrateProductList(snap.docs.map(d => d.data()));

      if (newDocs.length > 0) {
        lastDocRef.current = snap.docs[snap.docs.length - 1];
        setProducts(prev => {
          const combined = [...prev, ...newDocs];
          return combined;
        });
        // Cache the combined list so future sessions start with more data
        const combined = [...products, ...newDocs];
        setCache('products', combined, 3 * 60 * 1000);
      }

      if (newDocs.length < PAGE_SIZE) {
        setHasMore(false);
        allProductsLoadedRef.current = true;
      }
    } catch (err) {
      console.warn('[Products] loadMoreProducts failed:', err?.message || err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, products]);

  // ─── Force refresh products (admin writes, catalog version bumps) ───────────
  const refreshProducts = useCallback(async ({ silent = false } = {}) => {
    if (!isFirebaseActive) return;

    if (!silent) {
      invalidateCache('products');
      lastDocRef.current = null;
      allProductsLoadedRef.current = false;
      setHasMore(true);
      setLoading(true);
    }

    try {
      const q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const docs = await hydrateProductList(snap.docs.map(d => d.data()));
      setProducts(docs);
      setCache('products', docs, 3 * 60 * 1000);
      if (docs.length > 0) lastDocRef.current = snap.docs[snap.docs.length - 1];
      setHasMore(docs.length === PAGE_SIZE);
      allProductsLoadedRef.current = docs.length === 0;
      setProductsError(false);
    } catch (err) {
      console.warn('[Products] refreshProducts failed:', err?.message || err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const { testProductSettings } = useAdmin();

  const testProductObject = useMemo(() => {
    if (!testProductSettings?.enabled) return null;
    const totalPrice = Number(testProductSettings.price || 0) + Number(testProductSettings.gstAmount || 0) + Number(testProductSettings.deliveryFee || 0);
    return {
      id: 'test-demo-product',
      name: testProductSettings.name || 'Demo Test Product (Razorpay Testing)',
      price: Number(testProductSettings.price ?? 1.00),
      originalPrice: totalPrice,
      gstAmount: Number(testProductSettings.gstAmount ?? 0),
      deliveryFee: Number(testProductSettings.deliveryFee ?? 0),
      isTestProduct: true,
      category: testProductSettings.category || 'Jute Bags',
      images: testProductSettings.images || ['/Jute-Bags-1.webp'],
      description: testProductSettings.description || 'Demo product configured by Admin for testing Razorpay payment integration.',
      sku: testProductSettings.sku || 'DEMO-TEST',
      stock: 999,
      visible: true,
      archived: false,
      featured: true,
      bestseller: false,
      newArrival: false,
      rating: 5.0,
      reviews: 1,
      customerReviews: [{ id: 'rev-test', name: 'Admin Test', rating: 5, text: 'Demo Test Product for Razorpay testing', date: new Date().toLocaleDateString() }],
      createdAt: new Date().toISOString(),
    };
  }, [testProductSettings]);

  const allProducts = useMemo(() => {
    if (testProductObject) {
      const exists = products.some(p => String(p.id) === String(testProductObject.id));
      if (!exists) {
        return [testProductObject, ...products];
      }
    }
    return products;
  }, [products, testProductObject]);

  const getProductById = (id) => allProducts.find((product) => String(product.id) === String(id));
  // Find product by URL slug — checks stored slug field first, then name-based
  // slug, then doc id (for backward compat with older shared links)
  const getProductBySlug = (slug) =>
    allProducts.find((p) => typeof p.slug === 'string' && p.slug === slug) ||
    allProducts.find((p) => slugify(p.name) === slug) ||
    allProducts.find((p) => String(p.id) === String(slug));

  const fetchSingleProduct = useCallback(async (slugOrId) => {
    if (!slugOrId) return null;

    // 0. Already loaded in memory?
    const existing = allProducts.find((p) =>
      (typeof p.slug === 'string' && p.slug === slugOrId) ||
      slugify(p.name) === slugOrId ||
      String(p.id) === String(slugOrId)
    );
    // Products that store full images in chunks are upgraded to full quality
    // in the background — the list copy (thumbnails) renders immediately.
    if (existing && !(existing.imagesInChunks && !existing.fullImages)) return existing;

    if (!isFirebaseActive) return existing || null;

    // Deduplicate concurrent lookups for the same slug/id
    if (singleProductInflight.has(slugOrId)) return singleProductInflight.get(slugOrId);

    const promise = (async () => {
      const mergeIntoProducts = async (data) => {
        const final = await hydrateFullImages(data);
        // Keep the shared LIST light: only the thumbnail copy joins products.
        const light = final?.fullImages ? { ...final, fullImages: undefined } : final;
        setProducts(prev => {
          if (prev.some(p => String(p.id) === String(final.id))) return prev;
          return [light, ...prev];
        });
        setCache(`product/${String(final.id)}`, final, 10 * 60 * 1000);
        return final;
      };

      // 1. Direct document-id read (fast — used by /product/:id style links)
      try {
        const docSnap = await getDoc(doc(db, 'products', String(slugOrId)));
        if (docSnap.exists()) return await mergeIntoProducts(docSnap.data());
      } catch (e) { /* not a doc id — continue */ }

      // 2. Indexed slug lookup (fast — single-field equality, no composite index)
      try {
        const snap = await getDocs(query(collection(db, 'products'), where('slug', '==', String(slugOrId)), limit(1)));
        if (!snap.empty) return await mergeIntoProducts(snap.docs[0].data());
      } catch (e) {
        console.warn('fetchSingleProduct slug query failed:', e?.message || e);
      }

      // 3. Legacy products (no slug field): use the persisted slug→id index
      const slugIndex = readSlugIndex();
      const indexedId = slugIndex[slugOrId];
      if (indexedId) {
        try {
          const docSnap = await getDoc(doc(db, 'products', String(indexedId)));
          if (docSnap.exists()) return await mergeIntoProducts(docSnap.data());
        } catch (e) { /* continue to full scan */ }
      }

      // 4. Last resort: full collection scan for legacy products created before
      //    the slug field existed. Every doc seen is indexed (slug + name slug),
      //    so one slow scan fixes ALL future shared links on this device.
      try {
        const snap = await getDocs(collection(db, 'products'));
        let matched = null;
        snap.forEach(d => {
          const data = d.data();
          if (data && data.name) {
            slugIndex[slugify(data.name)] = String(d.id);
            if (data.slug) slugIndex[data.slug] = String(d.id);
          }
          if (!matched && (slugify(data.name || '') === slugOrId || data.slug === slugOrId || String(d.id) === String(slugOrId))) {
            matched = data;
          }
        });
        writeSlugIndex(slugIndex);
        if (matched) {
          // Normalize legacy heavy images in the background so this product
          // (and every list page) loads faster for all future visitors.
          queueNormalize(matched);
          return await mergeIntoProducts(matched);
        }
        return null;
      } catch (e) {
        console.warn('fetchSingleProduct error:', e);
        return null;
      }
    })();

    singleProductInflight.set(slugOrId, promise);
    try {
      return await promise;
    } finally {
      singleProductInflight.delete(slugOrId);
    }
  }, [allProducts]);

  const getFeaturedProducts = () => allProducts.filter((product) => product.featured && product.visible && !product.archived);
  const getBestsellers = () => allProducts.filter((product) => product.bestseller && product.visible && !product.archived);
  const getNewArrivals = () => allProducts.filter((product) => product.newArrival && product.visible && !product.archived);
  const getProductsByCategory = (category) => allProducts.filter((product) => product.category === category && product.visible && !product.archived);

  const addProduct = async (product) => {
    const nextProduct = {
      ...product,
      id: createProductId(),
      slug: slugify(product.name),
      archived: false,
      visible: true,
      weightPerPiece: Number(product.weightPerPiece) || 0,
      featured: Boolean(product.featured),
      bestseller: Boolean(product.bestseller),
      newArrival: Boolean(product.newArrival),
      images: product.images || [],
      colors: product.colors || [],
      sizes: product.sizes || [],
      tags: product.tags || [],
      specifications: product.specifications || [],
      dimensions: product.dimensions || { length: '', width: '', height: '', unit: 'cm' },
      styles: product.styles || [],
      customDesignFee: Number(product.customDesignFee) || 100,
      createdAt: new Date().toISOString(),
    };

    // Full-resolution uploads go to image chunks; the doc keeps thumbnails only.
    const fullImages = Array.isArray(product.fullImages) ? product.fullImages.filter(isDataUrlImage) : [];
    const docData = { ...nextProduct };
    delete docData.fullImages;
    docData.imagesInChunks = fullImages.length > 0;
    docData.fullImagesCount = fullImages.length;

    if (isFirebaseActive) {
      await setDocSafe(doc(db, 'products', String(nextProduct.id)), docData, { keepDataUrls: true });
      if (fullImages.length > 0) {
        await saveProductImages(String(nextProduct.id), fullImages)
          .catch(err => console.warn('[Products] saveProductImages failed:', err?.message || err));
      }
    }
    const nextList = [docData, ...products];
    setProducts(nextList);
    // Update the cache directly so the storefront shows the new product
    // immediately — no waiting for cache expiry or a full reload.
    setCache('products', nextList, 3 * 60 * 1000);
    invalidateByPrefix('product/');
    bumpCatalogVersion();
    return docData;
  };

  const updateProduct = async (productId, updates) => {
    if (isFirebaseActive) {
      const existing = products.find((product) => String(product.id) === String(productId));
      // When new uploads are provided, image chunks are replaced too.
      const fullImages = Array.isArray(updates.fullImages) ? updates.fullImages.filter(isDataUrlImage) : null;
      const { fullImages: _fullImages, ...restUpdates } = updates;
      const updated = { ...(existing || {}), ...restUpdates, id: String(productId) };

      // Keep the URL slug in sync when the name changes; backfill slug for legacy products
      if (updates.name && updates.name !== existing?.name) {
        updated.slug = slugify(updates.name);
      }
      if (!updated.slug && updated.name) {
        updated.slug = slugify(updated.name);
      }

      if (fullImages !== null) {
        updated.imagesInChunks = fullImages.length > 0;
        updated.fullImagesCount = fullImages.length;
      }
      delete updated.fullImages;

      await setDocSafe(doc(db, 'products', String(productId)), updated, { keepDataUrls: true });
      if (fullImages !== null) {
        if (fullImages.length > 0) {
          await saveProductImages(String(productId), fullImages)
            .catch(err => console.warn('[Products] saveProductImages failed:', err?.message || err));
        } else {
          await deleteProductImagesSafe(doc(db, 'products', String(productId)));
        }
      }

      const nextList = existing
        ? products.map(p => (String(p.id) === String(productId) ? updated : p))
        : [updated, ...products];
      setProducts(nextList);
      setCache('products', nextList, 3 * 60 * 1000);
      invalidateByPrefix('product/');
      bumpCatalogVersion();
    }
  };

  const deleteProduct = async (productId) => {
    if (isFirebaseActive) {
      await deleteDocSafe(doc(db, 'products', String(productId)));
      const nextList = products.filter(p => String(p.id) !== String(productId));
      setProducts(nextList);
      setCache('products', nextList, 3 * 60 * 1000);
      invalidateByPrefix('product/');
      bumpCatalogVersion();
    }
  };

  const duplicateProduct = async (productId) => {
    const source = products.find((product) => String(product.id) === String(productId));
    if (!source) return null;

    const copy = {
      ...source,
      id: createProductId(),
      name: `${source.name} Copy`,
      slug: slugify(`${source.name} Copy`),
      sku: `${source.sku || 'SKU'}-COPY`,
      barcode: `${source.barcode || 'BAR'}-COPY`,
      archived: false,
      visible: source.visible,
      featured: false,
      bestseller: false,
      newArrival: false,
      dimensions: source.dimensions || { length: '', width: '', height: '', unit: 'cm' },
      styles: source.styles || [],
      customDesignFee: source.customDesignFee || 100,
      createdAt: new Date().toISOString(),
    };
    // The copy keeps the inline thumbnails; it never inherits the original's
    // image chunks (those belong to the source product).
    delete copy.fullImages;
    copy.imagesInChunks = false;
    copy.fullImagesCount = 0;

    if (isFirebaseActive) {
      await setDocSafe(doc(db, 'products', String(copy.id)), copy, { keepDataUrls: true });
      const nextList = [copy, ...products];
      setProducts(nextList);
      setCache('products', nextList, 3 * 60 * 1000);
      invalidateByPrefix('product/');
      bumpCatalogVersion();
    }
    return copy;
  };

  const archiveProduct = (productId) => {
    updateProduct(productId, { archived: true, visible: false });
  };

  const toggleProductVisibility = (productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    if (product) {
      updateProduct(productId, { visible: !product.visible });
    }
  };

  const [inventoryHistory, setInventoryHistory] = useState([]);

  const addInventoryLog = async (productId, type, quantity, previousStock, newStock, notes = '') => {
    const product = products.find(p => String(p.id) === String(productId));
    const newLog = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      productId,
      productName: product ? product.name : 'Unknown Product',
      type,
      quantity: Number(quantity),
      timestamp: new Date().toLocaleString(),
      previousStock: Number(previousStock),
      newStock: Number(newStock),
      notes,
    };
    if (isFirebaseActive) {
      await setDoc(doc(db, 'inventoryHistory', newLog.id), newLog);
    }
  };

  const updateProductStock = async (productId, stock, notes = 'Manual stock adjustment', meta = null) => {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;
    const oldStock = product.stock;
    const newStock = Math.max(0, Number(stock) || 0);
    const diff = newStock - oldStock;

    // Order-driven adjustments must always reach the server, even when our
    // local copy shows no difference — the server owns the real stock number.
    const isOrderFlow = Boolean(meta && meta.orderId);
    if (diff === 0 && !isOrderFlow) return;

    const type = diff > 0 ? 'Stock In' : 'Stock Out';

    // Update the UI instantly — never wait for the network round-trip.
    setProducts(prev => prev.map(p => (String(p.id) === String(productId) ? { ...p, stock: newStock } : p)));

    if (!isFirebaseActive) return;

    try {
      if (isOrderFlow) {
        // Customer flow: the browser only names the ORDER, never a stock value.
        // The serverless function reads the ordered quantity from that order
        // document, computes the new stock itself and writes it with the Admin
        // SDK — so customers cannot set stock numbers or replay an adjustment.
        const currentUser = auth.currentUser;
        const idToken = currentUser ? await currentUser.getIdToken(true).catch(() => null) : null;
        if (!idToken) throw new Error('Sign in required to adjust stock');
        const response = await fetch('/api/update-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            productId: String(productId),
            orderId: String(meta.orderId),
            action: meta.action || (diff < 0 ? 'place' : 'cancel'),
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 404 && import.meta.env.DEV) {
          // Vite's dev server does not run serverless functions, so
          // /api/update-stock only exists once deployed (or under
          // `npx vercel dev`). The optimistic UI number stays, and nothing is
          // written to Firestore — which is exactly how it should be.
          console.warn('[stock] Skipped in local dev — use "npx vercel dev" or a deployment to apply stock changes');
          return;
        }
        if (!response.ok && !payload.idempotent) {
          throw new Error(payload.message || 'Stock update failed');
        }
        if (typeof payload.stock === 'number') {
          setProducts(prev => prev.map(p => (String(p.id) === String(productId) ? { ...p, stock: payload.stock } : p)));
        }
        // The function already wrote the inventory log and bumped the catalog
        // version, so the client skips both here.
        invalidateCache('products');
      } else {
        // Admin flow: targeted single-field write — stock changes must never
        // rewrite the whole product document (images, styles, etc.).
        await updateDoc(doc(db, 'products', String(productId)), { stock: newStock });
        invalidateCache('products');
        bumpCatalogVersion();
        await addInventoryLog(productId, type, Math.abs(diff), oldStock, newStock, notes).catch(() => { });
      }
    } catch (err) {
      console.error('Failed to update product stock:', err);
    }
  };

  const bulkUpdateStock = async (updates, notes = 'Bulk stock adjustment') => {
    for (const update of updates) {
      await updateProductStock(update.productId, update.stock, notes);
    }
  };

  const addCategory = async (category) => {
    const nextCategory = {
      ...category,
      id: createCategoryId(),
      visible: true,
      featured: Boolean(category.featured),
      sortOrder: Number(category.sortOrder) || categories.length + 1,
    };
    if (isFirebaseActive) {
      await setDocSafe(doc(db, 'categories', String(nextCategory.id)), nextCategory, { keepDataUrls: true });
      invalidateCache('categories');
    }
    setCategories(prev => [...prev, nextCategory]);
    return nextCategory;
  };

  const updateCategory = async (categoryId, updates) => {
    const existing = categories.find((c) => c.id === categoryId);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    if (isFirebaseActive) {
      await setDocSafe(doc(db, 'categories', String(categoryId)), updated, { keepDataUrls: true });
    }
    setCategories(prev => prev.map(c => (c.id === categoryId ? updated : c)));
  };

  const deleteCategory = async (categoryId) => {
    if (isFirebaseActive) {
      await deleteDocSafe(doc(db, 'categories', String(categoryId)));
      invalidateCache('categories');
    }
    setCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const toggleCategoryVisibility = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      updateCategory(categoryId, { visible: !category.visible });
    }
  };

  const addReview = async (productId, reviewData) => {
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) return null;

    // Strip base64 review images that are too large for Firestore (1MB doc limit)
    const safeImages = (reviewData.images || []).filter(img => {
      if (typeof img === 'string' && img.startsWith('data:') && img.length > 300000) {
        console.warn('[Review] Dropping oversized image from review');
        return false;
      }
      return true;
    }).slice(0, 3);

    const newReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: String(product.id),
      productName: product.name,
      userId: reviewData.userId || '',
      name: reviewData.name || 'Anonymous',
      rating: reviewData.rating,
      text: reviewData.text,
      images: safeImages,
      hidden: false,
      date: new Date().toLocaleDateString()
    };

    // Each review is its own document under productReviews, so no customer
    // can ever overwrite another customer's review or touch product fields.
    if (isFirebaseActive) {
      await setDoc(doc(db, 'productReviews', newReview.id), newReview);

      // Keep the card-level rating aggregates on the product doc in sync
      // (numbers only — Firestore rules allow just these two fields).
      try {
        const reviews = await fetchProductReviews(String(product.id));
        const visible = reviews.filter(r => !r.hidden);
        const avgRating = visible.length > 0
          ? visible.reduce((sum, r) => sum + r.rating, 0) / visible.length
          : 0;
        await updateDoc(doc(db, 'products', String(product.id)), {
          rating: avgRating,
          reviews: visible.length,
        });
      } catch (err) {
        console.warn('[Review] Aggregate sync skipped:', err?.message || err);
      }
    }

    invalidateByPrefix('product/');
    return newReview;
  };

  // Load one product's reviews (newest first) from the productReviews store.
  const fetchProductReviews = async (productId) => {
    if (!isFirebaseActive) return [];
    try {
      const q = query(collection(db, 'productReviews'), where('productId', '==', String(productId)));
      const snap = await getDocs(q);
      const docs = [];
      snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
      docs.sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));
      return docs;
    } catch (err) {
      console.warn('Failed to load product reviews:', err);
      return [];
    }
  };

  // Load every review for the admin moderation table.
  const fetchAllProductReviews = async () => {
    if (!isFirebaseActive) return [];
    try {
      const snap = await getDocs(collection(db, 'productReviews'));
      const docs = [];
      snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
      return docs;
    } catch (err) {
      console.warn('Failed to load all product reviews:', err);
      return [];
    }
  };

  const deleteProductReview = async (reviewId) => {
    if (isFirebaseActive) {
      await deleteDoc(doc(db, 'productReviews', String(reviewId)));
    }
  };

  const toggleReviewVisibility = async (reviewId, nextHidden) => {
    if (isFirebaseActive) {
      await updateDoc(doc(db, 'productReviews', String(reviewId)), { hidden: Boolean(nextHidden) });
    }
  };

  const value = useMemo(() => ({
    products: allProducts,
    categories,
    inventoryHistory,
    loading,
    productsError,
    loadingMore,
    hasMore,
    loadMoreProducts,
    refreshProducts,
    optimizeAllProducts,
    getProductById,
    getProductBySlug,
    fetchSingleProduct,
    getFeaturedProducts,
    getBestsellers,
    getNewArrivals,
    getProductsByCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    archiveProduct,
    toggleProductVisibility,
    updateProductStock,
    bulkUpdateStock,
    addInventoryLog,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryVisibility,
    addReview,
    fetchProductReviews,
    fetchAllProductReviews,
    deleteProductReview,
    toggleReviewVisibility,
  }), [categories, allProducts, inventoryHistory, loading, productsError, loadingMore, hasMore, loadMoreProducts, refreshProducts, fetchSingleProduct]);

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};
