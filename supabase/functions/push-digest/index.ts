/**
 * Delivers the daily digest to everybody whose hour it is.
 *
 * Postgres decides *who* and *what* — `public.daily_digest()` — because that is
 * where the alerts, the preferences and the subscriptions already are. This
 * function exists for the one thing Postgres cannot do: a Web Push message is
 * signed with a VAPID key and encrypted per recipient, which needs a crypto
 * runtime.
 *
 * Called by `public.send_daily_digest()` through pg_net, carrying a shared
 * secret. It is not reachable by the app and holds no session — the service
 * role key it uses is injected by Supabase and never leaves this process.
 *
 * Verified on the deployed function: it boots, rejects a wrong secret with 401,
 * and returns `{sent: 0}` when nothing is due. That covers the import — several
 * web-push packages are Node-only and die under Deno on crypto, and this one
 * does not.
 *
 * STILL UNEXERCISED: the signing and encryption path, which only runs when
 * there is something to send. Subscribe a browser, make something due, and send
 * one real notification before scheduling anything.
 */

import * as webpush from "jsr:@negrel/webpush@0.3";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Digest = {
  profile_id: string;
  title: string;
  body: string;
  subscriptions: { endpoint: string; p256dh: string; auth: string }[];
};

const SHARED_SECRET = Deno.env.get("PUSH_SHARED_SECRET");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:owner@tog5vms.local";

Deno.serve(async (request) => {
  if (request.headers.get("authorization") !== `Bearer ${SHARED_SECRET}`) {
    return new Response("no", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase.rpc("daily_digest");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const digests = (data ?? []) as Digest[];

  if (digests.length === 0) {
    // The common case, and not a failure: nothing is due, so nobody is woken.
    return Response.json({ sent: 0, note: "nothing due" });
  }

  const server = await webpush.ApplicationServer.new({
    contactInformation: VAPID_SUBJECT,
    vapidKeys: await webpush.importVapidKeys(
      JSON.parse(Deno.env.get("VAPID_KEYS")!),
      { extractable: false },
    ),
  });

  let sent = 0;
  const gone: string[] = [];
  const delivered: string[] = [];

  for (const digest of digests) {
    const payload = JSON.stringify({
      title: digest.title,
      body: digest.body,
      url: "/alerts",
      tag: "tog5-digest",
    });

    for (const subscription of digest.subscriptions ?? []) {
      try {
        await server
          .subscribe({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          })
          .pushTextMessage(payload, {});

        sent += 1;
        delivered.push(subscription.endpoint);
      } catch (caught) {
        // 404 and 410 mean the browser threw the subscription away — a reset
        // phone, or notifications turned off in browser settings. Left alone it
        // fails every morning for ever.
        const status = (caught as { response?: { status?: number } })?.response?.status;

        if (status === 404 || status === 410) {
          gone.push(subscription.endpoint);
        } else {
          console.error("push failed", subscription.endpoint, caught);
        }
      }
    }
  }

  if (gone.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ deleted_at: new Date().toISOString() })
      .in("endpoint", gone);
  }

  if (delivered.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ last_delivered_at: new Date().toISOString(), failure_count: 0 })
      .in("endpoint", delivered);
  }

  // Marked only after delivery, so a failed run tries again on the next hour
  // rather than being silently skipped until tomorrow.
  if (sent > 0) {
    await supabase.rpc("mark_digest_sent", {
      profile_ids: digests.map((digest) => digest.profile_id),
    });
  }

  return Response.json({ sent, dropped: gone.length });
});
