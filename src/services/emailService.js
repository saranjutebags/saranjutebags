import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_heco3g8';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_v2scuzk';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

emailjs.init(EMAILJS_PUBLIC_KEY);

const getCompanyName = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('saran-jute-company-settings') || '{}');
    return settings.companyName || 'Saran Jute Bags';
  } catch {
    return 'Saran Jute Bags';
  }
};

const resolveRecipientEmail = (order) => {
  const candidates = [
    order?.shippingAddress?.email,
    order?.billingAddress?.email,
    order?.userEmail,
    order?.user_email,
    order?.email,
  ];
  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
};

const formatAddress = (address) => {
  if (!address) return 'N/A';
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.pincode,
    address.country,
  ].filter(Boolean);
  return parts.join(', ') || 'N/A';
};

const STATUS_ALIASES = {
  'On the way': 'Out for Delivery',
  'Returned': 'Delivered',
  'Refund Requested': 'Delivered',
};

const getStatusConfig = (status) => {
  const resolved = STATUS_ALIASES[status] || status;
  const configs = {
    'Pending': {
      emoji: '⏳',
      color: '#F59E0B',
      subject: 'Order Received',
      message: 'Your order has been received and is being processed'
    },
    'Confirmed': {
      emoji: '✅',
      color: '#10B981',
      subject: 'Order Confirmed',
      message: 'Your order has been confirmed and is being prepared'
    },
    'Packed': {
      emoji: '📦',
      color: '#3B82F6',
      subject: 'Order Packed',
      message: 'Your order has been packed and is ready for shipping'
    },
    'Shipped': {
      emoji: '🚚',
      color: '#8B5CF6',
      subject: 'Order Shipped',
      message: 'Your order has been shipped and is on its way'
    },
    'Out for Delivery': {
      emoji: '🛵',
      color: '#EC4899',
      subject: 'Out for Delivery',
      message: 'Your order is out for delivery'
    },
    'Delivered': {
      emoji: '🎉',
      color: '#10B981',
      subject: 'Order Delivered',
      message: 'Your order has been delivered successfully'
    },
    'Cancelled': {
      emoji: '❌',
      color: '#EF4444',
      subject: 'Order Cancelled',
      message: 'Your order has been cancelled'
    }
  };
  return configs[resolved] || configs['Pending'];
};

export const sendOrderStatusEmail = async (order, status) => {
  const statusConfig = getStatusConfig(status);
  const recipientEmail = resolveRecipientEmail(order);
  const companyName = getCompanyName();
  const customerName = order.shippingAddress?.name || 'Customer';

  if (!recipientEmail) {
    console.error('❌ Email send skipped: Customer email is missing on this order');
    return { success: false, error: 'Customer email is missing on this order' };
  }

  const itemsHtml = (order.items || []).map((item, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px; font-size: 14px; color: #374151;">${item.name}${item.customText ? `<br/><span style="color:#6b7280;font-size:12px;">Custom: ${item.customText}</span>` : ''}</td>
      <td style="padding: 10px; font-size: 14px; color: #374151; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; font-size: 14px; color: #374151; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const templateParams = {
    to_email: recipientEmail,
    email: recipientEmail,
    company_name: companyName,
    email_subject: `${statusConfig.subject} - ${companyName}`,
    customer_name: customerName,
    customer_greeting: `Dear ${customerName}`,
    order_id: order.id,
    order_date: order.date,
    order_status: status,
    status_emoji: statusConfig.emoji,
    status_color: statusConfig.color,
    status_message: statusConfig.message,
    tracking_number: order.trackingNumber || 'N/A',
    estimated_delivery: order.estimatedDelivery || 'N/A',
    tracking_link: `${window.location.origin}/orders/${order.id}`,
    shipping_address: formatAddress(order.shippingAddress),
    delivery_address: formatAddress(order.shippingAddress),
    billing_address: formatAddress(order.billingAddress || order.shippingAddress),
    support_email: 'saranjutebags@gmail.com',
    website: 'https://saranjutebags.co.in',
    item_count: order.items?.length || 0,
    item_names: (order.items || []).map(i => i.name).join(', '),
    items_html: itemsHtml,
    order_subtotal: `₹${Number(order.subtotal || 0).toFixed(2)}`,
    order_discount: order.discountAmount ? `-₹${Number(order.discountAmount).toFixed(2)}` : '₹0.00',
    order_shipping: order.shippingCharge === 0 ? 'Free' : `₹${Number(order.shippingCharge || 0).toFixed(2)}`,
    order_gst_rate: `${order.gstRate || 18}%`,
    order_gst: `₹${Number(order.gstAmount || 0).toFixed(2)}`,
    order_total: `₹${Number(order.grandTotal || order.total || 0).toFixed(2)}`,
    order_paid: order.paidAmount ? `₹${Number(order.paidAmount).toFixed(2)}` : '₹0.00',
    order_pending: order.pendingAmount ? `₹${Number(order.pendingAmount).toFixed(2)}` : '₹0.00',
    payment_method: order.paymentMethod || 'COD',
    totals_html: `
<table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top:12px;">
  <tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">Subtotal</td><td style="padding:4px 0;font-size:14px;color:#1f2937;text-align:right;">₹${Number(order.subtotal || 0).toFixed(2)}</td></tr>
  ${order.discountAmount ? `<tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">Discount</td><td style="padding:4px 0;font-size:14px;color:#059669;text-align:right;">-₹${Number(order.discountAmount).toFixed(2)}</td></tr>` : ''}
  <tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">Shipping</td><td style="padding:4px 0;font-size:14px;color:#1f2937;text-align:right;">${order.shippingCharge === 0 ? 'Free' : `₹${Number(order.shippingCharge || 0).toFixed(2)}`}</td></tr>
  <tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">GST (${order.gstRate || 18}%)</td><td style="padding:4px 0;font-size:14px;color:#1f2937;text-align:right;">₹${Number(order.gstAmount || 0).toFixed(2)}</td></tr>
  <tr><td style="padding:8px 0 0 0;font-size:16px;font-weight:bold;color:#1f2937;border-top:2px solid #e5e7eb;">Total</td><td style="padding:8px 0 0 0;font-size:16px;font-weight:bold;color:#059669;text-align:right;border-top:2px solid #e5e7eb;">₹${Number(order.grandTotal || order.total || 0).toFixed(2)}</td></tr>
  <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Payment</td><td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;">${order.paymentMethod || 'COD'}${order.paidAmount ? ` (Paid: ₹${Number(order.paidAmount).toFixed(2)})` : ''}</td></tr>
</table>`,
  };

  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );
    console.log('✅ Email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    const errorMessage = error?.text || error?.message || 'Email send failed';
    console.error('❌ Email send failed:', error);
    return { success: false, error: errorMessage, details: error };
  }
};
