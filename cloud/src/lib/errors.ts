export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }

  toJSON() {
    return { error: this.message }
  }
}

export function badRequest(message: string): AppError {
  return new AppError(400, message)
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(401, message)
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(403, message)
}

export function notFound(message = 'Not found'): AppError {
  return new AppError(404, message)
}

export function conflict(message: string): AppError {
  return new AppError(409, message)
}

export function tooManyRequests(message = 'Too many requests'): AppError {
  return new AppError(429, message)
}
