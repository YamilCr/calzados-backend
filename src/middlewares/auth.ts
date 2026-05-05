import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../types'

// ─── Augmentar Express.Request ────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

// ─── requireAuth ─────────────────────────────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token no proporcionado.' })
    return
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as JwtPayload
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido o expirado.' })
  }
}

// ─── requireAdmin ────────────────────────────────────────────────────────────
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Acceso denegado. Se requiere rol admin.' })
    return
  }
  next()
}

// ─── errorHandler ────────────────────────────────────────────────────────────
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const status = (err as Error & { statusCode?: number }).statusCode ?? 500
  console.error(`[${status}]`, err.message)
  res.status(status).json({
    success: false,
    message: status === 500 && process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor.'
      : err.message,
  })
}

// ─── notFound ────────────────────────────────────────────────────────────────
export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` })
}

// ─── Helper para lanzar errores con statusCode ────────────────────────────────
export function httpError(message: string, statusCode = 400): Error {
  return Object.assign(new Error(message), { statusCode })
}
