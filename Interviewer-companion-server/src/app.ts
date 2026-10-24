import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import { config } from './config/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requireAuth } from './middleware/auth.js'
import { MySqlSessionStore } from './middleware/mysqlSessionStore.js'
import { localUploadsDir } from './services/storageService.js'
import authRouter from './routes/auth.js'
import healthRouter from './routes/health.js'
import questionsRouter from './routes/questions.js'
import categoriesRouter from './routes/categories.js'
import subcategoriesRouter from './routes/subcategories.js'
import interviewsRouter from './routes/interviews.js'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// Local development only: on Lambda uploads live in S3 and the filesystem is read-only
if (!config.s3Bucket) app.use('/uploads', express.static(localUploadsDir))


if (!config.isProduction) {
  app.use(cors({ origin: config.frontendUrl, credentials: true }))
}

// API Gateway / Function URL terminate TLS, so trust X-Forwarded-* for secure cookies
if (config.isProduction) app.set('trust proxy', 1)

app.use(
  session({
    store: new MySqlSessionStore(),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: config.cookieSameSite,
      secure: config.isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
)

app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/questions', requireAuth, questionsRouter)
app.use('/api/categories', requireAuth, categoriesRouter)
app.use('/api/subcategories', requireAuth, subcategoriesRouter)
app.use('/api/interviews', requireAuth, interviewsRouter)


app.use(errorHandler)

export default app

