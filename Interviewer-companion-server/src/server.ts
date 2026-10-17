import 'dotenv/config'
import { config } from './config/index.js'
import { initializeDatabase } from './database/init.js'
import app from './app.js'

const PORT = config.port

const startServer = async () => {
  try {
    await initializeDatabase()
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV}`)
    })
  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  }
}

startServer()
