const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '';
const ONESIGNAL_API_KEY = import.meta.env.VITE_ONESIGNAL_API_KEY || '';
const ONESIGNAL_PROXY_URL = import.meta.env.VITE_ONESIGNAL_PROXY_URL || '';

export const sendOrderStatusNotification = async (order, status) => {
  const customerEmail = order.shippingAddress?.email || order.userEmail || order.email || 'saranjutebags@gmail.com';
  const customerName = order.shippingAddress?.name || 'Valued Customer';
  const orderId = order.id || 'SJB-ORDER';

  if (!ONESIGNAL_APP_ID) {
    console.info('OneSignal notifications are disabled - APP_ID missing');
    return {
      success: false,
      reason: 'onesignal_not_configured',
    };
  }

  let subject = `Saran Jute Bags - Order Update (${status})`;
  let bodyContent = '';

  const primaryColor = '#059669'; // Emerald Green
  const secondaryColor = '#10b981';

  switch (status) {
    case 'Confirmed':
      subject = `🌿 Order Confirmed! Saran Jute Bags - ${orderId}`;
      bodyContent = `
        <h2 style="color: ${primaryColor}; font-size: 24px; margin-bottom: 10px;">Thank You for Your Order!</h2>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hi ${customerName},</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">We are pleased to inform you that your order <strong>${orderId}</strong> has been successfully placed and confirmed!</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Our team is already preparing your eco-friendly bags. You will receive another update as soon as they are packed and ready to ship.</p>
      `;
      break;
    case 'Packed':
      subject = `📦 Order Packed & Ready! Saran Jute Bags - ${orderId}`;
      bodyContent = `
        <h2 style="color: ${primaryColor}; font-size: 24px; margin-bottom: 10px;">Your Order is Packed!</h2>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hi ${customerName},</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Great news! Your order <strong>${orderId}</strong> has been carefully packed by our team and is awaiting pickup from our shipping carrier.</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">We'll share shipping and tracking details with you very soon.</p>
      `;
      break;
    case 'Shipped':
      subject = `🚚 Order Shipped! Saran Jute Bags - ${orderId}`;
      bodyContent = `
        <h2 style="color: ${primaryColor}; font-size: 24px; margin-bottom: 10px;">Your Order is on Its Way!</h2>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hi ${customerName},</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Your order <strong>${orderId}</strong> has been handed over to our delivery partner and is officially on its way to your destination!</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Please keep an eye out for updates. Thank you for choosing sustainable packaging.</p>
      `;
      break;
    case 'Out for Delivery':
    case 'On the way':
      subject = `🛵 Out for Delivery! Saran Jute Bags - ${orderId}`;
      bodyContent = `
        <h2 style="color: ${primaryColor}; font-size: 24px; margin-bottom: 10px;">Out for Delivery Today!</h2>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hi ${customerName},</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Get ready! Your package for order <strong>${orderId}</strong> is out with our local delivery agent and should arrive today.</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Please ensure someone is available at your shipping address to receive the parcel.</p>
      `;
      break;
    case 'Delivered':
      subject = `🎉 Delivered! Saran Jute Bags - ${orderId}`;
      bodyContent = `
        <h2 style="color: ${primaryColor}; font-size: 24px; margin-bottom: 10px;">Order Delivered Successfully!</h2>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hi ${customerName},</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Your order <strong>${orderId}</strong> has been delivered. We hope you love your premium, sustainable jute bags!</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">If you have any feedback or want to order again, feel free to visit our storefront or contact our team.</p>
      `;
      break;
    case 'Cancelled':
      subject = `❌ Order Cancelled - ${orderId}`;
      bodyContent = `
        <h2 style="color: #dc2626; font-size: 24px; margin-bottom: 10px;">Order Cancellation Status</h2>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hi ${customerName},</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">We would like to confirm that your order <strong>${orderId}</strong> has been cancelled.</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Reason: ${order.cancelReason || 'Cancelled by admin/customer request'}. If you did not request this, please reply to this email or get in touch with our help desk.</p>
      `;
      break;
    default:
      bodyContent = `
        <h2 style="color: ${primaryColor}; font-size: 24px; margin-bottom: 10px;">Order Update</h2>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hi ${customerName},</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Your order <strong>${orderId}</strong> has been updated to: <strong>${status}</strong>.</p>
      `;
  }

  const itemsListHtml = (order.items || []).map(item => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px; font-size: 14px; color: #374151;">${item.name}</td>
      <td style="padding: 10px; font-size: 14px; color: #374151; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; font-size: 14px; color: #374151; text-align: right;">₹${item.price}</td>
    </tr>
  `).join('');

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; border-collapse: collapse;">
        <!-- Header -->
        <tr style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);">
          <td style="padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 26px; font-weight: bold;">Saran Jute Bags</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">100% Eco-Friendly & Sustainable Carry Solutions</p>
          </td>
        </tr>
        <!-- Body Content -->
        <tr>
          <td style="padding: 30px;">
            ${bodyContent}
            
            <!-- Order Details Table -->
            <h3 style="color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 30px;">Order Summary</h3>
            <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 10px; text-align: left; font-size: 13px; color: #4b5563;">Product</th>
                  <th style="padding: 10px; text-align: center; font-size: 13px; color: #4b5563;">Qty</th>
                  <th style="padding: 10px; text-align: right; font-size: 13px; color: #4b5563;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsListHtml || '<tr><td colspan="3" style="padding:10px; text-align:center;">No items recorded</td></tr>'}
              </tbody>
            </table>
            
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 15px; border-top: 2px solid #e5e7eb; padding-top: 10px;">
              <tr>
                <td style="font-size: 14px; color: #4b5563; padding: 4px 0;">Subtotal</td>
                <td style="font-size: 14px; color: #1f2937; text-align: right; padding: 4px 0;">₹${Number(order.subtotal || order.total || 0).toFixed(2)}</td>
              </tr>
              ${order.discountAmount ? `
              <tr>
                <td style="font-size: 14px; color: #4b5563; padding: 4px 0;">Discount</td>
                <td style="font-size: 14px; color: #059669; text-align: right; padding: 4px 0;">-₹${Number(order.discountAmount).toFixed(2)}</td>
              </tr>` : ''}
              <tr>
                <td style="font-size: 14px; color: #4b5563; padding: 4px 0;">Shipping</td>
                <td style="font-size: 14px; color: #1f2937; text-align: right; padding: 4px 0;">${order.shippingCharge === 0 ? 'Free' : `₹${Number(order.shippingCharge || 0).toFixed(2)}`}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; color: #4b5563; padding: 4px 0;">GST (${order.gstRate || 18}%)</td>
                <td style="font-size: 14px; color: #1f2937; text-align: right; padding: 4px 0;">₹${Number(order.gstAmount || 0).toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold; font-size: 16px;">
                <td style="color: #1f2937; padding: 10px 0 0 0;">Total Amount</td>
                <td style="color: ${primaryColor}; text-align: right; padding: 10px 0 0 0;">₹${Number(order.grandTotal || order.total || 0).toFixed(2)}</td>
              </tr>
            </table>

            <!-- Shipping Address Details -->
            <h3 style="color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 30px;">Shipping Details</h3>
            <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin: 5px 0;">
              <strong>Delivery Address:</strong><br/>
              ${customerName}<br/>
              ${order.shippingAddress?.addressLine1 || ''}${order.shippingAddress?.addressLine2 ? ', ' + order.shippingAddress.addressLine2 : ''}<br/>
              ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.pincode || ''}<br/>
              Phone: ${order.shippingAddress?.phone || ''}
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr style="background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
          <td style="padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0;">Saran Jute Bags. Mehdipatnam & Secunderabad, Hyderabad, India.</p>
            <p style="margin: 5px 0 0 0;">Call: +91 9866027027 | WhatsApp: +91 9866027027</p>
            <p style="margin: 5px 0 0 0;">This email was sent dynamically via OneSignal API.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    // Direct OneSignal API call for push notifications
    const pushPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: subject },
      contents: { en: `${bodyContent.replace(/<[^>]*>/g, '').substring(0, 200)}...` },
      include_external_user_ids: [customerEmail],
      data: {
        orderId,
        status,
        trackingStage: order.trackingStage || status,
      },
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(pushPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OneSignal API returned ${response.status}: ${errorText}`);
    }

    const resJson = await response.json().catch(() => ({}));
    console.log('OneSignal notification sent:', resJson);
    return { success: true, response: resJson };
  } catch (error) {
    console.error('Error sending OneSignal notification:', error);
    return { success: false, error: error.message };
  }
};
