import { Request, Response, NextFunction } from 'express'
import { RubricSetsService } from '../services/rubricSetsService.js'
import { AppError } from '../middleware/errorHandler.js'
import type { RubricSetInput } from '../types/rubricSet.js'

const MAX_ITEMS = 50

const text = (value: unknown, label: string, max: number, required = false): string => {
  if (value === undefined || value === null) value = ''
  if (typeof value !== 'string') throw new AppError(400, `${label} must be text`)
  const trimmed = value.trim()
  if (required && !trimmed) throw new AppError(400, `${label} is required`)
  if (trimmed.length > max) throw new AppError(400, `${label} must be at most ${max} characters`)
  return trimmed
}

const parseId = (value: string): number => {
  const id = parseInt(value, 10)
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Invalid rubric set id')
  return id
}

const parseBody = (body: Record<string, unknown>): RubricSetInput => {
  if (!Array.isArray(body.items)) throw new AppError(400, 'Rubrics must be a list')
  if (body.items.length === 0) throw new AppError(400, 'A rubric set needs at least one rubric')
  if (body.items.length > MAX_ITEMS) throw new AppError(400, `A rubric set can have at most ${MAX_ITEMS} rubrics`)

  return {
    name: text(body.name, 'Name', 255, true),
    role: text(body.role, 'Role', 255),
    description: text(body.description, 'Description', 5000),
    items: body.items.map((raw: Record<string, unknown>, index) => ({
      title: text(raw?.title, `Rubric ${index + 1} title`, 255, true),
      description: text(raw?.description, `Rubric ${index + 1} description`, 5000),
    })),
  }
}

export class RubricSetsController {
  private service = new RubricSetsService()

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.q === 'string' ? req.query.q.trim() : ''
      res.json(await this.service.list(search))
    } catch (error) {
      next(error)
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const set = await this.service.getById(parseId(req.params.id))
      if (!set) throw new AppError(404, 'Rubric set not found')
      res.json(set)
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await this.service.create(parseBody(req.body ?? {})))
    } catch (error) {
      next(error)
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const set = await this.service.update(parseId(req.params.id), parseBody(req.body ?? {}))
      if (!set) throw new AppError(404, 'Rubric set not found')
      res.json(set)
    } catch (error) {
      next(error)
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      if (!(await this.service.delete(parseId(req.params.id)))) throw new AppError(404, 'Rubric set not found')
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  }

  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const name = text(req.body?.name, 'Name', 255, true)
      const set = await this.service.duplicate(parseId(req.params.id), name)
      if (!set) throw new AppError(404, 'Rubric set not found')
      res.status(201).json(set)
    } catch (error) {
      next(error)
    }
  }

  async interviews(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.service.interviewsFor(parseId(req.params.id)))
    } catch (error) {
      next(error)
    }
  }
}
