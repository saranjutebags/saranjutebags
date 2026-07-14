import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Copy, CheckCircle2 } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { useCart } from '../contexts/CartContext';

/**
 * CouponPopup — shows active promotional coupon popups on first page load.
 * Uses sessionStorage to suppress popups the user has already dismissed this session.
 */
const CouponPopup = () => {
  const { popups } = useAdmin();
  const { coupons } = useCart();
  const [visiblePopups, setVisiblePopups] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    const now = Date.now();
    const eligible = (popups || []).filter(p => {
      if (!p.active) return false;
      if (p.startDate && new Date(p.startDate).getTime() > now) return false;
      if (p.endDate && new Date(p.endDate).getTime() < now) return false;
      // Check sessionStorage for dismissed state
      if (p.showOnce && sessionStorage.getItem(`popup-dismissed-${p.id}`) === '1') return false;
      return true;
    });

    // Sort by priority and show after a short delay
    const sorted = eligible.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    const timer = setTimeout(() => {
      setVisiblePopups(sorted);
    }, 1800);

    return () => clearTimeout(timer);
  }, [popups]);

  const handleDismiss = (popupId, showOnce) => {
    if (showOnce) {
      sessionStorage.setItem(`popup-dismissed-${popupId}`, '1');
    }
    setVisiblePopups(prev => prev.filter(p => p.id !== popupId));
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  if (visiblePopups.length === 0) return null;

  // Show only the first/highest priority popup at a time
  const popup = visiblePopups[0];

  return (
    <AnimatePresence>
      <motion.div
        key={popup.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(popup.id, popup.showOnce); }}
      >
        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-emerald-100"
        >
          {/* Close button */}
          {popup.closeButton !== false && (
            <button
              onClick={() => handleDismiss(popup.id, popup.showOnce)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/80 hover:bg-gray-100 text-gray-500 shadow transition-colors"
              aria-label="Close promotion"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Banner image */}
          {popup.image && (
            <div className="relative h-44 bg-gradient-to-br from-emerald-600 to-green-500 overflow-hidden">
              <img src={popup.image} alt={popup.title} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6">
                <span className="text-xs font-semibold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full mb-2">
                  {popup.subtitle || 'Limited Offer'}
                </span>
                <h2 className="text-2xl font-bold drop-shadow">{popup.title}</h2>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {!popup.image && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 mb-3">
                  <Tag className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{popup.title}</h2>
                {popup.subtitle && <p className="text-sm text-gray-500 mt-1">{popup.subtitle}</p>}
              </div>
            )}

            {popup.description && (
              <p className="text-gray-600 text-center text-sm mb-4">{popup.description}</p>
            )}

            {/* Coupon code chip */}
            {popup.couponCode && (
              <button
                onClick={() => handleCopyCode(popup.couponCode)}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-5 py-3 mb-4 hover:bg-emerald-100 transition-colors group"
              >
                <div className="text-left">
                  <p className="text-xs text-gray-500 font-medium">Coupon Code</p>
                  <p className="text-xl font-bold text-emerald-700 tracking-widest">{popup.couponCode}</p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${copiedCode === popup.couponCode ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-700 border border-emerald-200 group-hover:bg-emerald-500 group-hover:text-white'}`}>
                  {copiedCode === popup.couponCode ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Tap to Copy</>
                  )}
                </div>
              </button>
            )}

            {/* CTA */}
            <a
              href={popup.buttonLink || '/products'}
              onClick={() => handleDismiss(popup.id, popup.showOnce)}
              className="btn-primary w-full py-3 text-center font-bold block text-sm"
            >
              {popup.buttonText || 'Shop Now'}
            </a>

            <button
              onClick={() => handleDismiss(popup.id, popup.showOnce)}
              className="w-full text-center text-xs text-gray-400 mt-3 hover:text-gray-600 transition-colors"
            >
              No thanks, skip offer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CouponPopup;
