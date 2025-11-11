# Offroad Parks

A modern web application for discovering and exploring offroad parks and UTV trails across the United States. Built with Next.js 16, TypeScript, Prisma, and PostgreSQL.

## Features

- **Park Discovery**: Browse and search through a curated list of offroad parks
- **Interactive Map**: Visualize parks on an interactive map using Leaflet
- **Advanced Filtering**: Filter parks by state, terrain type, amenities, and more
- **Route Planning**: Build custom routes connecting multiple parks
- **User Authentication**: Sign in with Google OAuth to access personalized features
- **Favorites**: Save and manage your favorite parks
- **Park Submissions**: Users can submit new parks for admin approval
- **Admin Dashboard**: Comprehensive admin panel for managing parks, users, and submissions
- **Responsive Design**: Beautiful, mobile-friendly interface with Tailwind CSS

## Tech Stack

### Core

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5 (strict mode)
- **Database**: PostgreSQL (via Vercel Postgres)
- **ORM**: Prisma 6
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI
- **Maps**: Leaflet + React Leaflet
- **Icons**: Lucide React

### Testing

- **Test Runner**: Vitest 4
- **Component Testing**: React Testing Library
- **E2E Testing**: Playwright
- **API Mocking**: MSW (Mock Service Worker)
- **Coverage**: V8 (built into Vitest)
- **CI/CD**: GitHub Actions

## Prerequisites

- Node.js 20+
- PostgreSQL database (Vercel Postgres recommended)
- Google OAuth credentials

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd offroad-parks
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database (Vercel Postgres)
POSTGRES_URL="your-postgres-url"
POSTGRES_PRISMA_URL="your-prisma-url"
POSTGRES_URL_NON_POOLING="your-non-pooling-url"
POSTGRES_USER="your-user"
POSTGRES_HOST="your-host"
POSTGRES_PASSWORD="your-password"
POSTGRES_DATABASE="your-database"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### Getting credentials:

- **Vercel Postgres**: Create a database at [vercel.com/dashboard](https://vercel.com/dashboard) -> Storage -> Postgres
- **Google OAuth**: Set up credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  - Create OAuth 2.0 Client ID
  - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### 4. Set up the database

Push the Prisma schema to your database:

```bash
npm run db:push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Available Scripts

### Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Testing

- `npm test` - Run all unit & integration tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:ui` - Run E2E tests with UI

### Database

- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Project Structure

```
offroad-parks/
├── prisma/
│   └── schema.prisma      # Database schema
├── public/                # Static assets
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── admin/        # Admin dashboard
│   │   ├── api/          # API routes
│   │   ├── parks/        # Park detail pages
│   │   ├── profile/      # User profile/favorites
│   │   └── submit/       # Park submission form
│   ├── components/       # React components
│   │   ├── admin/        # Admin-specific components
│   │   ├── layout/       # Layout components
│   │   ├── parks/        # Park-related components
│   │   ├── profile/      # Profile components
│   │   └── ui/           # Reusable UI components
│   ├── features/         # Feature-specific modules
│   │   ├── map/          # Map functionality
│   │   └── route-planner/ # Route planning
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions and configs
│   └── types/            # TypeScript type definitions
└── package.json
```

## Database Schema

The application uses the following main models:

- **User**: User accounts with authentication
- **Park**: Offroad park information
- **UserFavorite**: User's favorited parks
- **ParkTerrain**: Park terrain types (sand, rocks, mud, trails, hills)
- **ParkDifficulty**: Difficulty levels (easy, moderate, difficult, extreme)
- **ParkAmenity**: Available amenities (camping, cabins, restrooms, etc.)

## User Roles

- **USER**: Default role with access to browse parks, create favorites, and submit parks
- **ADMIN**: Full access to admin dashboard for managing parks, users, and submissions

## Making Your First Admin User

After signing in for the first time, you'll need to manually set your user role to ADMIN in the database:

1. Run `npm run db:studio` to open Prisma Studio
2. Navigate to the `User` table
3. Find your user account
4. Change the `role` field from `USER` to `ADMIN`
5. Save and refresh the application

## Development Notes

### Double API Calls in Development

You may notice that API calls (like `/api/auth/session` and `/api/favorites`) are called twice on page load in development mode. This is **expected behavior** in React 18 with Strict Mode enabled - React intentionally double-invokes effects in development to help catch bugs. This will not happen in production builds.

## Deployment

The application is optimized for deployment on Vercel:

1. Push your code to a Git repository
2. Import the project on [Vercel](https://vercel.com)
3. Add your environment variables in the Vercel dashboard
4. Deploy!

For other platforms, ensure your environment supports:

- Node.js 20+
- PostgreSQL database
- Environment variables configuration

## Testing

This project follows **Test-Driven Development (TDD)** practices and aims for **100% code coverage**.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Test Infrastructure

- **Vitest** - Fast, modern test runner with native TypeScript support
- **React Testing Library** - Component testing with user-centric approach
- **Playwright** - Cross-browser E2E testing
- **MSW** - API mocking for integration tests

### Pre-Commit Hooks

Before every commit, automated checks run:

- ✅ ESLint on staged files
- ✅ Tests related to changed files

### CI/CD

All pushes and pull requests trigger:

- ✅ Linting and type checking
- ✅ Full test suite execution
- ✅ Coverage report generation
- ✅ E2E tests across browsers

**Deployment**: Tests must pass before deployment to production.

For detailed testing guidelines, see [TESTING.md](./TESTING.md).

## Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for:

- TDD workflow (write tests first!)
- Code standards and style guide
- Commit message conventions
- Pull request process

**Key principle**: All code changes must include tests.

## License

[MIT License](LICENSE)

## Support

For issues, questions, or feature requests, please open an issue on the GitHub repository.
