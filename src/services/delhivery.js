const API_KEY = import.meta.env.VITE_DELHIVERY_API_KEY || '';
// Route all requests through our serverless proxy to avoid CORS issues.
// The proxy (api/delhivery.js) forwards requests to track.delhivery.com server-side.
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
  const response = await fetch(apiUrl(`/waybill/fetch/json/?${params}`), { headers: authHeader() });
  if (!response.ok) throw new Error(`Delhivery waybill error: ${response.status}`);
  const data = await response.json();
  if (typeof data === 'string' || typeof data === 'number') return { waybills: [String(data)] };
  return data;
};

// ─── Order / Shipment Creation ─────────────────────────────
export const createShipment = async (shipmentPayload) => {
  if (!API_KEY) return null;
  const formBody = `format=json&data=${encodeURIComponent(JSON.stringify(shipmentPayload))}`;
  console.log('[Delhivery] Sending shipment payload:', JSON.stringify(shipmentPayload));
  const response = await fetch(apiUrl('/cmu/create.json'), {
    method: 'POST',
    headers: {
      Authorization: `Token ${API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });
  const result = await response.json();
  console.log('[Delhivery] Shipment response:', result);
  if (!response.ok) throw new Error(`Delhivery shipment error: ${response.status}`);
  const packages = result?.packages || result?.data?.packages || [];
  if (result?.success === false || result?.errors?.length > 0) {
    throw new Error(`Delhivery shipment failed: ${(result.errors || []).join(', ') || JSON.stringify(result)}`);
  }
  if (!packages.length && !result?.waybill) {
    console.warn('[Delhivery] Shipment response has no packages:', result);
  }
  return result;
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

// ─── Shipping Charge Calculation ──────────────────────────────────────────────
// The endpoint returns a JSON array: [{ total_amount, gross_amount, ... }]
export const calculateShippingCharge = async ({ originPin, destPin, weightGrams, isCOD = false }) => {
  if (!API_KEY) return null;
  const cleanOrigin = String(originPin || '').trim();
  const cleanDest = String(destPin || '').trim();
  if (!/^\d{6}$/.test(cleanOrigin) || !/^\d{6}$/.test(cleanDest)) {
    console.warn('[Delhivery] Skipping domestic charge calculation for non-Indian 6-digit pincode:', { originPin, destPin });
    return null;
  }
  const params = new URLSearchParams({
    md: 'E',
    cgm: String(Math.round(weightGrams)),
    o_pin: String(originPin),
    d_pin: String(destPin),
    ss: 'Delivered',
    pt: isCOD ? 'COD' : 'Pre-paid',
  });
  // Note: /api/kinko/v1/invoice/charges/.json is the current endpoint path.
  // The old /kinko/v1/invoice/charges/ path (without /api/ prefix and .json suffix) is deprecated.
  const url = apiUrl(`/api/kinko/v1/invoice/charges/.json?${params}`);
  const response = await fetch(url, { headers: authHeader() });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`[Delhivery] Charge HTTP ${response.status}:`, body.slice(0, 500));
    throw new Error(`Delhivery charge error: ${response.status}`);
  }
  const text = await response.text();
  console.log('[Delhivery] Charge raw response:', text.slice(0, 1000));

  // Try JSON first (current API format: an array of charge objects)
  try {
    const json = JSON.parse(text);
    const item = Array.isArray(json) ? json[0] : json;
    if (!item || item.total_amount == null) {
      throw new Error('Delhivery charge: no charge data in JSON response');
    }
    return {
      total_amount: parseFloat(item.total_amount) || 0,
      gross_amount: parseFloat(item.gross_amount) || 0,
      _raw: item,
    };
  } catch (jsonErr) {
    // Fall back to XML parsing for legacy responses
    console.warn('[Delhivery] JSON parse failed, trying XML:', jsonErr.message);
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const xmlItem = xml.querySelector('list-item');
    if (!xmlItem) {
      const errMsg = xml.querySelector('error, Error, Message, message')?.textContent || 'no charge data in response';
      console.error('[Delhivery] Charge parse error:', text.slice(0, 2000));
      throw new Error(`Delhivery charge: ${errMsg}`);
    }
    const totalEl = xmlItem.querySelector('total_amount');
    const grossEl = xmlItem.querySelector('gross_amount');
    return {
      total_amount: totalEl ? parseFloat(totalEl.textContent) : 0,
      gross_amount: grossEl ? parseFloat(grossEl.textContent) : 0,
      _rawXml: text,
    };
  }
};


// ─── Tracking ──────────────────────────────────────────────
export const trackOrder = async (waybill) => {
  if (!API_KEY) return null;
  const response = await fetch(apiUrl(`/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`), { headers: authHeader() });
  if (!response.ok) throw new Error(`Delhivery tracking error: ${response.status}`);
  return response.json();
};

// ─── Pincode Serviceability ────────────────────────────────
export const checkPincodeServiceability = async (pincode) => {
  if (!API_KEY) return null;
  const response = await fetch(apiUrl(`/c/pin-codes/json/?filter_codes=${pincode}`), { headers: authHeader() });
  if (!response.ok) throw new Error(`Delhivery pincode error: ${response.status}`);
  return response.json();
};

// ─── Warehouse Registration ───────────────────────────────
export const registerWarehouse = async (warehouseData) => {
  if (!API_KEY) return null;
  const response = await fetch(apiUrl('/backend/clientwarehouse/create/'), {
    method: 'POST',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(warehouseData),
  });
  const text = await response.text();
  console.log('[Delhivery] Warehouse registration raw response:', text.slice(0, 500));
  let result, xmlError;
  try {
    result = JSON.parse(text);
  } catch {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const msgEl = xml.querySelector('root > data > message, data > message, message');
    xmlError = msgEl?.textContent || xml.querySelector('error')?.textContent || null;
    const successEl = xml.querySelector('success');
    if (successEl && successEl.textContent === 'false') {
      throw new Error(xmlError || 'Warehouse registration failed');
    }
    if (!response.ok) throw new Error(xmlError || `Delhivery warehouse registration error: ${response.status}`);
    result = { success: successEl?.textContent === 'true', _xml: true };
  }
  if (!response.ok) throw new Error(result?.error || xmlError || `Delhivery warehouse registration error: ${response.status}`);
  if (result?.success === false) throw new Error(result?.errors?.[0] || xmlError || 'Warehouse registration failed');
  return result;
};

// ─── Cancel Shipment ───────────────────────────────────────
export const cancelShipment = async (waybill) => {
  if (!API_KEY) return null;
  const response = await fetch(apiUrl('/p/edit'), {
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
