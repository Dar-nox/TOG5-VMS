import { supabase, unwrap, unwrapVoid } from "./client";

export type NotificationPreferences = {
  /** Wall-clock in the fleet's timezone, "HH:MM". */
  sendAt: string;
  scope: "all" | "overdue";
  weekdaysOnly: boolean;
  /** Hours a trip may stay open before it is mentioned. Null is off. */
  openTripHours?: number | null;
};

const DEFAULTS: NotificationPreferences = {
  sendAt: "07:00",
  scope: "all",
  weekdaysOnly: false,
  openTripHours: null,
};

/** Nobody has a row until they change something, so absence means defaults. */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const rows = unwrap<
    {
      sendAt: string;
      scope: string;
      weekdaysOnly: boolean;
      openTripHours: number | null;
    }[]
  >(await supabase.from("notification_preferences").select("*").limit(1));

  const row = rows.length > 0 ? rows[0] : undefined;

  if (!row) {
    return DEFAULTS;
  }

  return {
    // Postgres hands back "07:00:00"; the time input wants "07:00".
    sendAt: row.sendAt.slice(0, 5),
    scope: row.scope === "overdue" ? "overdue" : "all",
    weekdaysOnly: row.weekdaysOnly,
    openTripHours: row.openTripHours,
  };
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<void> {
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return;
  }

  unwrapVoid(
    await supabase.from("notification_preferences").upsert(
      {
        profile_id: data.user.id,
        send_at: preferences.sendAt,
        scope: preferences.scope,
        weekdays_only: preferences.weekdaysOnly,
        open_trip_hours: preferences.openTripHours ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    ),
  );
}

export type PushSubscriptionRequest = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
};

/**
 * Records this browser as somewhere the daily digest can reach.
 *
 * Keyed on the endpoint rather than the person: the same account signed in on a
 * phone and an office computer is two subscriptions, and the push service can
 * hand back the same endpoint again after a reinstall — so this upserts rather
 * than piling up rows that all point at one device.
 */
export async function saveSubscription(request: PushSubscriptionRequest): Promise<void> {
  unwrapVoid(
    await supabase.from("push_subscriptions").upsert(
      {
        endpoint: request.endpoint,
        p256dh: request.p256dh,
        auth: request.auth,
        user_agent: request.userAgent ?? null,
        failure_count: 0,
        deleted_at: null,
      },
      { onConflict: "endpoint" },
    ),
  );
}

export async function removeSubscription(endpoint: string): Promise<void> {
  unwrapVoid(
    await supabase
      .from("push_subscriptions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("endpoint", endpoint),
  );
}
