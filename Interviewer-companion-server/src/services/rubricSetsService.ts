import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { getPool } from '../database/connection.js'
import type {
  RubricSet,
  RubricSetInput,
  RubricSetInterviewRef,
  RubricSetSummary,
} from '../types/rubricSet.js'

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

const toDateString = (value: Date | string | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

const writeItems = async (connection: PoolConnection, setId: number, input: RubricSetInput) => {
  await connection.query('DELETE FROM rubric_set_items WHERE rubric_set_id = ?', [setId])
  const rows = input.items.map((item, position) => [setId, item.title, item.description, position])
  if (rows.length > 0) {
    await connection.query('INSERT INTO rubric_set_items (rubric_set_id, title, description, position) VALUES ?', [rows])
  }
}

const toSummary = (row: RowDataPacket): RubricSetSummary => ({
  id: row.id,
  name: row.name,
  role: row.role,
  description: row.description ?? '',
  updatedAt: row.updated_at,
  rubricCount: Number(row.rubric_count),
  interviewCount: Number(row.interview_count),
  completedInterviewCount: Number(row.completed_count),
  lastUsedAt: row.last_used_at ?? null,
})

const SUMMARY_SELECT = `
  SELECT rs.id, rs.name, rs.role, rs.description, rs.updated_at,
    (SELECT COUNT(*) FROM rubric_set_items it WHERE it.rubric_set_id = rs.id) AS rubric_count,
    (SELECT COUNT(*) FROM interviews i WHERE i.rubric_set_id = rs.id) AS interview_count,
    (SELECT COUNT(*) FROM interviews i WHERE i.rubric_set_id = rs.id AND i.status = 'completed') AS completed_count,
    (SELECT MAX(i.created_at) FROM interviews i WHERE i.rubric_set_id = rs.id) AS last_used_at
  FROM rubric_sets rs`

export class RubricSetsService {
  async list(search: string): Promise<RubricSetSummary[]> {
    return withConnection(async connection => {
      const like = `%${search.replace(/[%_\\]/g, '\\$&')}%`
      const [rows] = search
        ? await connection.query<RowDataPacket[]>(
            `${SUMMARY_SELECT} WHERE rs.name LIKE ? OR rs.role LIKE ? ORDER BY rs.updated_at DESC`,
            [like, like]
          )
        : await connection.query<RowDataPacket[]>(`${SUMMARY_SELECT} ORDER BY rs.updated_at DESC`)
      return rows.map(toSummary)
    })
  }

  async getById(id: number): Promise<RubricSet | null> {
    return withConnection(async connection => {
      const [rows] = await connection.query<RowDataPacket[]>(`${SUMMARY_SELECT} WHERE rs.id = ?`, [id])
      if (rows.length === 0) return null
      const [items] = await connection.query<RowDataPacket[]>(
        'SELECT id, title, description FROM rubric_set_items WHERE rubric_set_id = ? ORDER BY position, id',
        [id]
      )
      return {
        ...toSummary(rows[0]),
        items: items.map(item => ({ id: item.id, title: item.title, description: item.description ?? '' })),
      }
    })
  }

  async create(input: RubricSetInput): Promise<RubricSet> {
    const id = await inTransaction(async connection => {
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO rubric_sets (name, role, description) VALUES (?, ?, ?)',
        [input.name, input.role, input.description]
      )
      await writeItems(connection, result.insertId, input)
      return result.insertId
    })
    return (await this.getById(id))!
  }

  // Only changes the set. Interviews that already imported from it keep their own copies.
  async update(id: number, input: RubricSetInput): Promise<RubricSet | null> {
    const found = await inTransaction(async connection => {
      const [result] = await connection.query<ResultSetHeader>(
        'UPDATE rubric_sets SET name = ?, role = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [input.name, input.role, input.description, id]
      )
      if (result.affectedRows === 0) return false
      await writeItems(connection, id, input)
      return true
    })
    return found ? this.getById(id) : null
  }

  // Interviews keep their rubrics; their rubric_set_id is set to NULL by the foreign key
  async delete(id: number): Promise<boolean> {
    return withConnection(async connection => {
      const [result] = await connection.query<ResultSetHeader>('DELETE FROM rubric_sets WHERE id = ?', [id])
      return result.affectedRows > 0
    })
  }

  async duplicate(id: number, name: string): Promise<RubricSet | null> {
    const source = await this.getById(id)
    if (!source) return null
    return this.create({
      name,
      role: source.role,
      description: source.description,
      items: source.items.map(({ title, description }) => ({ title, description })),
    })
  }

  async interviewsFor(id: number): Promise<RubricSetInterviewRef[]> {
    return withConnection(async connection => {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT id, title, candidate_name, status, interview_date
         FROM interviews WHERE rubric_set_id = ? ORDER BY created_at DESC`,
        [id]
      )
      return rows.map(row => ({
        id: row.id,
        title: row.title,
        candidateName: row.candidate_name,
        status: row.status,
        interviewDate: toDateString(row.interview_date),
      }))
    })
  }
}
