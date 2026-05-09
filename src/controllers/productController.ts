import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { productService } from '../services/productService'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const varianteSchema = z.object({
  talle:    z.string().optional(),
  color_id: z.string().uuid('color_id debe ser un UUID').optional(),
})

const productoSchema = z.object({
  codigo:          z.string().min(1, 'El código es obligatorio'),
  nombre:          z.string().min(2, 'El nombre es demasiado corto'),
  descripcion:     z.string().optional(),
  precio:          z.number().positive('El precio debe ser positivo'),
  
  precio_anterior: z.preprocess((val) => val === '' ? undefined : val,z.number().positive().optional().nullable()),
  subcategoria_id: z.string().uuid().optional().nullable(),
  activo:          z.boolean().optional(),
  destacado:       z.boolean().optional(),
  en_carrusel:     z.boolean().optional(),
  // Relaciones que se manejan en cascada
  imagenesUrls:    z.array(z.string().url('URL de imagen inválida')).optional(),
  talles:          z.array(z.string().min(1)).optional(),
  variantes:       z.array(varianteSchema).optional(),
})

// ─── productController ────────────────────────────────────────────────────────
export const productController = {

  // GET /v1/products
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        categoria:      req.query.categoria     as string | undefined,
        subcategoria:   req.query.subcategoria  as string | undefined,
        search:         req.query.search        as string | undefined,
        sortBy:         req.query.sortBy        as string | undefined,
        minPrice:       req.query.minPrice  ? Number(req.query.minPrice)  : undefined,
        maxPrice:       req.query.maxPrice  ? Number(req.query.maxPrice)  : undefined,
        soloDestacados: req.query.destacados === 'true',
        soloActivos:    req.query.activos !== 'false',  // default true
        page:           req.query.page    ? Number(req.query.page)    : 1,
        perPage:        req.query.perPage ? Number(req.query.perPage) : 9,
      }

      const result = await productService.list(filters as any) // el service espera ProductFilters, pero el req.query tiene tipos más sueltos
      res.json({ success: true, ...result })
    } catch (err) { next(err) }
  },

  // GET /v1/products/destacados
  async destacados(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productService.getDestacados()
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  // GET /v1/products/carrusel
  async carrusel(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productService.getCarrusel()
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  // GET /v1/products/:id
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productService.getById(req.params.id)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  // GET /v1/products/codigo/:codigo
  async getByCodigo(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productService.getByCodigo(req.params.codigo)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  // POST /v1/products  [admin]
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = productoSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0]?.message })
        return
      }
      const data = await productService.create(parsed.data as any) // el service espera ProductoInsert, pero el schema tiene campos extra para imágenes/talles/variantes
      res.status(201).json({ success: true, data, message: 'Producto creado.' })
    } catch (err) { next(err) }
  },

  // PATCH /v1/products/:id  [admin]
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = productoSchema.partial().safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0]?.message })
        return
      }
      const data = await productService.update(req.params.id, parsed.data)
      res.json({ success: true, data, message: 'Producto actualizado.' })
    } catch (err) { next(err) }
  },

  // DELETE /v1/products/:id  [admin]  → soft delete (activo = false)
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.remove(req.params.id)
      res.json({ success: true, message: 'Producto desactivado.' })
    } catch (err) { next(err) }
  },

  // DELETE /v1/products/:id/hard  [admin]  → borrado físico
  async hardDelete(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.hardDelete(req.params.id)
      res.json({ success: true, message: 'Producto eliminado permanentemente.' })
    } catch (err) { next(err) }
  },
}
