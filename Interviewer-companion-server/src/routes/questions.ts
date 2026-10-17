import { Router } from 'express'
import multer from 'multer'
import { QuestionsController } from '../controllers/questionsController.js'

const router = Router()
const controller = new QuestionsController()

const upload = multer({
  // Buffered in memory (5MB cap) and then handed to the storage service (S3 on Lambda)
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
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
