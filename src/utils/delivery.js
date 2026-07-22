const WAREHOUSE_DEFAULTS = {
  lat: 17.433333,
  lng: 78.383333,
  address: 'Mehdipatnam, Hyderabad, Telangana 500028',
  pincode: '500028', // Mehdipatnam, Hyderabad — set this in Admin Dashboard to your actual warehouse pin
  active: true,
};

const SHIPPING_DEFAULTS = {
  domesticBaseCharge: 40,
  domesticPerKm: 8,
  freeDeliveryAbove: 5000,
};

const DEFAULT_INTERNATIONAL_RATES = [
  { country: 'USA', code: 'US', ratePerKg: 420, currency: 'USD', minCharge: 1000, estimatedDays: '7-10' },
  { country: 'UK', code: 'GB', ratePerKg: 390, currency: 'GBP', minCharge: 800, estimatedDays: '7-10' },
  { country: 'UAE', code: 'AE', ratePerKg: 220, currency: 'AED', minCharge: 500, estimatedDays: '5-7' },
  { country: 'Australia', code: 'AU', ratePerKg: 450, currency: 'AUD', minCharge: 1000, estimatedDays: '10-14' },
  { country: 'Germany', code: 'DE', ratePerKg: 400, currency: 'EUR', minCharge: 900, estimatedDays: '7-10' },
];

const toRad = (deg) => (deg * Math.PI) / 180;

export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const isInternational = (countryCode) => {
  return countryCode && countryCode !== 'IN';
};

export const getCountryName = (countryCode) => {
  const map = {
    US: 'USA', GB: 'UK', AE: 'UAE', AU: 'Australia', DE: 'Germany',
    IN: 'India', CA: 'Canada', SG: 'Singapore', MY: 'Malaysia',
    LK: 'Sri Lanka', NP: 'Nepal', BD: 'Bangladesh', PK: 'Pakistan',
    BH: 'Bahrain', QA: 'Qatar', SA: 'Saudi Arabia', KW: 'Kuwait',
    OM: 'Oman', FR: 'France', IT: 'Italy', ES: 'Spain', NL: 'Netherlands',
    CH: 'Switzerland', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
    JP: 'Japan', KR: 'South Korea', CN: 'China', NZ: 'New Zealand',
    ZA: 'South Africa', BR: 'Brazil', RU: 'Russia',
  };
  return map[countryCode] || countryCode;
};

export const getDefaultWarehouse = () => ({ ...WAREHOUSE_DEFAULTS });

export const getDefaultShippingRates = () => ({ ...SHIPPING_DEFAULTS });

export const getDefaultInternationalRates = () => DEFAULT_INTERNATIONAL_RATES.map(r => ({ ...r }));

export const calcDomesticShipping = (distanceKm, subtotal, baseCharge, perKm, freeAbove) => {
  if (subtotal >= freeAbove) return 0;
  const charge = Math.round((baseCharge + perKm * Math.max(0, distanceKm)) * 100) / 100;
  return Math.max(charge, baseCharge);
};

export const calcInternationalShipping = (totalWeightKg, ratePerKg, minCharge) => {
  const charge = Math.round(totalWeightKg * ratePerKg * 100) / 100;
  return Math.max(charge, minCharge);
};

export const calcTotalWeight = (cartItems) => {
  const DEFAULT_WEIGHT_PER_PIECE_KG = 0.3; // 300g default if no weight assigned
  return cartItems.reduce((sum, item) => sum + ((item.weightPerPiece || DEFAULT_WEIGHT_PER_PIECE_KG) * item.quantity), 0);
};

export const getEstimatedDelivery = (distanceKm, countryCode) => {
  if (countryCode && countryCode !== 'IN') {
    const rate = DEFAULT_INTERNATIONAL_RATES.find(r => r.code === countryCode);
    return rate ? rate.estimatedDays : '7-14 business days';
  }
  if (distanceKm <= 50) return '1-2 business days';
  if (distanceKm <= 200) return '2-3 business days';
  if (distanceKm <= 500) return '3-5 business days';
  if (distanceKm <= 1500) return '5-7 business days';
  return '7-10 business days';
};

export const getCodAvailability = (countryCode) => {
  if (countryCode && countryCode !== 'IN') return false;
  return true;
};
