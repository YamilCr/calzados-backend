import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { productService } from '../services/productService'

// ─── Schemas de validación ────────────────────────────────────────────────────
const colorSchema = z.object({
  name: z.string().min(1),
  hex:  z.string().regex(/^#[0-9a-fA-F]{3,6}$/, 'Hex inválido'),
})

const productSchema = z.object({
  name:          z.string().min(2, 'Nombre muy corto'),
  price:         z.number().positive('El precio debe ser positivo'),
  original_price: z.number().positive().optional().nullable(),
  image:         z.string().url('URL de imagen inválida'),
  images:        z.array(z.string().url()).default([]),
  rating:        z.number().min(0).max(5).default(0),
  review_count:  z.number().int().min(0).default(0),
  category:      z.string().min(1),
  gender:        z.enum(['men', 'women', 'unisex']),
  sizes:         z.array(z.string()).min(1, 'Se requiere al menos un talle'),
  colors:        z.array(colorSchema).min(1, 'Se requiere al menos un color'),
  description:   z.string().min(10, 'Descripción muy corta'),
  featured:      z.boolean().default(false),
  in_stock:      z.boolean().default(true),
  tags:          z.array(z.string()).default([]),
})

// ─── Controllers ──────────────────────────────────────────────────────────────
export const productController = {

  // GET /products
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        category:  req.query.category  as string | undefined,
        gender:    req.query.gender    as string | undefined,
        search:    req.query.search    as string | undefined,
        sortBy:    req.query.sortBy    as string | undefined,
        minPrice:  req.query.minPrice  ? Number(req.query.minPrice)  : undefined,
        maxPrice:  req.query.maxPrice  ? Number(req.query.maxPrice)  : undefined,
        page:      req.query.page      ? Number(req.query.page)      : 1,
        perPage:   req.query.perPage   ? Number(req.query.perPage)   : 9,
      }

      const result = await productService.list(filters)
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  },

  // GET /products/featured
  async featured(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productService.getFeatured()
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  // GET /products/:slug
  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productService.getBySlug(req.params.slug)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  // POST /products  (admin)
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = productSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0]?.message })
        return
      }

      const data = await productService.create(parsed.data)
      res.status(201).json({ success: true, data, message: 'Producto creado correctamente.' })
    } catch (err) {
      next(err)
    }
  },

  // PATCH /products/:id  (admin)
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'ID inválido.' })
        return
      }

      const parsed = productSchema.partial().safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0]?.message })
        return
      }

      const data = await productService.update(id, parsed.data)
      res.json({ success: true, data, message: 'Producto actualizado correctamente.' })
    } catch (err) {
      next(err)
    }
  },

  // DELETE /products/:id  (admin)
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'ID inválido.' })
        return
      }

      await productService.remove(id)
      res.json({ success: true, message: 'Producto eliminado correctamente.' })
    } catch (err) {
      next(err)
    }
  },
}
