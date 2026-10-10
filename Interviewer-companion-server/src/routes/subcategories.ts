import { Router } from 'express'
import { CategoriesController } from '../controllers/categoriesController.js'

const router = Router()
const controller = new CategoriesController()

router.put('/:id', (req, res, next) => controller.updateSubcategory(req, res, next))
router.delete('/:id', (req, res, next) => controller.deleteSubcategory(req, res, next))

export default router
