/**
 * firestoreCache.js
 *
 * Shared, in-memory + localStorage Firestore cache with:
 *  - TTL-based expiration (configurable per collection/doc)
 *  - Request deduplication (concurrent callers share one in-flight fetch)
 *  - One-time read helpers that return a Promise<data>
 *  - Simple invalidation API for post-write refreshes
 */

import { getDoc, getDocs, doc, collection } from 'firebase/firestore';

// ─── Default TTLs (milliseconds) ─────────────────────────────────────────────
const DEFAULT_TTL_MAP = {
  'settings/company':               15 * 60 * 1000,
  'settings/homepage':              15 * 60 * 1000,
  'settings/pricing':               10 * 60 * 1000,
  'settings/warehouse':             10 * 60 * 1000,
  'settings/domesticShipping':      10 * 60 * 1000,
  'settings/internationalShipping': 10 * 60 * 1000,
  'settings/security':              15 * 60 * 1000,
  'settings/testProduct':           10 * 60 * 1000,
  categories:    10 * 60 * 1000,
  products:       3 * 60 * 1000,
  coupons:        5 * 60 * 1000,
  popups:         5 * 60 * 1000,
  banners:        5 * 60 * 1000,
  reviews:        5 * 60 * 1000,
  notifications:  5 * 60 * 1000,
  scrollingTexts: 5 * 60 * 1000,
};

const DEFAULT_TTL_FALLBACK = 5 * 60 * 1000;

// ─── In-memory store ──────────────────────────────────────────────────────────
const memCache = new Map();
const inflight = new Map();

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_PREFIX = 'sjb_fscache_';

const lsGet = (key) => {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(LS_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
};

const lsSet = (key, data, expiresAt) => {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ data, expiresAt }));
  } catch { /* localStorage full */ }
};

const lsRemove = (key) => {
  try { localStorage.removeItem(LS_PREFIX + key); } catch { /* noop */ }
};

const getTTL = (key) => DEFAULT_TTL_MAP[key] ?? DEFAULT_TTL_FALLBACK;

// ─── Public API ───────────────────────────────────────────────────────────────

export const getCached = (key) => {
  const mem = memCache.get(key);
  if (mem && Date.now() < mem.expiresAt) return mem.data;
  if (mem) memCache.delete(key);
  return lsGet(key);
};

export const setCache = (key, data, ttlMs) => {
  const resolvedTTL = ttlMs ?? getTTL(key);
  const expiresAt = Date.now() + resolvedTTL;
  memCache.set(key, { data, expiresAt });
  lsSet(key, data, expiresAt);
};

export const invalidateCache = (key) => {
  memCache.delete(key);
  lsRemove(key);
};

export const invalidateByPrefix = (prefix) => {
  for (const k of memCache.keys()) {
    if (k.startsWith(prefix)) { memCache.delete(k); lsRemove(k); }
  }
};

/**
 * Fetch a single Firestore document with caching + deduplication.
 */
export const fetchCachedDoc = async (db, collectionPath, docId, opts = {}) => {
  const cacheKey = `${collectionPath}/${docId}`;
  const { fallback = null, ttl, forceRefresh = false } = opts;

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached !== null) return cached;
  }

  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const promise = (async () => {
    try {
      const snap = await getDoc(doc(db, collectionPath, docId));
      const data = snap.exists() ? snap.data() : fallback;
      setCache(cacheKey, data, ttl);
      return data;
    } catch (err) {
      console.warn(`[Cache] fetchCachedDoc(${cacheKey}) failed:`, err?.message || err);
      return fallback;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, promise);
  return promise;
};

/**
 * Fetch an entire Firestore collection with caching + deduplication.
 */
export const fetchCachedCollection = async (db, collectionName, opts = {}) => {
  const cacheKey = collectionName;
  const { fallback = [], ttl, forceRefresh = false, transform } = opts;

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached !== null) return cached;
  }

  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const promise = (async () => {
    try {
      const snap = await getDocs(collection(db, collectionName));
      const docs = [];
      snap.forEach((d) => docs.push({ ...d.data(), id: d.id }));
      const result = transform ? transform(docs) : (docs.length > 0 ? docs : fallback);
      setCache(cacheKey, result, ttl);
      return result;
    } catch (err) {
      console.warn(`[Cache] fetchCachedCollection(${cacheKey}) failed:`, err?.message || err);
      return fallback;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, promise);
  return promise;
};
