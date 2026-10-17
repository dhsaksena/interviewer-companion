import 'dotenv/config'
import type { Context } from 'aws-lambda'
import serverless from 'serverless-http'
import app from './app.js'

// Created once per Lambda execution environment and reused across warm invocations.
// The schema is not touched here: run `npm run db:init` as part of deployment.
const expressHandler = serverless(app)

export const handler = (event: Parameters<typeof expressHandler>[0], context: Context) => {
  // Don't wait for the MySQL pool's open sockets before returning the response
  context.callbackWaitsForEmptyEventLoop = false
  return expressHandler(event, context)
}
