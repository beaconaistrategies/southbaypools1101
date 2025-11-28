# Architecture Overview

This document describes the technical architecture of SquareKeeper.

## System Overview

SquareKeeper is a full-stack TypeScript application with a React frontend and Express.js backend, using PostgreSQL for data persistence.

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   React +   │  │   TanStack  │  │     shadcn/ui +     │  │
│  │ TypeScript  │  │    Query    │  │    Tailwind CSS     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Server                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Express.js │  │   Drizzle   │  │    Replit Auth      │  │
│  │   Routes    │  │     ORM     │  │      (OIDC)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ SQL
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL (Neon Serverless)                 │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌───────────────┐  │
│  │  users  │  │ contests │  │ squares │  │   folders     │  │
│  └─────────┘  └──────────┘  └─────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack
- **React 18** with functional components and hooks
- **TypeScript** for type safety
- **Vite** for fast development and building
- **TanStack Query v5** for server state management
- **wouter** for lightweight client-side routing
- **Tailwind CSS** + shadcn/ui for styling
- **React Hook Form** + Zod for form handling

### Key Patterns

#### State Management
- **Server State**: TanStack Query handles all API data fetching, caching, and invalidation
- **Local UI State**: React hooks (useState, useReducer) for component-level state
- **Form State**: React Hook Form with Zod validation

#### Query Key Strategy
```typescript
// Hierarchical keys for proper cache invalidation
queryKey: ['/api/contests']           // All contests
queryKey: ['/api/contests', id]       // Single contest
queryKey: ['/api/contests', id, 'squares']  // Contest squares
```

#### Component Organization
```
components/
├── ui/                  # shadcn/ui primitives
├── ContestForm.tsx      # Create/edit contest form
├── SquaresGrid.tsx      # 10x10 grid component
├── WinnersPanel.tsx     # Winner entry panel
└── ...
```

### Pages and Routing

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login | Public |
| `/admin` | Dashboard | Admin |
| `/admin/contests/new` | Create Contest | Admin |
| `/admin/contests/:id` | Contest Manager | Admin |
| `/admin/contests/:id/edit` | Edit Contest | Admin |
| `/board/:identifier` | Public Board | Public |
| `/my-contests` | My Contests Lookup | Public |
| `/:slug` | Custom URL Board | Public |

## Backend Architecture

### Technology Stack
- **Express.js** web framework
- **Drizzle ORM** for type-safe database queries
- **Zod** for request validation
- **express-session** with PostgreSQL store
- **openid-client** for Replit Auth OIDC

### Layer Structure

```
Request → Route Handler → Storage Layer → Database
              │                │
              │                └── Drizzle ORM
              │
              └── Zod Validation
```

#### Routes (`server/routes.ts`)
- Thin handlers that validate input and delegate to storage
- Authentication middleware for protected routes
- Consistent error response format

#### Storage (`server/storage.ts`)
- All database operations abstracted behind IStorage interface
- CRUD operations for contests, squares, folders, users
- Business logic kept minimal - mostly data access

#### Authentication (`server/replitAuth.ts`)
- OIDC integration with Replit
- Session-based auth with PostgreSQL store
- Middleware: `isAuthenticated`, `isAdmin`

### Authentication Flow

```
1. User clicks "Sign in with Replit"
2. Redirect to Replit OIDC provider
3. User authenticates (Google/GitHub/email)
4. Callback with auth code
5. Exchange code for tokens
6. Extract user claims (sub, email, name)
7. Upsert user in database
8. Create session
9. First user becomes admin
```

## Database Design

### Tables

#### `users`
Stores authenticated users from Replit Auth.
- First user to log in gets `isAdmin = true`
- Linked to Replit user ID (`sub` claim)

#### `contests`
Main entity storing contest configuration.
- `topAxisNumbers`, `leftAxisNumbers`: 2D arrays for multi-layer headers
- `layerLabels`, `layerColors`: Customization per layer
- `prizes`, `winners`: JSON arrays for flexible structure
- `slug`: Optional custom URL

#### `squares`
Individual squares in a 10x10 grid.
- Linked to contest via `contestId`
- Status: available, taken, disabled
- Participant info when claimed

#### `folders`
Optional organization for contests.
- Simple name + id structure
- Contests reference via `folderId`

#### `sessions`
PostgreSQL-backed session storage for authentication.

### Key Relationships

```
folders 1──┬──N contests
            │
contests 1──┼──N squares
            │
users (admin authentication)
```

## Design Decisions

### Why Drizzle ORM?
- Type-safe queries that match TypeScript types
- Schema-as-code with Zod integration
- Simple migration workflow with `db:push`

### Why TanStack Query?
- Automatic caching and background refetching
- Built-in loading/error states
- Cache invalidation on mutations

### Why wouter instead of React Router?
- Lightweight (2KB vs 20KB+)
- Simple API sufficient for our needs
- Good TypeScript support

### Why Replit Auth?
- Zero-config authentication on Replit
- Supports Google, GitHub, email
- Secure OIDC implementation

### Multi-Layer Header System
The grid supports up to 6 independent number layers:
- Each layer has its own shuffled 0-9 sequence
- Used for different payout periods (Q1, Q2, Q3, Q4, etc.)
- Colors help distinguish layers visually

### Multi-Game Boards
For events with multiple games:
- Layer labels define game names (e.g., "GB @ DET")
- 8 prizes per game (Q1, HALF, Q3, FINAL + Opposites)
- Winners grouped by game in UI

## Performance Considerations

### Frontend
- Query deduplication via TanStack Query
- Optimistic updates for square claiming
- Minimal re-renders with proper key usage

### Backend
- PostgreSQL connection pooling via Neon
- Efficient batch operations for squares
- Session stored in database (not memory)

### Database
- Index on `sessions.expire` for cleanup
- Foreign keys with proper cascade behavior
- JSON columns for flexible schema parts

## Security

### Authentication
- OIDC with Replit (industry standard)
- HTTP-only, secure session cookies
- CSRF protection via SameSite cookies

### Authorization
- Admin routes protected by `isAdmin` middleware
- Public routes carefully scoped
- No sensitive data in client-accessible responses

### Data Validation
- All inputs validated with Zod schemas
- SQL injection prevented by Drizzle ORM
- XSS prevented by React's default escaping
