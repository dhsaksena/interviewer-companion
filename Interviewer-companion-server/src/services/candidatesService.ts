import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { getPool } from '../database/connection.js'
import type { Candidate, CandidateSummary, ListCandidatesParams } from '../types/candidate.js'
import type { CandidateProfile } from '../types/candidateProfile.js'
import type { ResumeExtractionResult } from '../types/resumeExtractionResult.js'

const TOP_SKILLS = 5

// Falls back to "<title> at <company>" of the latest role when the resume has no headline
const headlineOf = (profile: CandidateProfile) => {
  if (profile.headline) return profile.headline
  const latest = profile.experience[0]
  if (!latest) return ''
  return [latest.title, latest.company].filter(Boolean).join(' at ')
}

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const toCandidate = (row: RowDataPacket): Candidate => ({
  id: row.id,
  profile: JSON.parse(row.profile),
  warnings: parseJson<string[]>(row.warnings, []),
  resumeFileName: row.resume_file_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export class CandidatesService {
  async list(params: ListCandidatesParams): Promise<{ items: CandidateSummary[]; total: number }> {
    const where: string[] = []
    const values: unknown[] = []

    if (params.search) {
      // The profile JSON holds skills, companies and schools, so one LIKE covers them all
      const like = `%${params.search.replace(/[\\%_]/g, '\\$&')}%`
      where.push('(full_name LIKE ? OR email LIKE ? OR headline LIKE ? OR profile LIKE ?)')
      values.push(like, like, like, like)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const [countRows] = await getPool().query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM candidates ${whereSql}`, values)
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, full_name, email, headline, profile, resume_file_name, updated_at
       FROM candidates ${whereSql}
       ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...values, params.pageSize, (params.page - 1) * params.pageSize]
    )

    return {
      total: Number(countRows[0].total),
      items: rows.map(row => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        headline: row.headline,
        topSkills: parseJson<Partial<CandidateProfile>>(row.profile, {}).skills?.slice(0, TOP_SKILLS) ?? [],
        resumeFileName: row.resume_file_name,
        updatedAt: row.updated_at,
      })),
    }
  }

  async getById(id: number): Promise<Candidate | null> {
    const [rows] = await getPool().query<RowDataPacket[]>(
      'SELECT id, profile, warnings, resume_file_name, created_at, updated_at FROM candidates WHERE id = ?',
      [id]
    )
    return rows.length ? toCandidate(rows[0]) : null
  }

  async create(extraction: ResumeExtractionResult, resumeFileName: string): Promise<Candidate> {
    const profile = extraction.candidateProfile
    const [result] = await getPool().query<ResultSetHeader>(
      `INSERT INTO candidates (full_name, email, headline, profile, warnings, resume_file_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        profile.fullName.slice(0, 255),
        (profile.email ?? '').slice(0, 255),
        headlineOf(profile).slice(0, 255),
        JSON.stringify(profile),
        JSON.stringify(extraction.warnings),
        resumeFileName.slice(0, 255),
      ]
    )
    return (await this.getById(result.insertId))!
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await getPool().query<ResultSetHeader>('DELETE FROM candidates WHERE id = ?', [id])
    return result.affectedRows > 0
  }
}
