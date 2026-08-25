import { motion } from 'framer-motion';
import { ShoppingBag, Trash2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const CartView = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal, cartCount } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16 flex items-center justify-center">
        <div className="text-center glass rounded-3xl p-12 border border-emerald-100">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Looks like you haven't added anything to your cart yet</p>
          <Link to="/products" className="btn-primary inline-block">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">Shopping Cart</h1>
          <p className="text-gray-600">{cartCount} items in your cart</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => {
              const hasStyles = item.selectedStyles && item.selectedStyles.length > 0;
              const totalQty = item.totalStyleQuantity || item.quantity;
              const itemTotal = item.price * totalQty;
              
              return (
                <motion.div
                  key={`${item.id}-${item.stylesKey || ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-6 border border-emerald-100"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-40 h-40 bg-gradient-to-br from-emerald-50 to-mint-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 mb-2">{item.name}</h3>
                          <p className="text-gray-600 text-sm mb-4">{item.category}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Styles Display */}
                      {hasStyles && (
                        <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <div className="flex items-center gap-2 mb-3">
                            <ShoppingBag className="w-4 h-4 text-emerald-600" />
                            <span className="font-semibold text-emerald-800">Selected Styles:</span>
                            <span className="text-sm text-emerald-600">({item.selectedStyles.length} style{item.selectedStyles.length !== 1 ? 's' : ''})</span>
                          </div>
                          <div className="space-y-2">
                            {item.selectedStyles.map((style, idx) => (
                              <div key={`${style.name}-${idx}`} className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-100">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <p className="font-medium text-gray-800 text-sm">{style.name}</p>
                                    <p className="text-xs text-gray-500">Qty: {style.quantity} × ₹{style.price}</p>
                                  </div>
                                </div>
                                <span className="font-semibold text-emerald-700">₹{style.total}</span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Custom Design Details */}
                          {item.selectedStyles.some(s => s.isCustomDesign) && (
                            <div className="mt-3 pt-3 border-t border-emerald-200 space-y-2">
                              {item.selectedStyles.filter(s => s.isCustomDesign).map((design, dIdx) => (
                                <div key={`custom-design-${dIdx}`} className="p-3 bg-white rounded-lg border border-emerald-200">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-bold">🎨</span>
                                    <span className="font-semibold text-emerald-800 text-sm">Custom Design Details</span>
                                  </div>
                                  {design.customText && (
                                    <p className="text-xs text-gray-700"><strong>Text:</strong> {design.customText}</p>
                                  )}
                                  {design.customLogo && (
                                    <div className="flex items-center gap-2">
                                      <strong className="text-xs text-gray-700">Logo:</strong>
                                      <img src={design.customLogo} alt="Custom Logo" className="w-10 h-10 object-contain rounded border border-gray-200" />
                                    </div>
                                  )}
                                  {design.customDescription && (
                                    <p className="text-xs text-gray-700"><strong>Details:</strong> {design.customDescription}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="mt-3 pt-3 border-t border-emerald-200 flex justify-between">
                            <span className="font-medium text-gray-700">Total Quantity: {totalQty}</span>
                            <span className="font-bold text-emerald-700">₹{itemTotal}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-700">
                            {hasStyles ? 'Total Qty:' : 'Qty:'}
                          </span>
                          <div className="flex items-center border border-gray-200 rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.id, Math.max(1, totalQty - 1))}
                              className="px-3 py-2 hover:bg-emerald-50 transition-colors"
                            >
                              -
                            </button>
                            <span className="px-4 py-2 font-semibold">{totalQty}</span>
                            <button
                              onClick={() => updateQuantity(item.id, totalQty + 1)}
                              className="px-3 py-2 hover:bg-emerald-50 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-bold text-emerald-600">₹{itemTotal}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            <button
              onClick={clearCart}
              className="text-red-500 hover:text-red-600 font-medium transition-colors"
            >
              Clear Cart
            </button>
          </div>

          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-3xl p-8 border border-emerald-100 sticky top-28"
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Order Summary</h3>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-800">₹{cartTotal}</span>
                </div>
                <div className="border-t border-emerald-100 pt-4 flex items-center justify-between">
                  <span className="text-xl font-bold text-gray-800">Total</span>
                  <span className="text-2xl font-bold text-gradient">₹{cartTotal}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full btn-primary py-4 text-lg font-bold mb-4"
              >
                Proceed to Checkout
              </button>

              <Link
                to="/products"
                className="block w-full btn-secondary text-center py-4"
              >
                Continue Shopping
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartView;
