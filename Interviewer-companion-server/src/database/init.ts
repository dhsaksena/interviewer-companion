import mysql from 'mysql2/promise'

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
      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(100) PRIMARY KEY,
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
    `)

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
