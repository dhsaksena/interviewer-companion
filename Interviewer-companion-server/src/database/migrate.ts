import 'dotenv/config'
import { initializeDatabase } from './init.js'

// Schema setup/migration, run once per deploy (npm run db:init) instead of on every Lambda cold start.
initializeDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Database initialization failed:', error)
    process.exit(1)
  })
