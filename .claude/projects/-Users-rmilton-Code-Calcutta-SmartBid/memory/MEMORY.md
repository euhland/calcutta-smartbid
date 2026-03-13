# Calcutta SmartBid — Project Memory

## What It Is
Live NCAA Calcutta auction cockpit. Next.js 15 / React 19 / TypeScript. Deployed on Vercel + Supabase. Built with Codex (OpenAI's coding agent). This is a decision-support tool for an auction operator during a live March Madness Calcutta.

## Stack
- Next.js 15, React 19, TypeScript
- Supabase (production persistence + realtime)
- Vitest (unit tests)
- Vercel (hosting)
- No external UI library — custom CSS in globals.css

## Key Architectural Files
- `src/lib/types.ts` — all domain types and Zod schemas
- `src/lib/repository/index.ts` — repository abstraction (local JSON or Supabase)
- `src/lib/config.ts` — runtime env validation; fails fast for bad config
- `src/lib/dashboard.ts` — AuctionDashboard view-model assembly
- `src/lib/engine/simulation.ts` — Monte Carlo tournament simulation
- `src/lib/engine/recommendations.ts` — max-bid guidance, stoplight, drivers
- `src/lib/session-analysis.ts` — CSV/analysis ranking and budget rows
- `src/lib/team-intelligence.ts` — scouting profile scoring and signal extraction
- `src/lib/providers/projections.ts` — projection ingest, override application
- `src/lib/providers/csv-projections.ts` — CSV projection parsing
- `src/lib/hooks/use-session-dashboard.ts` — client polling/realtime hook
- `src/lib/auth.ts` — cookie-based auth (platform vs session scope)
- `src/lib/session-security.ts` — shared code hashing/encryption

## Routes
- `/` — landing login (routes platform admins to /admin, session members to /session/[id])
- `/admin` — admin center (platform-level: users, syndicates, data sources, sessions)
- `/admin/sessions/[id]` — session admin (access, shared code, payout, syndicates, imports)
- `/session/[id]` — live room (Auction + Analysis tabs; admin/viewer role)
- `/csv-analysis` — legacy, should redirect into live room Analysis tab
- API under `/api/admin/...` and `/api/sessions/...`

## Auth Model
- Landing accepts email + shared code → routes by scope
- Platform admins: configured via PLATFORM_ADMIN_EMAILS + PLATFORM_ADMIN_SHARED_CODE
- Session members: assigned by platform admin with role (admin | viewer)
- Cookie-based sessions; no named-user auth yet

## Storage Backends
- `CALCUTTA_STORAGE_BACKEND=local` (dev default, JSON file in OS temp)
- `CALCUTTA_STORAGE_BACKEND=supabase` (required for Vercel/production)
- Config fails fast on Vercel if backend != supabase

## Key Env Vars
- CALCUTTA_STORAGE_BACKEND
- PLATFORM_ADMIN_EMAILS, PLATFORM_ADMIN_NAMES, PLATFORM_ADMIN_SHARED_CODE
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- MOTHERSHIP_SYNDICATE_NAME (defaults to "Mothership")
- SPORTS_PROJECTIONS_URL (remote API), SPORTS_PROJECTIONS_CSV_FILE (CSV file path)
- CALCUTTA_STORE_FILE (override local JSON store path)

## Domain Concepts
- **Mothership**: the fixed focus syndicate for all recommendation math; not user-selectable
- **Projectedpot**: provisional pot total (not real locked pot); drives EV/payout math
- **Payout structure**: round percentages + projectedPot; no house take %
- **Analysis settings**: targetTeamCount, maxSingleTeamPct
- **Stoplight**: buy/caution/pass recommendation signal
- **SessionRole**: admin (operator) | viewer (read-only)

## Invariants (must not break)
- Production must use `CALCUTTA_STORAGE_BACKEND=supabase`
- Purchases are authoritative; no UI drift from persisted state
- Viewer mode stays read-only
- Do NOT rerun full Monte Carlo on every bid keystroke — use cached simulation
- Local form edits must not be overwritten by background refresh

## Test Commands
```bash
npm run lint
npm run test
npm run build
```

## Current State (as of 2026-03-12, post merge of PR #20)
- Redesigned UI live across all surfaces
- Admin center: org users, syndicate catalog, data sources, session list
- Session admin: access, shared code, payout structure, analysis settings, data imports, archive/delete
- Live room: Auction + Analysis tabs
- Session lifecycle: archive + permanent delete (requires name confirmation)
- CSV import: supported as data source kind
- Archive email not exposed in dashboard payload

## UX Shipped (PR #20, merged 2026-03-12)
- **Team combobox**: typeahead replaces native select; seed+name display, live filter, keyboard nav, sold teams greyed, auto-save on selection, reopens on click-while-focused
- **Call panel**: shows `rationale[0]` (conviction score) + `rationale[3]` (conflict) live from recommendation payload; no more canned static text
- **Analysis/Auction decoupled**: `analysisTeamId` is independent state; clicking Analysis table rows doesn't mutate live nominated team; initializes to `nominatedTeamId` on open
- **Auth simplified**: removed login mode tabs (server determines role from credentials)
- **Hero slim**: removed description, added teams-available pill, smaller h1
- **Bid dirty state**: label shows "Current bid — unsaved" when pending
- **Shortcut kbd legend**: proper `<kbd>` key legend replaces cryptic pill
- **Bankroll labels**: "(est.)" suffix on all estimated values
- **UI cleanup**: no backend storage pill, neutral Record Purchase button, removed Quick Select dropdown

## Known Gaps / Backlog
- No undo/correction for mistaken purchases
- No "actual pot locked" final workflow
- Lint uses deprecated `next lint`
- Old sessions pre-Mothership-first may need admin correction

## Worktree / Branch Convention
- Main branch: `main` on GitHub (rmilton/calcutta-smartbid)
- Codex branches: `codex/...`
- Claude branches: `claude/...`
- Worktrees live at: `/Users/rmilton/code/Calcutta-SmartBid/.claude/worktrees/`
- Dev server: port 3003, configured in `.claude/launch.json` inside the worktree
