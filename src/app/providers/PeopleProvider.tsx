import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { listPeopleNames, type PersonName } from "../../services/api/people";
import { IMPORTED_AUTHOR, PeopleContext, type PeopleLookup } from "./peopleContext";

/**
 * Reads the fleet's accounts once so every record can name whoever entered it.
 *
 * Loaded here rather than joined into each read view: the views already carry
 * `created_by`, and resolving it in one place covers every table at once
 * instead of four view definitions that each have to be restated in full to
 * gain one column. The fleet has a single-figure number of accounts, so this
 * is one small request for the whole session.
 *
 * Accounts change rarely, and the cost of being briefly out of date is a name
 * missing from a footnote — so there is no polling here.
 */
export function PeopleProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<PersonName[]>([]);

  const load = useCallback(async () => {
    try {
      setPeople(await listPeopleNames());
    } catch {
      // Attribution is a footnote. If this fails, records still show what they
      // are and what they cost, and the screen shows its own error if the data
      // behind it failed too.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<PeopleLookup>(() => {
    const byId = new Map(people.map((person) => [person.id, person.displayName]));

    return {
      nameFor(id?: string | null): string {
        if (!id) {
          return IMPORTED_AUTHOR;
        }

        // An id with no matching account. The accounts table has no delete
        // policy at all, so this should not happen — but a name is not worth
        // rendering "undefined" over.
        return byId.get(id) || "Someone no longer listed";
      },
    };
  }, [people]);

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}
