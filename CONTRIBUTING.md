# Contributing to SquareKeeper

Thank you for your interest in contributing to SquareKeeper! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- Git

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd squarekeeper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities
├── server/                 # Express backend
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database layer
│   └── replitAuth.ts      # Auth middleware
├── shared/                 # Shared types/schema
│   └── schema.ts          # Drizzle schema + Zod validation
└── docs/                   # Documentation
```

## Development Workflow

### Branching Strategy
- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Making Changes

1. Create a feature branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guidelines

3. Test your changes locally

4. Commit with descriptive messages
   ```bash
   git commit -m "feat: add multi-game prize generation"
   ```

### Commit Message Format
We use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style/formatting
- `refactor:` - Code refactoring
- `test:` - Adding/updating tests
- `chore:` - Maintenance tasks

## Code Style Guidelines

### TypeScript
- Use strict TypeScript (no `any` unless absolutely necessary)
- Define types in `shared/schema.ts` for shared data structures
- Use Zod schemas for runtime validation

### React Components
- Use functional components with hooks
- Place reusable components in `client/src/components/`
- Use shadcn/ui components from `@/components/ui/`
- Add `data-testid` attributes to interactive elements

### API Routes
- Keep route handlers thin - delegate to storage layer
- Validate request bodies with Zod schemas
- Return consistent error responses

### Database
- All schema changes go in `shared/schema.ts`
- Use Drizzle ORM for queries
- Run `npm run db:push` after schema changes

## Testing

### Manual Testing
1. Test admin flows (create/edit/delete contests)
2. Test public flows (claim squares, view boards)
3. Test edge cases (empty states, validation errors)

### Checking for Issues
- Check browser console for errors
- Check server logs for backend errors
- Verify database state after operations

## Pull Request Process

1. Ensure your code follows the style guidelines
2. Update documentation if needed
3. Update CHANGELOG.md with your changes
4. Create a pull request with a clear description
5. Wait for review and address feedback

## Database Migrations

We use Drizzle Kit for database management:

```bash
# Push schema changes to database
npm run db:push

# Generate migration files (if needed)
npm run db:generate
```

**Important**: Never manually edit migration files. Use `db:push` for development.

## Questions?

If you have questions about contributing, please open an issue or reach out to the maintainers.
