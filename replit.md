# SquareKeeper

## Overview

SquareKeeper is a football squares pool management system that enables administrators to create and manage multiple contests while providing a public-facing interface for participants to claim squares. The application features a 10×10 grid system where each contest represents a football game with customizable team labels, axis numbers (0-9), and configurable red header rows/columns for visual emphasis.

**Core Purpose:** Simplify the management of football squares pools by providing real-time square claiming, contest configuration, and winner tracking across multiple simultaneous contests.

## Recent Changes

### October 26, 2025 - Full Backend Integration Complete
- **Database Schema**: Implemented PostgreSQL schema with pgEnum for contest_status ("open", "locked") and square_status ("available", "taken", "disabled")
- **Validation Layer**: Added Zod schemas with array length/value constraints (topAxisNumbers/leftAxisNumbers must be length 10 with values 0-9, redRowsCount 1-6)
- **API Routes**: Created validated REST endpoints with proper error handling (400 for invalid data, 404 for not found)
- **N+1 Pattern Fix**: Optimized /api/contests to return square counts (takenSquares, totalSquares) in single query
- **Strong Typing**: Restored Square[] typing throughout frontend with null-safe optional fields
- **End-to-End Testing**: Verified complete contest lifecycle (create → shuffle → claim → release → lock)
- **API Parameter Fix**: Corrected all apiRequest calls to use proper parameter order (method, url, data)

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
- **Contests:** Contest configuration including teams, axis numbers, red header settings, status, and quarter winners
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