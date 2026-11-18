# Architecture

See the project CLAUDE.md for the overall layout. Feature notes:

## Rubric Sets
- Server: `routes/rubricSets.ts` -> `controllers/rubricSetsController.ts` -> `services/rubricSetsService.ts`, mounted at `/api/rubric-sets` (auth required). Schema in `sql/rubric_sets.sql`, extra columns in `database/init.ts`.
- Interviews API: `rubricSetId` (create only) and per-rubric `id` / `setItemId` are optional request fields. Responses add `rubricSetId`, `rubricSetName` and `isImported`. Existing clients keep working.
- UI: `RubricSetsPage`, `RubricSetEditPage`, `SaveRubricSetDialog`, `api/rubricSetsApi.ts`; the picker and locked rows live in `InterviewEditPage`.
