import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authService } from '../services/authService'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
})

// ─── Controllers ──────────────────────────────────────────────────────────────
export const authController = {

  // POST /auth/register
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0]?.message })
        return
      }

      const { name, email, password } = parsed.data
      const result = await authService.register(name, email, password)

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registro exitoso.',
      })
    } catch (err) {
      next(err)
    }
  },

  // POST /auth/login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0]?.message })
        return
      }

      const { email, password } = parsed.data
      const result = await authService.login(email, password)

      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  // GET /auth/me  (requireAuth)
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub
      const data   = await authService.me(userId)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  // POST /auth/logout  (requireAuth)
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.user!.sub)
      res.json({ success: true, message: 'Sesión cerrada correctamente.' })
    } catch (err) {
      next(err)
    }
  },
}
