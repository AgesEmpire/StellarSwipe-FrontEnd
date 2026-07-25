export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
}

export type NotificationCategory =
  | "priceAlerts"
  | "newSignals"
  | "systemUpdates";

export function canShowNotification(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

export function showNotification(
  title: string,
  options?: NotificationOptions & { category?: NotificationCategory }
) {
  if (!canShowNotification()) return;

  if (options?.category && typeof window !== "undefined") {
    const stored = localStorage.getItem("stellarswipe:notification-categories");
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        if (prefs[options.category] === false) {
          return;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  if (typeof window !== "undefined") {
    const storedAlerts = localStorage.getItem(
      "stellarswipe:notification-alerts-enabled"
    );
    if (storedAlerts && JSON.parse(storedAlerts) === false) {
      return;
    }
  }

  new Notification(title, options);
}

// Web Push helpers

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;
  const applicationServerKey = urlBase64ToUint8Array(vapidKey);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });
}

export async function unsubscribeFromPush(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return true;
  return sub.unsubscribe();
}

export async function getExistingSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  return registration.pushManager.getSubscription();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
