import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, Printer, X, Package, PencilLine, FileText, Search, Table2 } from 'lucide-react';
import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAdmin } from '../contexts/AdminContext';
import { useProducts } from '../contexts/ProductContext';
import { useCart } from '../contexts/CartContext';

const emptyCustomer = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

const BillGenerator = ({ showMessage }) => {
  const { products } = useProducts();
  const { companySettings } = useAdmin();
  const { pricingSettings } = useCart();
  const GST_RATE = Number(pricingSettings?.gstRate) || 18;

  const [customer, setCustomer] = useState(emptyCustomer);
  const [billItems, setBillItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(true);
  const [manualEntry, setManualEntry] = useState({ name: '', price: '' });
  const [nextSerial, setNextSerial] = useState(1);
  const [saving, setSaving] = useState(false);
  const [previewBill, setPreviewBill] = useState(null);

  // Track latest serial for numbering
  useEffect(() => {
    if (!isFirebaseActive) return;
    const unsub = onSnapshot(collection(db, 'offlineBills'), (snap) => {
      let maxSerial = 0;
      snap.forEach(d => {
        const data = d.data();
        maxSerial = Math.max(maxSerial, data.serial || 0);
      });
      setNextSerial(maxSerial + 1);
    }, (err) => console.warn('Bills sync unavailable:', err?.message));
    return () => unsub();
  }, []);

  const generateBillNumber = (serial) => `SJB-OF-${String(serial).padStart(6, '0')}`;

  // ─── Pricing ────────────────────────────────────────────────────
  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const gstAmount = Math.round(subtotal * (GST_RATE / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

  // ─── Item management ────────────────────────────────────────────
  const addWebsiteProduct = (product) => {
    setBillItems(prev => {
      const idx = prev.findIndex(i => i.productId === String(product.id));
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      return [...prev, {
        key: `wp-${product.id}-${Date.now()}`,
        productId: String(product.id),
        name: product.name,
        price: Number(product.price) || 0,
        quantity: 1,
        source: 'Website',
      }];
    });
    setShowProductPicker(false);
    setProductSearch('');
  };

  const addManualProduct = () => {
    if (!manualEntry.name.trim() || !manualEntry.price) {
      showMessage('Enter product name and price', 'error');
      return;
    }
    setBillItems(prev => [...prev, {
      key: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: null,
      name: manualEntry.name.trim(),
      price: Number(manualEntry.price),
      quantity: 1,
      source: 'Manual',
    }]);
    setManualEntry({ name: '', price: '' });
  };

  const updateItem = (key, updates) => {
    setBillItems(prev => prev.map(item => item.key === key ? { ...item, ...updates } : item));
  };

  const updateQuantity = (key, delta) => {
    setBillItems(prev => prev.map(item =>
      item.key === key ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeItem = (key) => setBillItems(prev => prev.filter(item => item.key !== key));
  const resetBill = () => { setBillItems([]); setCustomer(emptyCustomer); };

  const validateBill = () => {
    if (billItems.length === 0) { showMessage('Add at least one item to the bill', 'error'); return false; }
    if (!customer.name.trim()) { showMessage('Customer name is required', 'error'); return false; }
    if (!customer.phone.trim()) { showMessage('Customer mobile number is required', 'error'); return false; }
    return true;
  };

  // ─── Invoice HTML ───────────────────────────────────────────────
  const buildInvoiceHTML = (bill) => {
    const c = bill.customer;
    const co = companySettings;
    const items = bill.items;
    const sub = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const gst = Math.round(sub * (GST_RATE / 100) * 100) / 100;
    const total = Math.round((sub + gst) * 100) / 100;

    return `
      <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; color: #222;">
        <div style="background: linear-gradient(135deg, #0F766E, #16A34A); padding: 25px; border-radius: 12px; margin-bottom: 25px; color: #fff; display: flex; align-items: center; gap: 18px;">
          ${co?.logo ? `<img src="${co.logo}" alt="Logo" style="width: 72px; height: 72px; object-fit: contain; background: #fff; border-radius: 10px; padding: 5px;" />` : ''}
          <div>
            <h1 style="margin: 0; font-size: 26px;">${co?.companyName || 'Saran Jute Bags'}</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #E8FFF4;">${co?.addressLine1 || ''}${co?.cityStatePin ? `, ${co.cityStatePin}` : ''}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #E8FFF4;">Mobile: ${co?.phone || '—'} | Email: ${co?.email || '—'}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #E8FFF4;">Website: www.saranjutebags.in | www.saranjutebags.co.in</p>
            ${co?.gstin ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #E8FFF4;">GSTIN: ${co.gstin}</p>` : ''}
            ${co?.pan ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #E8FFF4;">PAN: ${co.pan}</p>` : ''}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
          <div>
            <h3 style="margin: 0 0 8px 0;">Tax Invoice</h3>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Bill No:</strong> ${bill.billNumber}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Date:</strong> ${bill.date}</p>
            <p style="margin: 3px 0; font-size: 13px;"><strong>Time:</strong> ${bill.time}</p>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0 0 8px 0;">Bill To:</h3>
            <p style="margin: 3px 0; font-size: 13px;"><strong>${c.name}</strong></p>
            <p style="margin: 3px 0; font-size: 13px;">Mobile: ${c.phone}</p>
            ${c.email ? `<p style="margin: 3px 0; font-size: 13px;">Email: ${c.email}</p>` : ''}
            ${c.address ? `<p style="margin: 3px 0; font-size: 13px;">${c.address}${c.city ? `, ${c.city}` : ''}${c.state ? `, ${c.state}` : ''}${c.pincode ? ` - ${c.pincode}` : ''}</p>` : ''}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #f0fdf4;">
              <th style="padding: 10px; text-align: left; border: 1.5px solid #333;">#</th>
              <th style="padding: 10px; text-align: left; border: 1.5px solid #333;">Item</th>
              <th style="padding: 10px; text-align: center; border: 1.5px solid #333;">Qty</th>
              <th style="padding: 10px; text-align: right; border: 1.5px solid #333;">Price</th>
              <th style="padding: 10px; text-align: right; border: 1.5px solid #333;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => `
              <tr>
                <td style="padding: 10px; border: 1.5px solid #333; text-align: center;">${idx + 1}</td>
                <td style="padding: 10px; border: 1.5px solid #333;">${item.name}</td>
                <td style="padding: 10px; border: 1.5px solid #333; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border: 1.5px solid #333; text-align: right;">₹${Number(item.price).toFixed(2)}</td>
                <td style="padding: 10px; border: 1.5px solid #333; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-left: auto; width: 280px; margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
            <span>Subtotal:</span><span>₹${sub.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
            <span>GST (${GST_RATE}%):</span><span>₹${gst.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 18px; font-weight: bold; border-top: 2px solid #16A34A; margin-top: 6px;">
            <span>Grand Total:</span><span>₹${total.toFixed(2)}</span>
          </div>
        </div>

        <div style="margin-top: 50px; display: flex; justify-content: flex-start;">
          <div style="text-align: center;">
            <div style="width: 220px; border-top: 1px solid #333; margin-bottom: 6px;"></div>
            <p style="margin: 0; font-size: 13px; font-weight: bold; color: #222;">Authorized Signatory</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">For ${co?.companyName || 'Saran Jute Bags'}</p>
          </div>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 25px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 5px 0;">Thank you for your business!</p>
          <p style="margin: 5px 0;">This is computer generated bill.</p>
        </div>
      </div>
    `;
  };

  // ─── Print ──────────────────────────────────────────────────────
  const printBill = (bill) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <html>
        <head>
          <title>${bill.billNumber}</title>
          <style>
            body { margin: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            table, th, td { border-color: #333 !important; }
          </style>
        </head>
        <body>${buildInvoiceHTML(bill)}
        <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ─── Save bill ──────────────────────────────────────────────────
  const saveBill = async (andPrint = false) => {
    if (!validateBill()) return;
    if (!isFirebaseActive) { showMessage('Firebase not connected — cannot save bill', 'error'); return; }

    setSaving(true);
    try {
      const serial = nextSerial;
      const billNumber = generateBillNumber(serial);
      const now = new Date();
      const bill = {
        id: billNumber,
        billNumber,
        serial,
        customer: { ...customer },
        items: billItems,
        subtotal,
        gstRate: GST_RATE,
        gstAmount,
        grandTotal,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        createdAt: now.toISOString(),
        createdBy: 'admin',
      };
      await setDoc(doc(db, 'offlineBills', billNumber), bill);
      showMessage(`Bill ${billNumber} saved successfully`);
      if (andPrint) {
        printBill(bill);
      }
      // Bill stays on screen — admin can print again or clear manually
    } catch (err) {
      console.error('Save bill error:', err);
      showMessage(`Failed to save bill: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = productSearch.trim()
    ? products.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Customer Details */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <PencilLine className="w-5 h-5 text-emerald-600" /> Customer Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Customer Name *" className="p-3 border border-gray-300 rounded-lg text-sm" />
          <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Mobile Number *" className="p-3 border border-gray-300 rounded-lg text-sm" />
          <input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Email (optional)" className="p-3 border border-gray-300 rounded-lg text-sm" />
          <input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="Address" className="p-3 border border-gray-300 rounded-lg text-sm" />
          <input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} placeholder="City" className="p-3 border border-gray-300 rounded-lg text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} placeholder="State" className="p-3 border border-gray-300 rounded-lg text-sm" />
            <input value={customer.pincode} onChange={(e) => setCustomer({ ...customer, pincode: e.target.value })} placeholder="Pincode" className="p-3 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* Add Items */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" /> Add Items
        </h3>

        <div className="flex flex-wrap gap-3 mb-4">
          <button onClick={() => setShowProductPicker(!showProductPicker)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            <Search className="w-4 h-4" /> Pick Website Product
          </button>
        </div>

        {showProductPicker && (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm" />
              <span className="text-xs text-gray-500 ml-3 shrink-0">{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1">
              {filteredProducts.map(p => (
                <button key={p.id} onClick={() => addWebsiteProduct(p)} className="w-full flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-100 hover:border-emerald-400 text-left">
                  <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                  <span className="text-sm font-bold text-emerald-600 ml-2 shrink-0">₹{p.price}</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-3">
                  {products.length === 0 ? 'No products available on the site yet' : 'No products match your search'}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input value={manualEntry.name} onChange={(e) => setManualEntry({ ...manualEntry, name: e.target.value })} placeholder="Manual product name" className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm" />
          <input type="number" min="0" value={manualEntry.price} onChange={(e) => setManualEntry({ ...manualEntry, price: e.target.value })} placeholder="Price ₹" className="sm:w-28 p-2.5 border border-gray-300 rounded-lg text-sm" />
          <button onClick={addManualProduct} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-1 shrink-0">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Bill Items */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Bill Items ({billItems.length})</h3>
        {billItems.length === 0 ? (
          <p className="text-gray-400 text-center py-6 text-sm">No items yet. Add website products or manual entries.</p>
        ) : (
          <div className="space-y-2">
            {billItems.map((item, idx) => (
              <div key={item.key} className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                <input value={item.name} onChange={(e) => updateItem(item.key, { name: e.target.value })} className="flex-1 min-w-[140px] p-2 border border-gray-200 rounded-lg text-sm" placeholder="Product name" />
                {item.productId ? (
                  <span className="text-sm font-semibold text-gray-700 w-16 text-right">₹{item.price}</span>
                ) : (
                  <input type="number" min="0" value={item.price} onChange={(e) => updateItem(item.key, { price: Number(e.target.value) || 0 })} className="w-16 p-2 border border-gray-200 rounded-lg text-sm" />
                )}
                <div className="flex items-center border border-gray-200 rounded-lg bg-white shrink-0">
                  <button onClick={() => updateQuantity(item.key, -1)} className="px-2.5 py-1.5 hover:bg-emerald-50">−</button>
                  <span className="px-3 py-1.5 font-semibold text-sm min-w-[2.5rem] text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.key, 1)} className="px-2.5 py-1.5 hover:bg-emerald-50">+</button>
                </div>
                <span className="font-bold text-emerald-700 w-20 text-right text-sm">₹{(item.price * item.quantity).toFixed(2)}</span>
                <button onClick={() => removeItem(item.key)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary + Actions */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Bill Summary</h3>
          <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded">{generateBillNumber(nextSerial)}</span>
        </div>

        <div className="space-y-2 text-sm max-w-xs ml-auto">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span className="font-medium">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>GST ({GST_RATE}%)</span><span className="font-medium">₹{gstAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-800 border-t border-gray-200 pt-3 mt-2">
            <span>Grand Total</span><span className="text-emerald-600">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => saveBill(true)} disabled={saving || billItems.length === 0} className="flex-1 min-w-[180px] flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save & Print'}
          </button>
          {billItems.length > 0 && (
            <button onClick={() => setPreviewBill({ billNumber: generateBillNumber(nextSerial), customer, items: billItems, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() })} className="flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
              <Printer className="w-5 h-5" /> Print Only
            </button>
          )}
          {billItems.length > 0 && (
            <button onClick={resetBill} className="px-5 py-3 text-red-500 hover:text-red-600 text-sm font-medium">
              Clear Bill
            </button>
          )}
        </div>
        {billItems.length > 0 && (
          <p className="text-xs text-gray-400 mt-3 text-right">Bill stays after saving — you can print again or clear manually.</p>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewBill && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold text-lg text-gray-800">Bill Preview — {previewBill.billNumber}</h3>
                <button onClick={() => setPreviewBill(null)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div dangerouslySetInnerHTML={{ __html: buildInvoiceHTML(previewBill) }} />
              </div>
              <div className="flex gap-3 p-4 border-t justify-end">
                <button onClick={() => printBill(previewBill)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setPreviewBill(null)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BillGenerator;
