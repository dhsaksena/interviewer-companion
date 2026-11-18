import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { getPool } from '../database/connection.js'
import { AppError } from '../middleware/errorHandler.js'
import type {
  Interview,
  InterviewInput,
  InterviewStatus,
  InterviewSummary,
  InterviewUsage,
  ListInterviewsParams,
} from '../types/interview.js'
import { checkImportedOnUpdate, resolveImportedOnCreate, type SetItemRow, type StoredImportedRubric } from './interviewRubricRules.js'

// Whitelisted ORDER BY expressions (sort keys come from the query string)
const SORT_SQL = {
  title: 'i.title',
  candidate: 'i.candidate_name',
  rubrics: 'rubric_count',
  questions: 'question_count',
  updated: 'i.updated_at',
  date: 'i.interview_date',
} as const

const withConnection = async <T>(fn: (connection: PoolConnection) => Promise<T>): Promise<T> => {
  const connection = await getPool().getConnection()
  try {
    return await fn(connection)
  } finally {
    connection.release()
  }
}

const inTransaction = <T>(fn: (connection: PoolConnection) => Promise<T>): Promise<T> =>
  withConnection(async connection => {
    await connection.beginTransaction()
    try {
      const result = await fn(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })

// DATE columns come back as Date objects in the server's timezone: format from local parts to avoid day shifts
const toDateString = (value: Date | string | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

// Writes the interview's rubrics (and their question links). Rubrics imported from a rubric set are
// updated in place (only position, rating, feedback and questions can change); everything else is
// replaced. `imported[i]` says whether input.rubrics[i] is an imported rubric. `existingImportedIds`
// are the stored imported rubrics that are kept (update only).
const writeRubrics = async (
  connection: PoolConnection,
  interviewId: number,
  input: InterviewInput,
  imported: boolean[],
  existingImportedIds: Set<number> = new Set()
) => {
  await connection.query('DELETE FROM interview_rubrics WHERE interview_id = ? AND is_imported = 0', [interviewId])

  const questionIds = [...new Set(input.rubrics.flatMap(r => r.questionIds))]
  if (questionIds.length > 0) {
    const [found] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM questions WHERE id IN (?)',
      [questionIds]
    )
    if (found.length !== questionIds.length) {
      throw new AppError(400, 'One or more selected questions no longer exist')
    }
  }

  for (const [position, rubric] of input.rubrics.entries()) {
    let rubricId: number
    if (rubric.id !== undefined && existingImportedIds.has(rubric.id)) {
      rubricId = rubric.id
      await connection.query(
        'UPDATE interview_rubrics SET position = ?, rating = ?, feedback = ? WHERE id = ? AND interview_id = ?',
        [position, rubric.rating, rubric.feedback, rubricId, interviewId]
      )
      await connection.query('DELETE FROM rubric_questions WHERE rubric_id = ?', [rubricId])
    } else {
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO interview_rubrics (interview_id, title, description, position, rating, feedback, is_imported) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [interviewId, rubric.title, rubric.description, position, rubric.rating, rubric.feedback, imported[position] ? 1 : 0]
      )
      rubricId = result.insertId
    }
    const links = [...new Set(rubric.questionIds)].map((questionId, index) => [rubricId, questionId, index])
    if (links.length > 0) {
      await connection.query('INSERT INTO rubric_questions (rubric_id, question_id, position) VALUES ?', [links])
    }
  }
}

export class InterviewsService {
  async list(params: ListInterviewsParams): Promise<{ items: InterviewSummary[]; total: number }> {
    return withConnection(async connection => {
      const where: string[] = []
      const values: unknown[] = []

      if (params.status !== 'all') {
        where.push('i.status = ?')
        values.push(params.status)
      }

      if (params.search) {
        const like = `%${params.search.replace(/[\\%_]/g, '\\$&')}%`
        where.push(`(i.title LIKE ? OR i.candidate_name LIKE ? OR i.notes LIKE ?
          OR EXISTS (SELECT 1 FROM interview_rubrics r WHERE r.interview_id = i.id AND r.title LIKE ?))`)
        values.push(like, like, like, like)
      }

      const having =
        params.questionFilter === 'with' ? 'HAVING question_count > 0'
        : params.questionFilter === 'without' ? 'HAVING question_count = 0'
        : ''

      const base = `
        SELECT i.id, i.title, i.candidate_name, i.notes, i.status, i.interview_date, i.updated_at,
          (SELECT COUNT(*) FROM interview_rubrics r WHERE r.interview_id = i.id) AS rubric_count,
          (SELECT COUNT(*) FROM rubric_questions rq
             JOIN interview_rubrics r ON r.id = rq.rubric_id WHERE r.interview_id = i.id) AS question_count
        FROM interviews i
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ${having}
      `

      const [countRows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM (${base}) t`, values)
      const total = Number(countRows[0].total)

      const direction = params.dir === 'asc' ? 'ASC' : 'DESC'
      const [rows] = await connection.query<RowDataPacket[]>(
        `${base} ORDER BY ${SORT_SQL[params.sort]} ${direction}, i.id DESC LIMIT ? OFFSET ?`,
        [...values, params.pageSize, (params.page - 1) * params.pageSize]
      )

      // Which rubric title matched, only for rows where the text isn't in the interview's own fields
      const matched = new Map<number, string>()
      const needle = params.search.toLowerCase()
      if (needle && rows.length > 0) {
        const [rubricRows] = await connection.query<RowDataPacket[]>(
          'SELECT interview_id, title FROM interview_rubrics WHERE interview_id IN (?) ORDER BY position',
          [rows.map(r => r.id)]
        )
        for (const rubric of rubricRows) {
          if (!matched.has(rubric.interview_id) && String(rubric.title).toLowerCase().includes(needle)) {
            matched.set(rubric.interview_id, rubric.title)
          }
        }
      }

      const items = rows.map(row => {
        const ownText = `${row.title} ${row.candidate_name} ${row.notes ?? ''}`.toLowerCase()
        return {
          id: row.id,
          title: row.title,
          candidateName: row.candidate_name,
          notes: row.notes ?? '',
          status: row.status as InterviewStatus,
          interviewDate: toDateString(row.interview_date),
          updatedAt: row.updated_at,
          rubricCount: Number(row.rubric_count),
          questionCount: Number(row.question_count),
          matchedRubric: needle && !ownText.includes(needle) ? matched.get(row.id) ?? null : null,
        }
      })

      return { items, total }
    })
  }

  async getById(id: number): Promise<Interview | null> {
    return withConnection(async connection => {
      const [interviews] = await connection.query<RowDataPacket[]>(
        `SELECT i.id, i.title, i.candidate_name, i.notes, i.status, i.interview_date, i.created_at, i.updated_at,
                i.rubric_set_id, rs.name AS rubric_set_name
         FROM interviews i LEFT JOIN rubric_sets rs ON rs.id = i.rubric_set_id WHERE i.id = ?`,
        [id]
      )
      if (interviews.length === 0) return null
      const row = interviews[0]

      const [rubrics] = await connection.query<RowDataPacket[]>(
        'SELECT id, title, description, rating, feedback, is_imported FROM interview_rubrics WHERE interview_id = ? ORDER BY position, id',
        [id]
      )
      const [links] = rubrics.length
        ? await connection.query<RowDataPacket[]>(
            `SELECT rq.rubric_id, q.id, q.title, q.difficulty, c.name AS category
             FROM rubric_questions rq
             JOIN questions q ON q.id = rq.question_id
             LEFT JOIN categories c ON c.id = q.category_id
             WHERE rq.rubric_id IN (?) ORDER BY rq.position`,
            [rubrics.map(r => r.id)]
          )
        : [[] as RowDataPacket[]]

      return {
        id: row.id,
        title: row.title,
        candidateName: row.candidate_name,
        notes: row.notes ?? '',
        status: row.status as InterviewStatus,
        interviewDate: toDateString(row.interview_date),
        rubricSetId: row.rubric_set_id ?? null,
        rubricSetName: row.rubric_set_name ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        rubrics: rubrics.map(rubric => ({
          id: rubric.id,
          title: rubric.title,
          description: rubric.description ?? '',
          isImported: Boolean(rubric.is_imported),
          rating: rubric.rating ?? null,
          feedback: rubric.feedback ?? '',
          questions: links
            .filter(link => link.rubric_id === rubric.id)
            .map(link => ({ id: link.id, title: link.title, difficulty: link.difficulty, category: link.category })),
        })),
      }
    })
  }

  // `trusted` is only for server-side copies (duplicate), where imported flags come from an existing interview
  async create(input: InterviewInput, trusted = false): Promise<Interview> {
    const id = await inTransaction(async connection => {
      let imported: boolean[]
      let rubricSetId: number | null = null
      if (trusted) {
        imported = input.rubrics.map(r => Boolean(r.imported))
        rubricSetId = input.rubricSetId ?? null
      } else {
        let items: SetItemRow[] | null = null
        if (input.rubricSetId) {
          const [setRows] = await connection.query<RowDataPacket[]>('SELECT id FROM rubric_sets WHERE id = ?', [input.rubricSetId])
          if (setRows.length === 0) throw new AppError(400, 'The selected rubric set no longer exists')
          const [itemRows] = await connection.query<RowDataPacket[]>(
            'SELECT id, title, description FROM rubric_set_items WHERE rubric_set_id = ? ORDER BY position, id',
            [input.rubricSetId]
          )
          items = itemRows.map(row => ({ id: row.id, title: row.title, description: row.description ?? '' }))
          rubricSetId = input.rubricSetId
        }
        imported = resolveImportedOnCreate(input.rubrics, items)
      }

      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO interviews (title, candidate_name, notes, status, interview_date, rubric_set_id) VALUES (?, ?, ?, ?, ?, ?)',
        [input.title, input.candidateName, input.notes, input.status, input.interviewDate, rubricSetId]
      )
      await writeRubrics(connection, result.insertId, input, imported)
      return result.insertId
    })
    return (await this.getById(id))!
  }

  async update(id: number, input: InterviewInput): Promise<Interview | null> {
    const found = await inTransaction(async connection => {
      const [locked] = await connection.query<RowDataPacket[]>('SELECT id FROM interviews WHERE id = ? FOR UPDATE', [id])
      if (locked.length === 0) return false

      // Rubrics imported from a rubric set must survive unchanged (title, description) and cannot be removed
      const [storedRows] = await connection.query<RowDataPacket[]>(
        'SELECT id, title, description FROM interview_rubrics WHERE interview_id = ? AND is_imported = 1',
        [id]
      )
      const stored: StoredImportedRubric[] = storedRows.map(row => ({ id: row.id, title: row.title, description: row.description ?? '' }))
      const keptIds = checkImportedOnUpdate(input.rubrics, stored)

      await connection.query(
        'UPDATE interviews SET title = ?, candidate_name = ?, notes = ?, status = ?, interview_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [input.title, input.candidateName, input.notes, input.status, input.interviewDate, id]
      )
      await writeRubrics(connection, id, input, input.rubrics.map(r => r.id !== undefined && keptIds.has(r.id)), keptIds)
      return true
    })
    return found ? this.getById(id) : null
  }

  async delete(id: number): Promise<boolean> {
    return withConnection(async connection => {
      const [result] = await connection.query<ResultSetHeader>('DELETE FROM interviews WHERE id = ?', [id])
      return result.affectedRows > 0
    })
  }

  // Copies rubrics and question assignments into a new interview for another candidate
  async duplicate(id: number, title: string, candidateName: string): Promise<Interview | null> {
    const source = await this.getById(id)
    if (!source) return null

    return this.create({
      title,
      candidateName,
      notes: '',
      status: 'draft',
      interviewDate: null,
      rubricSetId: source.rubricSetId,
      // Ratings and feedback belong to the original candidate, so the copy starts blank
      rubrics: source.rubrics.map(rubric => ({
        title: rubric.title,
        description: rubric.description,
        imported: rubric.isImported,
        rating: null,
        feedback: '',
        questionIds: rubric.questions.map(q => q.id),
      })),
    }, true)
  }

  // Interviews that have the question assigned to any rubric
  async usageForQuestion(questionId: number): Promise<InterviewUsage[]> {
    return withConnection(async connection => {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT DISTINCT i.id, i.title, i.candidate_name, i.updated_at
         FROM rubric_questions rq
         JOIN interview_rubrics r ON r.id = rq.rubric_id
         JOIN interviews i ON i.id = r.interview_id
         WHERE rq.question_id = ?
         ORDER BY i.updated_at DESC`,
        [questionId]
      )
      return rows.map(row => ({ id: row.id, title: row.title, candidateName: row.candidate_name }))
    })
  }
}
