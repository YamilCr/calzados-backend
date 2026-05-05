import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authService } from '../services/authService'

const loginSchema    = z.object({ email: z.string().email(), password: z.string().min(6) })
const registerSchema = loginSchema.extend({ name: z.string().min(2) })

export const authController = {

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const p = registerSchema.safeParse(req.body)
      if (!p.success) { res.status(400).json({ success: false, message: p.error.errors[0]?.message }); return }
      const result = await authService.register(p.data.name, p.data.email, p.data.password)
      res.status(201).json({ success: true, data: result, message: 'Registro exitoso.' })
    } catch (e) { next(e) }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const p = loginSchema.safeParse(req.body)
      if (!p.success) { res.status(400).json({ success: false, message: p.error.errors[0]?.message }); return }
      const result = await authService.login(p.data.email, p.data.password)
      res.json({ success: true, data: result })
    } catch (e) { next(e) }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.me(req.user!.sub)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.user!.sub)
      res.json({ success: true, message: 'Sesión cerrada.' })
    } catch (e) { next(e) }
  },
}
