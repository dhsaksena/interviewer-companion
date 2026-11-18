import { AppError } from '../middleware/errorHandler.js'
import type { RubricInput } from '../types/interview.js'

export interface SetItemRow {
  id: number
  title: string
  description: string
}

export interface StoredImportedRubric {
  id: number
  title: string
  description: string
}

// Create: rubrics tagged with setItemId must match the chosen set exactly, and every item of the set must be present.
// Returns the rubrics flagged as imported (the flag is decided here, never taken from the client).
export const resolveImportedOnCreate = (rubrics: RubricInput[], setItems: SetItemRow[] | null): boolean[] => {
  if (!setItems) {
    if (rubrics.some(r => r.setItemId !== undefined)) throw new AppError(400, 'Rubrics reference a rubric set that was not selected')
    return rubrics.map(() => false)
  }

  const byId = new Map(setItems.map(item => [item.id, item]))
  const seen = new Set<number>()
  const flags = rubrics.map((rubric, index) => {
    if (rubric.setItemId === undefined) return false
    const item = byId.get(rubric.setItemId)
    if (!item) throw new AppError(400, `Rubric ${index + 1} does not belong to the selected rubric set`)
    if (seen.has(item.id)) throw new AppError(400, `Rubric "${item.title}" is imported more than once`)
    if (rubric.title !== item.title || rubric.description !== item.description) {
      throw new AppError(400, `Imported rubric "${item.title}" cannot be edited`)
    }
    seen.add(item.id)
    return true
  })

  const missing = setItems.find(item => !seen.has(item.id))
  if (missing) throw new AppError(400, `Imported rubric "${missing.title}" cannot be removed`)
  return flags
}

// Update: every stored imported rubric must still be present (matched by id) with unchanged title and description.
// Returns the set of imported rubric ids found in the payload.
export const checkImportedOnUpdate = (rubrics: RubricInput[], stored: StoredImportedRubric[]): Set<number> => {
  const payloadById = new Map<number, RubricInput>()
  for (const rubric of rubrics) {
    if (rubric.id === undefined) continue
    if (payloadById.has(rubric.id)) throw new AppError(400, 'A rubric appears more than once')
    payloadById.set(rubric.id, rubric)
  }

  for (const imported of stored) {
    const incoming = payloadById.get(imported.id)
    if (!incoming) throw new AppError(400, `Imported rubric "${imported.title}" cannot be removed`)
    if (incoming.title !== imported.title || incoming.description !== imported.description) {
      throw new AppError(400, `Imported rubric "${imported.title}" cannot be edited`)
    }
  }
  return new Set(stored.map(r => r.id))
}
