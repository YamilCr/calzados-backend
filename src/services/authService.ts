import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../db/supabase'
import type { JwtPayload } from '../middlewares/auth'

// ─── AuthService ──────────────────────────────────────────────────────────────
export const authService = {

  // ── Registro ──────────────────────────────────────────────────────────────────
  async register(name: string, email: string, password: string) {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // skip email confirmation en dev
      user_metadata: { name },
    })

    if (authError) {
      // Supabase devuelve "already registered" si el email existe
      if (authError.message.toLowerCase().includes('already')) {
        throw Object.assign(new Error('El email ya está registrado.'), { statusCode: 409 })
      }
      throw new Error(authError.message)
    }

    const userId = authData.user.id

    // 2. Crear perfil en tabla profiles
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      name,
      email,
      role: 'customer',
    })

    if (profileError) throw new Error(profileError.message)

    // 3. Generar JWT propio
    const token = generateToken({ sub: userId, email, role: 'customer' })

    return {
      user: { id: userId, name, email },
      token,
    }
  },

  // ── Login ─────────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    // Autenticar via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      throw Object.assign(new Error('Credenciales inválidas.'), { statusCode: 401 })
    }

    // Obtener perfil para saber el rol
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role, avatar_url')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      throw Object.assign(new Error('Perfil no encontrado.'), { statusCode: 404 })
    }

    const token = generateToken({
      sub: data.user.id,
      email,
      role: profile.role as 'customer' | 'admin',
    })

    return {
      user: {
        id: data.user.id,
        name: profile.name,
        email,
        avatar: profile.avatar_url ?? undefined,
      },
      token,
    }
  },

  // ── Me (perfil del usuario autenticado) ───────────────────────────────────────
  async me(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      throw Object.assign(new Error('Usuario no encontrado.'), { statusCode: 404 })
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      avatar: data.avatar_url ?? undefined,
      role: data.role,
    }
  },

  // ── Logout (Supabase invalida la sesión; el JWT expira solo) ──────────────────
  async logout(userId: string) {
    // Con la service role podemos invalidar todas las sesiones del usuario
    await supabase.auth.admin.signOut(userId)
  },
}

// ─── Helper JWT ───────────────────────────────────────────────────────────────
function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  })
}
