/**
 * Getting the daily digest onto a device.
 *
 * Alerts only exist when somebody opens the app — nothing runs on a schedule —
 * so an owner who does not open it for a week is told nothing for a week. A
 * push is what reaches them in between: the push service wakes the service
 * worker with the app closed and the browser not running.
 *
 * A subscription belongs to a *browser on a device*, not to a person. Somebody
 * signed in on the office computer and on their phone has two, and turning it
 * off on one must leave the other alone — which is why the toggle says "this
 * device" and the table keys on the endpoint.
 */

import { saveSubscription, removeSubscription } from "../services/api/push";

/** Baked in at build time by Vite; the app cannot subscribe without it. */
const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function canReceivePush(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(PUBLIC_KEY)
  );
}

/** A refusal cannot be undone from the page — only in browser settings. */
export function pushBlocked(): boolean {
  return canReceivePush() && Notification.permission === "denied";
}

export async function isSubscribed(): Promise<boolean> {
  if (!canReceivePush() || Notification.permission !== "granted") {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;

  return (await registration.pushManager.getSubscription()) !== null;
}

/**
 * Asked for only when somebody presses the toggle. A permission prompt on load
 * is the quickest way to be refused for ever.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!canReceivePush() || !PUBLIC_KEY) {
    return false;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  if (
    Notification.permission === "default" &&
    (await Notification.requestPermission()) !== "granted"
  ) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;

  // Reusing an existing subscription rather than making a second one: the
  // browser keeps one per registration, and subscribing again with the same key
  // returns the same endpoint anyway.
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      // Required by Chrome: a push must always result in something visible.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
    }));

  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false;
  }

  await saveSubscription({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    userAgent: navigator.userAgent,
  });

  return true;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!canReceivePush()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  // The row goes first. If the browser unsubscribes and the delete then fails,
  // the server keeps posting to an endpoint nobody is listening on until the
  // push service reports it gone.
  await removeSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}

/**
 * VAPID keys travel as base64url text; `applicationServerKey` wants bytes.
 * Base64url is not what `atob` reads, hence the two substitutions and the
 * padding.
 */
function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  // The buffer rather than the view: TypeScript's Uint8Array carries an
  // ArrayBufferLike that will not narrow to the ArrayBuffer BufferSource wants.
  return bytes.buffer;
}
