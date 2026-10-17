import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { config } from '../config/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const localUploadsDir = path.join(__dirname, '../../uploads')

let s3Client: S3Client | undefined

const uniqueFileName = (originalName: string) =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 11)}${path.extname(originalName).toLowerCase()}`

// Stores an uploaded image and returns the URL to save with the question.
// S3 is used when S3_BUCKET is set (required on Lambda, whose filesystem is read-only);
// otherwise the file is written to the local uploads directory for development.
export const saveUpload = async (file: Express.Multer.File): Promise<string> => {
  const fileName = uniqueFileName(file.originalname)

  if (config.s3Bucket) {
    s3Client ??= new S3Client({})
    const key = `${config.s3KeyPrefix}${fileName}`
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )
    return config.s3PublicBaseUrl
      ? `${config.s3PublicBaseUrl}/${key}`
      : `https://${config.s3Bucket}.s3.amazonaws.com/${key}`
  }

  if (config.isLambda) throw new Error('S3_BUCKET must be set when running on Lambda')

  await fs.mkdir(localUploadsDir, { recursive: true })
  await fs.writeFile(path.join(localUploadsDir, fileName), file.buffer)
  return `/uploads/${fileName}`
}
