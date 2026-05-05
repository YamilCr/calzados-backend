import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { categoriaService, subcategoriaService, colorService } from '../services/catalogService'

// ── Schemas ──────────────────────────────────────────────────────────────────
const nombreSchema    = z.object({ nombre: z.string().min(1) })
const colorSchema     = z.object({ nombre: z.string().min(1), codigo_hex: z.string().regex(/^#[0-9a-fA-F]{3,6}$/).optional() })
const subSchema       = z.object({ nombre: z.string().min(1), categoria_id: z.string().uuid() })
const subUpdateSchema = subSchema.partial()

// ── categoriaController ──────────────────────────────────────────────────────
export const categoriaController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await categoriaService.list() }) }
    catch (e) { next(e) }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await categoriaService.getById(req.params.id) }) }
    catch (e) { next(e) }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const p = nombreSchema.safeParse(req.body)
      if (!p.success) { res.status(400).json({ success: false, message: p.error.errors[0]?.message }); return }
      res.status(201).json({ success: true, data: await categoriaService.create(p.data.nombre) })
    } catch (e) { next(e) }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const p = nombreSchema.safeParse(req.body)
      if (!p.success) { res.status(400).json({ success: false, message: p.error.errors[0]?.message }); return }
      res.json({ success: true, data: await categoriaService.update(req.params.id, p.data.nombre) })
    } catch (e) { next(e) }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try { await categoriaService.remove(req.params.id); res.json({ success: true, message: 'Categoría eliminada.' }) }
    catch (e) { next(e) }
  },
}

// ── subcategoriaController ───────────────────────────────────────────────────
export const subcategoriaController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await subcategoriaService.list(req.query.categoria_id as string) }) }
    catch (e) { next(e) }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await subcategoriaService.getById(req.params.id) }) }
    catch (e) { next(e) }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const p = subSchema.safeParse(req.body)
      if (!p.success) { res.status(400).json({ success: false, message: p.error.errors[0]?.message }); return }
      res.status(201).json({ success: true, data: await subcategoriaService.create(p.data.nombre, p.data.categoria_id) })
    } catch (e) { next(e) }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const p = subUpdateSchema.safeParse(req.body)
      if (!p.success) { res.status(400).json({ success: false, message: p.error.errors[0]?.message }); return }
      res.json({ success: true, data: await subcategoriaService.update(req.params.id, p.data) })
    } catch (e) { next(e) }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try { await subcategoriaService.remove(req.params.id); res.json({ success: true, message: 'Subcategoría eliminada.' }) }
    catch (e) { next(e) }
  },
}

// ── colorController ──────────────────────────────────────────────────────────
export const colorController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await colorService.list() }) }
    catch (e) { next(e) }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await colorService.getById(req.params.id) }) }
    catch (e) { next(e) }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const p = colorSchema.safeParse(req.body)
      if (!p.success) { res.status(400).json({ success: false, message: p.error.errors[0]?.message }); return }
      res.status(201).json({ success: true, data: await colorService.create(p.data.nombre, p.data.codigo_hex) })
    } catch (e) { next(e) }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const p = colorSchema.partial().safeParse(req.body)
      if (!p.success) { res.status(400).json({ success: false, message: p.error.errors[0]?.message }); return }
      res.json({ success: true, data: await colorService.update(req.params.id, p.data) })
    } catch (e) { next(e) }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try { await colorService.remove(req.params.id); res.json({ success: true, message: 'Color eliminado.' }) }
    catch (e) { next(e) }
  },
}
