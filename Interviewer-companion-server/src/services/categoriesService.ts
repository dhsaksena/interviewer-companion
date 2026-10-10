import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { getPool } from '../database/connection.js'
import { AppError } from '../middleware/errorHandler.js'
import { Category, CreateCategoryInput, Subcategory, UpdateCategoryInput } from '../types/category.js'

export class CategoriesService {
  async getAllCategories(): Promise<Category[]> {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      const [categories] = await connection.query(
        'SELECT id, name, description, created_at, updated_at FROM categories ORDER BY name ASC'
      )
      const result = categories as Category[]

      for (const category of result) {
        const [subcategories] = await connection.query(
          'SELECT id, category_id, name, created_at, updated_at FROM subcategories WHERE category_id = ? ORDER BY name ASC',
          [category.id]
        )
        category.subcategories = subcategories as any[]
      }

      return result
    } finally {
      connection.release()
    }
  }

  async getCategoryById(id: number): Promise<Category | null> {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      const [categories] = await connection.query(
        'SELECT id, name, description, created_at, updated_at FROM categories WHERE id = ?',
        [id]
      )
      const results = categories as Category[]
      if (results.length === 0) return null

      const category = results[0]
      const [subcategories] = await connection.query(
        'SELECT id, category_id, name, created_at, updated_at FROM subcategories WHERE category_id = ? ORDER BY name ASC',
        [category.id]
      )
      category.subcategories = subcategories as any[]
      return category
    } finally {
      connection.release()
    }
  }

  async getCategoryByName(name: string): Promise<Category | null> {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      const [categories] = await connection.query(
        'SELECT id, name, description, created_at, updated_at FROM categories WHERE name = ?',
        [name]
      )
      const results = categories as Category[]
      if (results.length === 0) return null

      const category = results[0]
      const [subcategories] = await connection.query(
        'SELECT id, category_id, name, created_at, updated_at FROM subcategories WHERE category_id = ? ORDER BY name ASC',
        [category.id]
      )
      category.subcategories = subcategories as any[]
      return category
    } finally {
      connection.release()
    }
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      const [result] = await connection.query(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [input.name, input.description || null]
      )

      const insertResult = result as { insertId: number }
      const categoryId = insertResult.insertId

      if (input.subcategories && input.subcategories.length > 0) {
        for (const subcategoryName of input.subcategories) {
          await connection.query(
            'INSERT INTO subcategories (category_id, name) VALUES (?, ?)',
            [categoryId, subcategoryName]
          )
        }
      }

      const category = await this.getCategoryById(categoryId)

      if (!category) {
        throw new Error('Failed to create category')
      }

      return category
    } finally {
      connection.release()
    }
  }

  async updateCategory(id: number, input: UpdateCategoryInput): Promise<Category | null> {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      const existing = await this.getCategoryById(id)
      if (!existing) return null

      const updates: string[] = []
      const values: (string | null)[] = []

      if (input.name !== undefined) {
        updates.push('name = ?')
        values.push(input.name)
      }

      if (input.description !== undefined) {
        updates.push('description = ?')
        values.push(input.description || null)
      }

      if (updates.length === 0) return existing

      values.push(id.toString())

      await connection.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values)

      const updated = await this.getCategoryById(id)
      return updated
    } finally {
      connection.release()
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    const pool = getPool()

    // The questions FK cascades on delete, so refuse rather than silently remove questions
    const [countRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM questions WHERE category_id = ?',
      [id]
    )
    const questionCount = Number(countRows[0].count)
    if (questionCount > 0) {
      throw new AppError(
        409,
        `Category has ${questionCount} question(s). Move or delete them before deleting the category.`
      )
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM categories WHERE id = ?', [id])
    return result.affectedRows > 0
  }

  async getSubcategoryById(id: number): Promise<Subcategory | null> {
    const pool = getPool()
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, category_id, name, created_at, updated_at FROM subcategories WHERE id = ?',
      [id]
    )
    return (rows[0] as Subcategory) ?? null
  }

  async createSubcategory(categoryId: number, name: string): Promise<Subcategory | null> {
    const pool = getPool()
    const [categoryRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM categories WHERE id = ?',
      [categoryId]
    )
    if (categoryRows.length === 0) return null

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO subcategories (category_id, name) VALUES (?, ?)',
      [categoryId, name]
    )
    return this.getSubcategoryById(result.insertId)
  }

  async updateSubcategory(id: number, name: string): Promise<Subcategory | null> {
    const pool = getPool()
    const existing = await this.getSubcategoryById(id)
    if (!existing) return null

    await pool.query('UPDATE subcategories SET name = ? WHERE id = ?', [name, id])
    return this.getSubcategoryById(id)
  }

  async deleteSubcategory(id: number): Promise<boolean> {
    const pool = getPool()

    const [countRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM questions WHERE subcategory_id = ?',
      [id]
    )
    const questionCount = Number(countRows[0].count)
    if (questionCount > 0) {
      throw new AppError(
        409,
        `Subcategory has ${questionCount} question(s). Move or delete them before deleting the subcategory.`
      )
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM subcategories WHERE id = ?', [id])
    return result.affectedRows > 0
  }
}
