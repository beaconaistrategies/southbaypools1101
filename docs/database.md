# Database Schema

SquareKeeper uses PostgreSQL with Drizzle ORM. The schema is defined in `shared/schema.ts`.

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     folders     │       │      users      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ name            │       │ email           │
│ createdAt       │       │ firstName       │
└────────┬────────┘       │ lastName        │
         │                │ profileImageUrl │
         │ 1:N            │ isAdmin         │
         ▼                │ createdAt       │
┌─────────────────┐       │ updatedAt       │
│    contests     │       └─────────────────┘
├─────────────────┤
│ id (PK)         │       ┌─────────────────┐
│ name            │       │    sessions     │
│ slug            │       ├─────────────────┤
│ eventDate       │       │ sid (PK)        │
│ topTeam         │       │ sess (JSONB)    │
│ leftTeam        │       │ expire          │
│ notes           │       └─────────────────┘
│ folderId (FK)   │
│ topAxisNumbers  │
│ leftAxisNumbers │
│ layerLabels     │
│ layerColors     │
│ redRowsCount    │
│ showRedHeaders  │
│ headerColorsEnabled │
│ status          │
│ prizes          │
│ winners         │
│ webhookUrl      │
│ createdAt       │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│     squares     │
├─────────────────┤
│ id (PK)         │
│ contestId (FK)  │
│ index           │
│ row             │
│ col             │
│ status          │
│ entryName       │
│ holderName      │
│ holderEmail     │
└─────────────────┘
```

## Tables

### users

Stores authenticated users from Replit Auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR | PRIMARY KEY, DEFAULT uuid | User ID (from Replit `sub` claim) |
| email | VARCHAR | UNIQUE | User's email address |
| firstName | VARCHAR | | First name |
| lastName | VARCHAR | | Last name |
| profileImageUrl | VARCHAR | | Avatar URL |
| isAdmin | BOOLEAN | NOT NULL, DEFAULT false | Admin flag |
| createdAt | TIMESTAMP | DEFAULT now() | Creation timestamp |
| updatedAt | TIMESTAMP | DEFAULT now() | Last update timestamp |

**Notes:**
- The first user to authenticate becomes admin (`isAdmin = true`)
- ID matches Replit OIDC `sub` claim

### folders

Optional organization for contests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR | PRIMARY KEY, DEFAULT uuid | Folder ID |
| name | TEXT | NOT NULL, UNIQUE | Folder name |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

### contests

Main entity for football squares pools.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR | PRIMARY KEY, DEFAULT uuid | Contest ID |
| name | TEXT | NOT NULL | Contest name |
| slug | VARCHAR(100) | UNIQUE | Custom URL slug |
| eventDate | TIMESTAMP | NOT NULL | Event date |
| topTeam | TEXT | NOT NULL | Top team label |
| leftTeam | TEXT | NOT NULL | Left team label |
| notes | TEXT | | Additional notes |
| folderId | VARCHAR | FK → folders.id, ON DELETE SET NULL | Parent folder |
| topAxisNumbers | JSONB | NOT NULL | 2D array of header numbers `number[][]` |
| leftAxisNumbers | JSONB | NOT NULL | 2D array of header numbers `number[][]` |
| layerLabels | JSONB | | Layer label names `string[]` |
| layerColors | JSONB | | Layer colors `string[]` (hex) |
| redRowsCount | INTEGER | NOT NULL, DEFAULT 2 | Number of layers |
| showRedHeaders | BOOLEAN | NOT NULL, DEFAULT false | Show numbers on public board |
| headerColorsEnabled | BOOLEAN | NOT NULL, DEFAULT true | Enable color-coded headers |
| status | ENUM | NOT NULL, DEFAULT 'open' | 'open' or 'locked' |
| prizes | JSONB | DEFAULT [] | Prize configuration `Prize[]` |
| winners | JSONB | DEFAULT [] | Winner records `Winner[]` |
| q1Winner | TEXT | | Legacy: Q1 winner (deprecated) |
| q2Winner | TEXT | | Legacy: Q2 winner (deprecated) |
| q3Winner | TEXT | | Legacy: Q3 winner (deprecated) |
| q4Winner | TEXT | | Legacy: Q4 winner (deprecated) |
| webhookUrl | TEXT | | n8n webhook URL |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**JSON Types:**

```typescript
type Prize = {
  label: string;   // e.g., "Q1", "HALF", "GB @ DET Q1"
  amount: string;  // e.g., "$100"
};

type Winner = {
  label: string;      // Prize label
  squareNumber: number;  // Winning square (1-100)
};
```

**Axis Numbers Format:**
```typescript
// Each layer has 10 numbers (0-9 in shuffled order)
topAxisNumbers: [
  [3,7,1,9,0,5,2,8,4,6],  // Layer 1
  [8,2,6,0,4,9,1,5,3,7],  // Layer 2
  // ... up to 6 layers
]
```

### squares

Individual squares in the 10x10 grid.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR | PRIMARY KEY, DEFAULT uuid | Square ID |
| contestId | VARCHAR | NOT NULL, FK → contests.id, ON DELETE CASCADE | Parent contest |
| index | INTEGER | NOT NULL | Square number (1-100) |
| row | INTEGER | NOT NULL | Grid row (0-9) |
| col | INTEGER | NOT NULL | Grid column (0-9) |
| status | ENUM | NOT NULL, DEFAULT 'available' | Square status |
| entryName | TEXT | | Entry/team name |
| holderName | TEXT | | Participant name |
| holderEmail | TEXT | | Participant email |

**Status Values:**
- `available` - Can be claimed
- `taken` - Claimed by a participant
- `disabled` - Not available for claiming

### sessions

PostgreSQL-backed session storage for authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| sid | VARCHAR | PRIMARY KEY | Session ID |
| sess | JSONB | NOT NULL | Session data |
| expire | TIMESTAMP | NOT NULL | Expiration time |

**Index:** `IDX_session_expire` on `expire` column for efficient cleanup.

## Enums

### contest_status
```sql
CREATE TYPE contest_status AS ENUM ('open', 'locked');
```

### square_status
```sql
CREATE TYPE square_status AS ENUM ('available', 'taken', 'disabled');
```

## Reserved Slugs

The following slugs cannot be used for custom contest URLs:
- `admin`, `login`, `board`, `my-contests`, `api`
- `logout`, `auth`, `contest`, `contests`, `folder`, `folders`

## Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| sessions | IDX_session_expire | expire | Session cleanup queries |

## Migrations

We use Drizzle Kit for database management:

```bash
# Push schema changes to database (development)
npm run db:push

# Generate migration files (if needed for production)
npm run db:generate

# Force push (use carefully)
npm run db:push --force
```

## Sample Queries

### Get contest with square counts
```sql
SELECT 
  c.*,
  COUNT(CASE WHEN s.status = 'taken' THEN 1 END) as taken_count,
  COUNT(s.id) as total_count
FROM contests c
LEFT JOIN squares s ON s.contest_id = c.id
GROUP BY c.id;
```

### Find participant's squares across all contests
```sql
SELECT 
  c.id as contest_id,
  c.name as contest_name,
  s.index as square_number,
  s.entry_name
FROM squares s
JOIN contests c ON c.id = s.contest_id
WHERE LOWER(s.holder_email) = LOWER($1)
  AND s.status = 'taken'
ORDER BY c.event_date DESC;
```

### Get available squares for a contest
```sql
SELECT * FROM squares
WHERE contest_id = $1
  AND status = 'available'
ORDER BY index;
```
