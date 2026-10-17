const requireEnv = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

const sameSiteValues = ['lax', 'strict', 'none'] as const
type SameSite = (typeof sameSiteValues)[number]

const nodeEnv = process.env.NODE_ENV || 'development'

const parseSameSite = (value: string | undefined): SameSite => {
  const normalized = (value || 'lax').toLowerCase()
  if (!sameSiteValues.includes(normalized as SameSite)) {
    throw new Error(`COOKIE_SAMESITE must be one of ${sameSiteValues.join(', ')}`)
  }
  return normalized as SameSite
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isLambda: Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  googleClientId: requireEnv('GOOGLE_CLIENT_ID'),
  sessionSecret: requireEnv('SESSION_SECRET'),
  // Use 'none' when the frontend and API are served from different sites (requires HTTPS)
  cookieSameSite: parseSameSite(process.env.COOKIE_SAMESITE),
  // Uploaded images go to S3 when S3_BUCKET is set, otherwise to the local uploads directory
  s3Bucket: process.env.S3_BUCKET || '',
  s3KeyPrefix: process.env.S3_KEY_PREFIX || 'uploads/',
  // Public base URL of the bucket (e.g. a CloudFront distribution), without trailing slash
  s3PublicBaseUrl: (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  // Lambda instances handle one request at a time, so keep the pool small
  dbConnectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || (process.env.AWS_LAMBDA_FUNCTION_NAME ? '2' : '10'), 10),
}
