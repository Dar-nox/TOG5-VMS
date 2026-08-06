# 05 — UI/UX Specification

## UX Priority

TOG 5 VMS must be easy to use for people who are not highly technical, on a
phone as readily as on a computer.

> The system should guide users, not overwhelm them.

**Guiding is not the same as explaining.** The previous version of this
document asked for short explanations of thirteen mechanic's terms. That was
right, and the way it was delivered was wrong: the app ended up with roughly
eighty-five blocks of instructional prose, a paragraph under every heading, an
essay in every empty state, and one list row that gave click-by-click
instructions. The client asked for all of it to be removed.

The rule now: **an interface that has to explain how to operate it is wrong.**
Fix the interface. Keep explanations for the subject matter — what a glow plug
is — and attach them to the word, on request.

## Design System

Everything visual comes from `src/styles/theme.css`. No screen defines a
colour, a size, or a spacing value of its own.

- **Palette** — navy `#102833` and gold `#E0A32E`, taken from the app icon.
  Gold marks the one primary action on a screen and nothing else.
- **Type** — IBM Plex Sans for interface text, IBM Plex Mono for every measured
  value. Self-hosted and subsetted by `scripts/subset-fonts.py`, which exists
  because packaged subsets of Plex drop U+20B1, the peso sign.
- **Measured values are set in the mono face.** Odometers, litres, km/L,
  currency and dates. Both faces share a 600-unit digit, so figures line up in
  columns.
- Eight type sizes, a 4px spacing grid, three radii, one shadow.

## Layout Rules

These are not style preferences. Each one is a bug that was reported.

1. **Use container queries, never viewport breakpoints,** for anything inside
   the content area. The old layout keyed its breakpoints to the window while
   its grids sat in a column ~500px narrower, which is what made content
   overlap between 761px and 1120px — and at 125% browser zoom.
2. **Never put an unbreakable string in a fixed-width box.** A currency amount
   has no break opportunity. Use `Stat` or `MetaItem`, which wrap.
3. **No `line-height: 1`** on anything that can wrap.
4. **Use `dvh`, never `vh`.** On a phone `100vh` is the viewport with the
   address bar hidden.
5. **Nothing gets a `min-width` in pixels.**
6. Everything must work at 320px wide and at 400% zoom.

## Navigation

Five destinations: **Dashboard · Vehicles · Alerts · Reports · Settings.**

Fuel, trips, maintenance, service history and expenses are not destinations.
They are facts about a vehicle and live in tabs inside one. A task starts with
"which van?", not with filtering a fleet-wide table down to one.

- Desktop: a sidebar, collapsible only when asked.
- Phone: five labelled icons in a bottom bar.
- The route carries the vehicle and the tab, so links work and the back button
  steps through the app rather than out of it.

## Screen Structure

Every screen: one `<h1>`, then the content. No eyebrow, no subtitle, no
description of what the screen is for.

Use the primitives in `src/components/ui/`. If a screen needs something they do
not offer, add it there rather than inventing a local variant — the previous
interface had fifteen versions of "a row with a title and some meta".

## Status Colours

Green OK · Amber due soon · Red overdue · Blue informational · Grey archived.

Never colour alone: a `Badge` always contains words. Mappings live in
`src/components/ui/tones.ts` so no screen invents its own.

## Forms

- Mark **optional** fields. Most fields in these forms are required, and an
  asterisk on nine of ten is noise.
- Errors appear against the field they belong to **and** in a summary.
- Every numeric field sets `inputMode` so a phone shows a numeric keypad.
- Prefer a date and a time control over `datetime-local`.
- Fields that are usually left blank go behind one disclosure button.
- Opening a form for editing must scroll to it.

## Destructive Actions

Confirm every one, in a centred dialog — `useConfirm()`.

The confirmation names the record, says what will be affected, and says that
archived records can be restored. "Are you sure?" is not acceptable: it carries
no information. Focus starts on Cancel.

Confirmations work only while they stay rare. Nothing routine opens one.

## Feedback

- Success and failure go through `useToast()`. Success clears itself; failure
  waits to be dismissed.
- Say what happened: "Recorded. Next due 12/09/2026", not "Saved".
- Loading shows a skeleton shaped like what is coming. Buttons keep their label
  and show a spinner — never a gerund, which changes the button's width.

## Photos

The vehicle picture is required: it and the name are how staff recognise a van.
Capture leads with **Take photo** (`capture="environment"`), with a file picker
second. The plate number is never required.

## Help Text

Thirteen mechanic's terms are explained in
`src/components/ui/helpTerms.ts` and shown by `HelpTerm`, which attaches the
explanation to the word and reveals it on request.

Nothing else on a screen explains the screen.

## Accessibility

- Visible focus on everything. Never `outline: none` on `:focus-visible`.
- All text at least 4.5:1 against its background; verify, do not estimate.
- Real buttons and links, never a clickable `div`.
- `aria-current` on the active navigation item; focus moves to the content on
  navigation; a skip link.
- Touch targets at least 44px with 8px between them.
- Motion respects `prefers-reduced-motion`, except where it is the only signal
  that the app is still working.

## Empty States

One short line, and the action if there is one.

> No fuel logged for this vehicle yet.
> [Log the first fill-up]

Not an explanation of what would appear here.
