/*
 * What happens when somebody taps a pinned trip.
 *
 * Imported into the generated service worker rather than replacing it: the
 * generated worker handles precaching and updates, and all this adds is a
 * `notificationclick` handler. Switching the whole build to injectManifest to
 * get one event listener would mean owning the caching strategy by hand.
 *
 * Two kinds of notification arrive here. A pinned trip is *local* — shown by the
 * page itself when somebody asks for it, needing no push service and no server.
 * The daily digest is *pushed*, which is what reaches somebody who has not
 * opened the app for a week: the push service wakes this worker with the app
 * closed and the browser not running.
 */

self.addEventListener("push", (event) => {
  // A push with no readable body still has to show something. Chrome revokes
  // the permission of a worker that receives a push and stays silent, so
  // "something is waiting" beats saying nothing and losing the ability to say
  // anything later.
  let payload = { title: "TOG 5 Vehicle Care", body: "Something needs attention." };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      // One tag for the digest, so tomorrow's replaces today's rather than
      // stacking up a week of unread mornings.
      tag: payload.tag || "tog5-digest",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url || "/alerts" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification.data && event.notification.data.url;

  if (!target) {
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        // Already open somewhere: steer that window rather than stacking up a
        // second copy of the app every time a driver taps the notification.
        for (const window of windows) {
          if ("focus" in window) {
            return window.navigate ? window.navigate(target).then((w) => w && w.focus()) : window.focus();
          }
        }

        return self.clients.openWindow(target);
      })
      .catch(() => self.clients.openWindow(target)),
  );
});
