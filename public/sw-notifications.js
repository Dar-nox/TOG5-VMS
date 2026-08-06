/*
 * What happens when somebody taps a pinned trip.
 *
 * Imported into the generated service worker rather than replacing it: the
 * generated worker handles precaching and updates, and all this adds is a
 * `notificationclick` handler. Switching the whole build to injectManifest to
 * get one event listener would mean owning the caching strategy by hand.
 *
 * There is no `push` handler here on purpose. A pinned trip is a *local*
 * notification, shown by the page itself when somebody asks for it, so it needs
 * no push service, no VAPID keys and no server. It survives the app being
 * closed because a notification lives in the phone's shade, not in the page.
 */

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
