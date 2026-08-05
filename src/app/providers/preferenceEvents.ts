/**
 * Lets Settings tell the rest of the app that display preferences changed,
 * without every screen polling for something that changes twice a year.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToPreferenceChanges(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Called after Settings saves, so the change is visible immediately. */
export function refreshDisplayPreferences(): void {
  for (const listener of listeners) {
    listener();
  }
}
