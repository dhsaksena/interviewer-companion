import { Router } from 'express'
import { InterviewsController } from '../controllers/interviewsController.js'

const router = Router()
const controller = new InterviewsController()

router.get('/', (req, res, next) => controller.list(req, res, next))
router.get('/by-question/:questionId', (req, res, next) => controller.usageForQuestion(req, res, next))
router.get('/:id', (req, res, next) => controller.get(req, res, next))
router.post('/', (req, res, next) => controller.create(req, res, next))
router.put('/:id', (req, res, next) => controller.update(req, res, next))
router.delete('/:id', (req, res, next) => controller.remove(req, res, next))
router.post('/:id/duplicate', (req, res, next) => controller.duplicate(req, res, next))

export default router
