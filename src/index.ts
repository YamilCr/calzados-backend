import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'

import productRoutes from './routes/products'
import authRoutes    from './routes/auth'
import orderRoutes   from './routes/orders'
import { errorHandler, notFound } from './middlewares/auth'

const app  = express()
const PORT = Number(process.env.PORT) || 3000

// ─── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet())

app.use(
  cors({
    origin:      process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
    methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

// Rate limiting global: 200 req / 15 min por IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      200,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: 'Demasiadas solicitudes. Intente más tarde.' },
  }),
)

// Rate limiting estricto para auth: 10 req / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message: { success: false, message: 'Demasiados intentos. Intente más tarde.' },
})

// ─── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API funcionando correctamente.', env: process.env.NODE_ENV })
})
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido a la API de Calzados',
    docs: '/health para chequeo, /v1/auth para autenticación, /v1/products para productos, /v1/orders para pedidos'
  })
})
// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/v1/auth',     authLimiter, authRoutes)
app.use('/v1/products', productRoutes)
app.use('/v1/orders',   orderRoutes)

// ─── 404 / Error handler ──────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Calzados API corriendo en http://localhost:${PORT}`)
  console.log(`   Entorno: ${process.env.NODE_ENV ?? 'development'}`)
  console.log(`   CORS:    ${process.env.CORS_ORIGIN ?? 'http://localhost:5173'}\n`)
})

export default app
