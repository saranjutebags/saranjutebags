const admin = require('firebase-admin');

// ─────────────────────────────────────────────────────────────────────────────
// Trusted stock updates.
//
// Customers never send a stock NUMBER to Firestore. They only say
// "apply the stock change for my order X" — and this function derives the
// quantity from the order document itself, reads the current stock inside a
// transaction, and writes the result with the Admin SDK (which bypasses
// security rules). The same order can only ever be applied once, in each
// direction, so retries and double-clicks cannot inflate or deflate stock.
//
//   action 'place'  → decrement the ordered quantity (checkout)
//   action 'cancel' → restore it (customer/admin cancellation), only if 'place'
//                     was applied for that order before
// ─────────────────────────────────────────────────────────────────────────────

let app = null;
const getAdmin = () => {
  if (!app) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
    const serviceAccount = JSON.parse(raw);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || undefined,
    });
  }
  return app;
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { idToken, productId, orderId, action } = body || {};
  if (!idToken || !productId || !orderId || !['place', 'cancel'].includes(action)) {
    return res.status(400).json({ error: 'Missing or invalid fields: idToken, productId, orderId, action' });
  }

  try {
    const adminApp = getAdmin();
    const decoded = await adminApp.auth().verifyIdToken(String(idToken));
    const uid = decoded.uid;
    const db = adminApp.firestore();

    const orderRef = db.collection('users').doc(uid).collection('orders').doc(String(orderId));
    const productRef = db.collection('products').doc(String(productId));

    const result = await db.runTransaction(async (tx) => {
      // Read the order INSIDE the transaction so the idempotency flag and the
      // quantity are both race-condition safe.
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        const err = new Error('Order not found');
        err.code = 404;
        throw err;
      }
      const order = orderSnap.data() || {};
      if (order.userId && order.userId !== uid) {
        const err = new Error('Order does not belong to this account');
        err.code = 403;
        throw err;
      }

      const quantity = (order.items || []).reduce((sum, item) => (
        item && String(item.id) === String(productId)
          ? sum + (Number(item.quantity) || 0)
          : sum
      ), 0);
      if (quantity <= 0) {
        const err = new Error('This product is not part of the order');
        err.code = 400;
        throw err;
      }

      const productSnap = await tx.get(productRef);
      if (!productSnap.exists) {
        const err = new Error('Product not found');
        err.code = 404;
        throw err;
      }
      const product = productSnap.data() || {};
      const currentStock = Number(product.stock) || 0;
      const applied = order.stockApplied || null;

      let newStock;
      if (action === 'place') {
        if (applied) {
          const err = new Error(`Stock already applied for this order (${applied})`);
          err.code = 409;
          err.idempotent = true;
          throw err;
        }
        newStock = Math.max(0, currentStock - quantity);
        tx.update(orderRef, { stockApplied: 'place' });
      } else {
        if (applied !== 'place') {
          const err = new Error(applied
            ? `Stock already applied for this order (${applied})`
            : 'Stock was never deducted for this order');
          err.code = 409;
          throw err;
        }
        newStock = currentStock + quantity;
        tx.update(orderRef, { stockApplied: 'cancel' });
      }

      tx.update(productRef, { stock: newStock });

      const logId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      tx.set(db.collection('inventoryHistory').doc(logId), {
        id: logId,
        productId: String(productId),
        productName: product.name || 'Unknown Product',
        type: action === 'place' ? 'Stock Out' : 'Stock In',
        quantity,
        timestamp: new Date().toLocaleString('en-IN'),
        previousStock: currentStock,
        newStock,
        notes: action === 'place'
          ? `Order ${orderId} placed`
          : `Stock restored from cancelled order ${orderId}`,
      });

      // Tell every open storefront to refresh its product list.
      tx.set(db.collection('settings').doc('catalogVersion'), {
        version: Date.now(),
        updatedAt: new Date().toISOString(),
      });

      return { newStock, quantity };
    });

    return res.status(200).json({ success: true, stock: result.newStock, quantity: result.quantity });
  } catch (err) {
    const status = err.code || 500;
    if (status !== 409) console.error('[update-stock] error:', err.message);
    return res.status(status).json({
      success: false,
      error: err.idempotent ? 'Stock already applied' : 'Stock update failed',
      message: err.message,
      idempotent: Boolean(err.idempotent),
    });
  }
};
