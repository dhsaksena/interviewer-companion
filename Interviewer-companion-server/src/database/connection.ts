import mysql from 'mysql2/promise'

export const createPool = () => {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'interviewer_companion',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
}

let pool: mysql.Pool | null = null

export const getPool = () => {
  if (!pool) {
    pool = createPool()
  }
  return pool
}

export const closePool = async () => {
  if (pool) {
    await pool.end()
    pool = null
  }
}
