/**
 * Convert a product name into a URL-friendly slug.
 * e.g. "Premium Jute Bag" → "premium-jute-bag"
 */
export const slugify = (str = '') =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
