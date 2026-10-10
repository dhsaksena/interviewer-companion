import { getPool } from '../database/connection.js'
import {
  Question,
  CreateQuestionInput,
  UpdateQuestionInput,
  GetQuestionsFilters,
} from '../types/question.js'

export class QuestionsService {
  async getAllQuestions(filters: GetQuestionsFilters): Promise<Question[]> {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      let query = `
        SELECT
          q.id, q.title, q.description, q.difficulty, q.type,
          q.category_id, q.subcategory_id, q.solution, q.solution_image_url,
          q.created_at, q.updated_at,
          c.name as category, s.name as subcategory
        FROM questions q
        LEFT JOIN categories c ON q.category_id = c.id
        LEFT JOIN subcategories s ON q.subcategory_id = s.id
        WHERE 1=1
      `
      const params: any[] = []

      if (filters.category) {
        query += ' AND c.name = ?'
        params.push(filters.category)
      }

      if (filters.subcategory) {
        query += ' AND s.name = ?'
        params.push(filters.subcategory)
      }

      if (filters.search) {
        query += ' AND (q.title LIKE ? OR q.description LIKE ?)'
        const searchTerm = `%${filters.search}%`
        params.push(searchTerm, searchTerm)
      }

      if (filters.difficulty && filters.difficulty.length > 0) {
        query += ` AND q.difficulty IN (${filters.difficulty.map(() => '?').join(',')})`
        params.push(...filters.difficulty)
      }

      if (filters.type && filters.type.length > 0) {
        query += ` AND q.type IN (${filters.type.map(() => '?').join(',')})`
        params.push(...filters.type)
      }

      query += ' ORDER BY q.id ASC'

      const [questions] = await connection.query(query, params)
      return questions as Question[]
    } finally {
      connection.release()
    }
  }

  async getQuestionById(id: number): Promise<Question | null> {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      const [questions] = await connection.query(
        `
        SELECT
          q.id, q.title, q.description, q.difficulty, q.type,
          q.category_id, q.subcategory_id, q.solution, q.solution_image_url,
          q.created_at, q.updated_at,
          c.name as category, s.name as subcategory
        FROM questions q
        LEFT JOIN categories c ON q.category_id = c.id
        LEFT JOIN subcategories s ON q.subcategory_id = s.id
        WHERE q.id = ?
        `,
        [id]
      )
      const results = questions as Question[]
      return results.length > 0 ? results[0] : null
    } finally {
      connection.release()
    }
  }

  async createQuestion(input: CreateQuestionInput): Promise<Question> {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      let categoryId = input.category_id
      let subcategoryId = input.subcategory_id

      // If IDs not provided, look them up by name
      if (!categoryId && input.category) {
        const [categories] = await connection.query(
          'SELECT id FROM categories WHERE name = ?',
          [input.category]
        )
        const catResults = categories as Array<{ id: number }>
        if (catResults.length === 0) throw new Error(`Category not found: ${input.category}`)
        categoryId = catResults[0].id
      }

      if (!subcategoryId && input.subcategory) {
        const [subcategories] = await connection.query(
          'SELECT id FROM subcategories WHERE name = ?',
          [input.subcategory]
        )
        const subResults = subcategories as Array<{ id: number }>
        if (subResults.length === 0) throw new Error(`Subcategory not found: ${input.subcategory}`)
        subcategoryId = subResults[0].id
      }

      if (!categoryId || !subcategoryId) {
        throw new Error('Category ID and Subcategory ID are required')
      }

      const [result] = await connection.query(
        `INSERT INTO questions (
          title, description, difficulty, type, category_id, subcategory_id,
          solution, solution_image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.title,
          input.description,
          input.difficulty,
          input.type,
          categoryId,
          subcategoryId,
          input.solution || null,
          input.solutionImageUrl || input.solution_image_url || null
        ]
      )

      const question = await this.getQuestionById((result as { insertId: number }).insertId)
      if (!question) {
        throw new Error('Failed to create question')
      }

      return question
    } finally {
      connection.release()
    }
  }

  async updateQuestion(
    id: number,
    input: UpdateQuestionInput
  ): Promise<Question | null> {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      const existing = await this.getQuestionById(id)
      if (!existing) return null

      const updates: string[] = []
      const values: any[] = []

      if (input.title !== undefined) {
        updates.push('title = ?')
        values.push(input.title)
      }

      if (input.description !== undefined) {
        updates.push('description = ?')
        values.push(input.description)
      }

      if (input.difficulty !== undefined) {
        updates.push('difficulty = ?')
        values.push(input.difficulty)
      }

      if (input.type !== undefined) {
        updates.push('type = ?')
        values.push(input.type)
      }

      // Handle category update
      if (input.category !== undefined || input.category_id !== undefined) {
        let categoryId = input.category_id
        if (!categoryId && input.category) {
          const [categories] = await connection.query(
            'SELECT id FROM categories WHERE name = ?',
            [input.category]
          )
          const catResults = categories as Array<{ id: number }>
          if (catResults.length === 0) throw new Error(`Category not found: ${input.category}`)
          categoryId = catResults[0].id
        }
        if (categoryId) {
          updates.push('category_id = ?')
          values.push(categoryId)
        }
      }

      // Handle subcategory update
      if (input.subcategory !== undefined || input.subcategory_id !== undefined) {
        let subcategoryId = input.subcategory_id
        if (!subcategoryId && input.subcategory) {
          const [subcategories] = await connection.query(
            'SELECT id FROM subcategories WHERE name = ?',
            [input.subcategory]
          )
          const subResults = subcategories as Array<{ id: number }>
          if (subResults.length === 0) throw new Error(`Subcategory not found: ${input.subcategory}`)
          subcategoryId = subResults[0].id
        }
        if (subcategoryId) {
          updates.push('subcategory_id = ?')
          values.push(subcategoryId)
        }
      }

      if (input.solution !== undefined) {
        updates.push('solution = ?')
        values.push(input.solution)
      }

      if (input.solutionImageUrl !== undefined || input.solution_image_url !== undefined) {
        updates.push('solution_image_url = ?')
        values.push(input.solutionImageUrl || input.solution_image_url)
      }

      if (updates.length === 0) return existing

      values.push(id)

      await connection.query(
        `UPDATE questions SET ${updates.join(', ')} WHERE id = ?`,
        values
      )

      const updated = await this.getQuestionById(id)
      return updated
    } finally {
      connection.release()
    }
  }

  async deleteQuestion(id: number): Promise<boolean> {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      const [result] = await connection.query('DELETE FROM questions WHERE id = ?', [id])
      const deleteResult = result as { affectedRows: number }
      return deleteResult.affectedRows > 0
    } finally {
      connection.release()
    }
  }
}
