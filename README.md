# hsrp-fe — HSRP Dealer Management System (web app)

The web app of the HSRP Dealer Management System prototype: staff screens for operations, embossing stations and
administration, plus limited dealer screens (place and track orders, wallet). React + Vite + TypeScript. All data
comes from the backend API; nothing here contacts a real external system.

| Repo | What |
| --- | --- |
| [hsrp-be](../hsrp-be) | API, database, mocks, seed, acceptance script, contracts, decision log — **start here** |
| **hsrp-fe** (this) | Web app |
| [hsrp-mobile-app](../hsrp-mobile-app) | Dealer Android app |

Open items: [docs/TRACKER.md](docs/TRACKER.md) (this repo) and the
[backend tracker](../hsrp-be/docs/TRACKER.md) (cross-repo) · decisions:
[hsrp-be/docs/DECISIONS.md](../hsrp-be/docs/DECISIONS.md) · working in the repo: [AGENTS.md](AGENTS.md).

> **Customer portal disabled (decision D37).** Its code is still in `src/portal` but is not routed, linked or built.

## Run it (Docker)

Start the backend first (in `../hsrp-be`: `docker compose up -d`). Then here:

```bash
docker compose up --build -d
```

Open http://localhost:8080 and sign in (demo users and password: see the backend README). The container serves the
build with nginx and proxies `/api` and `/mock-gateway` to `API_UPSTREAM`, by default the backend on this machine's
port 3000 (`http://host.docker.internal:3000`, decision D40). To change ports or the backend address, copy
`.env.example` to `.env` and edit `WEB_PORT` / `API_UPSTREAM`.

## Develop

Needs Node 20+ and pnpm 9.

```bash
pnpm install
pnpm dev
```

The dev server runs on http://localhost:5175 and proxies the API to `VITE_API_PROXY` (default http://localhost:3000).

| Command | What it does |
| --- | --- |
| `pnpm build` | Contracts drift check, type-check, production build to `dist/` |
| `pnpm typecheck` | TypeScript only |
| `pnpm contracts:sync` | Copy the shared contracts from `../hsrp-be/packages/contracts` into `src/contracts` (D39) |
| `pnpm contracts:check` | Fail if `src/contracts` differs from the backend |
| `pnpm docs:check` | Documentation checks (also run by the pre-commit hook) |

`src/contracts` is a copy of the backend's contracts: never edit it here. Change the backend, then run
`pnpm contracts:sync` and commit.

## Screens

| Area | Screens |
| --- | --- |
| Everyone | Dashboard (staff), Orders (list, detail with timeline, plates, challans, fitment photos, approvals, payments, audit, events), Place order |
| Operations | Approvals (replacements, dealer onboarding), OEM files & uploads (CSV with error report), Wallets, Complaints, Reports (CSV export) |
| Embossing station | Issuance & job cards, Quality check (pass / reject / switch laser code), Sticker printing and reprint, Delivery challans, Rejection approval, Inventory |
| Setup | Masters & prices, Users & roles (devices, API clients), Configuration (settings, templates, print layouts), Audit log, Integration monitor (retry and dead-letter queue, replay), Simulator (VAHAN mode, OEM push and CSV, all SMS / e-mail, payments) |
| Dealer | Home (counts, wallet, appointments, challans in transit), My wallet, Orders, Place order — inward and fitment are on Android |

The click-through script for flows A–L is in the backend README.

## Keeping the docs current

[AGENTS.md](AGENTS.md) (`CLAUDE.md` imports it), the **maintain-docs** skill in `.claude/skills/maintain-docs/`,
`scripts/docs-check.mjs` and the pre-commit hook in `.githooks/` (enabled by `pnpm install`) keep this README,
AGENTS.md, the tracker and the contracts copy in step (decision D41).
