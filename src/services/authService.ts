import jwt from 'jsonwebtoken'
import { supabase } from '../db/supabase'
import { httpError } from '../middlewares/auth'
import type { JwtPayload } from '../types'

export const authService = {

  async register(name: string, email: string, password: string) {
    // Crear en Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        throw httpError('El email ya está registrado.', 409)
      }
      throw new Error(error.message)
    }

    // El trigger de Supabase crea el registro en profiles automáticamente
    const token = makeToken({ sub: data.user.id, email, role: 'customer' })

    return {
      user: { id: data.user.id, name, email },
      token,
    }
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) throw httpError('Credenciales inválidas.', 401)

    // Leer metadata para el rol (lo guardamos en user_metadata al asignar admin)
    const role = (data.user.user_metadata?.role as 'customer' | 'admin') ?? 'customer'
    const name = (data.user.user_metadata?.name as string) ?? email.split('@')[0]

    const token = makeToken({ sub: data.user.id, email, role })

    return {
      user: { id: data.user.id, name, email },
      token,
    }
  },

  async me(userId: string) {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data.user) throw httpError('Usuario no encontrado.', 404)

    const u = data.user
    return {
      id:    u.id,
      name:  u.user_metadata?.name ?? u.email!.split('@')[0],
      email: u.email!,
      role:  (u.user_metadata?.role as string) ?? 'customer',
    }
  },

  async logout(userId: string) {
    await supabase.auth.admin.signOut(userId)
  },
}

function makeToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  })
}
