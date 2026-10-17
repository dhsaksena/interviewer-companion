import mysql from 'mysql2/promise'

const questionsTableDdl = (tableName: string) => `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description LONGTEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category_id INT NOT NULL,
    subcategory_id INT NOT NULL,
    solution LONGTEXT,
    solution_image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE,
    INDEX idx_category_id (category_id),
    INDEX idx_subcategory_id (subcategory_id),
    INDEX idx_difficulty (difficulty)
  )
`

const QUESTION_COLUMNS =
  'title, description, difficulty, type, category_id, subcategory_id, solution, solution_image_url, created_at, updated_at'
const LEGACY_QUESTIONS_TABLE = 'questions_legacy_varchar_id'

// Older databases have questions.id as a VARCHAR (e.g. "q_1791039140445_k3j2h1x9a").
// Rebuild the table with an INT AUTO_INCREMENT id, numbering questions oldest-first.
// The new table is built and filled under a temporary name and swapped in with a single
// atomic RENAME, so a failure part-way leaves the original table untouched. The original
// is kept as a backup table rather than dropped.
const migrateQuestionIdsToInt = async (connection: mysql.Connection, dbName: string) => {
  const [columns] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questions' AND COLUMN_NAME = 'id'`,
    [dbName]
  )
  if (columns.length === 0 || columns[0].DATA_TYPE !== 'varchar') return

  await connection.query('DROP TABLE IF EXISTS questions_new')
  await connection.query(questionsTableDdl('questions_new'))
  await connection.query(
    `INSERT INTO questions_new (${QUESTION_COLUMNS})
     SELECT ${QUESTION_COLUMNS} FROM questions ORDER BY created_at ASC, id ASC`
  )
  await connection.query(`RENAME TABLE questions TO ${LEGACY_QUESTIONS_TABLE}, questions_new TO questions`)

  console.log(
    `Migrated questions.id to INT AUTO_INCREMENT. Original table kept as ${LEGACY_QUESTIONS_TABLE}`
  )
}

export const initializeDatabase = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  })

  try {
    const dbName = process.env.DB_NAME || 'interviewer_companion'

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`)
    await connection.query(`USE ${dbName}`)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS subcategories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE KEY unique_subcategory (category_id, name)
      )
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        google_sub VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(128) NOT NULL PRIMARY KEY,
        data MEDIUMTEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        INDEX idx_sessions_expires_at (expires_at)
      )
    `)

    await migrateQuestionIdsToInt(connection, dbName)
    await connection.query(questionsTableDdl('questions'))

    const [categories] = await connection.query(
      'SELECT COUNT(*) as count FROM categories'
    )
    const count = (categories as Array<{ count: number }>)[0].count

    if (count === 0) {
      const sampleCategories = [
        { name: 'Backend', description: 'Backend development questions', subcategories: ['Java', 'Python', 'System Design', 'APIs & Microservices'] },
        { name: 'Frontend', description: 'Frontend development questions', subcategories: ['React', 'JavaScript', 'CSS', 'HTML'] },
        { name: 'Data Engineering', description: 'Data engineering questions', subcategories: ['Spark', 'Hadoop', 'DB2', 'Data Modeling', 'ETL/ELT'] },
      ]

      for (const category of sampleCategories) {
        const [result] = await connection.query('INSERT INTO categories (name, description) VALUES (?, ?)', [
          category.name,
          category.description,
        ])
        const insertResult = result as { insertId: number }
        const categoryId = insertResult.insertId

        for (const subcategory of category.subcategories) {
          await connection.query('INSERT INTO subcategories (category_id, name) VALUES (?, ?)', [
            categoryId,
            subcategory,
          ])
        }
      }

      console.log('Database initialized with sample categories and subcategories')
    }

    console.log('Database ready')
  } finally {
    await connection.end()
  }
}
