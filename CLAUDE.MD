# Interview Companion — Project Instructions

## Project Overview

Interview Companion is an AI-powered interview preparation and candidate analysis application.

The application consists of two independent projects:

- `Interview-companion-ui`: React + TypeScript frontend.
- `Interview-companion-server`: Node.js + Express backend.

The frontend communicates with the backend through REST APIs.

## Architecture

```text
Interview Companion
│
├── Interview-companion-ui
│   ├── React
│   ├── TypeScript
│   └── UI components and application state
│
└── Interview-companion-server
    ├── Node.js
    ├── Express
    ├── REST APIs
    ├── AI Agents
    ├── Resume Processing
    └── MySQL
```

## Shared Development Principles

- Maintain clear separation between frontend and backend responsibilities.
- Follow existing architectural patterns and coding conventions.
- Avoid introducing unnecessary dependencies.
- Prefer modular, maintainable, production-oriented implementations.
- Do not modify unrelated functionality.
- Preserve backward compatibility of APIs unless explicitly requested.
- Handle errors explicitly and provide meaningful error messages.
- Consider security, performance, scalability, and maintainability.

## API Contract

- The frontend must communicate with the backend through defined API contracts.
- API request and response structures must remain consistent.
- When changing an API, inspect both frontend and backend usages.
- Update corresponding frontend and backend implementations when necessary.
- Avoid duplicating business logic in the frontend.

## AI Development

- AI functionality must be modular and independently testable.
- Clearly separate orchestration, prompts, tools, and business logic.
- Prefer structured outputs when AI responses are consumed programmatically.
- Validate AI-generated outputs before using them in downstream processing.
- Treat AI-generated content as untrusted input.

## Database

- MySQL is the application's relational database.
- Database schema changes must be explicit and reviewed.
- Preserve data integrity and transactional correctness.
- Avoid destructive migrations without explicit approval.

## Documentation

Maintain relevant architecture and technical documentation.

- `docs/ARCHITECTURE.md`: Overall application architecture.
- `docs/TECHNICAL_DECISIONS.md`: Important architectural decisions.
- `docs/CURRENT_WORK.md`: Current development progress and pending tasks.

Update documentation when significant architectural or implementation changes occur.

## Working Across Projects

When working on a feature:

1. Identify whether it requires frontend, backend, or both.
2. Inspect the relevant existing implementation before making changes.
3. Understand dependencies and API contracts.
4. Implement changes consistently across affected projects.
5. Run appropriate tests.
6. Update documentation when necessary.

## Important

- Never assume undocumented behavior.
- Verify implementation details against actual source code.
- Ask before making major architectural changes.
- Explain significant design decisions before implementing them.