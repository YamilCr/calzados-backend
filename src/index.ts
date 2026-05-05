import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'

import authRoutes    from './routes/auth'
import productRoutes from './routes/products'
import catalogRoutes from './routes/catalog'
import uploadRoutes  from './routes/upload'  
import { errorHandler, notFound } from './middlewares/auth'

const app  = express()
const PORT = Number(process.env.PORT) || 3000

// ── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin:      process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}))

// Rate limiting global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes. Intentá más tarde.' },
}))

// Rate limiting estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Demasiados intentos de autenticación.' },
})

// ── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// ── home ───────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido a la API de Calzados.',
  })
})

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Calzados API corriendo.',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

// ── Rutas ────────────────────────────────────────────────────────────────────
app.use('/v1/auth',     authLimiter, authRoutes)
app.use('/v1/products', productRoutes)
app.use('/v1/catalog',  catalogRoutes)
app.use('/v1/upload',   uploadRoutes)   

// ── 404 y errores ────────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`\n🚀  API corriendo en http://localhost:${PORT}`)
  console.log(`    Entorno : ${process.env.NODE_ENV ?? 'development'}`)
  console.log(`    CORS    : ${process.env.CORS_ORIGIN ?? 'http://localhost:5173'}`)
  console.log(`    Supabase: ${process.env.SUPABASE_URL}\n`)
})

export default app
