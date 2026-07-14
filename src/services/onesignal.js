import OneSignal from 'onesignal';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

class OneSignalService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized || !ONESIGNAL_APP_ID) {
      console.warn('OneSignal already initialized or APP_ID missing');
      return;
    }

    try {
      OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        notifyButton: {
          enable: true,
        },
      });

      this.isInitialized = true;
      console.log('OneSignal initialized successfully');
    } catch (error) {
      console.error('OneSignal initialization failed:', error);
    }
  }

  async sendNotification(data) {
    const { title, message, externalUserId, segments = ['Subscribed Users'] } = data;

    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${import.meta.env.VITE_ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          headings: { en: title },
          contents: { en: message },
          include_external_user_ids: externalUserId ? [externalUserId] : undefined,
          included_segments: externalUserId ? undefined : segments,
        }),
      });

      const result = await response.json();
      console.log('Notification sent:', result);
      return result;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  async sendOrderStatusNotification(orderId, status, customerEmail) {
    const statusMessages = {
      confirmed: { title: 'Order Confirmed', message: `Your order ${orderId} has been confirmed and is being processed.` },
      packed: { title: 'Order Packed', message: `Your order ${orderId} has been packed and is ready for shipping.` },
      shipped: { title: 'Order Shipped', message: `Your order ${orderId} has been shipped. Track your package for updates.` },
      ontheweway: { title: 'Order On the Way', message: `Your order ${orderId} is out for delivery and will arrive soon.` },
      delivered: { title: 'Order Delivered', message: `Your order ${orderId} has been delivered successfully. Thank you for shopping with us!` },
      cancelled: { title: 'Order Cancelled', message: `Your order ${orderId} has been cancelled. Refund will be processed if applicable.` },
    };

    const notification = statusMessages[status.toLowerCase()] || { title: 'Order Update', message: `Your order ${orderId} status has been updated to ${status}.` };

    return this.sendNotification({
      title: notification.title,
      message: notification.message,
      externalUserId: customerEmail,
    });
  }

  async setExternalUserId(userId) {
    try {
      await OneSignal.setExternalUserId(userId);
      console.log('External user ID set:', userId);
    } catch (error) {
      console.error('Failed to set external user ID:', error);
    }
  }
}

export const oneSignalService = new OneSignalService();
