import { supabase } from '../db/supabase'
import { httpError } from '../middlewares/auth'


// ─── categoriaService ─────────────────────────────────────────────────────────
export const categoriaService = {

  async list() {
  const { data, error } = await supabase
    .from('categorias')
    .select(`*, subcategorias ( id, nombre, orden )`) // 👈 incluir orden en subcategorías
    .order('orden', { ascending: true })             // 👈 ordenar categorías por orden
  if (error) throw new Error(error.message)

  // opcional: ordenar subcategorías en memoria también
  return (data ?? []).map(c => ({
    ...c,
      subcategorias: (c.subcategorias ?? []).sort((a, b) => a.orden - b.orden)
    }))
  },
    
  async getById(id: string) {
    const { data, error } = await supabase
      .from('categorias')
      .select(`*, subcategorias ( id, nombre )`)
      .eq('id', id)
      .single()

    if (error || !data) throw httpError('Categoría no encontrada.', 404)
    return data
  },

  async create(nombre: string) {
    const { data, error } = await supabase
      .from('categorias')
      .insert({ nombre })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async update(id: string, nombre: string) {
    const { data, error } = await supabase
      .from('categorias')
      .update({ nombre })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw httpError('Categoría no encontrada.', 404)
    return data
  },

  async remove(id: string) {
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

// ─── subcategoriaService ──────────────────────────────────────────────────────
export const subcategoriaService = {

  async list(categoriaId?: string) {
      let query = supabase
        .from('subcategorias')
        .select(`*, categoria:categorias ( id, nombre )`)
        .order('orden', { ascending: true })   // 👈 ahora usa el campo orden

      if (categoriaId) query = query.eq('categoria_id', categoriaId)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data ?? []
    },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('subcategorias')
      .select(`*, categoria:categorias ( id, nombre )`)
      .eq('id', id)
      .single()

    if (error || !data) throw httpError('Subcategoría no encontrada.', 404)
    return data
  },

  async create(nombre: string, categoriaId: string) {
    const { data, error } = await supabase
      .from('subcategorias')
      .insert({ nombre, categoria_id: categoriaId })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async update(id: string, payload: { nombre?: string; categoria_id?: string }) {
    const { data, error } = await supabase
      .from('subcategorias')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw httpError('Subcategoría no encontrada.', 404)
    return data
  },

  async remove(id: string) {
    const { error } = await supabase.from('subcategorias').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

// ─── colorService ─────────────────────────────────────────────────────────────
export const colorService = {

  async list() {
    const { data, error } = await supabase
      .from('colores')
      .select('*')
      .order('nombre')

    if (error) throw new Error(error.message)
    return data ?? []
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('colores')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) throw httpError('Color no encontrado.', 404)
    return data
  },

  async create(nombre: string, codigo_hex?: string) {
    const { data, error } = await supabase
      .from('colores')
      .insert({ nombre, codigo_hex })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async update(id: string, payload: { nombre?: string; codigo_hex?: string }) {
    const { data, error } = await supabase
      .from('colores')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) throw httpError('Color no encontrado.', 404)
    return data
  },

  async remove(id: string) {
    const { error } = await supabase.from('colores').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
