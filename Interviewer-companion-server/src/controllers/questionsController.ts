import { Request, Response, NextFunction } from 'express'
import { QuestionsService } from '../services/questionsService.js'
import { AppError } from '../middleware/errorHandler.js'

export class QuestionsController {
  private service = new QuestionsService()

  async getAllQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { difficulty, type, category, subcategory, search } = req.query
      const questions = await this.service.getAllQuestions({
        difficulty: difficulty ? String(difficulty).split(',') : undefined,
        type: type ? String(type).split(',') : undefined,
        category: category ? String(category) : undefined,
        subcategory: subcategory ? String(subcategory) : undefined,
        search: search ? String(search) : undefined,
      })
      res.json(questions)
    } catch (error) {
      next(error)
    }
  }

  async getQuestionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const question = await this.service.getQuestionById(id)
      if (!question) {
        throw new AppError(404, 'Question not found')
      }
      res.json(question)
    } catch (error) {
      next(error)
    }
  }

  async createQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, difficulty, type, category, subcategory, solution, tags } = req.body
      let solutionImageUrl: string | undefined

      if (req.file) {
        solutionImageUrl = `/uploads/${req.file.filename}`
      }

      const question = await this.service.createQuestion({
        title,
        description,
        difficulty,
        type,
        category,
        subcategory,
        solution,
        solutionImageUrl,
        tags: tags ? JSON.parse(tags) : undefined
      })
      res.status(201).json(question)
    } catch (error) {
      next(error)
    }
  }

  async updateQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { title, description, difficulty, type, category, subcategory, solution, tags } = req.body
      let solutionImageUrl: string | undefined

      if (req.file) {
        solutionImageUrl = `/uploads/${req.file.filename}`
      }

      const question = await this.service.updateQuestion(id, {
        title,
        description,
        difficulty,
        type,
        category,
        subcategory,
        solution,
        solutionImageUrl,
        tags: tags ? JSON.parse(tags) : undefined
      })
      if (!question) {
        throw new AppError(404, 'Question not found')
      }
      res.json(question)
    } catch (error) {
      next(error)
    }
  }

  async deleteQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const success = await this.service.deleteQuestion(id)
      if (!success) {
        throw new AppError(404, 'Question not found')
      }
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
