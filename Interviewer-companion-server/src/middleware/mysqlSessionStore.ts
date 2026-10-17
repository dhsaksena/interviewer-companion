import session from 'express-session'
import type mysql from 'mysql2/promise'
import { getPool } from '../database/connection.js'

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const PRUNE_PROBABILITY = 0.01

// Lambda instances don't share memory, so sessions are kept in MySQL (table created by db:init).
export class MySqlSessionStore extends session.Store {
  private expiresAt(data: session.SessionData) {
    const cookieExpiry = data.cookie?.expires ? new Date(data.cookie.expires).getTime() : NaN
    return Number.isNaN(cookieExpiry) ? Date.now() + DEFAULT_TTL_MS : cookieExpiry
  }

  get(sid: string, callback: (err?: unknown, session?: session.SessionData | null) => void) {
    getPool()
      .query('SELECT data FROM sessions WHERE sid = ? AND expires_at > ?', [sid, Date.now()])
      .then(([rows]) => {
        const row = (rows as mysql.RowDataPacket[])[0]
        callback(null, row ? JSON.parse(row.data) : null)
      })
      .catch(callback)
  }

  set(sid: string, data: session.SessionData, callback?: (err?: unknown) => void) {
    getPool()
      .query(
        `INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at)`,
        [sid, JSON.stringify(data), this.expiresAt(data)]
      )
      .then(() => {
        // Opportunistic cleanup; there is no long-lived process to run a timer in Lambda
        if (Math.random() < PRUNE_PROBABILITY) {
          getPool().query('DELETE FROM sessions WHERE expires_at <= ?', [Date.now()]).catch(console.error)
        }
        callback?.()
      })
      .catch(callback)
  }

  destroy(sid: string, callback?: (err?: unknown) => void) {
    getPool()
      .query('DELETE FROM sessions WHERE sid = ?', [sid])
      .then(() => callback?.())
      .catch(callback)
  }

  touch(sid: string, data: session.SessionData, callback?: () => void) {
    getPool()
      .query('UPDATE sessions SET expires_at = ? WHERE sid = ?', [this.expiresAt(data), sid])
      .then(() => callback?.())
      .catch(() => callback?.())
  }
}
