import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { orderService } from '../services/orderService'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const shippingSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  phone:     z.string().min(6),
  address:   z.string().min(5),
  city:      z.string().min(2),
  state:     z.string().min(2),
  zipCode:   z.string().min(3),
  country:   z.string().min(2),
})

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity:  z.number().int().positive(),
  size:      z.string().min(1),
  color:     z.string().min(1),  // JSON string
})

const createOrderSchema = z.object({
  items:           z.array(orderItemSchema).min(1, 'Se requiere al menos un ítem'),
  shippingAddress: shippingSchema,
})

// ─── Controllers ──────────────────────────────────────────────────────────────
export const orderController = {

  // GET /orders  (usuario autenticado → sus órdenes; admin → todas)
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { sub: userId, role } = req.user!
      const data = role === 'admin'
        ? await orderService.listAll()
        : await orderService.listByUser(userId)

      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  // GET /orders/:id
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { sub: userId, role } = req.user!
      const data = await orderService.getById(req.params.id, userId, role === 'admin')
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },

  // POST /orders
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createOrderSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0]?.message })
        return
      }

      const data = await orderService.create(req.user!.sub, parsed.data)
      res.status(201).json({ success: true, data, message: 'Orden creada correctamente.' })
    } catch (err) {
      next(err)
    }
  },

  // PATCH /orders/:id/status  (admin)
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body
      if (!status) {
        res.status(400).json({ success: false, message: 'Se requiere el campo "status".' })
        return
      }

      const data = await orderService.updateStatus(req.params.id, status)
      res.json({ success: true, data, message: 'Estado actualizado.' })
    } catch (err) {
      next(err)
    }
  },
}
