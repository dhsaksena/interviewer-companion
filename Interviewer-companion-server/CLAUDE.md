# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # tsx watch src/server.ts (port 3001)
npm run build          # tsc -> dist/
npm run lint           # eslint src
npm run type-check     # tsc --noEmit
npm test               # vitest run, loads .env.test via dotenv-cli
npx dotenv -e .env.test -- vitest run tests/agents/resume-analysis/resumeAnalysisAgent.test.ts   # single file
npx dotenv -e .env.test -- vitest run -t "test name"                                              # single test
npm run db:init        # run schema setup (src/database/migrate.ts)
npm run package:lambda # esbuild bundle + pdf.worker.mjs + zip -> lambda.zip
```

Always run tests through `dotenv -e .env.test`: `src/config/index.ts` throws at import time if `GOOGLE_CLIENT_ID` or `SESSION_SECRET` is missing. Requires MySQL (see `.env.example`, `setup-mysql.sh`). The package is ESM (`"type": "module"`), so relative imports in `src` use the `.js` extension.

## Architecture

Express + MySQL API that runs in two modes from the same app:
- **Local/server:** `src/server.ts` runs `initializeDatabase()` then `app.listen`.
- **AWS Lambda:** `src/handler.ts` wraps `src/app.ts` with `serverless-http`. HTTP requests never touch the schema. Schema init is a direct Lambda invoke with payload `{"action":"db:init"}`. Lambda differences: S3 for uploads, a smaller DB pool, `trust proxy`, and no CORS in production (it is only enabled when `!isProduction`). Check `config.isLambda`, `config.s3Bucket` and `config.isProduction` before adding environment-specific behavior.

`src/app.ts` wires everything. All routes except `/api/health` and `/api/auth` sit behind `requireAuth`. Auth is a Google ID token exchanged for an `express-session` cookie, stored in MySQL by the custom `MySqlSessionStore`.

Layering is routes -> controllers -> services -> `database/connection.ts` (mysql2 pool). Schema lives in `sql/*.sql` (candidates, interviews) plus inline DDL in `src/database/init.ts`. It is applied idempotently (`CREATE TABLE IF NOT EXISTS`). Statements are split on `;` at end of line, so don't put `;` at the end of a line inside a statement body or comment.

Config is centralized in `src/config/index.ts`. Read env vars there, not via `process.env` elsewhere.

### AI / candidate features
- `services/modelFactory.ts` returns a LangChain chat model chosen by `AI_PROVIDER` (`claude` via the Anthropic API, or `bedrock` via `BEDROCK_MODEL_ID`). Always obtain models through it.
- **Resume import** (`controllers/candidatesController.ts` -> `services/resumeExtractionService.ts` -> `agents/resume-analysis/`): file text is extracted (`services/document`: pdf-parse, mammoth), then the agent calls the model with a Zod schema as a tool and streams partial JSON back. The tool name must not match a schema key (see the comment in `resumeAnalysisAgent.ts`).
- **360 deep dives** (`workflows/`, `services/deepDiveService.ts`): a LangGraph `StateGraph`, `plan -> <one research agent chosen by deep-dive node type> -> validate`. Adding a new `DeepDiveType` means updating `RESEARCH_NODE`, `FINDINGS_FIELD` and the state schema.
- **Long-running endpoints stream over SSE** via `utils/sse.ts` (`openSse`) with `utils/progressTracker.ts` emitting `progress` events, then `complete`. After `openSse`, report errors with `sse.fail`, not `next(err)`, because headers have already been sent. `sse.signal` aborts when the client disconnects and is passed down to the LLM calls.

### Uploads
`services/storageService.ts` writes to S3 when `S3_BUCKET` is set, otherwise to local `uploads/`, which `app.ts` serves statically.

## Related
The frontend is the sibling repo `../interviewer-companion-ui` (Vite/React), which has its own CLAUDE.md. In dev, CORS allows `FRONTEND_URL` (default `http://localhost:5173`) with credentials.
