import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';

/**
 * HomeSlideshow — renders an auto-advancing banner carousel using active banners from AdminContext.
 * Falls back to a styled gradient if no banners are available.
 */
const HomeSlideshow = ({ className = '', height = 'h-full' }) => {
  const { banners } = useAdmin();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size to decide which banners to show
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const activeBanners = (banners || []).filter(b => {
    if (!b.active || !b.image) return false;
    // If type is not set, show on all
    if (!b.type) return true;
    // Show Desktop banners on desktop, Mobile banners on mobile
    if (isMobile) {
      return b.type === 'Mobile' || b.type === 'Mobile Banner';
    } else {
      return b.type === 'Desktop' || b.type === 'Desktop Banner';
    }
  });

  const goNext = useCallback(() => {
    if (activeBanners.length < 2) return;
    setDirection(1);
    setCurrentIndex(prev => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const goPrev = () => {
    if (activeBanners.length < 2) return;
    setDirection(-1);
    setCurrentIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const goTo = (index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (activeBanners.length < 2) return;
    const interval = setInterval(goNext, 5000);
    return () => clearInterval(interval);
  }, [goNext, activeBanners.length]);

  // Reset index when banner list changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeBanners.length]);

  if (activeBanners.length === 0) {
    return (
      <div className={`${height} ${className} bg-gradient-to-br from-emerald-600 to-green-500 rounded-3xl overflow-hidden`} />
    );
  }

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  const current = activeBanners[currentIndex];

  return (
    <div className={`${height} ${className} relative overflow-hidden rounded-3xl`}>
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={current.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <img
            src={current.image}
            alt={current.title || 'Banner'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          {current.title && (
            <div className="absolute bottom-5 left-5 right-5">
              <span className="text-white font-bold text-sm drop-shadow-lg bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                {current.title}
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-lg flex items-center justify-center transition-all hover:scale-105 backdrop-blur-sm"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={goNext}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-lg flex items-center justify-center transition-all hover:scale-105 backdrop-blur-sm"
          >
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {activeBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`Go to banner ${idx + 1}`}
              className={`transition-all rounded-full ${idx === currentIndex ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeSlideshow;
