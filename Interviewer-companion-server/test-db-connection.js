import 'dotenv/config'
import mysql from 'mysql2/promise'

console.log('Testing MySQL connection...')
console.log('Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '***' : 'BLANK',
  database: process.env.DB_NAME,
})

const testConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'interviewer_companion',
    })

    console.log('✅ Connection successful!')

    const [databases] = await connection.query('SHOW DATABASES')
    console.log('Available databases:', databases)

    await connection.end()
  } catch (error) {
    console.error('❌ Connection failed!')
    console.error('Error:', error.message)
    console.error('Code:', error.code)
    console.error('\nTroubleshooting tips:')
    console.error('1. Check if MySQL is running')
    console.error('2. Verify credentials in .env file')
    console.error('3. Make sure DB_HOST is correct (try 127.0.0.1 if localhost fails)')
    console.error('4. Check if port 3306 is accessible')
  }
}

testConnection()
