# Tracker — hsrp-dms-fe

**Last reviewed:** 12 Oct 2026

Items that touch only the web app. Items spanning repos, business questions and hardening are in the
[backend tracker](../../hsrp-dms-be/docs/TRACKER.md) (several involve this repo: F-02, O-04, P-06, P-09, P-10, P-12,
B-01, B-03, H-01, H-04). Each item lives in exactly one tracker. Decisions: `../hsrp-dms-be/docs/DECISIONS.md`.

**Status:** Open · In progress · Blocked · Done — **Priority:** P1 breaks a demo flow · P2 needed before real use · P3 nice to have

## Fixes

| ID | Item | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| F-06 | Masters screen calls a hook inside a loop | P3 | Open | `src/pages/Masters.tsx` builds reference lookups with `useQuery` inside `map`. Works because the tab remounts per resource, but breaks the rules of hooks. Replace with `useQueries`. |

## Not built yet

| ID | Item | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| N-01 | Record fitment on the web | P2 | Open | Fitment with photos is Android-only (D17). The API (`POST /api/v1/fitments`, multipart) already accepts any client; add a page (search vehicle, laser codes, upload or webcam photos, submit) only if dealers should also record fitment from a desk. No offline queue on the web. |

## Done

| ID | Item | Commit |
| --- | --- | --- |
| — | Split out of the monorepo with its history; standalone build, synced contracts copy, nginx upstream template (D38–D40) | "Split from the monorepo" commit |
