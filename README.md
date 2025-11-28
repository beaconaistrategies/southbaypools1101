# SquareKeeper

A football squares pool management platform for creating and managing multiple contests with a 10x10 grid system, multi-layer scoring periods, and real-time square claiming.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon serverless recommended)
- Replit account (for authentication)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd squarekeeper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your database credentials and session secret.

4. **Push database schema**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5000`

### First Admin Setup
The first user to log in via Replit Auth automatically becomes an admin.

## Features

- **Contest Management**: Create, edit, clone, and delete football squares contests
- **10x10 Grid System**: Classic 100-square grid with customizable team labels
- **Multi-Layer Headers**: Up to 6 independent number layers for different payout periods (Q1, Q2, Q3, Q4, etc.)
- **Multi-Game Boards**: Support for 3+ games per board with 8 prize periods each
- **Color-Coded Winners**: Each layer/game has its own color for easy identification
- **Custom URLs**: Optional slug-based URLs for easy sharing (e.g., `/superbowl-2025`)
- **Folder Organization**: Group contests into folders for better organization
- **Pre-Reserved Squares**: Reserve squares for specific participants before opening
- **Email Notifications**: Optional webhook integration for square claim notifications (n8n compatible)
- **Participant Dashboard**: "My Contests" page for participants to look up their squares by email
- **CSV Export**: Export participant data for record-keeping
- **Print-Friendly**: Optimized print styles for physical copies

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TanStack Query, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon serverless), Drizzle ORM
- **Authentication**: Replit Auth (OIDC)
- **Routing**: wouter

## Documentation

- [Architecture](docs/architecture.md) - System design and technical decisions
- [API Reference](docs/api.md) - REST endpoint documentation
- [Database Schema](docs/database.md) - Data models and relationships
- [Contributing](CONTRIBUTING.md) - Development workflow and guidelines
- [Changelog](CHANGELOG.md) - Version history and release notes

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (routes)
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and query client
├── server/                 # Backend Express application
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── replitAuth.ts      # Authentication setup
├── shared/                 # Shared code between frontend/backend
│   └── schema.ts          # Database schema and types
└── docs/                   # Documentation
```

## Environment Variables

See [.env.example](.env.example) for all required environment variables.

## Deployment

The app is designed to run on Replit with automatic deployments. For other platforms:

1. Build the frontend: `npm run build`
2. Set production environment variables
3. Run: `NODE_ENV=production npm start`

## License

Private - All rights reserved.
