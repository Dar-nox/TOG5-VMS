/**
 * Talks to the TOG 5 VMS server.
 *
 * `invoke` keeps the exact shape the desktop build's Tauri equivalent had —
 * a command name and an arguments object — so every call site in the app
 * stayed as it was when the transport became HTTP.
 */

const API_BASE = "/api";

const MANAGED_FILE_FOLDERS = [
  "vehicle-photos",
  "fuel-receipts",
  "maintenance-receipts",
  "maintenance-photos",
];

const OFFLINE_MESSAGE = "Could not reach TOG 5 VMS. Check your internet connection and try again.";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | undefined;

/**
 * Lets the sign-in screen react when a session expires mid-session, without
 * every screen in the app having to check for it.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | undefined) {
  onUnauthorized = handler;
}

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return apiRequest<T>(`/rpc/${command}`, args ?? {});
}

export async function apiRequest<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }

  return readResponse<T>(response);
}

export async function apiGet<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }

  return readResponse<T>(response);
}

/**
 * Builds the URL for a vehicle photo or a receipt. The folder is read back out
 * of the stored path, so one helper covers all four kinds of managed file.
 */
export function managedFileUrl(filePath?: string | null): string | undefined {
  if (!filePath) {
    return undefined;
  }

  const segments = filePath.replace(/\\/g, "/").split("/").filter(Boolean);
  const fileName = segments[segments.length - 1];
  const folder = segments[segments.length - 2];

  if (!fileName || !folder || !MANAGED_FILE_FOLDERS.includes(folder)) {
    return undefined;
  }

  return `${API_BASE}/files/${folder}/${encodeURIComponent(fileName)}`;
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await readJson(response);

  if (response.ok) {
    return payload as T;
  }

  if (response.status === 401) {
    onUnauthorized?.();
  }

  throw new ApiError(errorMessage(payload, response.status), response.status);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = (payload as { error: unknown }).error;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (status === 401) {
    return "Your sign-in has expired. Please sign in again.";
  }

  return "Something went wrong. Please try again.";
}
