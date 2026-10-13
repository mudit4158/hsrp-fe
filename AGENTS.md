# AGENTS.md — hsrp-dms-fe

**Last updated:** 12 Oct 2026

Guidance for anyone (human or coding agent) working in this repository. Read it before changing anything, and keep it
true: if you change how the repo is built, run, structured or tested, update this file in the same commit.

## What this repo is

The web app of the **HSRP Dealer Management System prototype**: React 18 + Vite + TypeScript, TanStack Query, React
Router. Staff screens (dashboard, orders, approvals, OEM files with bulk upload (D47), billing (D46), station issuance /
QC with plate photo OCR (D45) /
stickers / challans / rejection approval, inventory, wallets, complaints, reports, masters, users, configuration, audit, integration monitor,
simulator) and limited dealer screens (place and track orders, wallet). The customer portal code in `src/portal` is
**detached** (decision D37): not routed, not linked, not in the build.

It has no business logic and no database: everything goes through the backend API.

| Sibling repo (under `C:\workspace\hsrp\`) | Relationship |
| --- | --- |
| `hsrp-dms-be` | The API this app calls; owns the shared **contracts**, the **decision log** and the system tracker |
| `hsrp-dms-android` | The dealer app; independent of this repo |

Decisions: `../hsrp-dms-be/docs/DECISIONS.md` (single log for all repos) and the
[High-Level Design](https://claude.ai/code/artifact/d7fce61b-0fe9-4bae-a8b2-7286684b9de4).

## Layout

```
src/
  main.tsx, App.tsx      bootstrap, routes, role-based navigation (NAV)
  api.ts                 fetch client: JWT, Idempotency-Key, RFC 7807 errors → ApiError
  auth.tsx               session and permissions (can / hasRole)
  ui.tsx, styles.css     small UI kit (Page, Card, Table, Modal, Tabs, badges, toasts) and design tokens
  format.ts              money, dates (IST), status labels
  pages/                 staff and dealer screens (station/, admin/, dealer/, orders/)
  portal/                customer portal — DETACHED (D37), kept for re-enabling (tracker B-01 in the backend)
  contracts/             SYNCED COPY of hsrp-dms-be/packages/contracts/src — never edit here (D39)
scripts/                 sync-contracts.mjs, docs-check.mjs
nginx.conf.template      production server: serves the build, proxies /api and /mock-gateway to ${API_UPSTREAM}
docs/TRACKER.md          open items that touch only this repo
.claude/skills/          maintain-docs skill
.githooks/               pre-commit (docs-check incl. contracts drift, typecheck)
```

## Commands

Needs Node 20+ and pnpm 9. The backend must be running for the app to work (`hsrp-dms-be`: `docker compose up -d`).

| Command | What it does |
| --- | --- |
| `pnpm install` | Install dependencies; also enables the git hooks (`prepare` sets `core.hooksPath=.githooks`) |
| `pnpm dev` | Vite dev server on http://localhost:5175, proxying `/api` and `/mock-gateway` to `VITE_API_PROXY` (default http://localhost:3000) |
| `pnpm build` | Contracts drift check, type-check, production build to `dist/` |
| `pnpm typecheck` | TypeScript only |
| `pnpm contracts:sync` | Copy the backend's contracts into `src/contracts` (backend checked out at `../hsrp-dms-be`, or set `CONTRACTS_SRC`) |
| `pnpm contracts:check` | Fail if `src/contracts` differs from the backend (warns and passes if the backend is not checked out) |
| `pnpm docs:check` | Documentation and consistency checks (also run by the pre-commit hook) |
| `docker compose up --build -d` | Build and serve on http://localhost:8080 via nginx; proxies to `API_UPSTREAM` (default `http://host.docker.internal:3000`) |

Demo users and their password (`SEED_PASSWORD`) are defined by the backend; see its README. Never print or commit
passwords or tokens.

## Conventions

- All requests go through `src/api.ts` (`api.get/post/...`, `openFile` for PDFs/CSV). Mutations that the API marks
  `@Idempotent` must pass `{ idempotent: true }` (adds an `Idempotency-Key`). Use `uuid()` from `api.ts`, not
  `crypto.randomUUID()` (missing on plain-HTTP LAN addresses).
- Show errors with `useAction()` / `useToast()` / `ErrorBox` (they read RFC 7807 `detail` and field `errors`).
- Gate screens and buttons by permission (`useAuth().can(...)`) matching the backend's `@RequirePermission`. The
  backend is the real gate; the UI only hides what the user cannot do.
- Request/response shapes and enums come from `@hsrp/contracts` (alias to `src/contracts`). If you need a contract
  change, make it in `hsrp-dms-be/packages/contracts`, then `pnpm contracts:sync` here.
- New screen: add it to `NAV` and the routes in `App.tsx`; use the UI kit; keep IST dates via `format.ts`.
- Styling uses the tokens at the top of `styles.css`; no CSS framework.
- The on-screen simulator (`pnpm sim` in hsrp-dms-be, `sim/scenes`) finds fields by their label text and buttons by
  their names (e.g. QC "Upload photos", "Read the photos", "Pass"). When you rename one, update the simulator in the
  same change.
- Comments: explain why, not what; match the surrounding style.

## Safety

- The app talks only to the local backend. Never point it at real external systems.
- Never push or create remotes without explicit confirmation from the user.

## Keeping documentation current (required)

Every change that affects behaviour, setup, commands, screens, decisions or open items updates the docs **in the same
commit**. Use the **maintain-docs** skill (`.claude/skills/maintain-docs/SKILL.md`):

| You changed… | Update |
| --- | --- |
| Commands, scripts, env vars, ports | `README.md`, this file, `.env.example` |
| Screens, navigation, conventions | this file (Layout / Conventions); README if it changes how to use the app |
| A design choice | new decision in `../hsrp-dms-be/docs/DECISIONS.md` **and** the HLD (append-only) |
| Work only in this repo (done / found / deferred) | `docs/TRACKER.md` here |
| Work spanning repos | the backend tracker (`../hsrp-dms-be/docs/TRACKER.md`) |
| Contracts | never edit `src/contracts`; sync from the backend |

`pnpm docs:check` (and the pre-commit hook) checks required files, review dates, tracker IDs and statuses, that every
package script is documented, and that `src/contracts` matches the backend. It warns when code changes without any
doc change.

## Gotchas

- The Docker image cannot run the contracts drift check (the backend is not in its build context); run
  `pnpm contracts:check` locally before building the image.
- `nginx.conf.template` is rendered with envsubst; only `${API_UPSTREAM}` is substituted (`NGINX_ENVSUBST_FILTER`).
- The mock payment gateway page is served by the backend under `/mock-gateway`; keep that proxy rule.
- The dev server runs on **5175** (5173/5174 are used by other local projects).

## Where things are tracked

- This repo's items: `docs/TRACKER.md`. Cross-repo items, business questions and hardening: the backend tracker.
