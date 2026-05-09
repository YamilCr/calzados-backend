import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { supabase } from '../db/supabase'
import { httpError } from '../middlewares/auth'
import type { JwtPayload } from '../types'

/**
 * Crea un cliente temporal con la ANON KEY solo para autenticar al usuario.
 * Se descarta al terminar la función — nunca contamina el cliente global
 * de service role que usa el resto del backend (imágenes, productos, etc.).
 */
function createUserClient() {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en las variables de entorno.')
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export const authService = {

  async register(name: string, email: string, password: string) {
    // Crear usuario en Supabase Auth usando el cliente admin (service role)
    // admin.createUser NO crea sesión — no contamina el cliente global ✅
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

    const token = makeToken({ sub: data.user.id, email, role: 'customer' })

    return {
      user: { id: data.user.id, name, email },
      token,
    }
  },

  async login(email: string, password: string) {
    // ✅ CORRECCIÓN CLAVE: usamos un cliente TEMPORAL con ANON KEY.
    // Nunca usar supabase.auth.signInWithPassword() con el cliente global
    // de service role, porque inyecta una sesión de usuario en ese cliente
    // y rompe las URLs públicas de Storage (imágenes) para el resto del proceso.
    const userClient = createUserClient()
    const { data, error } = await userClient.auth.signInWithPassword({ email, password })

    // El userClient se descarta al salir de esta función — sin efectos secundarios.

    if (error || !data.user) throw httpError('Credenciales inválidas.', 401)

    const role = (data.user.user_metadata?.role as 'customer' | 'admin') ?? 'customer'
    const name = (data.user.user_metadata?.name as string) ?? email.split('@')[0]

    const token = makeToken({ sub: data.user.id, email, role })

    return {
      user: { id: data.user.id, name, email },
      token,
    }
  },

  async me(userId: string) {
    // admin.getUserById tampoco crea sesión — está bien con el cliente global ✅
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
    // admin.signOut invalida la sesión del usuario en Supabase sin tocar
    // el estado del cliente global — correcto ✅
    await supabase.auth.admin.signOut(userId)
  },
}

function makeToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  })
}