# SquareKeeper

## Overview

SquareKeeper is a football squares pool management system that enables administrators to create and manage multiple contests while providing a public-facing interface for participants to claim squares. The application features a 10×10 grid system where each contest represents a football game with customizable team labels, multi-layer axis numbers for different payout periods (quarters, halves), and configurable red header rows/columns with optional period labels.

**Core Purpose:** Simplify the management of football squares pools by providing real-time square claiming, contest configuration with multiple payout layers, and winner tracking across multiple simultaneous contests.

**Authentication:** Admin-only access via Replit Auth with Google/GitHub/email login. First user to log in is automatically granted admin privileges.

## Recent Changes

### November 2, 2025 - Replit Auth Integration for Admin-Only Access
- **Authentication System**: Integrated Replit Auth (OIDC) with Google/GitHub/email login for admin access
- **Admin Gating**: Protected all admin routes (create/edit contests, manage folders) with isAdmin middleware
- **First User Auto-Admin**: First user to log in is automatically granted admin status (isAdmin=true)
- **Session Management**: PostgreSQL-backed sessions with secure cookies and automatic token refresh
- **Protected Routes**: All admin endpoints require authentication and admin role verification
- **Public Access Preserved**: Public board (/board/:id) and My Contests (/my-contests) remain accessible without login
- **User Experience**: Added logout button with user email display in TopNav
- **Database Schema**: Added users and sessions tables for auth persistence
- **Security**: Middleware validates session expiry and refreshes tokens automatically
- **End-to-End Verified**: Complete auth workflow implemented (login → admin access → logout)

### October 31, 2025 - Layer Labels Consolidation
- **Unified Layer Labels**: Consolidated topLayerLabels and leftLayerLabels into single layerLabels field
- **Schema Migration**: Added layer_labels column, migrated existing data, dropped deprecated columns
- **UX Improvement**: Layer labels now input once in top axis section, eliminating duplicate/confusing inputs
- **Diagonal Display**: Layer labels render diagonally in pink corner area (Q1 at position 1,1; Q2 at 2,2; Q3 at 3,3; Q4 at 4,4)
- **Complete Update**: Updated all components (ContestForm, SquareGrid, ContestManager, PublicBoard, EditContest, CSV export, clone endpoint)
- **Type Safety**: Maintained strong typing throughout with updated Zod schemas and TypeScript types
- **Design Rationale**: Both axes represent same payout periods (e.g., Q1, Q2, Q3, Q4), so single unified field eliminates redundancy

### October 31, 2025 - Folder Organization System & Enhanced Contest Management
- **Folder/Category System**: Added optional folder organization for contests with database schema (folders table, folderId in contests)
- **Folder Management UI**: Create Folder button in Admin Dashboard with name input dialog and folder listing
- **Folder Filtering**: Dropdown filter on Admin Dashboard to view "All Contests", specific folders, or "Uncategorized" contests
- **Folder Selector**: ContestForm includes folder selector dropdown for assigning contests to folders during creation/editing
- **Optional Assignment**: Contests can be assigned to folders or left uncategorized; folder assignment is completely optional
- **Edit Contest Enhancements**: Added Delete Contest and Export CSV buttons directly on Edit Contest page for easier management
- **Critical Fix**: Resolved validation bug where form sent `null` instead of `undefined` for empty folderId, causing contest creation/editing failures
- **API Endpoints**: Implemented folder CRUD operations (GET /api/folders, POST /api/folders) and CSV export endpoint
- **End-to-End Verified**: Complete folder workflow tested (create folder → assign to contest → filter by folder → edit/delete)

### October 26, 2025 - Email Notifications & User Dashboard
- **Webhook Integration**: Optional n8n webhook URL field in contest form triggers notifications when squares are claimed
- **Notification Payload**: Sends contest details, participant info (name, email, entry name), square number, and event details
- **Fire-and-Forget**: Webhook calls don't block square claims; failures logged but don't affect user experience
- **My Contests Page**: New `/my-contests` route where participants can look up all their participations by email
- **Email Lookup**: Case-insensitive search returns all contests where user has claimed squares
- **Participation Details**: Shows contest name, teams, event date, entry name, square number with link to view board
- **Easy Access**: "My Contests" button added to public board header for quick navigation
- **End-to-End Verified**: Complete workflow tested (webhook setup → square claim → email lookup → view board)

### October 26, 2025 - Admin Toolset Enhancement (CSV Export, Clone, Delete, Filtering)
- **CSV Export**: Export button in Contest Manager generates downloadable CSV with participant data, prize info, winners, and grid numbers
- **Clone Contest**: Duplicate contest settings with fresh empty squares via clone dialog and POST /api/contests/:id/clone endpoint
- **Delete Contest**: Delete button with confirmation dialog that removes contest and redirects to admin dashboard
- **Dashboard Filtering**: Status filters (All/Open/Locked) and search by name/teams with real-time filtering
- **Sort Ordering**: Toggle between "Upcoming First" (ascending by event date) and "Recent First" (descending)
- **Copy Public Link**: Copy-to-clipboard button in Board tab for easy public board URL sharing
- **Print-Friendly Styles**: CSS media queries for clean grid printing with proper page breaks
- **End-to-End Verified**: Complete admin workflow tested (filter → search → manage → export → clone → delete)

### October 26, 2025 - Preset-Based Payout Configuration System
- **Unified Naming**: Added preset selector (Quarters, Half and Final, Custom) that synchronizes layer labels with prize labels to eliminate confusion between duplicate terms
- **Quarters Preset**: Automatically configures 4 layers with Q1-Q4 labels and matching prize labels
- **Half and Final Preset**: Automatically configures 2 layers with "Half" and "Final" labels and matching prize labels
- **Custom Mode**: Full user control over layer count and labels with validation warnings when prize count ≠ layer count
- **Smart Preset Lock**: Editing prize amounts preserves preset lock; only label changes or structural modifications switch to Custom mode
- **Validation UI**: Inline warning alerts when prize count doesn't match layer count in Custom mode
- **Improved Help Text**: Updated tips in PrizesEditor to clarify layer↔prize connection and preset usage
- **End-to-End Verified**: Complete preset workflow tested (select preset → edit amounts → save contest)

### October 26, 2025 - Layer Color-Coded Winner Highlighting
- **Visual Connection**: Winning squares now filled with matching header layer color instead of gold
- **Prize-to-Layer Mapping**: Winner square color determined by prize index in prizes array (Prize 0 → Layer 0 color, etc.)
- **Color Scheme**: Rose (Layer 0), Blue (Layer 1), Amber (Layer 2), Emerald (Layer 3), Purple (Layer 4), Cyan (Layer 5)
- **Entry Name Preservation**: Entry names remain visible on winning squares with appropriate contrast
- **Badge Matching**: Prize badges use matching darker shade of layer color for visual consistency
- **Public Board Enhancement**: Public Board link now opens in new tab with external link icon for easy admin navigation

### October 26, 2025 - Red Headers Visibility Toggle
- **Admin Control**: Added toggle button in Contest Manager to reveal/hide red header numbers (0-9 digits)
- **Default Behavior**: Red headers remain hidden by default (showRedHeaders=false) until admin reveals them
- **Toggle UI**: Eye/EyeOff icons with "Reveal Numbers" / "Hide Numbers" button text
- **Synchronized Display**: Visibility setting applies to both admin manager view and public board
- **Database Field**: Added showRedHeaders boolean column to contests table
- **End-to-End Verified**: Toggle functionality tested across manager and public board views

### October 26, 2025 - Multi-Layer Red Headers Refactor
- **Schema Migration**: Changed topAxisNumbers and leftAxisNumbers from `number[]` to `number[][]` (jsonb) to support multiple payout layers
- **Layer Labels**: Added optional layerLabels (string[] array) to name periods like "Q1", "Q2", "Q3", "Q4" - applies to both axes since they represent the same payout periods
- **Multi-Layer Architecture**: redHeadersCount now determines number of 0-9 digit sets (layers), creating multiple payout periods
  - 2 red headers = 2 layers for halftime payouts (Q1, Q2)
  - 4 red headers = 4 layers for quarter payouts (Q1, Q2, Q3, Q4)
  - Up to 6 layers supported with validation
- **Nested Array Validation**: Updated Zod schemas to validate each layer has exactly 10 digits (0-9), outer array length matches redHeadersCount
- **Grid Structure**: SquareGrid now renders redHeadersCount × redHeadersCount pink corner area with layer labels displayed vertically in leftmost column
- **Independent Shuffling**: Each layer shuffles independently, creating unique 0-9 permutations per period
- **ContestForm Enhancement**: Dynamic layer label inputs that auto-adjust when redHeadersCount changes
- **End-to-End Verified**: Complete 2-layer workflow tested (create → shuffle → display on manager/public boards)

### October 26, 2025 - Full Backend Integration & UI Refinements
- **Database Schema**: Implemented PostgreSQL schema with pgEnum for contest_status ("open", "locked") and square_status ("available", "taken", "disabled")
- **API Routes**: Created validated REST endpoints with proper error handling (400 for invalid data, 404 for not found)
- **N+1 Pattern Fix**: Optimized /api/contests to return square counts (takenSquares, totalSquares) in single query
- **Strong Typing**: Restored Square[] typing throughout frontend with null-safe optional fields
- **Team Name Display**: Team 1 (topTeam) displays horizontally above grid; Team 2 (leftTeam) displays vertically rotated

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React with TypeScript using Vite as the build tool

**UI Component System:** shadcn/ui built on Radix UI primitives with Tailwind CSS for styling
- Component library follows the "new-york" style variant
- Custom design system with utility-focused patterns inspired by Linear, Notion, and Stripe
- Typography hierarchy using Inter (primary) and JetBrains Mono (monospace for grid numbers)
- Consistent spacing scale based on Tailwind units (2, 4, 6, 8, 12, 16)

**State Management:**
- TanStack Query (React Query) for server state management and data fetching
- Local component state via React hooks for UI-specific state
- Query client configured with strict cache control (no refetch on window focus, infinite stale time)

**Routing:** wouter for lightweight client-side routing

**Key Pages:**
1. Login Page - Admin authentication entry point
2. Admin Dashboard - Contest listing with statistics
3. New/Edit Contest - Form-based contest creation and editing
4. Contest Manager - Admin view with board management and square control
5. Public Board - Entrant-facing view for claiming available squares

### Backend Architecture

**Server Framework:** Express.js running on Node.js

**API Design:** RESTful endpoints with JSON responses
- `/api/contests` - Contest CRUD operations
- `/api/contests/:id/squares` - Square management per contest
- Middleware for request logging and JSON parsing with raw body capture

**Database Layer:**
- ORM: Drizzle ORM for type-safe database interactions
- Connection: Neon serverless PostgreSQL via WebSocket for serverless compatibility
- Schema-first approach with Zod validation schemas derived from Drizzle schemas

**Data Models:**
- **Users:** Admin authentication (id, username, password)
- **Folders:** Optional organizational categories for contests (id, name)
- **Contests:** Contest configuration including teams, axis numbers, red header settings, status, optional folder assignment, and quarter winners
- **Squares:** Individual square state within contests (100 per contest, indexed 1-100) with holder information and reservation status

**Key Architectural Decisions:**
- Session-based authentication approach (infrastructure present but simplified login flow)
- Real-time data consistency through query invalidation on mutations
- Separation of concerns: storage layer abstraction (`IStorage` interface) enables easy testing and database swapping

### External Dependencies

**Database:**
- PostgreSQL via Neon serverless (@neondatabase/serverless)
- Connection pooling for serverless environments
- WebSocket-based connections using 'ws' library

**UI Component Libraries:**
- Radix UI primitives for accessible component foundations
- Tailwind CSS for utility-first styling
- Lucide React for iconography
- date-fns for date formatting

**Form Management:**
- React Hook Form with Zod resolvers for validation
- Drizzle-Zod for schema-to-validation integration

**Development Tools:**
- Vite with custom plugins for Replit integration
- TypeScript for type safety across client, server, and shared code
- ESBuild for server-side bundling in production

**Session Management:**
- connect-pg-simple for PostgreSQL-backed session storage

**Design System:**
- Custom CSS variables for theming (light/dark mode support)
- class-variance-authority for component variant management
- Design guidelines documented in design_guidelines.md for consistent UI patterns

**Build and Deployment:**
- Development: tsx for TypeScript execution in development mode
- Production: Vite for client build, ESBuild for server bundling
- Database migrations: Drizzle Kit for schema management