import { Router } from 'express'
import { CategoriesController } from '../controllers/categoriesController.js'

const router = Router()
const controller = new CategoriesController()

router.get('/', (req, res, next) => controller.getAllCategories(req, res, next))
router.get('/:id', (req, res, next) => controller.getCategoryById(req, res, next))
router.post('/', (req, res, next) => controller.createCategory(req, res, next))
router.put('/:id', (req, res, next) => controller.updateCategory(req, res, next))
router.delete('/:id', (req, res, next) => controller.deleteCategory(req, res, next))
router.post('/:id/subcategories', (req, res, next) => controller.createSubcategory(req, res, next))

export default router
