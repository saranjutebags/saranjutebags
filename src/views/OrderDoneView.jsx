import { motion } from 'framer-motion';
import { Package, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const OrderDoneView = () => {
  const navigate = useNavigate();
  const { latestOrder } = useCart();

  if (!latestOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 pb-16 flex items-center justify-center">
        <div className="glass rounded-3xl p-10 border border-emerald-100 text-center max-w-md mx-4">
          <Package className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-3">No recent order</h1>
          <p className="text-gray-600 mb-6">Place an order first to view the confirmation page.</p>
          <button onClick={() => navigate('/products')} className="btn-primary px-6 py-3 inline-flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Shop Now
          </button>
        </div>
      </div>
    );
  }

  const pricing = latestOrder.pricing || {
    subtotal: latestOrder.subtotal || latestOrder.total,
    discountAmount: latestOrder.discountAmount || 0,
    shipping: latestOrder.shippingCharge || 0,
    gstRate: latestOrder.gstRate || 0,
    gstAmount: latestOrder.gstAmount || 0,
    grandTotal: latestOrder.grandTotal || latestOrder.total,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[2rem] border border-emerald-100 shadow-2xl overflow-hidden"
        >
          <div className="grid lg:grid-cols-2 gap-0">
            <div className="relative min-h-[18rem] lg:min-h-[24rem] bg-gradient-to-br from-emerald-600 via-green-600 to-forest-600 flex items-center justify-center p-6 sm:p-8 order-1 lg:order-none">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_30%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.2),transparent_35%)]" />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7 }}
                className="relative z-10 w-full max-w-md text-center"
              >
                <img src="/confirmed.gif" alt="Order confirmed" className="mx-auto w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain mb-4" />
                <p className="text-white text-base sm:text-lg font-semibold">Order confirmed successfully</p>
                <p className="text-emerald-50 text-xs sm:text-sm mt-2">Tracking has started and your invoice details are below.</p>
              </motion.div>
            </div>

            <div className="p-6 sm:p-8 md:p-10 bg-white/70 order-2 lg:order-none">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 font-semibold mb-5">
                Order Confirmed
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient mb-3">Order Placed</h1>
              <p className="text-gray-600 text-sm sm:text-lg mb-6">Your order {latestOrder.id} has been successfully confirmed.</p>

              <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-5 mb-6 space-y-2">
                <p className="text-sm text-gray-500 mb-1">Order ID</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 break-all">{latestOrder.id}</p>
                <p className="text-sm text-gray-700"><span className="font-semibold">Customer:</span> {latestOrder.shippingAddress.name}</p>
                <p className="text-sm text-gray-700"><span className="font-semibold">Address:</span> {latestOrder.shippingAddress.addressLine1}, {latestOrder.shippingAddress.city}, {latestOrder.shippingAddress.state} - {latestOrder.shippingAddress.pincode}</p>
                <p className="text-sm text-gray-700"><span className="font-semibold">Payment:</span> {latestOrder.paymentMethod}</p>
                <div className="pt-3 border-t border-emerald-100 text-sm text-gray-700 space-y-1">
                  <p><span className="font-semibold">Subtotal:</span> ₹{pricing.subtotal.toFixed(2)}</p>
                  <p><span className="font-semibold">Shipping:</span> {pricing.shipping === 0 ? 'Free' : `₹${pricing.shipping.toFixed(2)}`}</p>
                  <p><span className="font-semibold">GST ({pricing.gstRate}%):</span> ₹{pricing.gstAmount.toFixed(2)}</p>
                  <p className="text-base font-bold text-gray-900 pt-2">Grand Total: ₹{pricing.grandTotal.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={() => navigate('/orders')} className="btn-secondary px-5 py-3 flex items-center gap-2">
                  View Orders
                </button>
                <Link to="/products" className="btn-secondary px-5 py-3 inline-flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderDoneView;