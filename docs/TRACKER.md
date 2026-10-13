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
| — | Billing page (setup per OEM and OEM × dealer, unbilled charges, bills with PDF, Run billing now, send again, mark paid), postpaid info on the order's Payment tab (D46); Bulk upload OEM data card with template download on OEM files & uploads (D47) | "Billing and OEM bulk upload" commit |
| — | Quality check: **Upload photos** of each embossed plate, OCR result per plate, **Pass** disabled until every plate reads the order's number; order page Plates tab lists every OCR reading (embossing and fitment, refused attempts included) (D45) | "Plate photo OCR" commit |
| — | Issuance: the box suggestions showed only the first 8 boxes and could leave out a needed plate size (car plates); now up to 3 boxes per needed size | "OEM vehicle data, reports and simulator support" commit |
| — | Order page refreshes every 2 s while the server moves the order on (validation, VAHAN post), 5 s otherwise | same commit |
| — | Simulator page: new-vehicle demo batch (prepare, download or send Kranti's vehicle data file); OEM files page: OEM vehicle data on file; validation steps shown by name (D42) | same commit |
| — | Split out of the monorepo with its history; standalone build, synced contracts copy, nginx upstream template (D38–D40) | "Split from the monorepo" commit |
