import { supabase } from '../db/supabase'
import type { OrderInsert } from '../types/database'

// ─── Tipos de entrada ─────────────────────────────────────────────────────────
export interface CreateOrderPayload {
  items: Array<{
    productId: number
    quantity: number
    size: string
    color: string   // JSON string: { name, hex }
  }>
  shippingAddress: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

// ─── orderService ─────────────────────────────────────────────────────────────
export const orderService = {

  // ── Listar órdenes del usuario ────────────────────────────────────────────────
  async listByUser(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          unit_price,
          selected_size,
          selected_color,
          product:products ( id, name, slug, image, price )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  },

  // ── Listar todas (admin) ──────────────────────────────────────────────────────
  async listAll() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          unit_price,
          selected_size,
          selected_color,
          product:products ( id, name, slug, image, price )
        ),
        profile:profiles ( name, email )
      `)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  },

  // ── Obtener por ID ────────────────────────────────────────────────────────────
  async getById(orderId: string, userId: string, isAdmin: boolean) {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          unit_price,
          selected_size,
          selected_color,
          product:products ( id, name, slug, image, price )
        )
      `)
      .eq('id', orderId)

    // Si no es admin, restringir al usuario propio
    if (!isAdmin) query = query.eq('user_id', userId)

    const { data, error } = await query.single()

    if (error || !data)
      throw Object.assign(new Error('Orden no encontrada.'), { statusCode: 404 })

    return data
  },

  // ── Crear orden ───────────────────────────────────────────────────────────────
  async create(userId: string, payload: CreateOrderPayload) {
    const { shippingAddress: addr, items } = payload

    // 1. Verificar stock y calcular total
    const productIds = items.map((i) => i.productId)
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, price, in_stock, name')
      .in('id', productIds)

    if (prodError) throw new Error(prodError.message)

    let total = 0
    for (const item of items) {
      const product = products?.find((p) => p.id === item.productId)
      if (!product)
        throw Object.assign(new Error(`Producto ${item.productId} no encontrado.`), { statusCode: 404 })
      if (!product.in_stock)
        throw Object.assign(new Error(`"${product.name}" no tiene stock.`), { statusCode: 409 })
      total += product.price * item.quantity
    }

    // 2. Crear la orden
    const orderInsert: OrderInsert = {
      user_id: userId,
      total,
      status: 'pending',
      shipping_first_name: addr.firstName,
      shipping_last_name:  addr.lastName,
      shipping_email:      addr.email,
      shipping_phone:      addr.phone,
      shipping_address:    addr.address,
      shipping_city:       addr.city,
      shipping_state:      addr.state,
      shipping_zip_code:   addr.zipCode,
      shipping_country:    addr.country,
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsert)
      .select()
      .single()

    if (orderError) throw new Error(orderError.message)

    // 3. Insertar items
    const orderItems = items.map((item) => {
      const product = products!.find((p) => p.id === item.productId)!
      return {
        order_id:       order.id,
        product_id:     item.productId,
        quantity:       item.quantity,
        unit_price:     product.price,
        selected_size:  item.size,
        selected_color: JSON.parse(item.color),
      }
    })

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) throw new Error(itemsError.message)

    return order
  },

  // ── Actualizar estado (admin) ─────────────────────────────────────────────────
  async updateStatus(orderId: string, status: string) {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      throw Object.assign(new Error(`Estado inválido: ${status}`), { statusCode: 400 })
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single()

    if (error || !data)
      throw Object.assign(new Error('Orden no encontrada.'), { statusCode: 404 })

    return data
  },
}
