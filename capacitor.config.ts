import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The Android build.
 *
 * The app's own files are packaged into the APK rather than loaded from the
 * web. It costs a rebuild to ship a change, and buys the thing that matters on
 * a phone at a petrol station: when the signal is bad, the app still opens and
 * says so in its own words. Pointed at a remote URL instead, a driver with no
 * bars would get the browser's error page and no way to tell whether the app
 * was broken or the signal was.
 *
 * Records are still online-only. Only the app itself is local.
 */
const config: CapacitorConfig = {
  appId: "com.tog5.vms",
  appName: "TOG 5 VMS",
  webDir: "dist",
  android: {
    // The fleet's photos are taken on the phone and go straight up, so the
    // webview needs to be able to hand files to the upload path.
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
