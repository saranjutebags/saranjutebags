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

const getStatusConfig = (status) => {
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
    'On the way': {
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
  return configs[status] || configs['Pending'];
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
