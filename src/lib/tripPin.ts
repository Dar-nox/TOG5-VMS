/**
 * Keeping an open trip on the phone's notification shade.
 *
 * A driver is out for hours. Asking "which trip am I on, and what do I press to
 * close it" means finding the app, the vehicle, then the tab. Pinned, the trip
 * sits in the shade with everything else on the phone and is one tap from the
 * screen that closes it — including after the app has been swiped away, because
 * a notification belongs to the phone rather than to the page.
 *
 * This is a *local* notification: the page asks its own service worker to show
 * one. No push service, no VAPID keys, no server, nothing scheduled. The cost
 * is that it can only change while the app is open, which is why `reconcile`
 * exists — a trip closed on the office computer leaves a stale notification on
 * the driver's phone until their app next runs.
 */

const TAG_PREFIX = "tog5-trip-";

export type PinnableTrip = {
  id: string;
  vehicleName: string;
  reason: string;
  destinations: string[];
  url: string;
};

/**
 * Phones only, as asked. On a desktop the app is already a window on a screen
 * somebody is looking at, so a notification duplicates what is in front of them.
 */
export function canPinTrips(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function pinningBlocked(): boolean {
  return canPinTrips() && Notification.permission === "denied";
}

/**
 * Asks only when somebody has pressed the button. A permission prompt on first
 * load is the fastest way to have it refused for ever, and a refusal cannot be
 * asked again from the page.
 */
async function allowed(): Promise<boolean> {
  if (!canPinTrips()) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  return (await Notification.requestPermission()) === "granted";
}

export async function pinTrip(trip: PinnableTrip): Promise<boolean> {
  if (!(await allowed())) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const going = trip.destinations.filter(Boolean).join(", ");

  await registration.showNotification(`${trip.vehicleName} is out`, {
    body: going ? `${trip.reason} — going to ${going}` : trip.reason,
    tag: `${TAG_PREFIX}${trip.id}`,
    // Keeps it in the shade rather than fading after a few seconds. Android
    // honours this; iOS ignores it, which costs nothing.
    requireInteraction: true,
    // The tag means re-pinning replaces rather than stacks, and silent means
    // replacing it does not buzz the phone again.
    silent: true,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: trip.url, tripId: trip.id },
  });

  return true;
}

export async function unpinTrip(tripId: string): Promise<void> {
  if (!canPinTrips() || Notification.permission !== "granted") {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const shown = await registration.getNotifications({ tag: `${TAG_PREFIX}${tripId}` });

  for (const notification of shown) {
    notification.close();
  }
}

export async function isPinned(tripId: string): Promise<boolean> {
  if (!canPinTrips() || Notification.permission !== "granted") {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;

  return (await registration.getNotifications({ tag: `${TAG_PREFIX}${tripId}` })).length > 0;
}

/**
 * Clears pins for trips that are no longer open.
 *
 * The trip that was closed on the office computer is the case this exists for:
 * nothing tells the driver's phone, so the notification would sit there naming
 * a journey that finished yesterday. Run whenever the trip list loads.
 */
export async function reconcilePins(openTripIds: string[]): Promise<void> {
  if (!canPinTrips() || Notification.permission !== "granted") {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const open = new Set(openTripIds);

  for (const notification of await registration.getNotifications()) {
    if (!notification.tag.startsWith(TAG_PREFIX)) {
      continue;
    }

    if (!open.has(notification.tag.slice(TAG_PREFIX.length))) {
      notification.close();
    }
  }
}
