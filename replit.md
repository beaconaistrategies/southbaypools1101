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

**Key Pages:** Login, Admin Dashboard, New/Edit Contest, Contest Manager, Public Board.

### Backend Architecture

**Server Framework:** Express.js running on Node.js.

**API Design:** RESTful endpoints with JSON responses for contest and square management.

**Database Layer:** Drizzle ORM for type-safe interactions with Neon serverless PostgreSQL via WebSocket. Uses a schema-first approach with Zod validation.

**Data Models:** Users (admin authentication), Folders (organizational categories), Contests (configuration, status, winners), Squares (individual square state, holder info).

**Key Architectural Decisions:** Session-based authentication, real-time data consistency via query invalidation, and separation of concerns using a storage layer abstraction.

### System Design Choices

**Authentication:** Admin-only access via Replit Auth (OIDC) with Google/GitHub/email login. First user to log in becomes an admin. Protected routes ensure secure access.

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
- **Winner Highlighting:** Winning squares are color-coded based on the corresponding header layer color.

**Admin Tooling:**
- CSV Export of participant data.
- Clone Contest functionality to duplicate settings.
- Delete Contest with confirmation.
- Dashboard filtering (status, search by name/teams) and sorting.
- Copy public link functionality.
- Print-friendly styles for grids.

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