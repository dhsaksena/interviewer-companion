import { Request, Response, NextFunction } from 'express'
import { InterviewsService } from '../services/interviewsService.js'
import { AppError } from '../middleware/errorHandler.js'
import { INTERVIEW_STATUSES, type InterviewInput, type InterviewSortKey, type InterviewStatus, type ListInterviewsParams } from '../types/interview.js'

const SORT_KEYS: InterviewSortKey[] = ['title', 'candidate', 'rubrics', 'questions', 'updated', 'date']
const MAX_PAGE_SIZE = 100

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
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Invalid interview id')
  return id
}

const parseStatus = (value: unknown): InterviewStatus => {
  if (value === undefined || value === null || value === '') return 'draft'
  const status = INTERVIEW_STATUSES.find(s => s === value)
  if (!status) throw new AppError(400, 'Status must be draft, scheduled or completed')
  return status
}

const parseDate = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new AppError(400, 'Interview date must be a valid date')
  }
  return value
}

const parseRating = (value: unknown, label: string): number | null => {
  if (value === undefined || value === null || value === '') return null
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 5) throw new AppError(400, `${label} rating must be 1 to 5`)
  return value as number
}

const parseBody = (body: Record<string, unknown>): InterviewInput => {
  if (!Array.isArray(body.rubrics)) throw new AppError(400, 'Rubrics must be a list')

  return {
    title: text(body.title, 'Title', 255, true),
    candidateName: text(body.candidateName, 'Candidate', 255),
    notes: text(body.notes, 'Notes', 5000),
    status: parseStatus(body.status),
    interviewDate: parseDate(body.interviewDate),
    rubrics: body.rubrics.map((raw: Record<string, unknown>, index) => {
      const questionIds = raw.questionIds ?? []
      if (!Array.isArray(questionIds) || !questionIds.every(id => Number.isInteger(id) && id > 0)) {
        throw new AppError(400, `Rubric ${index + 1} has invalid questions`)
      }
      return {
        title: text(raw.title, `Rubric ${index + 1} title`, 255, true),
        description: text(raw.description, `Rubric ${index + 1} description`, 5000),
        rating: parseRating(raw.rating, `Rubric ${index + 1}`),
        feedback: text(raw.feedback, `Rubric ${index + 1} feedback`, 5000),
        questionIds,
      }
    }),
  }
}

const parseListParams = (query: Request['query']): ListInterviewsParams => {
  const str = (value: unknown) => (typeof value === 'string' ? value : '')
  const sort = SORT_KEYS.find(key => key === str(query.sort)) ?? 'updated'
  const filter = str(query.questions)
  return {
    search: str(query.q).trim(),
    sort,
    dir: str(query.dir) === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, parseInt(str(query.page), 10) || 1),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(str(query.pageSize), 10) || 10)),
    questionFilter: filter === 'with' || filter === 'without' ? filter : 'all',
    status: INTERVIEW_STATUSES.find(s => s === str(query.status)) ?? 'all',
  }
}

export class InterviewsController {
  private service = new InterviewsService()

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.service.list(parseListParams(req.query)))
    } catch (error) {
      next(error)
    }
  }

  async usageForQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const questionId = parseInt(req.params.questionId, 10)
      if (!Number.isInteger(questionId) || questionId <= 0) throw new AppError(400, 'Invalid question id')
      res.json(await this.service.usageForQuestion(questionId))
    } catch (error) {
      next(error)
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const interview = await this.service.getById(parseId(req.params.id))
      if (!interview) throw new AppError(404, 'Interview not found')
      res.json(interview)
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
      const interview = await this.service.update(parseId(req.params.id), parseBody(req.body ?? {}))
      if (!interview) throw new AppError(404, 'Interview not found')
      res.json(interview)
    } catch (error) {
      next(error)
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      if (!(await this.service.delete(parseId(req.params.id)))) throw new AppError(404, 'Interview not found')
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  }

  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body ?? {}
      const title = text(body.title, 'Title', 255, true)
      // Candidate is optional so an interview can be copied as a reusable template
      const candidateName = text(body.candidateName, 'Candidate', 255)
      const interview = await this.service.duplicate(parseId(req.params.id), title, candidateName)
      if (!interview) throw new AppError(404, 'Interview not found')
      res.status(201).json(interview)
    } catch (error) {
      next(error)
    }
  }
}
