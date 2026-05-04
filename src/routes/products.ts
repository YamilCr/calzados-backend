import { Router } from 'express'
import { productController } from '../controllers/productController'
import { requireAuth, requireAdmin } from '../middlewares/auth'

const router = Router()

// ── Públicas ────────────────────────────────────────────────────────────────
router.get('/',          productController.list)      // GET  /products
router.get('/featured',  productController.featured)  // GET  /products/featured
router.get('/:slug',     productController.getBySlug) // GET  /products/:slug

// ── Protegidas (admin) ──────────────────────────────────────────────────────
router.post('/',        requireAuth, requireAdmin, productController.create)  // POST   /products
router.patch('/:id',   requireAuth, requireAdmin, productController.update)  // PATCH  /products/:id
router.delete('/:id',  requireAuth, requireAdmin, productController.remove)  // DELETE /products/:id

export default router
