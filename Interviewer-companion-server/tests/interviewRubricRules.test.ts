import { describe, it, expect } from 'vitest'
import { checkImportedOnUpdate, resolveImportedOnCreate } from '../src/services/interviewRubricRules.js'
import type { RubricInput } from '../src/types/interview.js'

const rubric = (over: Partial<RubricInput>): RubricInput => ({
  title: 'T', description: 'D', rating: null, feedback: '', questionIds: [], ...over,
})
const items = [
  { id: 1, title: 'Design', description: 'Systems' },
  { id: 2, title: 'Coding', description: 'Algos' },
]

describe('resolveImportedOnCreate', () => {
  it('flags only rubrics imported from the set and allows extras', () => {
    const flags = resolveImportedOnCreate(
      [rubric({ setItemId: 1, title: 'Design', description: 'Systems' }), rubric({ setItemId: 2, title: 'Coding', description: 'Algos' }), rubric({ title: 'Mine' })],
      items
    )
    expect(flags).toEqual([true, true, false])
  })
  it('treats everything as manual when no set is chosen', () => {
    expect(resolveImportedOnCreate([rubric({}), rubric({})], null)).toEqual([false, false])
  })
  it('rejects a set item reference without a set', () => {
    expect(() => resolveImportedOnCreate([rubric({ setItemId: 1 })], null)).toThrow()
  })
  it('rejects a missing set item', () => {
    expect(() => resolveImportedOnCreate([rubric({ setItemId: 1, title: 'Design', description: 'Systems' })], items)).toThrow(/cannot be removed/)
  })
  it('rejects edited title or description', () => {
    expect(() =>
      resolveImportedOnCreate([rubric({ setItemId: 1, title: 'Changed', description: 'Systems' }), rubric({ setItemId: 2, title: 'Coding', description: 'Algos' })], items)
    ).toThrow(/cannot be edited/)
  })
  it('rejects an item from another set and duplicates', () => {
    expect(() => resolveImportedOnCreate([rubric({ setItemId: 99 })], items)).toThrow(/does not belong/)
    expect(() =>
      resolveImportedOnCreate([rubric({ setItemId: 1, title: 'Design', description: 'Systems' }), rubric({ setItemId: 1, title: 'Design', description: 'Systems' })], items)
    ).toThrow(/more than once/)
  })
})

describe('checkImportedOnUpdate', () => {
  const stored = [{ id: 10, title: 'Design', description: 'Systems' }]
  it('passes when imported rubrics are present and unchanged, extras are free', () => {
    const kept = checkImportedOnUpdate([rubric({ id: 10, title: 'Design', description: 'Systems', rating: 4 }), rubric({ title: 'New' })], stored)
    expect([...kept]).toEqual([10])
  })
  it('rejects removing an imported rubric', () => {
    expect(() => checkImportedOnUpdate([rubric({ title: 'New' })], stored)).toThrow(/cannot be removed/)
  })
  it('rejects editing an imported rubric', () => {
    expect(() => checkImportedOnUpdate([rubric({ id: 10, title: 'Design', description: 'Other' })], stored)).toThrow(/cannot be edited/)
  })
  it('does nothing for interviews without imported rubrics', () => {
    expect(checkImportedOnUpdate([rubric({ title: 'A' })], []).size).toBe(0)
  })
})
