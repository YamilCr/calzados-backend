import slugify from 'slugify'
import { supabase } from '../db/supabase'
import type { ProductInsert, ProductRow, ProductUpdate } from '../types/database'

// ─── Filtros ──────────────────────────────────────────────────────────────────
export interface ProductFilters {
  category?: string
  gender?: string
  minPrice?: number
  maxPrice?: number
  search?: string
  sortBy?: 'featured' | 'price_asc' | 'price_desc' | 'name_asc' | 'rating'
  page?: number
  perPage?: number
}

// ─── ProductService ───────────────────────────────────────────────────────────
export const productService = {

  // ── Listar con filtros y paginación ─────────────────────────────────────────
  async list(filters: ProductFilters = {}) {
    const page    = Math.max(1, filters.page    ?? 1)
    const perPage = Math.min(50, filters.perPage ?? 9)
    const from    = (page - 1) * perPage
    const to      = from + perPage - 1

    let query = supabase.from('products').select('*', { count: 'exact' })

    if (filters.category) query = query.eq('category', filters.category)
    if (filters.gender)   query = query.in('gender', [filters.gender, 'unisex'])
    if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice)
    if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice)
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      )
    }

    // Ordenamiento
    switch (filters.sortBy) {
      case 'price_asc':  query = query.order('price',  { ascending: true });  break
      case 'price_desc': query = query.order('price',  { ascending: false }); break
      case 'name_asc':   query = query.order('name',   { ascending: true });  break
      case 'rating':     query = query.order('rating', { ascending: false }); break
      default:
        query = query.order('featured', { ascending: false }).order('created_at', { ascending: false })
    }

    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const total      = count ?? 0
    const totalPages = Math.ceil(total / perPage)

    return { data: data ?? [], total, page, perPage, totalPages }
  },

  // ── Obtener por slug ─────────────────────────────────────────────────────────
  async getBySlug(slug: string): Promise<ProductRow> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !data) throw Object.assign(new Error('Producto no encontrado.'), { statusCode: 404 })
    return data
  },

  // ── Obtener por ID ───────────────────────────────────────────────────────────
  async getById(id: number): Promise<ProductRow> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) throw Object.assign(new Error('Producto no encontrado.'), { statusCode: 404 })
    return data
  },

  // ── Destacados ───────────────────────────────────────────────────────────────
  async getFeatured(): Promise<ProductRow[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) throw new Error(error.message)
    return data ?? []
  },

  // ── Crear ────────────────────────────────────────────────────────────────────
  async create(payload: Omit<ProductInsert, 'slug'>): Promise<ProductRow> {
    const slug = slugify(payload.name, { lower: true, strict: true })

    // Verificar slug único
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    const finalSlug = existing
      ? `${slug}-${Date.now()}`
      : slug

    const { data, error } = await supabase
      .from('products')
      .insert({ ...payload, slug: finalSlug })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  // ── Actualizar ───────────────────────────────────────────────────────────────
  async update(id: number, payload: ProductUpdate): Promise<ProductRow> {
    // Si cambia el nombre, regenerar slug
    if (payload.name) {
      payload.slug = slugify(payload.name, { lower: true, strict: true })
    }

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw Object.assign(new Error('Producto no encontrado.'), { statusCode: 404 })
    return data
  },

  // ── Eliminar ─────────────────────────────────────────────────────────────────
  async remove(id: number): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
