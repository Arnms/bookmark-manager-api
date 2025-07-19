# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a bookmark management API service built with a modern TypeScript stack. The project is designed as a RESTful API with JWT authentication for personal bookmark management.

## Architecture Overview

### Technology Stack

- **Backend Framework**: Fastify (TypeScript-first, high-performance)
- **Database**: PostgreSQL with JSON field support
- **ORM**: Prisma (type-safe database client with auto-generated types)
- **Authentication**: JWT + bcrypt for password hashing
- **Language**: TypeScript for type safety and developer experience
- **Testing**: Jest + Supertest for unit and integration testing
- **Documentation**: Swagger/OpenAPI for API documentation
- **Validation**: Joi for request validation
- **Containerization**: Docker for PostgreSQL development environment

### Database Design

The application uses a PostgreSQL database with the following main entities:

- **User**: Authentication and user management
- **Category**: User-specific bookmark categories
- **WebsiteMetadata**: Shared website metadata (title, description, favicon)
- **Bookmark**: User bookmarks with personal notes and categorization
- **Tag**: User-specific tags for bookmark labeling
- **BookmarkTag**: Many-to-many relationship between bookmarks and tags

Key relationships:

- User (1) → Category (N)
- User (1) → Bookmark (N)
- User (1) → Tag (N)
- WebsiteMetadata (1) → Bookmark (N)
- Bookmark (N) ↔ Tag (N) through BookmarkTag

### Project Structure

This is a greenfield project in early planning stages. The codebase will follow these conventions:

- TypeScript throughout for type safety
- Async/await pattern for all asynchronous operations
- JSON Schema-based validation with Fastify
- RESTful API design principles
- Test-driven development approach

## Development Commands

⚠️ **Note**: This project is in initial planning stages. No package.json or build scripts exist yet.

Based on the tech stack documentation, these commands will be available once the project is initialized:

### Environment Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start PostgreSQL with Docker
docker-compose up -d

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed database with initial data
npm run seed
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Database Management

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database
npx prisma migrate reset

# Generate new migration
npx prisma migrate dev --name <migration-name>
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Run Prettier
npm run format

# Type checking
npm run type-check
```

## Implementation Phases

The project follows a structured 3-phase implementation plan:

### Phase 1 (MVP)

- User authentication (register/login)
- Basic bookmark CRUD operations
- Simple search functionality

### Phase 2

- Category system
- Tag system
- Pagination and sorting

### Phase 3

- Public/private bookmark settings
- Usage statistics
- Advanced search features

## Key Development Principles

1. **TypeScript-First**: All code uses TypeScript for compile-time safety
2. **Modern Async**: Promise/async-await pattern throughout
3. **Type Safety**: Prisma generates types automatically from database schema
4. **RESTful Design**: Follow REST principles for API endpoints
5. **Security**: JWT authentication, bcrypt password hashing, input validation
6. **Testing**: Comprehensive test coverage with Jest and Supertest
7. **Documentation**: Auto-generated API docs with Swagger

## Important Notes

- This project prioritizes developer experience with modern tooling
- Database schema uses snake_case (PostgreSQL convention) but Prisma models use camelCase
- Authentication uses stateless JWT tokens for scalability
- All user data is isolated by user_id for security
- Website metadata is shared across users to reduce duplication
