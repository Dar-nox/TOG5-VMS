/**
 * Who is on the fleet, by id.
 *
 * Records carry `createdBy` as a bare uuid — the read views have always
 * selected it and nothing ever turned it into a name. Rather than joining
 * `profiles` into each of the four detail views, the app reads the profile list
 * once and resolves names itself: it works for every table at once, including
 * any added later, and the fleet has a single-figure number of accounts.
 *
 * Every signed-in user may read this table ("signed in users can see
 * colleagues", migration 2), so a manager sees the same names an owner does.
 */

import { supabase, unwrap } from "./client";

export type PersonName = {
  id: string;
  displayName: string;
};

export async function listPeopleNames(): Promise<PersonName[]> {
  return unwrap(await supabase.from("profiles").select("id, display_name").order("display_name"));
}
