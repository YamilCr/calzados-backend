import { Router } from 'express'
import { productController } from '../controllers/productController'
import { requireAuth, requireAdmin } from '../middlewares/auth'

const router = Router()

// ── Públicas ────────────────────────────────────────────────────────────────
router.get('/',                  productController.list)         // GET /products
router.get('/destacados',        productController.destacados)   // GET /products/destacados
router.get('/codigo/:codigo',    productController.getByCodigo)  // GET /products/codigo/ABC123
router.get('/:id',               productController.getById)      // GET /products/:uuid

// ── Admin ───────────────────────────────────────────────────────────────────
router.post('/',                requireAuth, productController.create)
router.patch('/:id',            requireAuth, productController.update)
router.delete('/:id',           requireAuth, productController.remove)      // soft
router.delete('/:id/hard',      requireAuth, productController.hardDelete)  // físico

export default router
