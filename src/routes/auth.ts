import { Router } from 'express'
import { authController } from '../controllers/authController'
import { requireAuth } from '../middlewares/auth'

const router = Router()

router.post('/register', authController.register)          // POST /auth/register
router.post('/login',    authController.login)             // POST /auth/login
router.get('/me',        requireAuth, authController.me)   // GET  /auth/me
router.post('/logout',   requireAuth, authController.logout) // POST /auth/logout

export default router
