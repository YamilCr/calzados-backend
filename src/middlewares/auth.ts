import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../db/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string   // user uuid (auth.users.id)
  email: string
  role: 'customer' | 'admin'
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

// ─── requireAuth ──────────────────────────────────────────────────────────────
/**
 * Verifica el JWT en el header Authorization: Bearer <token>.
 * Adjunta el payload decodificado en req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token no proporcionado.' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido o expirado.' })
  }
}

// ─── requireAdmin ─────────────────────────────────────────────────────────────
/**
 * Debe usarse después de requireAuth.
 * Verifica que el usuario autenticado tenga rol 'admin'.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Acceso denegado. Se requiere rol admin.' })
    return
  }
  next()
}

// ─── errorHandler ─────────────────────────────────────────────────────────────
/**
 * Manejador global de errores. Debe ir al final del pipeline de Express.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[Error]', err.message)

  const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Error interno del servidor.'
        : err.message,
  })
}

// ─── notFound ─────────────────────────────────────────────────────────────────
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  })
}
