import { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler.js'

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.session.userId) return next(new AppError(401, 'Authentication required'))
  next()
}
