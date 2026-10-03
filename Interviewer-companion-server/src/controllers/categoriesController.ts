import { Request, Response, NextFunction } from 'express'
import { CategoriesService } from '../services/categoriesService.js'
import { AppError } from '../middleware/errorHandler.js'

export class CategoriesController {
  private service = new CategoriesService()

  async getAllCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await this.service.getAllCategories()
      res.json(categories)
    } catch (error) {
      next(error)
    }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const category = await this.service.getCategoryById(parseInt(id, 10))
      if (!category) {
        throw new AppError(404, 'Category not found')
      }
      res.json(category)
    } catch (error) {
      next(error)
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, subcategories } = req.body

      if (!name) {
        throw new AppError(400, 'Category name is required')
      }

      const category = await this.service.createCategory({
        name,
        description,
        subcategories,
      })
      res.status(201).json(category)
    } catch (error) {
      next(error)
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const category = await this.service.updateCategory(parseInt(id, 10), req.body)
      if (!category) {
        throw new AppError(404, 'Category not found')
      }
      res.json(category)
    } catch (error) {
      next(error)
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const success = await this.service.deleteCategory(parseInt(id, 10))
      if (!success) {
        throw new AppError(404, 'Category not found')
      }
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
