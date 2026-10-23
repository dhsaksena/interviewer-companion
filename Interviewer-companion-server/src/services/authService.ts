
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

// Verifies Google's ID token and creates or refreshes the user record.
export const signInWithGoogle = async (idToken: string): Promise<User> => {
  let payload

  // Step 1: Verify Google's ID token.
  console.log('[AUTH] Starting Google token verification')

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    })

    payload = ticket.getPayload()
    console.log('[AUTH] Google token verification completed')
  } catch (error) {
    console.error('[AUTH] Google token verification failed:', error)
    throw new AppError(401, 'Invalid Google credential')
  }

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    console.warn('[AUTH] Google token payload is missing required verified fields')
    throw new AppError(401, 'Google account email is not verified')
  }

  // Step 2: Insert or update the user in MySQL.
  console.log('[AUTH] Starting MySQL user upsert')

  await getPool().query(
    `INSERT INTO users (google_sub, email, name, picture)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       name = VALUES(name),
       picture = VALUES(picture)`,
    [
      payload.sub,
      payload.email,
      payload.name ?? payload.email,
      payload.picture ?? null,
    ],
  )

  console.log('[AUTH] MySQL user upsert completed')

  // Step 3: Retrieve the saved user.
  console.log('[AUTH] Starting MySQL user select')

  const [rows] = await getPool().query(
    'SELECT * FROM users WHERE google_sub = ?',
    [payload.sub],
  )

  console.log('[AUTH] MySQL user select completed')

  const user = (rows as UserRow[])[0]

  if (!user) {
    console.error('[AUTH] User was not found after database upsert')
    throw new Error('User record was not found after saving')
  }

  console.log('[AUTH] Sign-in service completed successfully')

  return toUser(user)
}

export const getUserById = async (id: number): Promise<User | null> => {
  console.log('[AUTH] Starting MySQL lookup by user ID')

  const [rows] = await getPool().query(
    'SELECT * FROM users WHERE id = ?',
    [id],
  )

  console.log('[AUTH] MySQL lookup by user ID completed')

  const row = (rows as UserRow[])[0]

  return row ? toUser(row) : null
}
