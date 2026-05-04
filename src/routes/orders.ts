import { Router } from 'express'
import { orderController } from '../controllers/orderController'
import { requireAuth, requireAdmin } from '../middlewares/auth'

const router = Router()

// Todas las rutas de órdenes requieren autenticación
router.use(requireAuth)

router.get('/',                          orderController.list)         // GET  /orders
router.get('/:id',                       orderController.getById)      // GET  /orders/:id
router.post('/',                         orderController.create)       // POST /orders
router.patch('/:id/status', requireAdmin, orderController.updateStatus) // PATCH /orders/:id/status (admin)

export default router
