import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Package, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductContext';
import { getItemImage } from '../utils/orderImageUtils';

const OrdersView = () => {
  const navigate = useNavigate();
  const { orders } = useCart();
  const { products } = useProducts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient mb-2 mt-2">My Orders</h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-8">Tap any order to open shipping, tracking, cancellation, and invoice details.</p>

        {orders.length === 0 ? (
          <div className="glass rounded-3xl p-12 border border-emerald-100 text-center">
            <Package className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No orders yet</h2>
            <p className="text-gray-600 mb-8">Place an order from checkout to see it here.</p>
            <Link to="/products" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
              <ShoppingBag className="w-5 h-5" />
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`} className="block group">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-4 sm:p-5 border border-emerald-100 hover:border-emerald-300 transition-colors">
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-20 sm:w-28 shrink-0">
                      <div className="rounded-2xl bg-white border border-gray-100 p-2">
                        <img src={getItemImage(order.items[0], products)} alt={order.items[0]?.name} className="w-full h-16 sm:h-20 object-contain" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <p className="text-sm sm:text-lg font-bold text-gray-800 break-all">Order {order.id}</p>
                        <span className={`text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full ${
  order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
  order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
  'bg-orange-100 text-orange-700'
}`}>{order.status}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">{order.items.length} item(s) • {order.paymentMethod}</p>
                      <p className="text-xs sm:text-sm text-gray-500 mb-3 break-all">Placed on {order.date}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {order.items.slice(0, 2).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 rounded-full bg-white border border-gray-100 px-3 py-1.5">
                            <img src={getItemImage(item, products)} alt={item.name} className="w-4 h-4 object-contain rounded-full" />
                            <span className="text-[10px] sm:text-xs font-medium text-gray-700 max-w-[120px] truncate">{item.name}</span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-semibold">
                            +{order.items.length - 2} more
                          </div>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="rounded-xl bg-white border border-gray-100 px-3 py-2">
                          <p className="text-gray-400 text-[10px] sm:text-xs">Subtotal</p>
                          <p className="font-semibold text-gray-800 text-xs sm:text-sm">₹{(order.pricing?.subtotal ?? order.subtotal ?? order.total).toFixed(2)}</p>
                        </div>
                        <div className="rounded-xl bg-white border border-gray-100 px-3 py-2">
                          <p className="text-gray-400 text-[10px] sm:text-xs">Grand Total</p>
                          <p className="font-semibold text-emerald-700 text-xs sm:text-sm">₹{(order.pricing?.grandTotal ?? order.grandTotal ?? order.total).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center text-emerald-700 font-semibold text-xs sm:text-sm gap-1 mt-auto">
                      <span>Open</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersView;
