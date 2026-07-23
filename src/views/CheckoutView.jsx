import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, CreditCard, Home, Plus, Tag, Truck, Wallet, X, Upload, MessageCircle, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../contexts/ProductContext';
import { useAdmin } from '../contexts/AdminContext';
import UiPopup from '../components/UiPopup';
import {
  isInternational, getCountryName,
  calcInternationalShipping, calcTotalWeight,
  getCodAvailability
} from '../utils/delivery';
import { isDelhiveryActive, calculateShippingCharge } from '../services/delhivery';

const emptyAddress = {
  name: '',
  phone: '',
  countryCode: '+91',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  landmark: '',
  isDefault: false,
};

const emptyCustomOrder = {
  customerName: '',
  nameOnBag: '',
  bagType: 'Jute Bag',
  quantity: 1,
  description: '',
  customImage: '',
};

/* ───────────────── Coupon helpers ───────────────── */
const parseCouponDiscount = (discountStr = '') => {
  if (!discountStr) return { type: 'none', value: 0 };
  const flat = discountStr.match(/Flat\s*₹?\s*(\d+(?:\.\d+)?)\s*OFF/i);
  if (flat) return { type: 'flat', value: Number(flat[1]) };
  const pct = discountStr.match(/(\d+(?:\.\d+)?)\s*%\s*OFF/i);
  if (pct) return { type: 'percent', value: Number(pct[1]) };
  return { type: 'none', value: 0 };
};

const computeDiscount = (subtotal, discountInfo) => {
  if (discountInfo.type === 'flat') return Math.min(discountInfo.value, subtotal);
  if (discountInfo.type === 'percent') return Math.round((subtotal * discountInfo.value) / 100 * 100) / 100;
  return 0;
};
/* ──────────────────────────────────────────────── */

const countries = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'United States / Canada (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+974', label: 'Qatar (+974)' },
  { code: '+965', label: 'Kuwait (+965)' },
  { code: '+968', label: 'Oman (+968)' },
  { code: '+973', label: 'Bahrain (+973)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+41', label: 'Switzerland (+41)' },
  { code: '+46', label: 'Sweden (+46)' },
  { code: '+47', label: 'Norway (+47)' },
  { code: '+45', label: 'Denmark (+45)' },
  { code: '+353', label: 'Ireland (+353)' },
  { code: '+32', label: 'Belgium (+32)' },
  { code: '+43', label: 'Austria (+43)' },
  { code: '+351', label: 'Portugal (+351)' },
  { code: '+30', label: 'Greece (+30)' },
  { code: '+48', label: 'Poland (+48)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+64', label: 'New Zealand (+64)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+94', label: 'Sri Lanka (+94)' },
  { code: '+977', label: 'Nepal (+977)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+62', label: 'Indonesia (+62)' },
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+66', label: 'Thailand (+66)' },
  { code: '+84', label: 'Vietnam (+84)' },
  { code: '+55', label: 'Brazil (+55)' },
  { code: '+52', label: 'Mexico (+52)' },
  { code: '+54', label: 'Argentina (+54)' },
  { code: '+56', label: 'Chile (+56)' },
  { code: '+57', label: 'Colombia (+57)' },
  { code: '+51', label: 'Peru (+51)' },
  { code: '+20', label: 'Egypt (+20)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+212', label: 'Morocco (+212)' },
  { code: '+90', label: 'Turkey (+90)' },
  { code: '+972', label: 'Israel (+972)' },
  { code: '+962', label: 'Jordan (+962)' },
  { code: '+961', label: 'Lebanon (+961)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+852', label: 'Hong Kong (+852)' },
  { code: '+886', label: 'Taiwan (+886)' },
  { code: '+7', label: 'Russia / Kazakhstan (+7)' },
];

const phoneToCountryCode = {
  '+91': 'IN', '+1': 'US', '+44': 'GB', '+971': 'AE', '+61': 'AU',
  '+49': 'DE', '+65': 'SG', '+60': 'MY', '+966': 'SA', '+974': 'QA',
  '+965': 'KW', '+968': 'OM', '+973': 'BH', '+33': 'FR', '+39': 'IT',
  '+34': 'ES', '+31': 'NL', '+41': 'CH', '+46': 'SE', '+47': 'NO',
  '+45': 'DK', '+353': 'IE', '+32': 'BE', '+43': 'AT', '+351': 'PT',
  '+30': 'GR', '+48': 'PL', '+81': 'JP', '+82': 'KR', '+64': 'NZ',
  '+27': 'ZA', '+94': 'LK', '+977': 'NP', '+880': 'BD', '+92': 'PK',
  '+62': 'ID', '+63': 'PH', '+66': 'TH', '+84': 'VN', '+55': 'BR',
  '+52': 'MX', '+54': 'AR', '+56': 'CL', '+57': 'CO', '+51': 'PE',
  '+20': 'EG', '+234': 'NG', '+254': 'KE', '+212': 'MA', '+90': 'TR',
  '+972': 'IL', '+962': 'JO', '+961': 'LB', '+86': 'CN', '+852': 'HK',
  '+886': 'TW', '+7': 'RU',
};

const detectCountryCode = (phone = '') => {
  for (const c of countries) {
    if (phone.startsWith(c.code)) return { code: c.code, local: phone.slice(c.code.length) };
  }
  return { code: '+91', local: phone };
};

/* ──────────────────────────────────────────────── */

const getCountryCodeFromAddress = (address) => {
  if (!address) return 'IN';
  if (address.countryCode && phoneToCountryCode[address.countryCode]) {
    return phoneToCountryCode[address.countryCode];
  }
  const prefix = countries.find(c => address.phone?.startsWith(c.code));
  return prefix ? (phoneToCountryCode[prefix.code] || 'IN') : 'IN';
};

const CheckoutView = () => {
  const { cart, cartTotal, addresses, getDefaultAddress, addAddress, updateAddress, addOrder, setLatestOrderItem, clearCart, setDefaultAddress, calculateOrderPricing, pricingSettings, coupons, warehouse, domesticShipping, internationalRates, updateOrder } = useCart();
  const { user, userData } = useAuth();
  const { products, updateProductStock } = useProducts();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(user);
  const canOrder = Boolean(user) && userData?.role !== 'admin';
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [selectedAddressId, setSelectedAddressId] = useState(() => getDefaultAddress()?.id || '');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(() => ({
    ...emptyAddress,
    name: userData?.displayName || '',
  }));
  const [customOrderEnabled, setCustomOrderEnabled] = useState(false);
  const [customOrder, setCustomOrder] = useState(emptyCustomOrder);
  const [popup, setPopup] = useState(null);
  const [delhiveryCharge, setDelhiveryCharge] = useState(null);
  const [delhiveryLoading, setDelhiveryLoading] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const selectedAddress = useMemo(
    () => addresses.find(address => address.id === selectedAddressId) || getDefaultAddress(),
    [addresses, getDefaultAddress, selectedAddressId],
  );

  // Calculate pricing with coupon discount
  const couponDiscountInfo = useMemo(() => {
    if (!appliedCoupon) return { type: 'none', value: 0 };
    return parseCouponDiscount(appliedCoupon.discount);
  }, [appliedCoupon]);

  const couponDiscountAmount = useMemo(() =>
    computeDiscount(cartTotal, couponDiscountInfo),
    [cartTotal, couponDiscountInfo],
  );

  // Fetch real-time shipping charge from Delhivery when pincode or cart changes (Domestic India only)
  useEffect(() => {
    console.log('[Delhivery] Checkout useEffect triggered');
    if (!isDelhiveryActive()) {
      console.log('[Delhivery] Not active - no API key configured, using fallback shipping');
      setDelhiveryCharge(null);
      return;
    }
    if (!warehouse?.pincode) {
      console.log('[Delhivery] Warehouse has no pincode, using fallback shipping');
      setDelhiveryCharge(null);
      return;
    }

    // Check if destination address is international
    const countryCode = getCountryCodeFromAddress(selectedAddress);
    const isIntlAddress = isInternational(countryCode);

    if (isIntlAddress) {
      console.log(`[Delhivery] International destination (${countryCode}) — skipping domestic Delhivery API, using international rate table`);
      setDelhiveryCharge(null);
      return;
    }

    const destPin = selectedAddress?.pincode?.trim();
    if (!destPin || !/^\d{6}$/.test(destPin)) {
      console.log('[Delhivery] Destination pincode is not a valid 6-digit Indian PIN code, using fallback shipping');
      setDelhiveryCharge(null);
      return;
    }

    const weightGrams = Math.round(calcTotalWeight(cart) * 1000);
    console.log(`[Delhivery] Cart calculated weight=${weightGrams}g`);

    let cancelled = false;
    setDelhiveryLoading(true);
    console.log(`[Delhivery] Calling calculateShippingCharge with origin=${warehouse.pincode}, dest=${destPin}, weight=${weightGrams}g`);

    calculateShippingCharge({ originPin: warehouse.pincode, destPin, weightGrams })
      .then((result) => {
        if (cancelled) return;
        console.log('[Delhivery] API response:', result);
        const charge = result?.total_amount;
        if (charge != null && charge > 0) {
          console.log(`[Delhivery] Got shipping charge: ₹${charge}`);
          setDelhiveryCharge(Number(charge));
        } else {
          console.log('[Delhivery] No valid charge in response, using fallback shipping');
          setDelhiveryCharge(null);
        }
        setDelhiveryLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[Delhivery] API call failed:', err);
        console.log('[Delhivery] Using fallback shipping due to API failure');
        setDelhiveryCharge(null);
        setDelhiveryLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedAddress, cart, warehouse?.pincode]);

  const shippingDetails = useMemo(() => {
    let countryCode = 'IN';
    let shippingCharge = 0;
    let estDelivery = '';
    let codAvailable = true;
    let totalWeight = 0;

    if (selectedAddress) {
      countryCode = getCountryCodeFromAddress(selectedAddress);
      const isIntl = isInternational(countryCode);

      totalWeight = calcTotalWeight(cart || []);

      if (isIntl) {
        const rate = (internationalRates || []).find(r => r.code === countryCode);
        if (rate) {
          shippingCharge = calcInternationalShipping(totalWeight, rate.ratePerKg, rate.minCharge);
        } else {
          shippingCharge = pricingSettings?.shippingCharge || 0;
        }
        codAvailable = false;
      } else {
        shippingCharge = delhiveryCharge != null ? delhiveryCharge : (pricingSettings?.shippingCharge || 0);
        codAvailable = getCodAvailability(countryCode);
      }
      estDelivery = '3-7 business days';
    } else {
      shippingCharge = pricingSettings?.shippingCharge || 0;
    }
    return { shippingCharge, estDelivery, codAvailable, countryCode, totalWeight };
  }, [selectedAddress, cart, cartTotal, internationalRates, delhiveryCharge, pricingSettings?.shippingCharge]);

  const { testProductSettings } = useAdmin();

  const cartList = cart || [];
  const testItem = useMemo(() => cartList.find(item => item.isTestProduct || item.id === 'test-demo-product'), [cartList]);
  const hasTestProduct = Boolean(testItem);

  const isCustom = (customOrderEnabled && customOrder.quantity > 0) || cartList.some(item => item.customText || item.customLogo || item.category === 'Customized' || item.subCategory === 'Custom');
  const customOrderFee = isCustom ? 100 : 0;

  const calculatedPricing = useMemo(() => {
    if (hasTestProduct && testItem) {
      const subtotal = Number(testItem.price || 1.00) * Number(testItem.quantity || 1);
      const shipping = Number(testItem.deliveryFee !== undefined ? testItem.deliveryFee : (testProductSettings?.deliveryFee ?? 0));
      const gst = Number(testItem.gstAmount !== undefined ? testItem.gstAmount : (testProductSettings?.gstAmount ?? 0)) * Number(testItem.quantity || 1);
      const total = Math.round((subtotal - couponDiscountAmount + shipping + gst + customOrderFee) * 100) / 100;
      return { subtotal, shipping, gst, total, isTest: true };
    } else {
      const shipping = shippingDetails.shippingCharge;
      const taxable = Math.max((cartTotal || 0) - couponDiscountAmount, 0);
      const gstRate = pricingSettings?.gstRate || 0;
      const gst = Math.round(taxable * (gstRate / 100) * 100) / 100;
      const total = Math.round((taxable + shipping + gst + customOrderFee) * 100) / 100;
      return { subtotal: cartTotal || 0, shipping, gst, total, isTest: false };
    }
  }, [hasTestProduct, testItem, testProductSettings, cartTotal, couponDiscountAmount, shippingDetails.shippingCharge, pricingSettings?.gstRate, customOrderFee]);

  const shipping = calculatedPricing.shipping;
  const gst = calculatedPricing.gst;
  const total = calculatedPricing.total;
  const subtotal = calculatedPricing.subtotal;
  const pricing = {
    subtotal,
    discountAmount: couponDiscountAmount,
    shipping,
    gstRate: hasTestProduct ? 0 : (pricingSettings?.gstRate || 0),
    gstAmount: gst,
    customOrderFee,
    grandTotal: total,
  };

  const CUSTOM_ADVANCE = 100;
  const advance = paymentMethod === 'cod' ? (isCustom ? CUSTOM_ADVANCE : 0) : total;
  const balance = Math.max(total - advance, 0);

  const handleInternationalWhatsAppOrder = () => {
    const custName = selectedAddress?.name || userData?.displayName || 'Valued Customer';
    const custPhone = selectedAddress?.phone || userData?.phone || 'Not provided';
    const countryName = getCountryName(shippingDetails.countryCode);
    const addrStr = selectedAddress
      ? `${selectedAddress.addressLine1}${selectedAddress.addressLine2 ? ', ' + selectedAddress.addressLine2 : ''}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}`
      : 'Not specified';

    const cartItemsFormatted = cart.map((item, idx) => {
      let line = `${idx + 1}. *${item.name}*\n   • Qty: ${item.quantity} | ₹${(item.price * item.quantity).toFixed(2)}`;
      if (item.customText) line += `\n   • Custom Print: "${item.customText}"`;
      return line;
    }).join('\n');

    let customDetailsStr = '';
    if (customOrderEnabled && customOrder.quantity > 0) {
      customDetailsStr = `\n\n*✨ Custom Bag Order Details:*\n` +
        `• Bag Type: ${customOrder.bagType}\n` +
        `• Name on Bag: ${customOrder.nameOnBag || 'N/A'}\n` +
        `• Quantity: ${customOrder.quantity}\n` +
        `• Instructions: ${customOrder.description || 'N/A'}`;
    }

    const messageText =
      `🌐 *INTERNATIONAL ORDER INQUIRY - SARAN JUTE BAGS*\n` +
      `───────────────────────────────\n` +
      `👤 *CUSTOMER DETAILS:*\n` +
      `• Name: ${custName}\n` +
      `• Mobile: ${custPhone}\n` +
      `• Country: ${countryName}\n` +
      `• Delivery Address: ${addrStr}\n\n` +
      `📦 *CART PRODUCTS (${cart.length}):*\n${cartItemsFormatted}` +
      `${customDetailsStr}\n\n` +
      `💰 *ORDER SUMMARY:*\n` +
      `• Total Weight: ${shippingDetails.totalWeight.toFixed(2)} kg\n` +
      `• Cart Subtotal: ₹${cartTotal.toFixed(2)}\n` +
      `───────────────────────────────\n` +
      `Hello! I want to place an international order to ${countryName}. Please assist with international shipping rates and payment options. Thank you!`;

    const waUrl = `https://api.whatsapp.com/send?phone=919866027027&text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
  };

  // Popup notification when an international address is selected
  useEffect(() => {
    if (selectedAddress && shippingDetails.countryCode !== 'IN') {
      const countryName = getCountryName(shippingDetails.countryCode);
      setPopup({
        title: `🌐 International Order (${countryName})`,
        message: `For orders shipping outside India (${countryName}), standard online checkout and payment gateway are disabled. Please click "Order via WhatsApp" to send your pre-filled cart & address details directly to our team on WhatsApp for custom international shipping quotes.`,
        primaryLabel: 'Order via WhatsApp 💬',
        onPrimary: () => handleInternationalWhatsAppOrder(),
        secondaryLabel: 'Got it',
        onSecondary: () => setPopup(null),
      });
    }
  }, [selectedAddress?.id, shippingDetails.countryCode]);

  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK. Check your internet connection.'));
      document.head.appendChild(script);
    });
  };

  const handleRazorpayPayment = async (order) => {
    await loadRazorpayScript();
    if (!window.Razorpay) {
      return { paid: false, error: 'Razorpay SDK not loaded' };
    }

    const amountPaise = Math.round(advance * 100);
    const createRes = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: order.id,
      }),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to initiate payment order');
    }

    const { order_id, amount: orderAmount } = await createRes.json();

    return new Promise((resolve) => {
      let settled = false;
      const safeResolve = (value) => { if (!settled) { settled = true; resolve(value); } };
      const digits = (order.shippingAddress?.phone || '').replace(/\D/g, '');
      const phone = digits.length > 10 ? digits.slice(-10) : digits;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderAmount,
        currency: 'INR',
        name: 'Saran Jute Bags',
        description: `Order ${order.id}`,
        order_id: order_id,
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyResult = await verifyRes.json();
            if (verifyResult.success) {
              order.paidAmount = advance;
              order.paymentStatus = 'Paid';
              order.paymentDetails = {
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                status: 'Paid',
                gateway: 'Razorpay',
                paidAmount: advance,
                pendingAmount: isCustom ? Math.max(total - advance, 0) : 0,
              };
              safeResolve({ paid: true });
            } else {
              safeResolve({ paid: false, error: 'Payment verification failed: signature mismatch' });
            }
          } catch {
            safeResolve({ paid: false, error: 'Payment verification failed' });
          }
        },
        prefill: {
          name: order.shippingAddress?.name || '',
          email: order.shippingAddress?.email || '',
          contact: phone,
        },
        theme: { color: '#059669' },
        modal: {
          ondismiss: () => safeResolve({ paid: false, cancelled: true }),
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        console.warn('Razorpay payment failed:', response.error?.description || 'Unknown error');
        safeResolve({ paid: false, error: response.error?.description || 'Payment failed' });
      });
      rzp.open();
    });
  };

  const handleApplyCoupon = () => {
    setCouponError('');
    setCouponSuccess('');
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    const found = coupons.find(c => c.code?.toUpperCase() === code && c.active);
    if (!found) {
      setCouponError('Invalid or expired coupon code. Please check and try again.');
      return;
    }
    setAppliedCoupon(found);
    const discInfo = parseCouponDiscount(found.discount);
    const discAmt = computeDiscount(cartTotal, discInfo);
    setCouponSuccess(`🎉 Coupon "${found.code}" applied! You save ₹${discAmt.toFixed(2)}`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
    setCouponSuccess('');
  };

  const handleAddressSubmit = (event) => {
    event.preventDefault();
    const { countryCode, ...rest } = addressForm;
    const cleanPhone = rest.phone.replace(/\D/g, '');
    const address = { ...rest, phone: `${countryCode}${cleanPhone}` };
    if (editingAddressId) {
      updateAddress(editingAddressId, address);
    } else {
      addAddress(address);
    }
    setAddressForm({ ...emptyAddress, name: userData?.displayName || '' });
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  const handlePlaceOrder = async () => {
    if (delhiveryLoading && !hasTestProduct) {
      setPopup({
        title: 'Calculating delivery fee...',
        message: 'Please wait, calculating delivery charge for your delivery location before placing the order.',
        primaryLabel: 'OK',
        onPrimary: () => setPopup(null),
      });
      return;
    }

    if (!isLoggedIn) {
      setPopup({
        title: 'Login required',
        message: 'Please sign in with your customer account before placing an order.',
        primaryLabel: 'Go to Login',
        onPrimary: () => navigate('/auth'),
      });
      return;
    }

    if (!canOrder) {
      setPopup({
        title: 'Admin account detected',
        message: 'Admin login can manage coupons and products, but cannot place customer orders.',
        primaryLabel: 'Open Dashboard',
        onPrimary: () => navigate('/dashboard'),
      });
      return;
    }

    if (!selectedAddress) {
      setPopup({
        title: 'Address needed',
        message: 'Please select or add a delivery address before placing the order.',
        primaryLabel: 'Add Address',
        onPrimary: () => setShowAddressForm(true),
      });
      return;
    }

    if (shippingDetails.countryCode !== 'IN') {
      handleInternationalWhatsAppOrder();
      return;
    }

    // Stock validation
    for (const item of cart) {
      const product = products.find(p => String(p.id) === String(item.id));
      if (product && product.stock !== undefined) {
        if (product.stock <= 0) {
          setPopup({
            title: 'Out of Stock',
            message: `${item.name} is out of stock and cannot be ordered.`,
            primaryLabel: 'OK',
            onPrimary: () => setPopup(null),
          });
          return;
        }
        if (item.quantity > product.stock) {
          setPopup({
            title: 'Insufficient Stock',
            message: `Only ${product.stock} unit(s) of "${item.name}" are in stock. You requested ${item.quantity}. Please reduce the quantity.`,
            primaryLabel: 'Fix Cart',
            onPrimary: () => setPopup(null),
          });
          return;
        }
      }
    }

    const firstItem = cart[0];
    const rawSku = firstItem?.sku || firstItem?.name || 'GEN';
    const sku = rawSku.replace(/[^A-Za-z0-9-]/g, '').substring(0, 12).toUpperCase();
    const year = new Date().getFullYear();
    const counterKey = `sjb-order-count-${year}`;
    const lastCount = Number(localStorage.getItem(counterKey) || '0') + 1;
    localStorage.setItem(counterKey, String(lastCount));
    const serial = String(lastCount).padStart(2, '0');
    const orderId = `SJB${sku}${year}${serial}`;

    const order = {
      id: orderId,
      date: new Date().toLocaleString(),
      items: cart,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      couponCode: appliedCoupon?.code || null,
      shippingCharge: pricing.shipping,
      gstRate: pricing.gstRate,
      gstAmount: pricing.gstAmount,
      customOrderFee: pricing.customOrderFee || 0,
      grandTotal: pricing.grandTotal,
      total: pricing.grandTotal,
      paidAmount: 0,
      pendingAmount: 0,
      paymentMethod: paymentMethod === 'cod' ? 'COD' : 'Online Payment',
      status: 'Pending',
      trackingStage: 'pending',
      trackingNumber: null,
      shippingAddress: {
        ...selectedAddress,
        email: user?.email || '',
      },
      userEmail: user?.email || '',
      customOrder: isCustom ? customOrder : null,
    };

    try {
      order.pendingAmount = isCustom ? Math.max(total - advance, 0) : 0;

      if (paymentMethod === 'online' || isCustom) {
        order.paymentStatus = 'Pending Payment';
        const rzpResult = await handleRazorpayPayment(order);

        if (!rzpResult.paid) {
          setPopup({
            title: rzpResult.cancelled ? 'Payment Cancelled' : 'Payment Failed',
            message: rzpResult.error || 'Your payment could not be completed. No order has been created.',
            primaryLabel: 'OK',
            onPrimary: () => setPopup(null),
          });
          return;
        }
        // order.paymentStatus is now 'Paid' (set by handler)
        await addOrder(order);
      } else {
        order.paymentStatus = 'Pending';
        await addOrder(order);
      }

      // Deduct stock for each ordered item
      for (const item of cart) {
        const product = products.find(p => String(p.id) === String(item.id));
        if (product && product.stock !== undefined) {
          const newStock = Math.max(0, product.stock - item.quantity);
          await updateProductStock(item.id, newStock, `Order ${orderId} placed`).catch(() => { });
        }
      }

      setLatestOrderItem(order);
      clearCart();
      navigate('/order-done');
    } catch (error) {
      setPopup({
        title: 'Payment Failed',
        message: error.message || 'Something went wrong. Please try again.',
        primaryLabel: 'Try Again',
        onPrimary: () => { setPopup(null); },
      });
    }
  };

  if (cart.length === 0 && !popup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-16 flex items-center justify-center">
        <div className="text-center glass rounded-3xl p-12 border border-emerald-100 max-w-md mx-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Checkout is empty</h2>
          <p className="text-gray-600 mb-8">Add items to your cart before opening checkout.</p>
          <Link to="/products" className="btn-primary inline-block px-6 py-3">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-mint-50 pt-32 sm:pt-36 pb-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 glass rounded-2xl p-4 sm:p-6 border border-emerald-100 overflow-hidden"
          >
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient mb-2">Checkout</h1>
            <p className="text-xs sm:text-sm text-gray-600 mb-6">Review your order, pick a saved address, or add a new one before paying.</p>

            {/* Custom Order */}
            <div className="mb-6 rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Custom Order</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Enter customer details, text to print, upload image, and add description.</p>
                </div>
                <button onClick={() => setCustomOrderEnabled(!customOrderEnabled)} className={`px-3 py-2 rounded-xl font-semibold text-xs sm:text-sm ${customOrderEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {customOrderEnabled ? 'Enabled' : 'Enable'}
                </button>
              </div>

              {customOrderEnabled && (
                <div className="space-y-3 mt-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input value={customOrder.customerName} onChange={(event) => setCustomOrder({ ...customOrder, customerName: event.target.value })} placeholder="Customer name" className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                    <input value={customOrder.nameOnBag} onChange={(event) => setCustomOrder({ ...customOrder, nameOnBag: event.target.value })} placeholder="Name on bag" className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                    <select value={customOrder.bagType} onChange={(event) => setCustomOrder({ ...customOrder, bagType: event.target.value })} className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm">
                      <option>Jute Bag</option>
                      <option>Cotton Bag</option>
                      <option>Canvas Bag</option>
                    </select>
                    <input type="number" min="1" value={customOrder.quantity} onChange={(event) => setCustomOrder({ ...customOrder, quantity: Number(event.target.value) })} placeholder="Quantity" className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                  </div>

                  {/* Custom Image Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Upload Custom Image (Logo/Design)</label>
                    {customOrder.customImage && (
                      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        <img src={customOrder.customImage} alt="Custom" className="w-16 h-16 object-contain rounded-lg" />
                        <button
                          onClick={() => setCustomOrder({ ...customOrder, customImage: '' })}
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="customImageUpload"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setCustomOrder({ ...customOrder, customImage: event.target.result });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="customImageUpload"
                      className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-emerald-300 rounded-xl hover:bg-emerald-50 cursor-pointer transition-colors text-sm text-gray-700"
                    >
                      <Upload className="w-4 h-4 text-emerald-600" />
                      {customOrder.customImage ? 'Change Image' : 'Upload Image'}
                    </label>
                  </div>

                  {/* Custom Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Custom Requirements / Description</label>
                    <textarea
                      value={customOrder.description}
                      onChange={(event) => setCustomOrder({ ...customOrder, description: event.target.value })}
                      placeholder="Describe your custom requirements (size, color, design, etc.)"
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm min-h-[100px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Coupon Section */}
            <div className="mb-6 rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                Apply Coupon
              </h2>

              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-bold text-emerald-700 text-xs sm:text-sm">{appliedCoupon.code}</p>
                    <p className="text-xs text-gray-500">{appliedCoupon.discount} · {appliedCoupon.label}</p>
                    {couponSuccess && <p className="text-xs text-emerald-700 mt-1">{couponSuccess}</p>}
                  </div>
                  <button onClick={handleRemoveCoupon} className="p-1.5 rounded-full hover:bg-emerald-100 transition-colors">
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value); setCouponError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="Enter coupon code e.g. WELCOME10"
                      className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 uppercase"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="btn-primary px-5 py-2 sm:py-3 whitespace-nowrap text-sm"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-rose-600 text-sm mt-2 flex items-center gap-1">
                      <X className="w-3 h-3" />{couponError}
                    </p>
                  )}

                  {/* Show active coupons */}
                  {coupons.filter(c => c.active).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {coupons.filter(c => c.active).map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setCouponInput(c.code); setCouponError(''); }}
                          className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          {c.code} — {c.discount}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Shipping Address */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Shipping Address</h2>
                <button onClick={() => { setEditingAddressId(null); setAddressForm({ ...emptyAddress, name: userData?.displayName || '' }); setShowAddressForm(true); }} className="btn-secondary px-3 py-2 flex items-center gap-2 text-xs sm:text-sm">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Add Address
                </button>
              </div>

              {showAddressForm && (
                <form onSubmit={handleAddressSubmit} className="glass rounded-2xl p-4 sm:p-6 border border-emerald-100 mb-6 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input required value={addressForm.name} onChange={(event) => setAddressForm({ ...addressForm, name: event.target.value })} placeholder="Full name" className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                    <div className="flex gap-2">
                      <select value={addressForm.countryCode || '+91'} onChange={(event) => setAddressForm({ ...addressForm, countryCode: event.target.value })} className="px-2 py-2 sm:px-3 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm shrink-0">
                        {countries.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                      <input required value={addressForm.phone} onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value.replace(/\D/g, '') })} placeholder="Phone" className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                    </div>
                    <input required value={addressForm.addressLine1} onChange={(event) => setAddressForm({ ...addressForm, addressLine1: event.target.value })} placeholder="Address line 1" className="sm:col-span-2 px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                    <input value={addressForm.addressLine2} onChange={(event) => setAddressForm({ ...addressForm, addressLine2: event.target.value })} placeholder="Address line 2" className="sm:col-span-2 px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                    <input required value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} placeholder="City" className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                    <input required value={addressForm.state} onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })} placeholder="State" className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                    <input required value={addressForm.pincode} onChange={(event) => setAddressForm({ ...addressForm, pincode: event.target.value })} placeholder="Pincode" className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                    <input value={addressForm.landmark} onChange={(event) => setAddressForm({ ...addressForm, landmark: event.target.value })} placeholder="Landmark (optional)" className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm" />
                  </div>
                  <label className="flex items-center gap-3 text-xs sm:text-sm text-gray-700">
                    <input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })} />
                    Set as default address
                  </label>
                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary px-4 py-2 sm:px-5 sm:py-3 text-xs sm:text-sm">Save Address</button>
                    <button type="button" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }} className="btn-secondary px-4 py-2 sm:px-5 sm:py-3 text-xs sm:text-sm">Cancel</button>
                  </div>
                </form>
              )}

              <div className="grid gap-3">
                {addresses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-gray-500 text-xs sm:text-sm">
                    No saved address yet. Add one to continue.
                  </div>
                ) : addresses.map((address) => (
                  <div
                    key={address.id}
                    onClick={() => setSelectedAddressId(address.id)}
                    className={`cursor-pointer text-left rounded-2xl p-4 border transition-colors ${selectedAddress?.id === address.id ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-emerald-50'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                        <span className="font-semibold text-gray-800 text-xs sm:text-sm">{address.name}</span>
                      </div>
                      {address.isDefault && <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Default</span>}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}, {address.city}, {address.state} - {address.pincode}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Phone: {address.phone}</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setDefaultAddress(address.id); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300">Use as default</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); const { code, local } = detectCountryCode(address.phone); setAddressForm({ ...address, countryCode: code, phone: local }); setEditingAddressId(address.id); setShowAddressForm(true); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-4">Payment Method</h2>
              {shippingDetails.countryCode !== 'IN' ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 text-amber-900 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base text-amber-900">
                    <Globe className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>International Shipping Notice ({getCountryName(shippingDetails.countryCode)})</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-amber-800">
                    Standard online payments and COD are disabled for international destinations. Please click the <strong>"Order via WhatsApp"</strong> button below to send your pre-filled order & address details to our team on WhatsApp for custom shipping quotes and payment instructions.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => { if (shippingDetails.codAvailable) setPaymentMethod('cod'); }}
                    disabled={!shippingDetails.codAvailable}
                    className={`w-full text-left rounded-xl p-4 border ${!shippingDetails.codAvailable
                        ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                        : paymentMethod === 'cod' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-white'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <input readOnly type="radio" checked={paymentMethod === 'cod'} className="mt-1" disabled={!shippingDetails.codAvailable} />
                      <div>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm">Cash on Delivery (COD)</p>
                        {!shippingDetails.codAvailable ? (
                          <p className="text-xs sm:text-sm text-amber-700">Not available for this delivery location</p>
                        ) : isCustom ? (
                          <p className="text-xs sm:text-sm text-gray-600">Pay ₹100 advance now (Razorpay), balance ₹{balance.toFixed(2)} on delivery</p>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-600">Pay on delivery — no advance required</p>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('online')}
                    className={`w-full text-left rounded-xl p-4 border ${paymentMethod === 'online' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex items-start gap-3">
                      <input readOnly type="radio" checked={paymentMethod === 'online'} className="mt-1" />
                      <div>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm">Online Payment (UPI / Card / Netbanking)</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {isCustom
                            ? `Pay ₹${advance.toFixed(2)} advance now, balance ₹${balance.toFixed(2)} on delivery`
                            : `Pay ₹${total.toFixed(2)} securely through Razorpay`}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* Shipping Information */}
              <div className="rounded-xl bg-emerald-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {shippingDetails.countryCode !== 'IN' ? (
                      <>🌍 International ({getCountryName(shippingDetails.countryCode)}) · {shippingDetails.totalWeight.toFixed(2)} kg total weight</>
                    ) : (
                      <>📦 Domestic delivery · pincode {selectedAddress?.pincode || '—'}</>
                    )}
                  </span>
                </div>
                {delhiveryLoading ? (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                    <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    Fetching shipping rate from Delhivery…
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                      <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Shipping: {shippingDetails.countryCode !== 'IN' ? `₹${shipping.toFixed(2)} (estimated table rate)` : (shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}` + (hasTestProduct ? ' (Manual test rate)' : (delhiveryCharge ? ' (Delhivery rate)' : ' (fallback rate)')))}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Est. delivery: <strong>{shippingDetails.estDelivery}</strong></span>
                    </div>
                  </>
                )}
                {shippingDetails.countryCode === 'IN' && !shippingDetails.codAvailable && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-700">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>COD not available — please use online payment</span>
                  </div>
                )}
              </div>
            </div>

            {shippingDetails.countryCode !== 'IN' ? (
              <button
                onClick={handleInternationalWhatsAppOrder}
                className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 sm:py-4 px-6 rounded-2xl text-sm sm:text-lg font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                Order via WhatsApp
              </button>
            ) : (
              <button
                onClick={handlePlaceOrder}
                disabled={delhiveryLoading && !hasTestProduct}
                className={`mt-6 w-full btn-primary py-3 sm:py-4 text-sm sm:text-lg font-bold flex items-center justify-center gap-2 ${
                  (delhiveryLoading && !hasTestProduct) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {delhiveryLoading && !hasTestProduct ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Calculating delivery charge…</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Place Order</span>
                  </>
                )}
              </button>
            )}
          </motion.div>

          {/* Order Summary Sidebar */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4 sm:p-6 border border-emerald-100 sticky top-24 h-fit overflow-hidden"
          >
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-4 sm:mb-6">Order Summary</h2>
            <div className="space-y-3 mb-4 sm:mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs sm:text-sm">Subtotal</span>
                <span className="font-semibold text-gray-800 text-xs sm:text-sm">₹{subtotal.toFixed(2)}</span>
              </div>
              {couponDiscountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-600">
                  <span className="font-semibold flex items-center gap-1 text-xs sm:text-sm">
                    <Tag className="w-3.5 h-3.5" />
                    Coupon ({appliedCoupon?.code})
                  </span>
                  <span className="font-bold text-xs sm:text-sm">-₹{couponDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {isCustom && (
                <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/60 p-2 rounded-lg border border-emerald-200">
                  <span className="font-semibold text-xs sm:text-sm">Customization Charge</span>
                  <span className="font-bold text-xs sm:text-sm">+₹100.00</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs sm:text-sm">Shipping</span>
                <span className="font-semibold text-gray-800 text-xs sm:text-sm">
                  {shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 text-right">
                {hasTestProduct ? 'Manual Admin Test rate' : (delhiveryCharge ? 'Delhivery rate' : 'Flat rate')} · est. {shippingDetails.estDelivery}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs sm:text-sm">
                  GST {hasTestProduct ? '(Manual Test)' : `(${pricingSettings.gstRate}%)`}
                </span>
                <span className="font-semibold text-gray-800 text-xs sm:text-sm">₹{gst.toFixed(2)}</span>
              </div>
              <div className="border-t border-emerald-100 pt-3 flex items-center justify-between">
                <span className="text-sm sm:text-lg md:text-xl font-bold text-gray-800">Total</span>
                <span className="text-lg sm:text-xl md:text-2xl font-bold text-gradient">₹{total.toFixed(2)}</span>
              </div>
            </div>
            <div className="rounded-xl bg-white border border-emerald-100 p-3 sm:p-4 text-xs sm:text-sm text-gray-600 space-y-1">
              {selectedAddress ? (
                <>
                  <p>Deliver to: {selectedAddress.addressLine1}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}</p>
                  {shippingDetails.codAvailable === false && (
                    <p className="text-amber-700 font-semibold">⚠ Online payment required for this location</p>
                  )}
                </>
              ) : (
                <p>Pick a saved address or add a new one.</p>
              )}
            </div>

            {/* Cart items quick view */}
            <div className="mt-4 sm:mt-5 space-y-2 sm:space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 text-xs sm:text-sm">
                  <img src={item.images?.[0]} alt={item.name} className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-xl bg-emerald-50 border border-emerald-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-gray-500 text-[10px] sm:text-xs">Qty: {item.quantity}</p>
                    {item.customText && <p className="text-emerald-600 text-[10px] sm:text-xs truncate">Print: "{item.customText}"</p>}
                  </div>
                  <p className="font-semibold text-gray-800 shrink-0 text-xs sm:text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </div>

      <UiPopup
        open={Boolean(popup)}
        title={popup?.title}
        message={popup?.message}
        icon={popup?.icon}
        primaryAction={popup?.primaryLabel ? (
          <button onClick={() => {
            popup?.onPrimary?.();
            setPopup(null);
          }} className="btn-primary px-4 py-2 sm:px-5 sm:py-3 w-full sm:w-auto sm:ml-auto text-xs sm:text-sm">
            {popup.primaryLabel}
          </button>
        ) : null}
        secondaryAction={popup?.secondaryLabel ? (
          <button onClick={() => {
            popup?.onSecondary?.();
            setPopup(null);
          }} className="btn-secondary px-4 py-2 sm:px-5 sm:py-3 w-full sm:w-auto text-xs sm:text-sm">
            {popup.secondaryLabel}
          </button>
        ) : null}
      />
    </div>
  );
};

export default CheckoutView;
