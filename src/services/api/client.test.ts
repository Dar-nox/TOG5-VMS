import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, invoke, managedFileUrl, setUnauthorizedHandler } from "./client";

function respondWith(status: number, body: unknown) {
  return vi.fn(
    async () =>
      new Response(body === undefined ? "" : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(undefined);
});

describe("managedFileUrl", () => {
  it("builds a URL from a Windows path saved by the server", () => {
    expect(managedFileUrl("C:\\Users\\fleet\\AppData\\vehicle-photos\\photo_1.png")).toBe(
      "/api/files/vehicle-photos/photo_1.png",
    );
  });

  it("handles every managed folder, whichever slash the path used", () => {
    expect(managedFileUrl("/srv/data/fuel-receipts/receipt_2.pdf")).toBe(
      "/api/files/fuel-receipts/receipt_2.pdf",
    );
    expect(managedFileUrl("/srv/data/maintenance-photos/photo_3.webp")).toBe(
      "/api/files/maintenance-photos/photo_3.webp",
    );
  });

  it("returns nothing for missing or unrecognised paths", () => {
    expect(managedFileUrl(undefined)).toBeUndefined();
    expect(managedFileUrl(null)).toBeUndefined();
    expect(managedFileUrl("")).toBeUndefined();
    // Not one of the folders the server will serve, so there is no URL to give.
    expect(managedFileUrl("C:\\Windows\\win.ini")).toBeUndefined();
  });
});

describe("invoke", () => {
  it("posts the arguments to the command and returns the result", async () => {
    const fetchMock = respondWith(200, [{ id: "vehicle_1" }]);
    vi.stubGlobal("fetch", fetchMock);

    const vehicles = await invoke<{ id: string }[]>("list_vehicles", { filter: null });

    expect(vehicles).toEqual([{ id: "vehicle_1" }]);
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/rpc/list_vehicles");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(options.body).toBe(JSON.stringify({ filter: null }));
  });

  it("throws the message the server wrote for the person using the app", async () => {
    vi.stubGlobal("fetch", respondWith(400, { error: "Choose a vehicle before saving." }));

    await expect(invoke("create_fuel_log")).rejects.toThrow("Choose a vehicle before saving.");
  });

  it("reports a signed-out session once, to the handler and the caller", async () => {
    const signedOut = vi.fn();
    setUnauthorizedHandler(signedOut);
    vi.stubGlobal("fetch", respondWith(401, { error: "Please sign in to continue." }));

    await expect(invoke("list_vehicles")).rejects.toMatchObject({ status: 401 });
    expect(signedOut).toHaveBeenCalledTimes(1);
  });

  it("explains an unreachable server rather than leaking the fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const error = await invoke("list_vehicles").catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toContain("Could not reach TOG 5 VMS");
    expect((error as ApiError).status).toBe(0);
  });

  it("still gives a usable message when the server sends no JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>502</html>", { status: 502 })),
    );

    await expect(invoke("list_vehicles")).rejects.toThrow("Something went wrong.");
  });
});
