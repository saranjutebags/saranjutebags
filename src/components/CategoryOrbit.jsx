import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Package, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Orbit geometry ──────────────────────────────────────────────────────────
// Radii are a share of the ring box, so the orbit scales with the section
// instead of being tied to one screen width.
const RADIUS_X = 0.35;
const RADIUS_Y = 0.30;
// The slot that faces the shopper: the chip sitting here (bottom of the ring)
// is the highlighted one.
const FRONT_DEG = 180;

// Horizontal reach of the ring, clamped so chips (and their name pills) never
// hang off the edge of narrow phone screens.
const reachX = (width) => Math.max(40, Math.min(RADIUS_X * width, width / 2 - 70));

const pointFor = (index, total, rotation, width, height) => {
  const angle = ((index * (360 / total)) + rotation) * (Math.PI / 180);
  // depth 1 = closest to the shopper (front of the ring), -1 = far side.
  const depth = -Math.cos(angle);
  const toward = (depth + 1) / 2;
  return {
    x: Math.sin(angle) * reachX(width),
    y: -Math.cos(angle) * RADIUS_Y * height,
    scale: 0.72 + 0.24 * toward,
    opacity: 0.55 + 0.45 * toward,
    zIndex: 10 + Math.round(depth * 10),
  };
};

const CategoryOrbit = ({ categories = [] }) => {
  const navigate = useNavigate();
  const ringRef = useRef(null);
  const lastTouched = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const total = categories.length;
  const step = total > 0 ? 360 / total : 0;

  // Which category currently sits in the front slot.
  const focusIndex = total > 0
    ? ((Math.round((FRONT_DEG - rotation) / step) % total) + total) % total
    : 0;
  const focused = categories[focusIndex];

  // The ring is measured, not guessed, so the orbit line and the chips always
  // share the same ellipse at any screen width.
  useLayoutEffect(() => {
    const el = ringRef.current;
    if (!el) return undefined;
    const measure = () => setSize({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const apply = () => setReduceMotion(media.matches);
    apply();
    media.addEventListener?.('change', apply);
    return () => media.removeEventListener?.('change', apply);
  }, []);

  // Slow auto-orbit; it stands still while hovered, while the shopper reads a
  // focused chip, and for a few seconds after any manual turn.
  useEffect(() => {
    if (total < 2 || reduceMotion) return undefined;
    const timer = setInterval(() => {
      if (hovered) return;
      if (Date.now() - lastTouched.current < 7000) return;
      setRotation((value) => value + step);
    }, 3200);
    return () => clearInterval(timer);
  }, [step, total, hovered, reduceMotion]);

  const openCategory = (category) => {
    navigate(`/products?category=${encodeURIComponent(category.name)}`);
  };

  const turnTo = (index) => {
    lastTouched.current = Date.now();
    // Rotate the short way round to the requested chip.
    const raw = FRONT_DEG - index * step;
    setRotation(raw + Math.round((rotation - raw) / 360) * 360);
  };

  const nudge = (direction) => {
    lastTouched.current = Date.now();
    setRotation((value) => value + direction * step);
  };

  const handleChip = (index) => {
    if (index === focusIndex) {
      openCategory(categories[index]);
      return;
    }
    turnTo(index);
  };

  const spring = { type: 'spring', stiffness: 110, damping: 18 };

  if (total === 0) return null;

  // One or two categories do not make an orbit; they read better as plain cards.
  if (total < 3) {
    return (
      <div className="grid gap-8 sm:grid-cols-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => openCategory(cat)}
            className="glass rounded-3xl overflow-hidden shadow-xl border border-emerald-100 text-left"
          >
            <div className="h-48 bg-gradient-to-br from-emerald-50 to-mint-50 flex items-center justify-center p-6">
              {cat.image
                ? <img src={cat.image} alt={cat.name} className="h-full w-full object-contain" />
                : <Package className="w-12 h-12 text-emerald-500" />}
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800">{cat.name}</h3>
              <p className="text-emerald-600 text-sm font-semibold mt-2">Shop Now</p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={ringRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative w-full h-[260px] sm:h-[320px] lg:h-[360px] mx-auto"
      >
        {/* The orbit line itself */}
        {size.width > 0 && (
          <svg
            className="absolute inset-0 w-full h-full orbit-trail"
            viewBox={`0 0 ${size.width} ${size.height}`}
            aria-hidden="true"
          >
            <ellipse
              cx={size.width / 2}
              cy={size.height / 2}
              rx={reachX(size.width)}
              ry={RADIUS_Y * size.height}
              fill="none"
              stroke="rgba(27, 77, 62, 0.18)"
              strokeWidth="1.5"
            />
            <ellipse
              cx={size.width / 2}
              cy={size.height / 2}
              rx={reachX(size.width)}
              ry={RADIUS_Y * size.height}
              fill="none"
              stroke="rgba(62, 122, 99, 0.55)"
              strokeWidth="2"
              strokeDasharray="4 14"
              strokeLinecap="round"
            />
          </svg>
        )}

        {categories.map((cat, index) => {
          if (!size.width) return null;
          const point = pointFor(index, total, rotation, size.width, size.height);
          const isFocus = index === focusIndex;
          return (
            <motion.div
              key={cat.id}
              className="absolute left-1/2 top-1/2"
              style={{ zIndex: point.zIndex }}
              initial={false}
              animate={{ x: point.x, y: point.y }}
              transition={spring}
            >
              <div className="-translate-x-1/2 -translate-y-1/2">
                <motion.button
                  type="button"
                  onClick={() => handleChip(index)}
                  aria-label={`${isFocus ? 'Shop' : 'Bring to front'} ${cat.name}`}
                  className="flex flex-col items-center gap-2 focus:outline-none"
                  initial={false}
                  animate={{
                    scale: point.scale * (isFocus ? 1.12 : 1),
                    opacity: isFocus ? 1 : point.opacity,
                  }}
                  transition={spring}
                  whileTap={{ scale: point.scale * (isFocus ? 1.05 : 1.08) }}
                >
                  <span className={`relative block rounded-full p-1.5 shadow-xl transition-colors ${
                    isFocus
                      ? 'bg-gradient-to-br from-[#1B4D3E] to-[#3E7A63]'
                      : 'bg-white/80 ring-1 ring-emerald-100'
                  }`}>
                    <span className="block w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden bg-gradient-to-br from-emerald-50 to-mint-50 flex items-center justify-center">
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-9 h-9 text-emerald-500" />
                      )}
                    </span>
                  </span>
                  <span className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-colors ${
                    isFocus ? 'bg-[#1B4D3E] text-white shadow-md' : 'bg-white text-gray-600 border border-emerald-100'
                  }`}>
                    {cat.name}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          );
        })}

        {/* Manual turning, for people who want a specific category next */}
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Previous category"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white shadow-md border border-emerald-100 text-[#1B4D3E] hover:bg-emerald-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Next category"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white shadow-md border border-emerald-100 text-[#1B4D3E] hover:bg-emerald-50 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* What the front (bottom) chip will open, and how to open it */}
      {focused && (
        <div className="text-center mt-12 sm:mt-14">
          <p className="text-sm text-gray-500">
            <ShoppingBag className="w-4 h-4 inline-block mr-1 text-emerald-600" />
            Tap <span className="font-semibold text-gray-700">{focused.name}</span> to shop it
          </p>
          <button
            type="button"
            onClick={() => openCategory(focused)}
            className="mt-4 btn-primary btn-auto px-8 py-2.5 text-sm font-semibold tracking-wide inline-flex items-center gap-2"
          >
            Shop {focused.name} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryOrbit;
