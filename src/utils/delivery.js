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
  { country: 'Canada', code: 'CA', ratePerKg: 440, currency: 'CAD', minCharge: 1050, estimatedDays: '7-10' },
  { country: 'UK', code: 'GB', ratePerKg: 390, currency: 'GBP', minCharge: 800, estimatedDays: '7-10' },
  { country: 'UAE', code: 'AE', ratePerKg: 220, currency: 'AED', minCharge: 500, estimatedDays: '5-7' },
  { country: 'Saudi Arabia', code: 'SA', ratePerKg: 250, currency: 'SAR', minCharge: 550, estimatedDays: '5-7' },
  { country: 'Qatar', code: 'QA', ratePerKg: 250, currency: 'QAR', minCharge: 550, estimatedDays: '5-7' },
  { country: 'Kuwait', code: 'KW', ratePerKg: 250, currency: 'KWD', minCharge: 550, estimatedDays: '5-7' },
  { country: 'Oman', code: 'OM', ratePerKg: 250, currency: 'OMR', minCharge: 550, estimatedDays: '5-7' },
  { country: 'Bahrain', code: 'BH', ratePerKg: 250, currency: 'BHD', minCharge: 550, estimatedDays: '5-7' },
  { country: 'Australia', code: 'AU', ratePerKg: 450, currency: 'AUD', minCharge: 1000, estimatedDays: '10-14' },
  { country: 'New Zealand', code: 'NZ', ratePerKg: 470, currency: 'NZD', minCharge: 1100, estimatedDays: '10-14' },
  { country: 'Germany', code: 'DE', ratePerKg: 400, currency: 'EUR', minCharge: 900, estimatedDays: '7-10' },
  { country: 'France', code: 'FR', ratePerKg: 400, currency: 'EUR', minCharge: 900, estimatedDays: '7-10' },
  { country: 'Italy', code: 'IT', ratePerKg: 410, currency: 'EUR', minCharge: 920, estimatedDays: '7-10' },
  { country: 'Spain', code: 'ES', ratePerKg: 410, currency: 'EUR', minCharge: 920, estimatedDays: '7-10' },
  { country: 'Netherlands', code: 'NL', ratePerKg: 400, currency: 'EUR', minCharge: 900, estimatedDays: '7-10' },
  { country: 'Singapore', code: 'SG', ratePerKg: 280, currency: 'SGD', minCharge: 600, estimatedDays: '4-6' },
  { country: 'Malaysia', code: 'MY', ratePerKg: 270, currency: 'MYR', minCharge: 580, estimatedDays: '5-7' },
  { country: 'Japan', code: 'JP', ratePerKg: 380, currency: 'JPY', minCharge: 850, estimatedDays: '6-8' },
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
    IN: 'India', US: 'USA', CA: 'Canada', GB: 'United Kingdom', AE: 'UAE',
    AU: 'Australia', DE: 'Germany', SG: 'Singapore', MY: 'Malaysia',
    SA: 'Saudi Arabia', QA: 'Qatar', KW: 'Kuwait', OM: 'Oman', BH: 'Bahrain',
    FR: 'France', IT: 'Italy', ES: 'Spain', NL: 'Netherlands', CH: 'Switzerland',
    SE: 'Sweden', NO: 'Norway', DK: 'Denmark', IE: 'Ireland', BE: 'Belgium',
    AT: 'Austria', PT: 'Portugal', GR: 'Greece', PL: 'Poland', JP: 'Japan',
    KR: 'South Korea', NZ: 'New Zealand', ZA: 'South Africa', LK: 'Sri Lanka',
    NP: 'Nepal', BD: 'Bangladesh', PK: 'Pakistan', ID: 'Indonesia', PH: 'Philippines',
    TH: 'Thailand', VN: 'Vietnam', BR: 'Brazil', MX: 'Mexico', AR: 'Argentina',
    CL: 'Chile', CO: 'Colombia', PE: 'Peru', EG: 'Egypt', NG: 'Nigeria',
    KE: 'Kenya', MA: 'Morocco', TR: 'Turkey', IL: 'Israel', JO: 'Jordan',
    LB: 'Lebanon', CN: 'China', HK: 'Hong Kong', TW: 'Taiwan', RU: 'Russia',
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
