import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// Universal "chunked write" layer for Firestore.
//
// Firestore allows at most 1MB (1,048,576 bytes) per document. Any document —
// a product with base64 images, an order with an uploaded logo, a banner with
// an uploaded picture — can exceed that limit and the write fails with
// Firestore's technical error. That must never happen again:
//
//   • Before writing, oversized string fields are split out of the main doc
//     into small "chunk" documents stored in a `chunks` subcollection under
//     the same document (products/{id}/chunks/*, orders/{id}/chunks/*, …).
//   • The main doc keeps a small placeholder ('') in each chunked field and a
//     `__chunked: true` marker.
//   • On read, `hydrateDoc` fetches the chunks and rebuilds the original
//     value, so everything displays normally.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_DOC_CHARS = 800000;   // main doc stays well below the 1MB ceiling
const CHUNK_PART_CHARS = 180000; // each chunk part is far below the 1MB limit
const MIN_CHUNKABLE_CHARS = 1000; // base64 payloads bigger than this get chunked

const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:');

const splitIntoParts = (value) => {
  const parts = [];
  for (let i = 0; i < value.length; i += CHUNK_PART_CHARS) {
    parts.push(value.slice(i, i + CHUNK_PART_CHARS));
  }
  return parts;
};

const sizeOfDoc = (obj) => JSON.stringify(obj).length;

// Walk a document tree. Oversized base64 strings are pulled into `chunks`
// (keyed by their dot-path like "items.0.customLogo" or "images.1") and
// replaced with '' in the main doc. Array positions never change, so the
// same paths can be walked again to rebuild the document.
const extractChunks = (root, chunks, minLength, path = '') => {
  if (Array.isArray(root)) {
    root.forEach((item, idx) => extractChunks(item, chunks, minLength, `${path}[${idx}]`));
    return;
  }
  if (!root || typeof root !== 'object') return;
  for (const key of Object.keys(root)) {
    const value = root[key];
    if (typeof value === 'string') {
      if (isDataUrl(value) && value.length > minLength) {
        const chunkKey = path ? `${path}.${key}` : key;
        chunks[chunkKey] = splitIntoParts(value);
        root[key] = '';
      }
    } else {
      extractChunks(value, chunks, minLength, path ? `${path}.${key}` : key);
    }
  }
};

// Strip base64 leftovers from images/selectedImage fields when the document
// type must not carry inline base64 (e.g. orders). Products keep their
// base64 images inline (small ones) or chunked (big ones).
const sanitizeDoc = (obj, keepDataUrls) => {
  if (Array.isArray(obj)) return obj.map(o => sanitizeDoc(o, keepDataUrls));
  if (obj === null || typeof obj !== 'object') return obj;
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (!keepDataUrls) {
      if (key === 'images' && Array.isArray(value)) {
        cleaned.images = value.map(img => (typeof img === 'string' && img.startsWith('data:') ? '' : img));
        continue;
      }
      if (key === 'selectedImage' && typeof value === 'string' && value.startsWith('data:')) {
        cleaned.selectedImage = '';
        continue;
      }
    }
    cleaned[key] = sanitizeDoc(value, keepDataUrls);
  }
  return cleaned;
};

/**
 * Turn a raw document into a Firestore-writeable plan.
 * Returns { doc, chunks } — `doc` always fits under the 1MB limit,
 * `chunks` maps field paths to arrays of string parts to store separately.
 * Pure computation (no network), so callers can run it BEFORE payment or
 * any other irreversible step to surface problems early.
 */
export const prepareDocForWrite = (rawDoc, { keepDataUrls = false } = {}) => {
  const doc = JSON.parse(JSON.stringify(rawDoc || {}));
  const chunks = {};

  // Pass 1: move big base64 payloads (images, logos) into chunks.
  extractChunks(doc, chunks, MIN_CHUNKABLE_CHARS);
  // Sanitize whatever remains (orders drop leftover base64 image fields).
  const clean = sanitizeDoc(doc, keepDataUrls);

  // Pass 2 (safety): if the doc is still too big, chunk any large string.
  if (sizeOfDoc(clean) > MAX_DOC_CHARS) {
    extractChunks(clean, chunks, 500);
  }

  if (Object.keys(chunks).length > 0 || rawDoc?.__chunked) {
    clean.__chunked = true;
  }
  return { doc: clean, chunks };
};

/**
 * Write a document, chunking any oversized fields into
 * `{docRef}/chunks/*` subcollection documents first, then the main doc.
 * A reader can therefore never observe a main doc missing its chunk data.
 */
export const setDocSafe = async (docRef, data, opts = {}) => {
  const { doc: prepared, chunks } = prepareDocForWrite(data, opts);

  const chunkWrites = [];
  for (const [fieldKey, parts] of Object.entries(chunks)) {
    const safeField = String(fieldKey).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 50);
    for (let part = 0; part < parts.length; part++) {
      const chunkId = `${safeField}-p${part}`;
      chunkWrites.push(
        setDoc(doc(collection(docRef, 'chunks'), chunkId), {
          field: fieldKey,
          part,
          total: parts.length,
          data: parts[part],
        })
      );
    }
  }

  if (chunkWrites.length > 0) {
    await Promise.all(chunkWrites);
  }
  await setDoc(docRef, prepared);
  return prepared;
};

/**
 * Rebuild a chunked document. Returns the hydrated copy, or null when the
 * document has no chunks (or hydration failed), so callers can fall back
 * to the raw data.
 */
export const hydrateDoc = async (docRef, data) => {
  if (!data || !data.__chunked || !isFirebaseActive) return null;
  try {
    const snap = await getDocs(collection(docRef, 'chunks'));
    if (snap.empty) return null;

    const partsByField = {};
    snap.forEach(d => {
      const c = d.data();
      if (!c || typeof c.field !== 'string') return;
      if (!partsByField[c.field]) partsByField[c.field] = [];
      partsByField[c.field][Number(c.part)] = c.data;
    });

    const rebuilt = {};
    for (const [field, parts] of Object.entries(partsByField)) {
      rebuilt[field] = parts.filter(p => typeof p === 'string').join('');
    }

    const hydrated = JSON.parse(JSON.stringify(data));
    const apply = (node, path) => {
      if (Array.isArray(node)) {
        node.forEach((item, i) => apply(item, `${path}[${i}]`));
        return;
      }
      if (!node || typeof node !== 'object') return;
      for (const key of Object.keys(node)) {
        const value = node[key];
        const nextPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string' && value === '' && rebuilt[nextPath] !== undefined) {
          node[key] = rebuilt[nextPath];
        } else {
          apply(value, nextPath);
        }
      }
    };
    apply(hydrated, '');
    return hydrated;
  } catch (err) {
    console.warn('Chunk hydration failed:', err);
    return null;
  }
};

/** Delete a document together with any chunk subdocuments it owns. */
export const deleteDocSafe = async (docRef) => {
  try {
    const snap = await getDocs(collection(docRef, 'chunks'));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => undefined)));
  } catch (err) {
    console.warn('Failed to clean up document chunks:', err);
  }
  await deleteProductImagesSafe(docRef);
  await deleteDoc(docRef);
};

/** Delete only the `chunks` subcollection docs, keeping the parent doc. */
export const deleteChunkSubdocs = async (docRef) => {
  try {
    const snap = await getDocs(collection(docRef, 'chunks'));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => undefined)));
  } catch (err) {
    console.warn('Failed to delete chunk subdocs:', err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Full-resolution product images (light-document store).
//
// Product documents keep only small thumbnail data URLs inline so the product
// LIST downloads fast. The full-resolution originals live in per-product chunk
// documents under `products/{id}/images/*` and are only fetched when a single
// product is opened. This keeps page loads fast while preserving full image
// quality, entirely inside Firestore (no Storage bucket needed).
// ─────────────────────────────────────────────────────────────────────────────

/** Write full-resolution product images into `products/{id}/images/*` chunks. */
export const saveProductImages = async (productId, images) => {
  const imgColl = collection(doc(db, 'products', String(productId)), 'images');
  // Replace whatever image chunks existed before this save.
  try {
    const existing = await getDocs(imgColl);
    await Promise.all(existing.docs.map(d => deleteDoc(d.ref).catch(() => undefined)));
  } catch (err) {
    console.warn('Failed to clean old product image chunks:', err);
  }

  const list = (images || []).filter(i => typeof i === 'string' && i.startsWith('data:'));
  const writes = [];
  list.forEach((img, idx) => {
    const parts = splitIntoParts(img);
    parts.forEach((part, p) => {
      writes.push(setDoc(doc(imgColl, `img-${idx}-p${p}`), {
        index: idx,
        part: p,
        total: parts.length,
        data: part,
      }));
    });
  });
  await Promise.all(writes);
  return list.length;
};

/** Rebuild the full-resolution image array for one product. */
export const loadProductImages = async (productId) => {
  try {
    const snap = await getDocs(collection(doc(db, 'products', String(productId)), 'images'));
    const byIndex = {};
    snap.forEach(d => {
      const c = d.data();
      if (!c || typeof c.data !== 'string') return;
      const idx = Number(c.index) || 0;
      if (!byIndex[idx]) byIndex[idx] = [];
      byIndex[idx][Number(c.part)] = c.data;
    });
    return Object.keys(byIndex)
      .sort((a, b) => Number(a) - Number(b))
      .map(k => byIndex[k].filter(p => typeof p === 'string').join(''));
  } catch (err) {
    console.warn('Failed to load product image chunks:', err);
    return null;
  }
};

/** Delete the `products/{id}/images/*` chunk subcollection (also used on doc delete). */
export const deleteProductImagesSafe = async (docRef) => {
  try {
    const snap = await getDocs(collection(docRef, 'images'));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => undefined)));
  } catch (err) {
    console.warn('Failed to clean up product image chunks:', err);
  }
};

/**
 * Rebuild a chunked order. Orders are stored twice (the customer's own copy
 * under users/{uid}/orders and the admin mirror under orders), so try the
 * customer's copy first, then the admin mirror.
 */
export const hydrateOrder = async (order, uid) => {
  if (!order || !order.__chunked || !isFirebaseActive) return order;
  const sources = [];
  if (uid) sources.push(doc(db, 'users', uid, 'orders', String(order.id)));
  sources.push(doc(db, 'orders', String(order.id)));
  for (const ref of sources) {
    const hydrated = await hydrateDoc(ref, order);
    if (hydrated) return hydrated;
  }
  return order;
};

/**
 * Translate a raw Firestore error into a message a user can understand.
 * Firestore's default technical text must never be shown to customers.
 */
export const friendlyFirestoreError = (err, context = 'save') => {
  const code = err?.code || '';
  const known = {
    'permission-denied': 'You do not have permission to perform this action. Please sign in again and try.',
    unauthenticated: 'Your session has expired. Please sign in again and try.',
    unavailable: 'The service is temporarily unavailable. Please check your internet connection and try again.',
    'deadline-exceeded': 'The request took too long. Please check your connection and try again.',
    internal: 'Something went wrong on our side. Please try again in a moment.',
    'resource-exhausted': 'Too many requests. Please wait a moment and try again.',
    'failed-precondition': 'This action cannot be completed right now. Please try again.',
    'not-found': 'The record could not be found. Please refresh and try again.',
  };
  if (known[code]) return known[code];
  return context === 'order'
    ? 'We could not save your order. Please check your connection and try again.'
    : 'Something went wrong. Please try again.';
};
