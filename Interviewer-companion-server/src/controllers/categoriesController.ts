import { Request, Response, NextFunction } from 'express'
import { CategoriesService } from '../services/categoriesService.js'
import { AppError } from '../middleware/errorHandler.js'

const requireName = (value: unknown, label: string): string => {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name) {
    throw new AppError(400, `${label} name is required`)
  }
  return name
}

export class CategoriesController {
  private service = new CategoriesService()

  async getAllCategories(_req: Request, res: Response, next: NextFunction) {
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

      const category = await this.service.createCategory({
        name: requireName(name, 'Category'),
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
      const { name, description } = req.body
      const category = await this.service.updateCategory(parseInt(id, 10), {
        name: name === undefined ? undefined : requireName(name, 'Category'),
        description,
      })
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

  async createSubcategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const subcategory = await this.service.createSubcategory(
        parseInt(id, 10),
        requireName(req.body.name, 'Subcategory')
      )
      if (!subcategory) {
        throw new AppError(404, 'Category not found')
      }
      res.status(201).json(subcategory)
    } catch (error) {
      next(error)
    }
  }

  async updateSubcategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const subcategory = await this.service.updateSubcategory(
        parseInt(id, 10),
        requireName(req.body.name, 'Subcategory')
      )
      if (!subcategory) {
        throw new AppError(404, 'Subcategory not found')
      }
      res.json(subcategory)
    } catch (error) {
      next(error)
    }
  }

  async deleteSubcategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const success = await this.service.deleteSubcategory(parseInt(id, 10))
      if (!success) {
        throw new AppError(404, 'Subcategory not found')
      }
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
