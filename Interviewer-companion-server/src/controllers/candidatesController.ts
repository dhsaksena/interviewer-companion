import { Request, Response, NextFunction } from 'express'
import { CandidatesService } from '../services/candidatesService.js'
import { analyzeResume, IMPORT_STEPS } from '../services/resumeExtractionService.js'
import { resolveTarget, runDeepDive } from '../services/deepDiveService.js'
import { AppError } from '../middleware/errorHandler.js'
import { ProgressTracker } from '../utils/progressTracker.js'
import { openSse } from '../utils/sse.js'
import type { ListCandidatesParams } from '../types/candidate.js'

const MAX_PAGE_SIZE = 100

const parseId = (value: string): number => {
  const id = parseInt(value, 10)
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Invalid candidate id')
  return id
}

const parseListParams = (query: Request['query']): ListCandidatesParams => {
  const str = (value: unknown) => (typeof value === 'string' ? value : '')
  return {
    search: str(query.q).trim(),
    page: Math.max(1, parseInt(str(query.page), 10) || 1),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(str(query.pageSize), 10) || 12)),
  }
}

export class CandidatesController {
  private service = new CandidatesService()

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.service.list(parseListParams(req.query)))
    } catch (error) {
      next(error)
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await this.service.getById(parseId(req.params.id))
      if (!candidate) throw new AppError(404, 'Candidate not found')
      res.json(candidate)
    } catch (error) {
      next(error)
    }
  }

  // Streams `progress` events while the resume is read and analyzed, then `complete` with the
  // saved candidate (or `error`). The resume file itself is not kept.
  async importResume(req: Request, res: Response, next: NextFunction) {
    if (!req.file) return next(new AppError(400, 'Choose a resume file to import'))

    const sse = openSse(req, res)
    const progress = new ProgressTracker(IMPORT_STEPS, event => sse.send('progress', event))
    try {
      const extraction = await analyzeResume(req.file, { progress, signal: sse.signal })
      // The client went away mid-analysis: don't save a candidate nobody will see
      if (sse.signal.aborted) return

      progress.step('save', 'active', { percent: 92, message: 'Saving the candidate' })
      const candidate = await this.service.create(extraction, req.file.originalname)
      progress.step('save', 'done', { percent: 100, message: 'Import complete' })
      sse.send('complete', candidate)
    } catch (error) {
      progress.failActive()
      sse.fail(error)
    } finally {
      sse.end()
    }
  }

  // Runs the Candidate 360 workflow for one graph node, streaming `progress` then `complete` / `error`
  async deepDive(req: Request, res: Response, next: NextFunction) {
    let target
    let candidate
    try {
      candidate = await this.service.getById(parseId(req.params.id))
      if (!candidate) throw new AppError(404, 'Candidate not found')
      const targetId = req.body?.targetId
      if (typeof targetId !== 'string' || !targetId) throw new AppError(400, 'targetId is required')
      target = resolveTarget(candidate.profile, targetId)
      if (!target) throw new AppError(400, 'Unknown graph node')
    } catch (error) {
      return next(error)
    }

    const sse = openSse(req, res)
    try {
      const result = await runDeepDive(candidate, target, { signal: sse.signal, onProgress: event => sse.send('progress', event) })
      sse.send('complete', result)
    } catch (error) {
      sse.fail(error)
    } finally {
      sse.end()
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      if (!(await this.service.delete(parseId(req.params.id)))) throw new AppError(404, 'Candidate not found')
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  }
}
