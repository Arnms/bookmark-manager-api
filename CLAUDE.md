# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a RESTful API for a personal bookmark management system using JWT authentication, built with TypeScript and Fastify. The project enables users to manage bookmarks with features like categorization, tagging, search, and privacy controls.

**Target User**: Web developers and knowledge workers who need systematic bookmark management with cross-device access, search capabilities, and personal note-taking features.

## Development Commands

- `npm run dev` - Start development server with hot reload using tsx
- `npm run build` - Compile TypeScript to JavaScript 
- `npm start` - Run the production build
- `npx eslint .` - Run ESLint for code linting
- `npx prettier --write .` - Format code with Prettier

## Architecture

### Tech Stack
- **Framework**: Fastify with TypeScript (chosen for performance, async/await optimization, and native TypeScript support)
- **Database**: PostgreSQL with Prisma ORM (selected for relational data structure and full-text search capabilities)
- **Authentication**: JWT via @fastify/jwt with bcrypt for password hashing
- **Validation**: Zod and TypeBox for schema validation
- **Security**: Helmet for security headers, CORS enabled, rate limiting configured
- **Logging**: Pino with pretty printing in development
- **Testing**: Jest + Supertest
- **Documentation**: Swagger/OpenAPI

### Project Structure
- `src/index.ts` - Application entry point, server startup logic
- `src/app.ts` - Fastify app configuration and plugin registration
- Core plugins registered: CORS, Helmet, JWT authentication
- Health check endpoint available at `/health`

### Configuration Notes
- Server runs on port 3000 by default (configurable via PORT env var)
- JWT secret defaults to 'secret-key' (should be set via JWT_SECRET env var)
- ESLint configured with TypeScript rules and Prettier integration
- TypeScript compiled to `dist/` directory

## Feature Requirements (User Stories)

### MVP Features (Phase 1)
- **US-001/002**: User authentication (registration, login with JWT)
- **US-003/004/005**: Bookmark CRUD operations with personal notes
- **US-008**: Basic search functionality (title, URL, notes, tags)

### Phase 2 Features
- **US-006**: Category management and assignment
- **US-007**: Tag system with multi-tag support
- **US-009**: Sorting and pagination

### Phase 3 Features
- **US-010**: Public/private bookmark settings
- **US-011**: Usage statistics and analytics

## Database Schema Design

### Core Entities
- **User**: Authentication and profile information
- **Bookmark**: URL, title, description, notes, privacy settings
- **Category**: Hierarchical organization system
- **Tag**: Flexible labeling system
- **Relationships**: User ↔ Bookmark ↔ Category ↔ Tag (many-to-many for tags)

### Key Features
- Soft delete support for bookmarks
- Full-text search capabilities
- User-scoped data isolation
- Automatic timestamp tracking

## API Design Principles

### RESTful Endpoints
- `/auth/*` - Authentication routes
- `/bookmarks/*` - Bookmark CRUD and search
- `/categories/*` - Category management
- `/tags/*` - Tag operations
- `/stats/*` - User statistics

### Response Standards
- Consistent JSON structure
- Proper HTTP status codes
- Pagination metadata
- Error handling with descriptive messages

## Development Guidelines

### Code Quality Standards
- TypeScript strict mode enabled
- Test coverage target: >80%
- ESLint compliance required
- Prettier formatting enforced

### Security Requirements
- JWT token-based authentication
- Password hashing with bcrypt
- Input validation on all endpoints
- Rate limiting protection
- CORS configuration
- Environment variable security

### Performance Targets
- API response time: <200ms
- Database query optimization
- Pagination for large datasets
- Efficient search algorithms

## Project Timeline (15-20 days)

### Week 1: Foundation
- Project setup and configuration
- Database design and Prisma schema
- Authentication system implementation

### Week 2: Core Features
- Bookmark CRUD operations
- Category and tag systems
- Search functionality

### Week 3: Polish & Deploy
- Testing and optimization
- Documentation and deployment preparation
- Performance tuning

## Current Status
The project is in early development stage with basic server setup. Database schema and core business logic are not yet implemented. Next steps involve database design and authentication system development.

## Development Notes
- **Language**: Korean developer - use Korean for documentation and code comments
- **Documentation**: All docs and comments should be written in Korean
- **Code Style**: Follow Korean naming conventions where applicable