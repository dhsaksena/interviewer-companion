import { OAuth2Client } from 'google-auth-library'
import { getPool } from '../database/connection.js'
import { config } from '../config/index.js'
import { AppError } from '../middleware/errorHandler.js'
import type { User } from '../types/user.js'

const googleClient = new OAuth2Client(config.googleClientId)

interface UserRow extends User {
  google_sub: string
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  picture: row.picture,
})

// Verifies a Google ID token (signature, audience, expiry) and returns the signed-in user,
// creating or refreshing their record.
export const signInWithGoogle = async (idToken: string): Promise<User> => {
  let payload
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId })
    payload = ticket.getPayload()
  } catch {
    throw new AppError(401, 'Invalid Google credential')
  }

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new AppError(401, 'Google account email is not verified')
  }

  await getPool().query(
    `INSERT INTO users (google_sub, email, name, picture) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE email = VALUES(email), name = VALUES(name), picture = VALUES(picture)`,
    [payload.sub, payload.email, payload.name ?? payload.email, payload.picture ?? null]
  )
  const [rows] = await getPool().query('SELECT * FROM users WHERE google_sub = ?', [payload.sub])
  return toUser((rows as UserRow[])[0])
}

export const getUserById = async (id: number): Promise<User | null> => {
  const [rows] = await getPool().query('SELECT * FROM users WHERE id = ?', [id])
  const row = (rows as UserRow[])[0]
  return row ? toUser(row) : null
}
