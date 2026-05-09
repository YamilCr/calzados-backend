// ─────────────────────────────────────────────────────────────────────────────
// Tipos que reflejan 1:1 las tablas del schema real de Supabase.
// ─────────────────────────────────────────────────────────────────────────────

// ── Tablas base ──────────────────────────────────────────────────────────────

export interface CategoriaRow {
  id: string
  nombre: string
  created_at: string
}

export interface SubcategoriaRow {
  id: string
  nombre: string
  categoria_id: string | null
  created_at: string
}

export interface ColorRow {
  id: string
  nombre: string
  codigo_hex: string | null
  created_at: string
}

export interface ProductoRow {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  precio: number
  precio_anterior: number | null
  subcategoria_id: string | null
  activo: boolean
  destacado: boolean
  en_carrusel: boolean
  created_at: string
}

export interface ImagenRow {
  id: string
  producto_id: string | null
  url: string
}

export interface TalleRow {
  id: string
  producto_id: string | null
  talle: string
}

export interface VarianteRow {
  id: string
  producto_id: string | null
  talle: string | null
  color_id: string | null
  created_at: string
}

export interface ProfileRow {
  id: string   // uuid referencia auth.users
  created_at: string
}

// ── Tipos enriquecidos (con joins) ───────────────────────────────────────────

/** Producto completo con todas sus relaciones */
export interface ProductoCompleto extends ProductoRow {
  subcategoria: (SubcategoriaRow & { categoria: CategoriaRow | null }) | null
  imagenes: ImagenRow[]
  talles: TalleRow[]
  variantes: (VarianteRow & { color: ColorRow | null })[]
}

/** Shape que devuelve la API al frontend (compatible con el tipo Product del frontend) */
export interface ProductoApi {
  id: string
  codigo: string
  name: string           // = nombre
  price: number          // = precio
  originalPrice?: number // = precio_anterior
  image: string          // primera imagen
  images: string[]       // todas las URLs
  category: string       // nombre de categoría
  subcategory: string    // nombre de subcategoría
  sizes: string[]        // talles únicos
  colors: Array<{ name: string; hex: string }>   // desde variantes → colores
  description: string
  featured: boolean      // = destacado
  en_carrusel: boolean    // = en_carrusel
  inStock: boolean       // = activo (proxy)
  slug: string           // generado del nombre+codigo
}

// ── Inserts ──────────────────────────────────────────────────────────────────

export type ProductoInsert = Omit<ProductoRow, 'id' | 'created_at' | 'activo' | 'destacado'> &
  Partial<Pick<ProductoRow, 'activo' | 'destacado'>>

export type ProductoUpdate = Partial<Omit<ProductoRow, 'id' | 'created_at'>>

// ── Respuestas API genéricas ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ── JWT ───────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string    // auth.users.id
  email: string
  role: 'customer' | 'admin'
}
