import 'dotenv/config'
import type { Context } from 'aws-lambda'
import serverless from 'serverless-http'
import app from './app.js'
import { initializeDatabase } from './database/init.js'

// Created once per Lambda execution environment and reused across warm invocations.
// HTTP requests never touch the schema. Run it on deploy with a direct invoke:
//   aws lambda invoke --function-name <fn> --payload '{"action":"db:init"}' --cli-binary-format raw-in-base64-out out.json
const expressHandler = serverless(app)

export const handler = (event: Parameters<typeof expressHandler>[0], context: Context) => {
  // Don't wait for the MySQL pool's open sockets before returning the response
  context.callbackWaitsForEmptyEventLoop = false

  // Direct invokes only (needs lambda:InvokeFunction): function URL events always carry requestContext
  if ((event as { action?: string }).action === 'db:init' && !(event as { requestContext?: unknown }).requestContext) {
    return initializeDatabase().then(() => ({ ok: true }))
  }

  return expressHandler(event, context)
}
