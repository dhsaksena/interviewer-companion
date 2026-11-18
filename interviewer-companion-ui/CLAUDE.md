# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

EvalNext / Saarthi – Interview Companion UI: a React 19 + Vite + TypeScript SPA for managing an interview question bank, interviews, and candidates (resume import, 360° profile graph, deep dives). The backend lives in the sibling repo directory `../Interviewer-companion-server`.

## Commands

```
npm install
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # tsc -b && vite build (output in dist/)
npm run lint      # eslint .
npm run preview
```

There is no test runner configured in this package. Config: copy `.env.example` to `.env.local` and set `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`. Without `VITE_API_URL`, dev falls back to `http://localhost:3001/api`, and **production builds throw** if it is unset.

Deployment is S3 + CloudFront via `S3_BUCKET=... CLOUDFRONT_DISTRIBUTION_ID=... ./deploy.sh` (see README.md). Always ask the user before deploying.

## Architecture

- **Routing (`src/router.ts`)**: custom hash router, not react-router. `Route` is a discriminated union, `paths.*` builds URLs, `parseRoute` parses them, and `useRoute`/`navigate` are the hooks/functions to use. It supports blocking navigation while forms have unsaved changes (see `UnsavedChangesDialog`). `src/App.tsx` switches on `route.name` to render pages. To add a page: extend `Route`, `paths`, `parseRoute`, then add a branch in `App.tsx`. (The README's "no URL routing" note is outdated; hash routing is why no SPA rewrite rules are needed on S3.)
- **Auth (`src/auth/`)**: Google sign-in; the server sets a session cookie. `AuthContext` gates `MainApp` vs `LandingPage` in `App.tsx`.
- **API layer (`src/api/`)**: all requests must go through `apiFetch`, which sends `credentials: 'include'`, dispatches `auth:unauthorized` on 401, and for body-bearing requests serializes the body to bytes and sets `x-amz-content-sha256` (required by CloudFront OAC). `sse.ts` (`postSse`) reads POST-based `text/event-stream` responses for long-running AI operations (e.g. resume import) with `progress`/`complete`/`error` events. Per-resource modules: `candidatesApi`, `categoriesApi`, `interviewsApi`, `authApi`.
- **Pages / components**: `src/pages/*` are route targets; shared UI is in `src/components/` (candidate graph/details/deep-dive in `components/candidate/`). Domain types are in `src/types/index.ts`; candidate graph/stat derivation in `src/utils/candidateGraph.ts` and `candidateStats.ts`.
- **Styling**: plain CSS, one file per page/component (`src/styles/`, `components/*.css`) plus `styles/theme.css` for shared tokens. No CSS framework.
- **Global shortcuts** (`App.tsx`): `/` focuses the search input, `n` clicks the `.fab` add button. List pages rely on `input[type="search"]` and `.fab` selectors, so keep them when editing.
- **Landing page**: `LandingPage.tsx` and `src/saarthi_landing_page.html` (static marketing HTML) are separate from the app shell.
