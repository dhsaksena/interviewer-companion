# Interviewer Companion Server

Backend server for the Interviewer Companion application - a platform for managing and practicing interview questions.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Language**: TypeScript
- **Package Manager**: npm

## Project Structure

```
src/
├── index.ts              # Application entry point
├── config/               # Configuration management
├── controllers/          # Request handlers
├── services/             # Business logic
├── routes/               # API routes
├── middleware/           # Express middleware
└── types/                # TypeScript type definitions
```

## Prerequisites

- Node.js >= 18
- npm >= 9
- MySQL >= 5.7

## Installation

```bash
npm install
```

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your MySQL configuration:
```
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=interviewer_companion
```

3. Ensure MySQL is running and accessible with your credentials

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The server will be available at `http://localhost:3001`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start the built application
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

## API Endpoints

### Health Check
- `GET /api/health` - Server health check

### Categories (MySQL)
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get a specific category
- `POST /api/categories` - Create a new category
- `PUT /api/categories/:id` - Update a category
- `DELETE /api/categories/:id` - Delete a category (409 if it still has questions)
- `POST /api/categories/:id/subcategories` - Add a subcategory (`{ "name": "..." }`)
- `PUT /api/subcategories/:id` - Rename a subcategory
- `DELETE /api/subcategories/:id` - Delete a subcategory (409 if it still has questions)

Duplicate names return 409; blank names return 400.

### Questions
- `GET /api/questions` - Get all questions with optional filters
  - Query params: `difficulty`, `type`, `category`, `search`
- `GET /api/questions/:id` - Get a specific question
- `POST /api/questions` - Create a new question
- `PUT /api/questions/:id` - Update a question
- `DELETE /api/questions/:id` - Delete a question

## Example Requests

### Get all categories
```bash
curl http://localhost:3001/api/categories
```

### Get a specific category
```bash
curl http://localhost:3001/api/categories/1
```

### Create a category
```bash
curl -X POST http://localhost:3001/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DevOps",
    "description": "DevOps and infrastructure questions"
  }'
```

### Get all questions
```bash
curl http://localhost:3001/api/questions
```

### Get questions with filters
```bash
curl "http://localhost:3001/api/questions?difficulty=Easy&category=Frontend"
```

### Create a question
```bash
curl -X POST http://localhost:3001/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "title": "What is async/await?",
    "description": "Explain async/await in JavaScript",
    "difficulty": "Medium",
    "type": "Conceptual",
    "category": "JavaScript",
    "tags": ["JavaScript", "Async"]
  }'
```

## Database Setup

### Categories Table (MySQL)
The server automatically creates the `categories` table on startup and populates it with sample data:
- Backend
- Frontend
- Data Engineering
- AI

The table is created with the following schema:
```sql
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

### Questions Table (In-Memory)
Currently, the questions data is stored in-memory. To integrate with a database:

1. Install the appropriate database driver
2. Update `services/questionsService.ts` to use your database
3. Create database schema/migrations as needed

## Type Definitions

All TypeScript types are defined in `src/types/` directory. Key types include:
- `Question` - Main question object
- `CreateQuestionInput` - Input for creating questions
- `UpdateQuestionInput` - Input for updating questions
- `GetQuestionsFilters` - Filters for fetching questions

## Error Handling

Errors are handled through the `AppError` class and centralized error handler middleware. All errors return a consistent JSON response with error message and status code.

## CORS Configuration

CORS is configured to:
- Allow all origins in development
- Restrict origins in production (update the array in `src/index.ts`)

## Deployment

### Build for production
```bash
npm run build
```

### Run production build
```bash
NODE_ENV=production npm start
```

## License

ISC
