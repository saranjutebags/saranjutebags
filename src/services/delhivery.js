const API_KEY = import.meta.env.VITE_DELHIVERY_API_KEY || '';
const apiUrl = (path) => `/api/delhivery${path}`;

const authHeader = () => ({
  Authorization: `Token ${API_KEY}`,
});

export const isDelhiveryActive = () => Boolean(API_KEY);

// ─── Waybill ───────────────────────────────────────────────
export const fetchWaybill = async (count = 1, clientName = '') => {
  if (!API_KEY) return null;
  const params = new URLSearchParams({ count: String(count) });
  if (clientName) params.set('cl', clientName);
  const response = await fetch(apiUrl(`/waybill/api/fetch/json/?${params}`), { headers: authHeader() });
  if (!response.ok) throw new Error(`Delhivery waybill error: ${response.status}`);
  return response.json();
};

// ─── Order / Shipment Creation ─────────────────────────────
export const createShipment = async (shipmentPayload) => {
  if (!API_KEY) return null;
  const formBody = `format=json&data=${encodeURIComponent(JSON.stringify(shipmentPayload))}`;
  const response = await fetch(apiUrl('/api/cmu/create.json'), {
    method: 'POST',
    headers: {
      Authorization: `Token ${API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });
  if (!response.ok) throw new Error(`Delhivery shipment error: ${response.status}`);
  return response.json();
};

// ─── Pickup Request ────────────────────────────────────────
export const requestPickup = async (pickupPayload) => {
  if (!API_KEY) return null;
  const response = await fetch(apiUrl('/fm/request/new/'), {
    method: 'POST',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pickupPayload),
  });
  if (!response.ok) throw new Error(`Delhivery pickup error: ${response.status}`);
  return response.json();
};

// ─── Shipping Charge Calculation (returns XML, parse total_amount) ──
export const calculateShippingCharge = async ({ originPin, destPin, weightGrams, isCOD = false }) => {
  if (!API_KEY) return null;
  const params = new URLSearchParams({
    md: 'E',
    cgm: String(Math.max(Math.round(weightGrams), 1000)),
    o_pin: String(originPin),
    d_pin: String(destPin),
    ss: 'Delivered',
    pt: isCOD ? 'COD' : 'Pre-paid',
  });
  const url = apiUrl(`/api/kinko/v1/invoice/charges/?${params}`);
  const response = await fetch(url, { headers: authHeader() });
  if (!response.ok) throw new Error(`Delhivery charge error: ${response.status}`);
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  const item = xml.querySelector('list-item');
  if (!item) throw new Error('Delhivery charge: no list-item in XML response');
  const totalEl = item.querySelector('total_amount');
  const grossEl = item.querySelector('gross_amount');
  return {
    total_amount: totalEl ? parseFloat(totalEl.textContent) : 0,
    gross_amount: grossEl ? parseFloat(grossEl.textContent) : 0,
    _rawXml: text,
  };
};

// ─── Tracking ──────────────────────────────────────────────
export const trackOrder = async (waybill) => {
  if (!API_KEY) return null;
  const response = await fetch(apiUrl(`/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`), { headers: authHeader() });
  if (!response.ok) throw new Error(`Delhivery tracking error: ${response.status}`);
  return response.json();
};

// ─── Pincode Serviceability ────────────────────────────────
export const checkPincodeServiceability = async (pincode) => {
  if (!API_KEY) return null;
  const response = await fetch(apiUrl(`/c/api/pin-codes/json/?filter_codes=${pincode}`), { headers: authHeader() });
  if (!response.ok) throw new Error(`Delhivery pincode error: ${response.status}`);
  return response.json();
};

// ─── Cancel Shipment ───────────────────────────────────────
export const cancelShipment = async (waybill) => {
  if (!API_KEY) return null;
  const response = await fetch(apiUrl('/api/p/edit'), {
    method: 'POST',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ waybill, cancellation: 'true' }),
  });
  if (!response.ok) throw new Error(`Delhivery cancel error: ${response.status}`);
  return response.json();
};
