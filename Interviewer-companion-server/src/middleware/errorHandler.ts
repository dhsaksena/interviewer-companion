import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    })
  }

  // Unique-key violation (duplicate category or subcategory name)
  if ((err as NodeJS.ErrnoException).code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'An item with this name already exists',
      statusCode: 409,
    })
  }

  console.error(err)
  return res.status(500).json({
    error: 'Internal server error',
    statusCode: 500,
  })
}
