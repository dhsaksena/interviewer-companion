import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { QuestionsController } from '../controllers/questionsController.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '../../uploads')

const router = Router()
const controller = new QuestionsController()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

router.get('/', (req, res, next) => controller.getAllQuestions(req, res, next))
router.get('/:id', (req, res, next) => controller.getQuestionById(req, res, next))
router.post('/', upload.single('solutionImage'), (req, res, next) => controller.createQuestion(req, res, next))
router.put('/:id', upload.single('solutionImage'), (req, res, next) => controller.updateQuestion(req, res, next))
router.delete('/:id', (req, res, next) => controller.deleteQuestion(req, res, next))

export default router
