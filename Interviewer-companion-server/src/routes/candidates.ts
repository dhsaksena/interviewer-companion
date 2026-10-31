import path from 'path'
import { Router } from 'express'
import multer from 'multer'
import { CandidatesController } from '../controllers/candidatesController.js'
import { AppError } from '../middleware/errorHandler.js'
import { RESUME_EXTENSIONS } from '../services/resumeExtractionService.js'

const router = Router()
const controller = new CandidatesController()

const MAX_RESUME_MB = 5

const upload = multer({
  // Buffered in memory: the file is only read for text, never stored
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    // Checked by extension too: browsers often send .docx as application/octet-stream
    if (RESUME_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true)
    } else {
      cb(new AppError(400, 'Only PDF and Word (.docx) resumes are supported'))
    }
  },
  limits: { fileSize: MAX_RESUME_MB * 1024 * 1024 },
}).single('resume')

// Turns multer's own errors (e.g. file too large) into 400s instead of 500s
const uploadResume: typeof upload = (req, res, next) =>
  upload(req, res, err => {
    if (err instanceof multer.MulterError) {
      return next(new AppError(400, err.code === 'LIMIT_FILE_SIZE' ? `Resume must be under ${MAX_RESUME_MB} MB` : err.message))
    }
    next(err)
  })

router.get('/', (req, res, next) => controller.list(req, res, next))
router.get('/:id', (req, res, next) => controller.get(req, res, next))
router.post('/import', uploadResume, (req, res, next) => controller.importResume(req, res, next))
router.post('/:id/deep-dives', (req, res, next) => controller.deepDive(req, res, next))
router.delete('/:id', (req, res, next) => controller.remove(req, res, next))

export default router
