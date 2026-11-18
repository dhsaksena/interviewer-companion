# Technical Decisions

## Rubric Sets are copied into interviews, never linked
- A Rubric Set (`rubric_sets`, `rubric_set_items`) is a reusable, named list of rubrics (title + description) for a role.
- Choosing a set while creating an interview copies its items into `interview_rubrics` with `is_imported = 1`. `interviews.rubric_set_id` records provenance only (ON DELETE SET NULL).
- Why: interviews hold ratings and feedback and are historical records. Editing or deleting a set must not change past interviews.
- An interview has at most one set, chosen at creation and fixed after the first save.
- Imported rubrics: title and description are locked and the rubric cannot be removed. Rating, feedback, questions and order stay editable. Users can add their own rubrics freely.
- Enforced on the server (`services/interviewRubricRules.ts`), not only in the UI. The imported flag is decided by the server and never read from the client.
- Interview save keeps its delete-and-reinsert behaviour for non-imported rubrics. Imported rubrics are updated in place so their ids stay stable.
- Usage: a set reports `interviewCount`, `completedInterviewCount` (status = completed) and `lastUsedAt`.
