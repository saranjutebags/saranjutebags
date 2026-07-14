import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MessageCircle, Mail, X, HelpCircle, ChevronUp } from 'lucide-react';

const PHONE = '+919866027027';
const WHATSAPP = '+919866027027';
const EMAIL = 'saranjutebags@gmail.com';

const HelpFloatButton = () => {
  const [open, setOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const actions = [
    {
      id: 'call',
      label: 'Call Us',
      icon: Phone,
      href: `tel:${PHONE}`,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: '+91 9866027027',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/${WHATSAPP}?text=Hello%2C%20I%20have%20a%20query%20about%20Saran%20Jute%20Bags`,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Chat on WhatsApp',
    },
    {
      id: 'email',
      label: 'Email Us',
      icon: Mail,
      href: `mailto:${EMAIL}?subject=Query from Saran Jute Bags Website`,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'saranjutebags@gmail.com',
    },
  ];

  return (
    <div className="fixed bottom-6 right-5 z-[999] flex flex-col items-end gap-3">
      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className="w-10 h-10 rounded-full bg-gray-700 text-white shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col gap-2 items-end"
          >
            {actions.map((action, idx) => (
              <motion.a
                key={action.id}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-white shadow-lg font-semibold text-sm ${action.color} transition-all duration-200 hover:scale-105 active:scale-95 group`}
              >
                <span className="hidden sm:block text-xs opacity-90 group-hover:opacity-100">{action.description}</span>
                <span className="sm:hidden text-xs opacity-90">{action.label}</span>
                <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                  <action.icon className="w-4 h-4" />
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Help Center"
        className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl flex items-center justify-center transition-colors"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="help" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <HelpCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default HelpFloatButton;
