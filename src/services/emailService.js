import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_heco3g8';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_v2scuzk';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

console.log('EmailJS Config:', { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY });

emailjs.init(EMAILJS_PUBLIC_KEY);

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

const getStatusConfig = (status) => {
  const configs = {
    'Pending': {
      emoji: '⏳',
      color: '#F59E0B',
      message: 'Your order has been received and is being processed'
    },
    'Confirmed': {
      emoji: '✅',
      color: '#10B981',
      message: 'Your order has been confirmed and is being prepared'
    },
    'Packed': {
      emoji: '📦',
      color: '#3B82F6',
      message: 'Your order has been packed and is ready for shipping'
    },
    'Shipped': {
      emoji: '🚚',
      color: '#8B5CF6',
      message: 'Your order has been shipped and is on its way'
    },
    'On the way': {
      emoji: '🛵',
      color: '#EC4899',
      message: 'Your order is out for delivery'
    },
    'Delivered': {
      emoji: '🎉',
      color: '#10B981',
      message: 'Your order has been delivered successfully'
    },
    'Cancelled': {
      emoji: '❌',
      color: '#EF4444',
      message: 'Your order has been cancelled'
    }
  };
  return configs[status] || configs['Pending'];
};

export const sendOrderStatusEmail = async (order, status) => {
  console.log('=== Email Send Attempt ===');
  console.log('Order:', order);
  console.log('Status:', status);
  
  const statusConfig = getStatusConfig(status);
  const recipientEmail = resolveRecipientEmail(order);

  if (!recipientEmail) {
    const errorMessage = 'Customer email is missing on this order';
    console.error('❌ Email send skipped:', errorMessage);
    return { success: false, error: errorMessage };
  }
  
  const templateParams = {
    to_email: recipientEmail,
    customer_name: order.shippingAddress?.name || 'Customer',
    order_id: order.id,
    order_date: order.date,
    order_status: status,
    status_emoji: statusConfig.emoji,
    status_color: statusConfig.color,
    tracking_number: order.trackingNumber || 'N/A',
    estimated_delivery: order.estimatedDelivery || 'N/A',
    tracking_link: `${window.location.origin}/orders/${order.id}`,
    support_email: 'saranjutebags@gmail.com',
    website: 'https://saranjutebags.co.in'
  };

  console.log('Template Params:', templateParams);

  try {
    console.log('Sending email via EmailJS...');
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
    console.error('Error details:', {
      message: error?.message,
      text: error?.text,
      status: error?.status
    });
    return { success: false, error: errorMessage, details: error };
  }
};
