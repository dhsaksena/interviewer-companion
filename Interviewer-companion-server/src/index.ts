import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { config } from './config/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { initializeDatabase } from './database/init.js'
import healthRouter from './routes/health.js'
import questionsRouter from './routes/questions.js'
import categoriesRouter from './routes/categories.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '../uploads')

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log(`Created uploads directory at ${uploadsDir}`)
}

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(uploadsDir))
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? [] : '*',
    credentials: true,
  })
)

app.use('/api/health', healthRouter)
app.use('/api/questions', questionsRouter)
app.use('/api/categories', categoriesRouter)

app.use(errorHandler)

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
