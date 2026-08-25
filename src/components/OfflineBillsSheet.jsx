import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Printer, Trash2, X, FileText, Table2, AlertTriangle } from 'lucide-react';
import { db, isFirebaseActive } from '../firebase/config';
import { collection, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { useAdmin } from '../contexts/AdminContext';
import { useCart } from '../contexts/CartContext';

const OfflineBillsSheet = ({ showMessage }) => {
  const { companySettings } = useAdmin();
  const { pricingSettings } = useCart();
  const GST_RATE = Number(pricingSettings?.gstRate) || 18;
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewBill, setViewBill] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('serial');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!isFirebaseActive) { setLoading(false); return; }
    const unsub = onSnapshot(collection(db, 'offlineBills'), (snap) => {
      const docs = [];
      snap.forEach(d => docs.push(d.data()));
      setBills(docs);
      setLoading(false);
    }, (err) => {
      console.warn('Offline bills sync unavailable:', err?.message);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Invoice HTML ───────────────────────────────────────────────
  const buildInvoiceHTML = (bill) => {
    const c = bill.customer;
    const co = companySettings;
    const items = bill.items;
    const sub = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const rate = Number(bill.gstRate ?? GST_RATE);
    const gst = Math.round(sub * (rate / 100) * 100) / 100;
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
            <span>GST (${rate}%):</span><span>₹${gst.toFixed(2)}</span>
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

  const downloadBillPdf = async (bill) => {
    try {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      printWindow.document.write(`<html><head><title>${bill.billNumber}</title></head><body id="bill-body">${buildInvoiceHTML(bill)}</body></html>`);
      printWindow.document.close();

      setTimeout(async () => {
        try {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(printWindow.document.body, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, 297));
          pdf.save(`${bill.billNumber}.pdf`);
          printWindow.close();
        } catch (err) {
          console.error('PDF generation failed:', err);
          showMessage('Failed to generate PDF', 'error');
          printWindow.close();
        }
      }, 600);
    } catch (err) {
      console.error('PDF error:', err);
      showMessage('Failed to generate PDF', 'error');
    }
  };

  const deleteBill = async (billId) => {
    try {
      await deleteDoc(doc(db, 'offlineBills', billId));
      showMessage('Bill permanently deleted');
      setDeleteConfirm(null);
      if (viewBill?.id === billId) setViewBill(null);
    } catch (err) {
      console.error('Delete bill error:', err);
      showMessage('Failed to delete bill', 'error');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedBills = [...bills].sort((a, b) => {
    let aVal = a[sortField] ?? '';
    let bVal = b[sortField] ?? '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  }).filter(bill => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      bill.billNumber?.toLowerCase().includes(q) ||
      bill.customer?.name?.toLowerCase().includes(q) ||
      bill.customer?.phone?.includes(q)
    );
  });

  const totalSales = sortedBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);

  const SortHeader = ({ field, children, className = '' }) => (
    <th
      onClick={() => handleSort(field)}
      className={`p-3 cursor-pointer select-none hover:text-emerald-600 border-r border-gray-200 last:border-r-0 whitespace-nowrap ${className}`}
    >
      {children} {sortField === field && (sortAsc ? '▲' : '▼')}
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Table2 className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-lg text-gray-800">Offline Sales Register</h3>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">{bills.length} bills</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bill no / customer / phone..."
            className="p-2.5 border border-gray-300 rounded-lg text-sm w-64"
          />
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold text-emerald-700">₹{totalSales.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Excel-style Sheet */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-gray-400 text-center py-12 text-sm">Loading bills...</p>
        ) : sortedBills.length === 0 ? (
          <p className="text-gray-400 text-center py-12 text-sm">No offline bills found. Create one from the "New Bill" tab.</p>
        ) : (
          <div className="overflow-auto max-h-[65vh]">
            <table className="w-full text-sm border-collapse" style={{ borderSpacing: 0 }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 text-left text-gray-600 border-b-2 border-gray-300">
                  <SortHeader field="serial" className="w-12">#</SortHeader>
                  <SortHeader field="billNumber">Bill No</SortHeader>
                  <SortHeader field="date">Date</SortHeader>
                  <SortHeader field="time">Time</SortHeader>
                  <SortHeader field="customer">Customer</SortHeader>
                  <SortHeader field="phone">Mobile</SortHeader>
                  <th className="p-3 border-r border-gray-200">Items</th>
                  <SortHeader field="subtotal" className="text-right">Subtotal</SortHeader>
                  <SortHeader field="gstAmount" className="text-right">GST {GST_RATE}%</SortHeader>
                  <SortHeader field="grandTotal" className="text-right">Grand Total</SortHeader>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBills.map((bill, idx) => (
                  <tr
                    key={bill.id}
                    className={`border-b hover:bg-emerald-50/50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                  >
                    <td className="p-3 border-r border-gray-100 text-gray-400">{idx + 1}</td>
                    <td className="p-3 border-r border-gray-100">
                      <button onClick={() => setViewBill(bill)} className="font-mono font-semibold text-emerald-700 hover:underline">
                        {bill.billNumber}
                      </button>
                    </td>
                    <td className="p-3 border-r border-gray-100 text-gray-600 whitespace-nowrap">{bill.date}</td>
                    <td className="p-3 border-r border-gray-100 text-gray-500 text-xs whitespace-nowrap">{bill.time}</td>
                    <td className="p-3 border-r border-gray-100">
                      <p className="font-medium text-gray-800">{bill.customer?.name}</p>
                    </td>
                    <td className="p-3 border-r border-gray-100 text-gray-600">{bill.customer?.phone}</td>
                    <td className="p-3 border-r border-gray-100 text-gray-600">
                      {bill.items?.length || 0}
                      <span className="text-xs text-gray-400"> ({(bill.items || []).reduce((s, i) => s + (i.quantity || 0), 0)} qty)</span>
                    </td>
                    <td className="p-3 border-r border-gray-100 text-right text-gray-600">₹{(bill.subtotal || 0).toFixed(2)}</td>
                    <td className="p-3 border-r border-gray-100 text-right text-gray-600">₹{(bill.gstAmount || 0).toFixed(2)}</td>
                    <td className="p-3 border-r border-gray-100 text-right font-bold text-gray-800">₹{(bill.grandTotal || 0).toFixed(2)}</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setViewBill(bill)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View Bill">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => downloadBillPdf(bill)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => printBill(bill)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Print">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(bill)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete Permanently">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-emerald-50 font-bold border-t-2 border-emerald-300 sticky bottom-0">
                  <td colSpan={7} className="p-3 text-right text-emerald-800">TOTAL ({sortedBills.length} bills)</td>
                  <td className="p-3 text-right text-gray-700">₹{sortedBills.reduce((s, b) => s + (b.subtotal || 0), 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-gray-700">₹{sortedBills.reduce((s, b) => s + (b.gstAmount || 0), 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-emerald-700">₹{totalSales.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Bill Modal */}
      <AnimatePresence>
        {viewBill && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold text-lg text-gray-800">Bill {viewBill.billNumber}</h3>
                <button onClick={() => setViewBill(null)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div dangerouslySetInnerHTML={{ __html: buildInvoiceHTML(viewBill) }} />
              </div>
              <div className="flex flex-wrap gap-3 p-4 border-t justify-end">
                <button onClick={() => downloadBillPdf(viewBill)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button onClick={() => printBill(viewBill)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setViewBill(null)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-bold text-lg text-gray-800">Delete {deleteConfirm.billNumber}?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-5">This will permanently remove the bill from the database. This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300">Cancel</button>
                <button onClick={() => deleteBill(deleteConfirm.id)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">Delete Permanently</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OfflineBillsSheet;
