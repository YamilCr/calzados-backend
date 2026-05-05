import { Router } from 'express'
import { categoriaController, subcategoriaController, colorController } from '../controllers/catalogController'
import { requireAuth, requireAdmin } from '../middlewares/auth'

const router = Router()

// ── Categorías (lectura pública, escritura admin) ────────────────────────────
router.get('/categorias',              categoriaController.list)
router.get('/categorias/:id',          categoriaController.getById)
router.post('/categorias',             requireAuth, requireAdmin, categoriaController.create)
router.patch('/categorias/:id',        requireAuth, requireAdmin, categoriaController.update)
router.delete('/categorias/:id',       requireAuth, requireAdmin, categoriaController.remove)

// ── Subcategorías ────────────────────────────────────────────────────────────
router.get('/subcategorias',           subcategoriaController.list)       // ?categoria_id=uuid
router.get('/subcategorias/:id',       subcategoriaController.getById)
router.post('/subcategorias',          requireAuth, requireAdmin, subcategoriaController.create)
router.patch('/subcategorias/:id',     requireAuth, requireAdmin, subcategoriaController.update)
router.delete('/subcategorias/:id',    requireAuth, requireAdmin, subcategoriaController.remove)

// ── Colores ──────────────────────────────────────────────────────────────────
router.get('/colores',                 colorController.list)
router.get('/colores/:id',             colorController.getById)
router.post('/colores',                requireAuth, requireAdmin, colorController.create)
router.patch('/colores/:id',           requireAuth, requireAdmin, colorController.update)
router.delete('/colores/:id',          requireAuth, requireAdmin, colorController.remove)

export default router
