// lib/notifications.ts
// Mock notifications for Expo Go - push notifications will work in production build

export async function registerForPushNotifications() {
  console.log('Push notifications disabled in Expo Go');
  return null;
}

export function addNotificationListener(callback: (notification: any) => void) {
  return { remove: () => {} };
}

export function addNotificationResponseListener(callback: (response: any) => void) {
  return { remove: () => {} };
}
