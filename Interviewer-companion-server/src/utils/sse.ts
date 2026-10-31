import type { Request, Response } from 'express'
import { AppError } from '../middleware/errorHandler.js'

const HEARTBEAT_MS = 15_000

export interface SseStream {
  send: (event: string, data: unknown) => void
  // Sends an `error` event (AppError messages are shown to the user; anything else is logged and generic)
  fail: (error: unknown) => void
  end: () => void
  // Aborted when the client disconnects, so long-running work (LLM calls) can stop
  signal: AbortSignal
}

// Switches the response to text/event-stream. After this, errors must go through `fail`, not next(err),
// because the status code and headers have already been sent.
export const openSse = (_req: Request, res: Response): SseStream => {
  const controller = new AbortController()

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Stops nginx-style proxies from buffering the stream
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()

  // A comment line keeps idle proxies from closing the connection during slow steps
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS)

  // 'close' on the response fires on normal end too; only a close before end() is a disconnect
  res.on('close', () => {
    clearInterval(heartbeat)
    if (!res.writableEnded) controller.abort()
  })

  const send = (event: string, data: unknown) => {
    if (res.writableEnded || controller.signal.aborted) return
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  return {
    send,
    fail: error => {
      if (controller.signal.aborted) return
      if (error instanceof AppError) {
        send('error', { message: error.message, statusCode: error.statusCode })
      } else {
        console.error(error)
        send('error', { message: 'Something went wrong. Please try again.', statusCode: 500 })
      }
    },
    end: () => {
      clearInterval(heartbeat)
      if (!res.writableEnded) res.end()
    },
    signal: controller.signal,
  }
}
