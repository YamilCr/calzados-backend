// ──────────────────────────────────────────────────────────────────────────────
// Tipos que reflejan el schema de Supabase.
// Si usás el CLI de Supabase podés regenerar esto con:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
// ──────────────────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      products: {
        Row: ProductRow
        Insert: ProductInsert
        Update: ProductUpdate
      }
      orders: {
        Row: OrderRow
        Insert: OrderInsert
        Update: OrderUpdate
      }
      order_items: {
        Row: OrderItemRow
        Insert: OrderItemInsert
        Update: Partial<OrderItemInsert>
      }
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: Partial<ProfileInsert>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      gender_type: 'men' | 'women' | 'unisex'
      order_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
    }
  }
}

// ── Products ──────────────────────────────────────────────────────────────────
export interface ProductRow {
  id: number
  name: string
  slug: string
  price: number
  original_price: number | null
  image: string
  images: string[]
  rating: number
  review_count: number
  category: string
  gender: 'men' | 'women' | 'unisex'
  sizes: string[]
  colors: Array<{ name: string; hex: string }>
  description: string
  featured: boolean
  in_stock: boolean
  tags: string[]
  en_carrusel: boolean
  created_at: string
  updated_at: string
}

export type ProductInsert = Omit<ProductRow, 'id' | 'created_at' | 'updated_at'>
export type ProductUpdate = Partial<ProductInsert>

// ── Orders ────────────────────────────────────────────────────────────────────
export interface OrderRow {
  id: string
  user_id: string
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  shipping_first_name: string
  shipping_last_name: string
  shipping_email: string
  shipping_phone: string
  shipping_address: string
  shipping_city: string
  shipping_state: string
  shipping_zip_code: string
  shipping_country: string
  created_at: string
  updated_at: string
}

export type OrderInsert = Omit<OrderRow, 'id' | 'created_at' | 'updated_at'>
export type OrderUpdate = Partial<Pick<OrderRow, 'status'>>

// ── Order Items ───────────────────────────────────────────────────────────────
export interface OrderItemRow {
  id: number
  order_id: string
  product_id: number
  quantity: number
  unit_price: number
  selected_size: string
  selected_color: { name: string; hex: string }
}

export type OrderItemInsert = Omit<OrderItemRow, 'id'>

// ── Profiles ──────────────────────────────────────────────────────────────────
export interface ProfileRow {
  id: string          // uuid (auth.users.id)
  name: string
  email: string
  avatar_url: string | null
  role: 'customer' | 'admin'
  created_at: string
}

export type ProfileInsert = Omit<ProfileRow, 'created_at'>

// ── API shapes (lo que devuelve la API al cliente) ────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}
