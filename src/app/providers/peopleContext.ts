import { createContext, useContext } from "react";

/**
 * Turns the `createdBy` uuid on a record into something readable.
 *
 * Falls back to a resolver that names nothing rather than throwing when there
 * is no provider, for the same reason the formatters do: a line saying who
 * entered a record should never be the reason a screen fails to render.
 */
export type PeopleLookup = {
  /** The display name for an id, or the right words when there is no name. */
  nameFor: (id?: string | null) => string;
};

/**
 * Records imported from the desktop app have no author, and saying so is more
 * honest than leaving a blank — there was one shared login over there and
 * nobody in this system typed them.
 */
export const IMPORTED_AUTHOR = "Imported from desktop";

export const PeopleContext = createContext<PeopleLookup>({
  nameFor: () => IMPORTED_AUTHOR,
});

export function usePeople(): PeopleLookup {
  return useContext(PeopleContext);
}
