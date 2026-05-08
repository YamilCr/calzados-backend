import slugify from 'slugify'
import { supabase } from '../db/supabase'
import { httpError } from '../middlewares/auth'
import type { ProductoApi, ProductoCompleto, ProductoInsert, ProductoUpdate } from '../types'

// ─── Filtros del listado ──────────────────────────────────────────────────────
export interface ProductFilters {
  categoria?: string
  subcategoria?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'precio_asc' | 'precio_desc' | 'nombre_asc' | 'destacado'
  soloDestacados?: boolean
  soloActivos?: boolean
  page?: number
  perPage?: number
}

// ─── Mapper ───────────────────────────────────────────────────────────────────
function toApi(p: ProductoCompleto): ProductoApi {
  const imagenes = (p.imagenes ?? []).map((i) => i.url)
  const sizes    = [...new Set((p.talles ?? []).map((t) => t.talle))]
  const colors   = (p.variantes ?? [])
    .filter((v) => v.color)
    .map((v) => ({ name: v.color!.nombre, hex: v.color!.codigo_hex ?? '#000000' }))
    .filter((c, idx, arr) => arr.findIndex((x) => x.name === c.name) === idx)

  const subcategoriaNombre = p.subcategoria?.nombre ?? ''
  const categoriaNombre    = p.subcategoria?.categoria?.nombre ?? ''

  return {
    id:            p.id,
    codigo:        p.codigo,
    name:          p.nombre,
    price:         Number(p.precio),
    originalPrice: p.precio_anterior ? Number(p.precio_anterior) : undefined,
    image:         imagenes[0] ?? '',
    images:        imagenes,
    category:      categoriaNombre,
    subcategory:   subcategoriaNombre,
    sizes,
    colors,
    description:   p.descripcion ?? '',
    featured:      p.destacado,
    inStock:       p.activo,
    slug:          slugify(`${p.nombre}-${p.codigo}`, { lower: true, strict: true }),
  }
}

// ─── Query base ───────────────────────────────────────────────────────────────
const SELECT_FULL = `
  *,
  subcategoria:subcategorias (
    id, nombre,
    categoria:categorias ( id, nombre )
  ),
  imagenes ( id, url ),
  talles ( id, talle ),
  variantes (
    id, talle, created_at,
    color:colores ( id, nombre, codigo_hex )
  )
`

// ─── productService ───────────────────────────────────────────────────────────
export const productService = {

  async list(filters: ProductFilters = {}) {
    const page    = Math.max(1, filters.page    ?? 1)
    const perPage = Math.min(50, filters.perPage ?? 9)

    // ── Paso 1: resolver IDs de subcategorías que coincidan con los filtros ──
    // Esto permite filtrar en la query principal con count correcto
    let subcategoriaIds: string[] | null = null

    if (filters.categoria || filters.subcategoria) {
      let subQuery = supabase
        .from('subcategorias')
        .select('id, nombre, categoria:categorias(id, nombre)')

      const { data: subs, error: subErr } = await subQuery
      if (subErr) throw new Error(subErr.message)

      let filtered = (subs ?? []) as Array<{
        id: string
        nombre: string
        categoria: { id: string; nombre: string } | null
      }>

      if (filters.categoria) {
        const cat = filters.categoria.toLowerCase()
        filtered = filtered.filter(
          (s) => s.categoria?.nombre.toLowerCase() === cat,
        )
      }

      if (filters.subcategoria) {
        const sub = filters.subcategoria.toLowerCase()
        filtered = filtered.filter(
          (s) => s.nombre.toLowerCase() === sub,
        )
      }

      subcategoriaIds = filtered.map((s) => s.id)

      // Si no hay subcategorías que coincidan, devolver vacío directamente
      if (subcategoriaIds.length === 0) {
        return { data: [], total: 0, page, perPage, totalPages: 0 }
      }
    }

    // ── Paso 2: query principal con filtros correctos y count exacto ──────────
    const from = (page - 1) * perPage
    const to   = from + perPage - 1

    let query = supabase
      .from('productos')
      .select(SELECT_FULL, { count: 'exact' })

    // Filtrar por subcategoria_id si aplica
    if (subcategoriaIds !== null) {
      query = query.in('subcategoria_id', subcategoriaIds)
    }

    // Activos
    if (filters.soloActivos !== false) query = query.eq('activo', true)

    // Destacados
    if (filters.soloDestacados) query = query.eq('destacado', true)

    // Precio
    if (filters.minPrice !== undefined) query = query.gte('precio', filters.minPrice)
    if (filters.maxPrice !== undefined) query = query.lte('precio', filters.maxPrice)

    // Búsqueda
    if (filters.search) {
      query = query.or(
        `nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`,
      )
    }

    // Ordenamiento
    switch (filters.sortBy) {
      case 'precio_asc':  query = query.order('precio',    { ascending: true });  break
      case 'precio_desc': query = query.order('precio',    { ascending: false }); break
      case 'nombre_asc':  query = query.order('nombre',    { ascending: true });  break
      default:            query = query.order('destacado', { ascending: false })
                                       .order('created_at', { ascending: false })
    }

    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const items      = (data ?? []) as unknown as ProductoCompleto[]
    const total      = count ?? 0
    const totalPages = Math.ceil(total / perPage)

    return { data: items.map(toApi), total, page, perPage, totalPages }
  },

  async getById(id: string): Promise<ProductoApi> {
    const { data, error } = await supabase
      .from('productos')
      .select(SELECT_FULL)
      .eq('id', id)
      .single()

    if (error || !data) throw httpError('Producto no encontrado.', 404)
    return toApi(data as unknown as ProductoCompleto)
  },

  async getByCodigo(codigo: string): Promise<ProductoApi> {
    const { data, error } = await supabase
      .from('productos')
      .select(SELECT_FULL)
      .eq('codigo', codigo)
      .single()

    if (error || !data) throw httpError('Producto no encontrado.', 404)
    return toApi(data as unknown as ProductoCompleto)
  },

  async getDestacados(): Promise<ProductoApi[]> {
    const { data, error } = await supabase
      .from('productos')
      .select(SELECT_FULL)
      .eq('activo', true)
      .eq('destacado', true)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as ProductoCompleto[]).map(toApi)
  },

  async getCarrusel(): Promise<ProductoApi[]> {
    const { data, error } = await supabase
      .from('productos')
      .select(SELECT_FULL)
      .eq('activo', true)
      .eq('en_carrusel', true)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as ProductoCompleto[]).map(toApi)
  },

  async create(payload: ProductoInsert & {
    imagenesUrls?: string[]
    talles?: string[]
    variantes?: Array<{ talle?: string; color_id?: string }>
  }): Promise<ProductoApi> {
    const { imagenesUrls, talles, variantes, ...productoData } = payload

    const { data: producto, error } = await supabase
      .from('productos')
      .insert(productoData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw httpError('El código de producto ya existe.', 409)
      throw new Error(error.message)
    }

    const productoId = producto.id

    if (imagenesUrls?.length) {
      const imgs = imagenesUrls.map((url) => ({ producto_id: productoId, url }))
      const { error: imgErr } = await supabase.from('imagenes').insert(imgs)
      if (imgErr) throw new Error(imgErr.message)
    }

    if (talles?.length) {
      const t = talles.map((talle) => ({ producto_id: productoId, talle }))
      const { error: talleErr } = await supabase.from('talles').insert(t)
      if (talleErr) throw new Error(talleErr.message)
    }

    if (variantes?.length) {
      const v = variantes.map((va) => ({ ...va, producto_id: productoId }))
      const { error: varErr } = await supabase.from('variantes').insert(v)
      if (varErr) throw new Error(varErr.message)
    }

    return this.getById(productoId)
  },

  async update(id: string, payload: ProductoUpdate & {
    imagenesUrls?: string[]
    talles?: string[]
    variantes?: Array<{ talle?: string; color_id?: string }>
  }): Promise<ProductoApi> {
    const { imagenesUrls, talles, variantes, ...productoData } = payload

    if (Object.keys(productoData).length > 0) {
      const { error } = await supabase
        .from('productos')
        .update(productoData)
        .eq('id', id)
      if (error) throw new Error(error.message)
    }

    if (imagenesUrls !== undefined) {
      await supabase.from('imagenes').delete().eq('producto_id', id)
      if (imagenesUrls.length) {
        const imgs = imagenesUrls.map((url) => ({ producto_id: id, url }))
        const { error } = await supabase.from('imagenes').insert(imgs)
        if (error) throw new Error(error.message)
      }
    }

    if (talles !== undefined) {
      await supabase.from('talles').delete().eq('producto_id', id)
      if (talles.length) {
        const t = talles.map((talle) => ({ producto_id: id, talle }))
        const { error } = await supabase.from('talles').insert(t)
        if (error) throw new Error(error.message)
      }
    }

    if (variantes !== undefined) {
      await supabase.from('variantes').delete().eq('producto_id', id)
      if (variantes.length) {
        const v = variantes.map((va) => ({ ...va, producto_id: id }))
        const { error } = await supabase.from('variantes').insert(v)
        if (error) throw new Error(error.message)
      }
    }

    return this.getById(id)
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}