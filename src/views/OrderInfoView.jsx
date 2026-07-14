import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, MapPin, ShoppingBag, Truck, X, Download, Eye } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAdmin } from '../contexts/AdminContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const trackingSteps = [
  { key: 'confirmed', label: 'Confirmed', gif: '/confirmed.gif' },
  { key: 'packed', label: 'Packed', gif: '/packed.gif' },
  { key: 'shipped', label: 'Shipped', gif: '/shipped.gif' },
  { key: 'ontheway', label: 'On the way', gif: '/ontheway.gif' },
  { key: 'delivered', label: 'Delivered', gif: '/delivered.gif' },
];

const cancelReasons = [
  'Changed my mind',
  'Ordered by mistake',
  'Found a better price',
  'Delivery taking too long',
  'Other',
];

const canCancelOrder = (order) => (order.status || '').toLowerCase() === 'confirmed';

const getTrackingStageIndex = (order) => {
  const status = (order.status || '').toLowerCase();
  const statusMap = {
    'confirmed': 'confirmed',
    'packed': 'packed',
    'shipped': 'shipped',
    'on the way': 'ontheway',
    'ontheway': 'ontheway',
    'delivered': 'delivered',
  };
  const stage = statusMap[status] || 'confirmed';
  return trackingSteps.findIndex((step) => step.key === stage);
};

const OrderInfoView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, cancelOrder } = useCart();
  const { companySettings } = useAdmin();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(cancelReasons[0]);
  const [otherReason, setOtherReason] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const order = useMemo(() => orders.find((item) => item.id === id), [id, orders]);

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 pb-16 flex items-center justify-center">
        <div className="glass rounded-3xl p-10 border border-emerald-100 text-center max-w-md mx-4">
          <ShoppingBag className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Order not found</h1>
          <p className="text-gray-600 mb-6">That order is not in your current history.</p>
          <button onClick={() => navigate('/orders')} className="btn-primary px-6 py-3">Back to Orders</button>
        </div>
      </div>
    );
  }

  const currentStageIndex = getTrackingStageIndex(order);
  const lockedForCancel = !canCancelOrder(order);
  const heroGif = order.status === 'Cancelled'
    ? '/cancel.gif'
    : trackingSteps[Math.max(currentStageIndex, 0)]?.gif || '/confirmed.gif';
  const orderPricing = order.pricing || {
    subtotal: order.subtotal ?? order.total,
    discountAmount: order.discountAmount ?? 0,
    shipping: order.shippingCharge ?? 0,
    gstRate: order.gstRate ?? 0,
    gstAmount: order.gstAmount ?? 0,
    grandTotal: order.grandTotal ?? order.total,
  };

  const downloadInvoicePdf = async () => {
    const openModal = async () => {
      setShowInvoiceModal(true);
      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));
      return document.getElementById('invoice-content');
    };

    let invoiceElement = document.getElementById('invoice-content');
    if (!invoiceElement) {
      invoiceElement = await openModal();
    }

    if (!invoiceElement) {
      console.error('Invoice element not found');
      return;
    }

    try {
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${companySettings.invoicePrefix || 'INV'}-${order.id}.pdf`);
    } catch (error) {
      console.error('Invoice download error:', error);
    }
  };

  const InvoiceHTML = () => (
    <div id="invoice-content" className="bg-white p-8 max-w-2xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0F766E, #16A34A)', padding: '35px', borderRadius: '14px', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#fff', fontSize: '30px' }}>{companySettings.companyName}</h1>
        <p style={{ marginTop: '8px', color: '#E8FFF4', fontSize: '15px' }}>Premium Eco-Friendly Packaging Solutions</p>
      </div>

      {/* Invoice Details */}
      <div style={{ marginBottom: '30px' }}>
        <p><strong>Invoice No:</strong> {companySettings.invoicePrefix}-{order.id.slice(-6)}</p>
        <p><strong>Invoice Date:</strong> {order.date}</p>
        <p><strong>Order ID:</strong> {order.id}</p>
        <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
      </div>

      {/* Company Details */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#222' }}>Bill To:</h3>
        <p style={{ margin: '5px 0' }}><strong>{order.shippingAddress.name}</strong></p>
        <p style={{ margin: '5px 0' }}>{order.shippingAddress.addressLine1}</p>
        <p style={{ margin: '5px 0' }}>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
        <p style={{ margin: '5px 0' }}>Phone: {order.shippingAddress.phone}</p>
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ececec' }}>Item</th>
            <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ececec' }}>Qty</th>
            <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #ececec' }}>Price</th>
            <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #ececec' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index}>
              <td style={{ padding: '12px', border: '1px solid #ececec' }}>{item.name}</td>
              <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ececec' }}>{item.quantity}</td>
              <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #ececec' }}>₹{item.price}</td>
              <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #ececec' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Subtotal:</span>
          <span>₹{orderPricing.subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Discount:</span>
          <span>-₹{orderPricing.discountAmount.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Shipping:</span>
          <span>{orderPricing.shipping === 0 ? 'Free' : `₹${orderPricing.shipping.toFixed(2)}`}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>{companySettings.taxLabel} ({orderPricing.gstRate}%):</span>
          <span>₹{orderPricing.gstAmount.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #16A34A', fontWeight: 'bold', fontSize: '18px' }}>
          <span>Grand Total:</span>
          <span>₹{orderPricing.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '30px', marginTop: '30px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
        <p style={{ margin: '10px 0' }}>Need help? Contact us at <strong>{companySettings.email}</strong></p>
        <p style={{ margin: '10px 0' }}>GSTIN: {companySettings.gstin}</p>
        <p style={{ margin: '20px 0' }}>© 2026 {companySettings.companyName} - Sustainable Packaging • Quality • Trust</p>
      </div>
    </div>
  );

  const handleConfirmCancel = () => {
    if (lockedForCancel) {
      setCancelOpen(false);
      return;
    }

    const finalReason = cancelReason === 'Other' ? otherReason.trim() : cancelReason;

    if (!finalReason) {
      return;
    }

    cancelOrder(order.id, finalReason);
    setCancelOpen(false);
    setOtherReason('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Orders</span>
        </button>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[2rem] border border-emerald-100 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 sm:px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm text-emerald-50">Order details</p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold break-all">Order {order.id}</h1>
              <p className="text-emerald-50 text-sm mt-1">Placed on {order.date}</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-4 py-3 rounded-2xl font-semibold inline-flex items-center gap-2 bg-white text-emerald-600 shadow-lg hover:bg-emerald-50 transition-colors"
              >
                <Eye className="w-5 h-5" />
                View Invoice
              </button>
              <button
                onClick={downloadInvoicePdf}
                className="px-4 py-3 rounded-2xl font-semibold inline-flex items-center gap-2 bg-white text-emerald-600 shadow-lg hover:bg-emerald-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download Invoice
              </button>
              <button
                onClick={() => setCancelOpen(true)}
                disabled={lockedForCancel || order.status === 'Cancelled'}
                className={`px-4 py-3 rounded-2xl font-semibold inline-flex items-center gap-2 ${lockedForCancel || order.status === 'Cancelled' ? 'bg-white/15 text-white/60 cursor-not-allowed' : 'bg-rose-600 text-white shadow-lg'}`}
              >
                <X className="w-5 h-5" />
                Cancel Order
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 md:p-8 space-y-8">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-start">
              <div className={`rounded-3xl border p-5 sm:p-6 ${order.status === 'Cancelled' ? 'border-rose-200 bg-rose-50' : 'border-emerald-100 bg-emerald-50'}`}>
                <div className="flex flex-col md:flex-row gap-5 md:items-center">
                  <img src={heroGif} alt={order.status} className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 object-contain shrink-0 mx-auto md:mx-0" />
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 text-gray-800 font-semibold mb-3">
                      {order.status}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">{order.status === 'Cancelled' ? 'Order cancelled' : 'Order confirmed'}</h2>
                    <p className="text-gray-600 mb-4">{order.status === 'Cancelled' ? 'This order was cancelled before dispatch.' : 'Your order is active and tracking has started.'}</p>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p><span className="font-semibold">Customer:</span> {order.shippingAddress.name}</p>
                      <p><span className="font-semibold">Phone:</span> {order.shippingAddress.phone}</p>
                      <p className="break-words"><span className="font-semibold">Address:</span> {order.shippingAddress.addressLine1}{order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                      <p><span className="font-semibold">Payment:</span> {order.paymentMethod}</p>
                    </div>
                  </div>
                </div>

                {order.status === 'Cancelled' && (
                  <div className="mt-5 rounded-2xl border border-rose-200 bg-white p-4 text-rose-800 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Cancellation reason</p>
                      <p className="text-sm mt-1">{order.cancelReason || 'Not provided'}{order.cancelledAt ? ` • ${order.cancelledAt}` : ''}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Order summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-gray-600">Subtotal</span><span className="font-semibold text-gray-800">₹{orderPricing.subtotal.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Discount</span><span className="font-semibold text-gray-800">-₹{orderPricing.discountAmount.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Shipping</span><span className="font-semibold text-gray-800">{orderPricing.shipping === 0 ? 'Free' : `₹${orderPricing.shipping.toFixed(2)}`}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">GST ({orderPricing.gstRate}%)</span><span className="font-semibold text-gray-800">₹{orderPricing.gstAmount.toFixed(2)}</span></div>
                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between"><span className="text-base font-bold text-gray-800">Grand Total</span><span className="text-xl font-bold text-gradient">₹{orderPricing.grandTotal.toFixed(2)}</span></div>
                </div>
              </div>
            </div>

            {order.status === 'Cancelled' && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Order cancelled</p>
                  <p className="text-sm mt-1">Reason: {order.cancelReason || 'Not provided'}{order.cancelledAt ? ` • Cancelled on ${order.cancelledAt}` : ''}</p>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-3xl border border-gray-100 bg-white p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-gray-800">Shipping Address</h2>
                </div>
                <p className="font-semibold text-gray-800">{order.shippingAddress.name}</p>
                <p className="text-gray-600 mt-1">{order.shippingAddress.addressLine1}{order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}</p>
                <p className="text-gray-600">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                <p className="text-gray-600">Phone: {order.shippingAddress.phone}</p>
                {order.customOrder && (
                  <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-gray-700">
                    <p className="font-semibold text-gray-800 mb-1">Custom order details</p>
                    <p>Customer: {order.customOrder.customerName}</p>
                    <p>Name on bag: {order.customOrder.nameOnBag}</p>
                    <p>Bag type: {order.customOrder.bagType}</p>
                    <p>Quantity: {order.customOrder.quantity}</p>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-gray-800">Tracking</h2>
                </div>

                {/* Vertical stepper — works on any screen size */}
                <div className="flex flex-col gap-0">
                  {trackingSteps.map((step, index) => {
                    const active = index <= currentStageIndex;
                    const isLast = index === trackingSteps.length - 1;
                    return (
                      <div key={step.key} className="flex items-start gap-4">
                        {/* Icon + connecting line */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${active ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                            <img
                              src={step.gif}
                              alt={step.label}
                              className={`w-6 h-6 object-contain ${active ? 'opacity-100' : 'opacity-30 grayscale'}`}
                            />
                          </div>
                          {!isLast && (
                            <div className={`w-0.5 h-8 mt-1 rounded-full ${index < currentStageIndex ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                          )}
                        </div>

                        {/* Label */}
                        <div className={`pb-6 pt-1.5 ${active ? 'text-emerald-700' : 'text-gray-400'}`}>
                          <p className="text-sm font-semibold leading-tight">{step.label}</p>
                          {index === currentStageIndex && order.status !== 'Cancelled' && (
                            <p className="text-xs text-emerald-500 mt-0.5">Current stage</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-gray-700">
                  Current status: <span className="font-semibold text-gray-900">{order.status}</span>
                </div>
                {lockedForCancel && order.status !== 'Cancelled' && (
                  <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                    Cancellation is locked after packing or shipping.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Items Ordered</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4">
                    <img src={item.images?.[0]} alt={item.name} className="w-20 h-20 object-contain rounded-2xl bg-emerald-50 border border-emerald-100" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity} • ₹{item.price} each</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/orders" className="btn-secondary px-5 py-3 inline-flex items-center gap-2">Back to Orders</Link>
              <Link to="/products" className="btn-primary px-5 py-3 inline-flex items-center gap-2">Continue Shopping</Link>
            </div>
          </div>
        </motion.div>

        {/* Invoice Modal */}
        {showInvoiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Invoice Preview</h2>
                <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-auto max-h-[70vh] border border-gray-200 rounded-2xl p-4">
                <InvoiceHTML />
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => setShowInvoiceModal(false)} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors">
                  Close
                </button>
                <button onClick={downloadInvoicePdf} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

      {cancelOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-rose-100">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Cancel order</h3>
                <p className="text-sm text-gray-600 mt-1">Choose a reason. You can only cancel before packing or shipping.</p>
              </div>
              <button onClick={() => setCancelOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">Cancellation reason</label>
              <select value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white">
                {cancelReasons.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>

              {cancelReason === 'Other' && (
                <textarea
                  value={otherReason}
                  onChange={(event) => setOtherReason(event.target.value)}
                  placeholder="Tell us the reason"
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-white resize-none"
                />
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button onClick={() => setCancelOpen(false)} className="btn-secondary px-5 py-3">Keep Order</button>
              <button onClick={handleConfirmCancel} disabled={lockedForCancel || (cancelReason === 'Other' && !otherReason.trim())} className={`px-5 py-3 rounded-2xl font-semibold ${lockedForCancel || (cancelReason === 'Other' && !otherReason.trim()) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-rose-600 text-white'}`}>
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default OrderInfoView;