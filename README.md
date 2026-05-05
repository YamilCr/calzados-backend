# Calzados Backend API

API REST en **Node.js + Express + TypeScript** conectada al schema real de Supabase.

---

## Schema mapeado

```
categorias
  └── subcategorias
        └── productos
              ├── imagenes
              ├── talles
              └── variantes ──→ colores
profiles (auth.users)
```

---

## Instalación rápida

```bash
npm install
cp .env.example .env   # completar con credenciales de Supabase
npm run dev            # hot-reload en http://localhost:3000
```

---

## Variables de entorno

| Variable | Dónde encontrarla |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `JWT_SECRET` | Generá con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Ej: `7d`, `24h` |
| `CORS_ORIGIN` | URL del frontend, ej: `http://localhost:5173` |

---

## Endpoints

### Auth
```
POST  /v1/auth/register     { name, email, password }
POST  /v1/auth/login        { email, password }
GET   /v1/auth/me           🔒
POST  /v1/auth/logout       🔒
```

### Productos
```
GET   /v1/products                     Listado con filtros (público)
GET   /v1/products/destacados          Destacados (público)
GET   /v1/products/:id                 Por UUID (público)
GET   /v1/products/codigo/:codigo      Por código (público)
POST  /v1/products                     Crear     🔒 admin
PATCH /v1/products/:id                 Actualizar 🔒 admin
DELETE /v1/products/:id                Soft delete (activo=false) 🔒 admin
DELETE /v1/products/:id/hard           Borrado físico 🔒 admin
```

#### Query params de listado
```
?categoria=Zapatillas          nombre de categoría (case-insensitive)
&subcategoria=Running
&search=nike
&minPrice=1000&maxPrice=5000
&sortBy=precio_asc             precio_asc | precio_desc | nombre_asc | destacado
&destacados=true
&activos=false                 incluir inactivos (default: solo activos)
&page=1&perPage=9
```

#### Body para crear/actualizar
```json
{
  "codigo": "ZAP-001",
  "nombre": "Air Max Running",
  "descripcion": "...",
  "precio": 1500,
  "precio_anterior": 2000,
  "subcategoria_id": "uuid-de-la-subcategoria",
  "activo": true,
  "destacado": true,
  "imagenesUrls": [
    "https://ejemplo.com/img1.jpg",
    "https://ejemplo.com/img2.jpg"
  ],
  "talles": ["38", "39", "40", "41", "42"],
  "variantes": [
    { "talle": "40", "color_id": "uuid-del-color" },
    { "talle": "41", "color_id": "uuid-del-color" }
  ]
}
```

### Catálogo (categorías, subcategorías, colores)
```
GET   /v1/catalog/categorias
GET   /v1/catalog/categorias/:id
POST  /v1/catalog/categorias          { nombre }  🔒 admin
PATCH /v1/catalog/categorias/:id      { nombre }  🔒 admin
DELETE /v1/catalog/categorias/:id               🔒 admin

GET   /v1/catalog/subcategorias       ?categoria_id=uuid
GET   /v1/catalog/subcategorias/:id
POST  /v1/catalog/subcategorias       { nombre, categoria_id }  🔒 admin
PATCH /v1/catalog/subcategorias/:id                              🔒 admin
DELETE /v1/catalog/subcategorias/:id                            🔒 admin

GET   /v1/catalog/colores
GET   /v1/catalog/colores/:id
POST  /v1/catalog/colores             { nombre, codigo_hex? }  🔒 admin
PATCH /v1/catalog/colores/:id                                   🔒 admin
DELETE /v1/catalog/colores/:id                                 🔒 admin
```

---

## Shape que devuelve la API al frontend

Cada producto se devuelve normalizado, compatible con el type `Product` del frontend Vue:

```json
{
  "id": "uuid",
  "codigo": "ZAP-001",
  "name": "Air Max Running",
  "price": 1500,
  "originalPrice": 2000,
  "image": "https://...",
  "images": ["https://...", "https://..."],
  "category": "Zapatillas",
  "subcategory": "Running",
  "sizes": ["38", "39", "40"],
  "colors": [{ "name": "Rojo", "hex": "#ff0000" }],
  "description": "...",
  "featured": true,
  "inStock": true,
  "slug": "air-max-running-zap-001"
}
```

---

## Conectar el frontend Vue

En `src/api/client.ts` del proyecto Vue:

```typescript
const USE_MOCK = false
const BASE_URL = 'http://localhost:3000/v1'
```

---

## Asignar rol admin

En el SQL Editor de Supabase:

```sql
-- Supabase guarda el rol en user_metadata
update auth.users
set raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
where email = 'tu-email@ejemplo.com';
```

---

## Estructura del proyecto

```
src/
├── index.ts
├── db/supabase.ts
├── types/index.ts
├── middlewares/auth.ts
├── services/
│   ├── productService.ts    ← lógica principal con joins
│   ├── catalogService.ts    ← categorías, subcategorías, colores
│   └── authService.ts
├── controllers/
│   ├── productController.ts
│   ├── catalogController.ts
│   └── authController.ts
└── routes/
    ├── products.ts
    ├── catalog.ts
    └── auth.ts
```
