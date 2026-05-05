import { Router, Request, Response } from 'express'
import multer from 'multer'
import { supabase } from '../db/supabase'

const router = Router()

// Multer en memoria (no guarda en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'))
  },
})

/**
 * POST /v1/upload/imagen
 * Body: multipart/form-data con campo "imagen"
 * Respuesta: { success: true, url: "https://..." }
 */
router.post('/imagen', upload.single('imagen'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió ningún archivo.' })
    }

    const ext      = req.file.originalname.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const path     = `productos/${filename}`

    // Subir al bucket "productos" de Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      })

      if (uploadError) {
        console.error('Supabase upload error:', uploadError)
        throw new Error(uploadError.message)
      }
    // if (uploadError) throw new Error(uploadError.message)

    // Obtener URL pública
    const { data } = supabase.storage.from('productos').getPublicUrl(path)

    return res.json({ success: true, url: data.publicUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al subir imagen'
    return res.status(500).json({ success: false, message: msg })
  }
})

export default router
