
import { Router } from 'express'
import { getPool } from '../database/connection.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    await getPool().query('SELECT 1')

    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Health check database failure:', error)

    res.status(503).json({
      status: 'error',
      database: 'disconnected',
    })
  }
})

export default router
