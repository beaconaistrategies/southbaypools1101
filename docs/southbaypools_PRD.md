# Product Requirements Document (PRD)
# South Bay Pools — Sports Pool Platform

**Version:** 1.0
**Last Updated:** 2026-03-08
**Status:** Living Document

---

## 1. Overview

South Bay Pools is a multi-tenant sports pool platform that allows operators to create and manage football squares contests, golf survivor pools, and golf earnings pools. Participants join via public links with no account required.

### 1.1 Vision

A turnkey platform for running social sports pools — football squares for game day, golf survivor picks for weekly tournaments, and earnings-based golf pools with live scoring. Simple for participants, powerful for operators.

### 1.2 Target Users

| Role | Description |
|------|-------------|
| **Operator** | Organization or individual running pools (e.g., a bar, office, friend group) |
| **Admin** | Manages an operator's contests, pools, and team members |
| **Manager** | Delegated access to specific contests within an operator |
| **Participant** | Joins pools and makes picks — no account required |

---

## 2. Product Architecture

### 2.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL (Neon Serverless) via Drizzle ORM |
| Auth | Passport.js, express-session, crypto.scrypt |
| Data | DataGolf API (rankings, fields, live scoring) |
| Hosting | Vercel (serverless functions + static frontend) |
| Notifications | n8n webhooks |

### 2.2 Multi-Tenancy Model

- Each **Operator** is an isolated tenant
- Users (admins/managers) belong to an operator
- All contests, pools, and entries are scoped to an operator
- First registered user auto-creates the operator and becomes `super_admin`
- Plans: `free`, `basic`, `pro` (controls `maxContests`)

### 2.3 Deployment

- **Production:** Vercel serverless (`api/index.js` bundled with esbuild)
- **Database:** Neon PostgreSQL with WebSocket driver
- **Build pipeline:** `vite build` (frontend) → `esbuild` (serverless bundles)
- **Regions:** `iad1` (US East)

---

## 3. Feature Specifications

### 3.1 Authentication & User Management

#### 3.1.1 Admin Authentication
- **Registration:** Email + password → creates operator + super_admin user
- **Login:** Email + password with session cookie
- **Password hashing:** `crypto.scrypt` with random salt
- **Sessions:** `express-session` with `memorystore`

#### 3.1.2 Role-Based Access Control (RBAC)
| Role | Permissions |
|------|------------|
| `super_admin` | Full operator control, user management, all contests |
| `admin` | Create/manage contests, manage members |
| `manager` | Manage assigned contests only |
| `member` | View-only access |
| `trial` | Limited access |

#### 3.1.3 Participant Access
- No account required — identified by email
- Magic link access via unique `manageToken` per entry
- Email-based lookup for "My Contests" feature

#### 3.1.4 User Management (Admin)
- List all users within operator
- Promote/demote roles (within hierarchy)
- Assign managers to specific contests

---

### 3.2 Football Squares

#### 3.2.1 Contest Creation
| Field | Description |
|-------|------------|
| Name | Contest display name |
| Slug | URL-friendly identifier (auto-generated, editable) |
| Event Date | Game date |
| Top Team / Left Team | Team names for grid axes |
| Axis Numbers | Custom 0-9 assignments per axis (randomizable) |
| Layer Labels | Multi-layer support (e.g., Q1, Q2, Q3, Q4) |
| Layer Colors | Color coding per layer |
| Red Rows Count | Highlighted rows for special squares |
| Prizes | Flexible prize structure (JSONB) |
| Status | `open` (accepting claims) or `locked` |
| Webhook URL | n8n notification endpoint |

#### 3.2.2 Square Grid
- 10x10 grid = 100 squares per contest
- Each square has: index, row, col, status, holder info
- Statuses: `available`, `taken`, `disabled`
- Multi-layer display (quarter-by-quarter views)

#### 3.2.3 Square Operations
| Action | Who | Description |
|--------|-----|------------|
| Claim square | Participant | Select specific square, enter name/email |
| Random claim | Participant | System assigns random available square |
| Reserve squares | Admin | Pre-assign squares via templates |
| Disable squares | Admin | Remove squares from play |
| Mark winners | Admin | Set Q1/Q2/Q3/Q4 winners |

#### 3.2.4 Contest Cloning
- Clone contest with all settings (teams, prizes, axis numbers)
- Squares reset to available
- New slug auto-generated

#### 3.2.5 Square Templates
- Save reserved square configurations as reusable templates
- Apply templates to new contests for quick setup

#### 3.2.6 Notifications
- Webhook fired on square claim with payload:
  - Event type, contest info, square details, holder info

---

### 3.3 Golf Survivor Pools

#### 3.3.1 Pool Configuration
| Field | Description |
|-------|------------|
| Name | Pool display name |
| Slug | URL-friendly identifier |
| Season | PGA Tour season year |
| Entry Fee | Display string (e.g., "$50") |
| Prize Pool | Display string (e.g., "$500") |
| Status | `upcoming`, `active`, `completed` |
| Current Week | Manually set or auto-detected |
| Pick Deadline Hours | Hours before tournament start |
| Show Picks Override | Admin can reveal all picks early |
| Webhook URL | Notification endpoint |

#### 3.3.2 Tournament Schedule
- Loaded from CSV: `data/pga-{season}-schedule.csv`
- Fields: week number, tournament name, start/end dates, course
- Auto-detection of current week based on date ranges
- States: `in_progress`, `upcoming`, `between_tournaments`, `season_over`

#### 3.3.3 Entry Management
- Participants sign up with name + email
- Each entry gets a unique `manageToken` for passwordless access
- Multiple entries per participant allowed
- Entry statuses: `active`, `eliminated`
- Track `eliminatedWeek` for history

#### 3.3.4 Pick System
| Rule | Description |
|------|------------|
| One pick per week | Unique constraint: entry + week |
| No golfer reuse | `usedGolfers` array tracks history |
| Deadline enforcement | Picks lock X hours before tournament start |
| Pick editing | Allowed before deadline passes |
| Auto-pick | System selects if participant misses deadline |
| Pick masking | Other participants' picks hidden until deadline |
| Admin override | Admin can make/edit picks for any entry |
| Golfer reset | Admin can remove golfer from used list |

#### 3.3.5 Pick Audit Trail
- `golf_pick_history` table tracks all changes
- Records: who changed, old value, new value, reason, timestamp

#### 3.3.6 Elimination & Results
- Pick result: `pending` → `survived` or `eliminated`
- Eliminated entries marked with week number
- Leaderboard shows active vs eliminated entries

#### 3.3.7 Leaderboard
- Public view at `/golf/pool/:poolId/leaderboard`
- Shows: entry name, status, picks history, current pick
- **Pick masking:** Current week picks hidden until deadline passes
- Admin `showPicksOverride` bypasses masking
- CSV export of all entries and picks

#### 3.3.8 DataGolf Integration (Survivor)
- `fetchTournamentField()` — get available golfers for current tournament
- Returns: player name, DG ID, country, rankings
- 15-minute cache to reduce API calls

---

### 3.4 Golf Earnings Pools

#### 3.4.1 Pool Configuration
| Field | Description |
|-------|------------|
| Name | Pool display name |
| Slug | URL-friendly identifier |
| Tournament Name | Linked PGA tournament |
| Tournament DG ID | DataGolf tournament identifier |
| Season | Year |
| Entry Fee | Numeric (cents) |
| Max Entries Per Email | Limit duplicate entries |
| Status | `setup` → `open` → `locked` → `live` → `completed` |
| Purse Total | Tournament purse in cents |
| Payout Structure | JSONB payout tiers |
| Rankings Cache | Pre-calculated leaderboard (JSONB) |

#### 3.4.2 Tiered Golfer Selection
| Tier | Description |
|------|------------|
| Tier 1 | Elite golfers (top ranked) |
| Tier 2 | Contenders |
| Tier 3 | Mid-field |
| Tier 4 | Long shots |

- Admin assigns golfers to tiers based on DG/OWGR rankings
- `assignTiers()` auto-assigns based on ranking cutoffs
- Each entry selects exactly one golfer per tier

#### 3.4.3 Entry Submission
- Participant selects 4 golfers (one per tier)
- Validated: golfer must exist in tier, no duplicate golfers
- Email-based identification

#### 3.4.4 Live Scoring Engine (`earningsEngine.ts`)
| Function | Description |
|----------|------------|
| `refreshEarnings()` | Fetch live data from DataGolf, calculate earnings |
| `calculateEarningsFromPosition()` | Handle ties (average payouts across tied positions) |
| `startScoringLoop()` | Auto-refresh on interval |
| `stopScoringLoop()` | Stop auto-refresh |

- PGA Tour standard payout structure (65 positions + ties)
- Updates: golfer position, earnings, status (active/cut/wd/dq)
- Re-ranks all entries by total earnings
- Caches rankings in `rankingsCache` for fast reads

#### 3.4.5 Scoreboard
- Public real-time leaderboard
- Shows: rank, entry name, golfer selections, per-golfer earnings, total
- Updates as tournament progresses

---

### 3.5 Public Discovery

#### 3.5.1 Hub Page (`/`)
- Lists all open contests and pools across operators
- Entry point for participants

#### 3.5.2 Join Page (`/join`)
- Golf pool signup directory
- Links to individual pool signup forms

#### 3.5.3 My Contests (`/my-contests`)
- Email-based lookup
- Find all contests/pools a participant has joined
- Links to manage entries

---

## 4. API Reference

### 4.1 Auth Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register admin + create operator |
| POST | `/api/auth/login` | Public | Admin login |
| GET | `/api/auth/user` | Admin | Get current user + operator |
| GET | `/api/participant/user` | Session | Get participant profile |

### 4.2 Contest Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/contests` | Admin | List operator contests |
| POST | `/api/contests` | Admin | Create contest |
| GET | `/api/contests/:id` | Admin | Get contest (UUID or slug) |
| PATCH | `/api/contests/:id` | Admin | Update contest |
| DELETE | `/api/contests/:id` | Admin | Delete contest |
| POST | `/api/contests/:id/clone` | Admin | Clone contest |
| GET | `/api/contests/:id/squares` | Admin | Get squares |
| PATCH | `/api/contests/:id/squares/:index` | Public | Claim/update square |
| POST | `/api/contests/:id/randomsquare` | Public | Claim random square |

### 4.3 Golf Pool Endpoints (Admin)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/golf/pools` | Admin | List pools |
| POST | `/api/golf/pools` | Admin | Create pool |
| PATCH | `/api/golf/pools/:id` | Admin | Update pool |
| DELETE | `/api/golf/pools/:id` | Admin | Delete pool |
| POST | `/api/golf/pools/:poolId/entries` | Admin | Add entry |
| GET | `/api/golf/pools/:poolId/entries` | Admin | List entries |
| GET | `/api/golf/pools/:poolId/export-csv` | Admin | Export CSV |
| PATCH | `/api/golf/entries/:id` | Admin | Update entry |
| DELETE | `/api/golf/entries/:id` | Admin | Delete entry |
| POST | `/api/golf/entries/:entryId/admin-pick` | Admin | Make pick for entry |
| POST | `/api/golf/entries/:entryId/reset-golfer` | Admin | Reset golfer usage |

### 4.4 Golf Pool Endpoints (Participant)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/golf/entries/:entryId/picks` | Token | Submit pick |
| PUT | `/api/golf/entries/:entryId/picks/:week` | Token | Edit pick |
| POST | `/api/golf/entries/:entryId/picks/:week` | Token | Auto-pick |

### 4.5 Golf Pool Endpoints (Public)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/public/golf/pools/:poolId` | Public | Pool info |
| GET | `/api/public/golf/pools/:poolId/leaderboard` | Public | Leaderboard |
| GET | `/api/golf/pools/:poolId/entries/email/:email` | Public | Entries by email |
| GET | `/api/golf/pools/:poolId/current-week` | Public | Current week |
| GET | `/api/golf/pools/:poolId/field` | Public | Tournament field |
| GET | `/api/golf/entry/token/:token` | Public | Entry by token |

### 4.6 Earnings Pool Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/earnings-pools` | Admin | List pools |
| POST | `/api/earnings-pools` | Admin | Create pool |
| GET | `/api/earnings-pools/:poolId/public` | Public | Pool info |
| GET | `/api/earnings-pools/:poolId/golfers` | Public | Golfers by tier |
| POST | `/api/earnings-pools/:poolId/entries` | Public | Join pool |
| GET | `/api/earnings-pools/:poolId/scoreboard` | Public | Live rankings |

### 4.7 Utility Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Admin | List operator users |
| PATCH | `/api/users/:userId/role` | Admin | Update role |
| GET | `/api/folders` | Admin | List folders |
| POST | `/api/folders` | Admin | Create folder |
| DELETE | `/api/folders/:id` | Admin | Delete folder |
| GET | `/api/templates` | Admin | List templates |
| POST | `/api/templates` | Admin | Create template |
| DELETE | `/api/templates/:id` | Admin | Delete template |
| GET | `/api/public/contests` | Public | All open contests |
| GET | `/api/my-contests/:email` | Public | Contests by email |
| GET | `/api/cron/refresh-scores` | Cron | Refresh live scores |

---

## 5. Database Schema

### 5.1 Entity Relationship Summary

```
Operator (1) ──── (*) User
Operator (1) ──── (*) Contest
Operator (1) ──── (*) GolfPool
Operator (1) ──── (*) EarningsPool

Contest (1) ──── (100) Square
Contest (*) ──── (*) User          [via ContestManager]

GolfPool (1) ──── (*) GolfPoolEntry
GolfPool (1) ──── (*) GolfPick
GolfPoolEntry (1) ──── (*) GolfPick
GolfPick (1) ──── (*) GolfPickHistory

EarningsPool (1) ──── (*) EarningsPoolGolfer
EarningsPool (1) ──── (*) EarningsPoolEntry

Participant (1) ──── (*) GolfPoolEntry
Participant (1) ──── (*) Square

GolfTournament (schedule reference)
```

### 5.2 Key Constraints
- `contests.slug` — unique
- `golf_pools.slug` — unique
- `golf_pool_entries.manageToken` — unique
- `golf_picks` — unique on `(entryId, weekNumber)`
- `earnings_pool_golfers` — unique on `(poolId, dgId)`

---

## 6. External Integrations

### 6.1 DataGolf API
| Endpoint | Use Case | Cache TTL |
|----------|----------|-----------|
| Rankings | Golfer tier assignment | 15 min |
| Tournament Field | Available picks for week | 15 min |
| Live Tournament Data | Earnings calculation | 5 min |

**Required env var:** `DATAGOLF_API_KEY`

### 6.2 n8n Webhooks
| Event | Trigger |
|-------|---------|
| Square claimed | Participant claims a square |
| Golf pick submitted | Participant makes a pick |
| Golf pool signup | Participant joins a pool |
| Golf entry created | New entry added |

**Format:** Flat key-value payload for n8n node compatibility

### 6.3 Vercel Cron
| Schedule | Path | Purpose |
|----------|------|---------|
| Daily midnight | `/api/cron/refresh-scores` | Refresh live scoring data |

---

## 7. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `DATAGOLF_API_KEY` | Yes | DataGolf API authentication |
| `SESSION_SECRET` | Yes | Express session encryption key |
| `NODE_ENV` | No | `development` or `production` |

---

## 8. Known Limitations & Technical Debt

| Issue | Impact | Priority |
|-------|--------|----------|
| `memorystore` for sessions | Sessions lost on serverless cold start; not shared across instances | High |
| Hardcoded `SESSION_SECRET` fallback | Security risk if env var missing | High |
| No email verification on registration | Fake accounts possible | Medium |
| No rate limiting on public endpoints | Abuse potential | Medium |
| Participant auth is email-only | No password protection for entries | Low |
| CSV schedule files | Must be manually updated each season | Low |
| Rankings cache in DB column | Works but not ideal for high-frequency updates | Low |

---

## 9. Future Considerations

- **Persistent sessions:** Replace memorystore with Redis or database-backed sessions
- **Email notifications:** Direct email for picks, results, reminders (beyond webhooks)
- **Payment integration:** Stripe for entry fees and payouts
- **Mobile app:** React Native or PWA for push notifications
- **Real-time updates:** WebSocket for live scoreboard updates
- **NFL/NBA/MLB pools:** Expand beyond football squares and golf
- **Analytics dashboard:** Operator insights on pool engagement
- **Custom branding:** White-label support per operator

---

## 10. Page Map

```
/                                    → Hub (contest/pool discovery)
/join                                → Golf pool signup directory
/login                               → Admin login/register
/my-contests                         → Find contests by email
/:slug                               → Public contest board (squares)
/board/:id                           → Public contest board (by ID)
/golf/pool/:poolId/signup            → Golf pool signup form
/golf/pool/:poolId/entry/:entryId    → Submit/manage picks
/golf/pool/:poolId/leaderboard       → Public leaderboard
/golf/earnings/:poolId/signup        → Earnings pool signup
/golf/earnings/:poolId/scoreboard    → Live earnings leaderboard
/admin                               → Admin dashboard
/admin/contest/new                   → Create football squares
/admin/contest/:id                   → Manage contest
/admin/contest/:id/edit              → Edit contest settings
/admin/users                         → User management
/admin/golf                          → Golf pools dashboard
/admin/golf/pool/new                 → Create golf survivor pool
/admin/golf/pool/:id                 → Manage golf pool
/admin/golf/earnings/new             → Create earnings pool
/admin/golf/earnings/:id             → Manage earnings pool
```
