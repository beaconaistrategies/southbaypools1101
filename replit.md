# SquareKeeper

## Overview

SquareKeeper is a football squares pool management system designed to streamline the creation and management of multiple contests. It offers a public-facing interface for participants to claim squares and features a 10x10 grid system with customizable team labels, multi-layer axis numbers for different payout periods (quarters, halves), and configurable red header rows/columns. The system simplifies pool management by providing real-time square claiming, flexible contest configuration, and winner tracking across simultaneous contests. Admin access is managed via Replit Auth, with the first user automatically granted administrative privileges.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React with TypeScript using Vite.

**UI Component System:** shadcn/ui built on Radix UI primitives with Tailwind CSS, following a "new-york" style variant. Custom typography uses Inter and JetBrains Mono.

**State Management:** TanStack Query for server state and data fetching; React hooks for local UI state.

**Routing:** wouter for client-side routing.

**Key Pages:** Login, Admin Dashboard, New/Edit Contest, Contest Manager, Public Board, Hub (landing page), Join (participant portal), Golf Survivor landing page.

### Backend Architecture

**Server Framework:** Express.js running on Node.js.

**API Design:** RESTful endpoints with JSON responses for contest and square management.

**Database Layer:** Drizzle ORM for type-safe interactions with Neon serverless PostgreSQL via WebSocket. Uses a schema-first approach with Zod validation.

**Data Models:** Operators (multi-tenant organizations), Users (admin authentication with operatorId), Participants (master accounts with Replit Auth linking), Folders (organizational categories), Contests (configuration, status, winners), Squares (individual square state, holder info, optional participantId link), SquareTemplates (reusable reserved square configurations), ContestManagers (manager-contest assignments for RBAC).

**Key Architectural Decisions:** Session-based authentication, real-time data consistency via query invalidation, separation of concerns using a storage layer abstraction, and multi-tenant operator isolation.

### Multi-Tenancy Architecture (Phase 1)

**Operator Model:** Each operator represents an independent pool management organization. Operators have:
- `name`, `slug` (unique URL identifier), `plan` (free/pro/enterprise), `status` (trial/active/suspended/cancelled)
- `maxContests` limit per plan, `stripeCustomerId` for future billing integration

**Data Isolation:** All admin endpoints are scoped by operatorId. Users, contests, and folders belong to a single operator. Cross-operator data access is prevented at the API level.

**URL Patterns:**
- UUID-based access: `/board/{contestId}` - Works globally (UUIDs are unique), fallback format
- Primary operator short URLs: `/{contestSlug}` - Short friendly URLs for the primary operator (south-bay-pools)
- Other operator URLs: `/{operatorSlug}/{contestSlug}` - Prefixed with operator slug for other operators
- Legacy format: `/pool/{operatorSlug}/{contestSlug}` - Still supported for backwards compatibility

**Auth Flow:** First user login creates a new operator and assigns admin privileges. Subsequent logins preserve operator/admin assignments.

### System Design Choices

**Authentication & Authorization:** 
- Replit Auth (OIDC) with Google/GitHub/email login. 
- Role-based access control (RBAC) with five roles:
  - **Super Admin**: Platform-level access across all operators
  - **Admin**: Full control within their operator (users, contests, settings)
  - **Manager**: Can manage specific assigned contests only
  - **Member**: Authenticated participant with standard access
  - **Trial User**: Limited access with restrictions
- Each operator's first user becomes admin. Protected routes check role permissions.
- ContestManagers table allows assigning managers to specific contests.
- Operator isolation enforced on all admin endpoints.

**Contest Configuration:**
- **Layer Labels:** Consolidated `layerLabels` for both axes, displayed diagonally in the pink corner area.
- **Folder System:** Optional folder organization for contests, with UI for creation, assignment, and filtering.
- **Preset Payouts:** Preset selector (Quarters, Half and Final, Custom) synchronizes layer labels with prize labels.
- **Multi-Layer Red Headers:** `redHeadersCount` determines the number of 0-9 digit sets (layers), supporting up to 6 independent shuffling layers for different payout periods.
- **Red Headers Visibility:** Admin toggle to reveal/hide red header numbers on both admin and public boards.
- **Multi-Game Boards:** Support for 3+ games per board with 8 prize periods each (Q1, HALF, Q3, FINAL + Opposites). Layer labels define game names (e.g., "GB @ DET", "KC @ DAL"). "Generate Multi-Game Prizes" button auto-creates all 24 prizes with proper labels.

**User Experience:**
- **Email Notifications:** Optional n8n webhook integration for square claim notifications.
- **My Contests Page:** Participants can look up all their participations by email.
- **Winner Highlighting:** Winning squares are color-coded by game layer. For multi-game boards (>8 prizes), all 8 prizes per game share the same color (Game 1 = red, Game 2 = blue, Game 3 = yellow). For single-game boards (≤8 prizes), each prize gets a unique color. Winner badges display simplified period labels (Q1, HALF, FINAL, etc.) instead of full game labels.

**Admin Tooling:**
- CSV Export of participant data.
- Clone Contest functionality to duplicate settings.
- Delete Contest with confirmation.
- Dashboard filtering (status, search by name/teams) and sorting.
- Copy public link functionality.
- Print-friendly styles for grids.
- **Square Templates:** Save reserved square configurations as reusable templates. Load templates when creating new contests to quickly populate pre-assigned squares with regular pool members.
- **User Management:** Admin interface at `/admin/users` to view all users and change their roles. Super admins can assign any role including super_admin. Accessible via dropdown menu in the top navigation.

## External Dependencies

**Database:**
- PostgreSQL via Neon serverless (`@neondatabase/serverless`)
- `connect-pg-simple` for PostgreSQL-backed session storage

**UI Component Libraries:**
- Radix UI primitives
- Tailwind CSS
- Lucide React for iconography
- `date-fns` for date formatting

**Form Management:**
- React Hook Form with Zod resolvers
- Drizzle-Zod for schema validation

**Development Tools:**
- Vite
- TypeScript
- ESBuild
- Drizzle Kit for database migrations

**Design System:**
- `class-variance-authority` for component variant management

## External APIs

**DataGolf API:**
- Integration for live golf tournament fields, rankings, and live tournament status
- Service located at `server/datagolf.ts` with 15-minute TTL caching (5-minute for live data)
- Requires `DATAGOLF_API_KEY` secret
- Endpoints:
  - `GET /api/datagolf/status` - Check if API is configured
  - `GET /api/datagolf/rankings` - Get world golf rankings
  - `GET /api/datagolf/field?tour=pga` - Get current tournament field
  - `GET /api/datagolf/search?q=name` - Search for golfers
  - `GET /api/datagolf/live?tour=pga` - Get live tournament leaderboard with player cut status
- **Cut Elimination**: Uses `/preds/in-play` endpoint to check if golfers made the cut, withdrew, or were disqualified. Statuses: CUT/MC → eliminated, WD → eliminated, DQ → eliminated, active → survived.

## Recent Changes

**January 2026:**
- Implemented role-based access control (RBAC) with five roles: Super Admin, Admin, Manager, Member, Trial User
- Added User Management page (`/admin/users`) for admins to view and change user roles
- Created contest_managers table for assigning managers to specific contests
- Updated authentication middleware to use role-based hierarchy instead of legacy boolean flag
- Integrated DataGolf API for Golf Survivor with golfer rankings and tournament field data
- Made golf_picks.tournamentId nullable to support picks without internal tournament records
- Added tournamentName column to golf_picks for display purposes
- Added configurable webhook URLs to golf pools with admin UI in pool creation and pool manager
- Enabled multiple entries per user for golf pools (removed single-entry restriction)
- Added edit pick functionality with "Change Pick" button that uses PUT endpoint
- Built public leaderboard page (`/golf/pool/:poolId/leaderboard`) showing all entries with tabbed view (all/active/eliminated)
- Updated signup page to display user's existing entries with manage links and allow adding more entries
- Added pick deadline enforcement: users cannot submit/change picks after tournament starts (based on pickDeadlineHours)
- Added updatedAt timestamp tracking on golf_picks for audit trail
- Admin picks bypass deadline enforcement
- Added "Run Cut Check" feature in Pool Manager to automatically eliminate entries whose picks missed the cut:
  - Fetches live tournament data from DataGolf `/preds/in-play` endpoint
  - Checks each pick against golfer status (CUT/MC, WD, DQ = eliminated; active = survived)
  - Updates pick.result and entry.status accordingly
  - Displays detailed results with survived/eliminated/not found counts
- Fixed pick deadline detection to compare DataGolf **field** endpoint (upcoming tournament) vs **live** endpoint (current/finishing tournament):
  - Deadline only passes when field and live show the SAME tournament AND that tournament has started
  - Prevents false deadline triggers from stale "live" data of finishing tournaments
- Added CSV export for golf pool entries (`/api/golf/pools/:poolId/export-csv`) with Download button in Pool Manager