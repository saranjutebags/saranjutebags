import { AnimatePresence, motion } from 'framer-motion';

const UiPopup = ({ open, title, message, icon, children, primaryAction, secondaryAction }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className="glass w-full max-w-md rounded-3xl border border-emerald-100 p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              {icon ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl">
                  {icon}
                </div>
              ) : null}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{title}</h3>
                {message ? <p className="text-gray-600 mb-4 leading-relaxed">{message}</p> : null}
                {children}
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {secondaryAction}
              {primaryAction}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UiPopup;