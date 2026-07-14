import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    const timer = setTimeout(() => {
      onComplete && onComplete();
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  const leafVariants = {
    initial: { y: -50, opacity: 0, rotate: -10 },
    animate: {
      y: 0,
      opacity: 1,
      rotate: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <img src="/splash_landscape.png" alt="Saran Jute Bags splash background" className="hidden h-full w-full object-cover md:block" />
        <img src="/splash_potrait.png" alt="Saran Jute Bags splash background" className="h-full w-full object-cover md:hidden" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-green-950/55 to-slate-950/85" />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.35, 0.6, 0.35],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.25, 0.5, 0.25],
          }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-lime-300/20 blur-3xl"
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <motion.div initial="initial" animate="animate" className="w-full max-w-4xl text-center text-white">
          <motion.div variants={leafVariants} className="mb-8 flex justify-center">
            <div className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-white/30 bg-white/12 shadow-2xl backdrop-blur-md">
              <img src="/logo.webp" alt="Saran Jute Bags logo" className="h-16 w-16 object-contain" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="mb-3 text-4xl font-black tracking-tight md:text-6xl"
          >
            Saran Jute Bags
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="mx-auto mb-8 max-w-2xl text-lg text-emerald-50 md:text-2xl"
          >
            Premium Sustainable Bags for a Better Tomorrow
          </motion.p>

          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '100%', opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.8 }}
            className="mx-auto h-2 w-full max-w-xl overflow-hidden rounded-full bg-white/25"
          >
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-emerald-300 via-green-400 to-lime-300"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05 }}
            className="mt-3 text-sm font-medium tracking-[0.24em] text-emerald-100 uppercase"
          >
            Loading... {progress}%
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default SplashScreen;
