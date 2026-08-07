import { afterEach, describe, expect, it, vi } from "vitest";

// The module reads configuration at import time, so it has to exist first.
vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-key");

const { ApiError, setUnauthorizedHandler, unwrap, unwrapVoid } = await import("./client");

type Failure = { code?: string; message: string; details?: string; hint?: string };

function failure(code: string, message = "boom"): { data: null; error: Failure } {
  return { data: null, error: { code, message } as Failure };
}

afterEach(() => {
  setUnauthorizedHandler(undefined);
});

describe("unwrap", () => {
  it("returns the data when there is no error", () => {
    expect(unwrap({ data: [{ id: "vehicle_1" }], error: null })).toEqual([{ id: "vehicle_1" }]);
  });

  it("throws, because every caller in the app expects a throw", () => {
    // supabase-js resolves rather than rejecting. If this ever stops throwing,
    // 43 catch blocks silently stop catching and the app renders undefined.
    expect(() => unwrap(failure("42501") as never)).toThrow(ApiError);
  });

  it("passes through the message the database wrote for the user", () => {
    const written =
      "Completion odometer cannot be lower than the previous completed odometer (12000 km).";

    expect(() =>
      unwrap({ data: null, error: { code: "P0001", message: written } } as never),
    ).toThrow(written);
  });

  it("translates constraint codes into something worth reading", () => {
    expect(() => unwrap(failure("23505") as never)).toThrow("That already exists.");
    expect(() => unwrap(failure("23503") as never)).toThrow(
      "That refers to something which no longer exists.",
    );
    expect(() => unwrap(failure("23514") as never)).toThrow(/not valid/);
    expect(() => unwrap(failure("42501") as never)).toThrow(/do not have permission/);
  });

  it("reports an expired session as one", () => {
    expect(() => unwrap(failure("PGRST301") as never)).toThrow(/sign in again/);
  });

  it("tells the sign-in screen once when the session has gone", () => {
    const signedOut = vi.fn();
    setUnauthorizedHandler(signedOut);

    expect(() => unwrap(failure("PGRST301") as never)).toThrow();
    expect(signedOut).toHaveBeenCalledTimes(1);
  });

  it("does not cry wolf on an ordinary validation failure", () => {
    const signedOut = vi.fn();
    setUnauthorizedHandler(signedOut);

    expect(() => unwrap(failure("23514") as never)).toThrow();
    expect(signedOut).not.toHaveBeenCalled();
  });

  it("marks the error so callers can tell the two apart", () => {
    const thrown = (() => {
      try {
        unwrap(failure("PGRST301") as never);
      } catch (error) {
        return error as InstanceType<typeof ApiError>;
      }
    })();

    expect(thrown?.isSignedOut).toBe(true);
    expect(thrown?.code).toBe("PGRST301");
  });

  // A request that never arrived carries no Postgres code, because nothing ran
  // to give it one. Which of the two messages comes back is the whole point:
  // one sends somebody to their router and the other does not.
  function whileOffline<T>(offline: boolean, body: () => T): T {
    const wasOnline = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { value: !offline, configurable: true });

    try {
      return body();
    } finally {
      Object.defineProperty(navigator, "onLine", { value: wasOnline, configurable: true });
    }
  }

  it("blames the connection only when the device is actually offline", () => {
    whileOffline(true, () => {
      expect(() => unwrap({ data: null, error: { message: "Failed to fetch" } } as never)).toThrow(
        /This device is offline/,
      );
    });
  });

  it("blames the server when the connection is fine and the request still failed", () => {
    whileOffline(false, () => {
      // A paused Supabase project looks exactly like this, and telling somebody
      // to check their wi-fi is an hour at the router for nothing.
      expect(() => unwrap({ data: null, error: { message: "Failed to fetch" } } as never)).toThrow(
        /not answering/,
      );
    });
  });

  it("leaves a real database error alone", () => {
    whileOffline(false, () => {
      // It has a code, so something ran. Whatever it says is more useful than
      // a guess about the network.
      expect(() => unwrap(failure("XX000", "internal error") as never)).toThrow("internal error");
    });
  });

  it("still throws for a call whose result is not used", () => {
    expect(() => unwrapVoid(failure("42501") as never)).toThrow(ApiError);
    expect(() => unwrapVoid({ error: null })).not.toThrow();
  });

  it("returns an empty list rather than throwing when nothing matched", () => {
    expect(unwrap({ data: [], error: null })).toEqual([]);
  });
});

describe("column names", () => {
  it("converts Postgres columns to the names the screens read", () => {
    expect(
      unwrap({
        data: { vehicle_name: "Service Van 1", current_odometer: 1200 },
        error: null,
      }),
    ).toEqual({ vehicleName: "Service Van 1", currentOdometer: 1200 });
  });

  it("handles the awkward ones", () => {
    expect(
      unwrap({
        data: {
          computed_km_per_liter: 10,
          computed_l_per_100km: 10,
          is_full_tank: true,
        },
        error: null,
      }),
    ).toEqual({ computedKmPerLiter: 10, computedLPer100km: 10, isFullTank: true });
  });

  it("reaches into lists and nested rows", () => {
    expect(
      unwrap({
        data: [{ vehicle_id: "1", trip_drivers: [{ driver_name: "Maria Santos" }] }],
        error: null,
      }),
    ).toEqual([{ vehicleId: "1", tripDrivers: [{ driverName: "Maria Santos" }] }]);
  });

  it("leaves values alone, only names", () => {
    expect(
      unwrap({ data: { notes: "changed_oil_and_filter", amount: null }, error: null }),
    ).toEqual({ notes: "changed_oil_and_filter", amount: null });
  });

  it("leaves an already-camelCase payload untouched", () => {
    // dashboard_overview builds its JSON in the right shape already.
    expect(unwrap({ data: { vehicleSummary: { activeCount: 3 } }, error: null })).toEqual({
      vehicleSummary: { activeCount: 3 },
    });
  });
});
