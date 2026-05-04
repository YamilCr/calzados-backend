# Calzados Backend API

API REST construida con **Node.js + Express + TypeScript**, lista para conectar con **Supabase** como base de datos y sistema de autenticación.

---

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Lenguaje | TypeScript 5 |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT propio |
| Validación | Zod |
| Seguridad | Helmet, CORS, Rate Limiting |

---

## Estructura del proyecto

```
src/
├── index.ts                  # Entry point Express
├── db/
│   └── supabase.ts           # Cliente Supabase singleton
├── middlewares/
│   └── auth.ts               # requireAuth, requireAdmin, errorHandler
├── routes/
│   ├── auth.ts
│   ├── products.ts
│   └── orders.ts
├── controllers/
│   ├── authController.ts
│   ├── productController.ts
│   └── orderController.ts
├── services/
│   ├── authService.ts
│   ├── productService.ts
│   └── orderService.ts
└── types/
    └── database.ts           # Tipos TypeScript del schema de Supabase
```

---

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editá .env con tus credenciales de Supabase

# 3. Crear las tablas en Supabase
# Abrí el SQL Editor en tu proyecto Supabase y ejecutá:
# supabase_schema.sql

# 4. Modo desarrollo (hot-reload)
npm run dev

# 5. Build para producción
npm run build
npm start
```

---

## Configuración de Supabase

### 1. Crear proyecto
Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo.

### 2. Obtener credenciales
En **Settings → API**:
- `Project URL` → `SUPABASE_URL`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`  
  ⚠️ Esta key tiene permisos de admin. Nunca la expongas en el frontend.

### 3. Ejecutar el schema
En **SQL Editor**, pegá y ejecutá el contenido de `supabase_schema.sql`.
Esto crea las tablas, índices, RLS policies y datos de prueba.

### 4. Crear usuario admin
En **SQL Editor**:
```sql
update profiles
set role = 'admin'
where email = 'tu-email@ejemplo.com';
```

---

## Variables de entorno

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
JWT_SECRET=un-secreto-muy-largo-y-aleatorio
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

---

## Endpoints

### Auth

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/v1/auth/register` | Público | Registrar usuario |
| POST | `/v1/auth/login` | Público | Iniciar sesión |
| GET | `/v1/auth/me` | Auth | Perfil del usuario |
| POST | `/v1/auth/logout` | Auth | Cerrar sesión |

### Productos

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/v1/products` | Público | Listar con filtros |
| GET | `/v1/products/featured` | Público | Productos destacados |
| GET | `/v1/products/:slug` | Público | Detalle por slug |
| POST | `/v1/products` | Admin | Crear producto |
| PATCH | `/v1/products/:id` | Admin | Actualizar producto |
| DELETE | `/v1/products/:id` | Admin | Eliminar producto |

**Query params de listado:**
```
?category=shoes
&gender=men
&minPrice=100&maxPrice=500
&search=runner
&sortBy=price_asc          # featured | price_asc | price_desc | name_asc | rating
&page=1&perPage=9
```

### Órdenes

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/v1/orders` | Auth | Mis órdenes (admin ve todas) |
| GET | `/v1/orders/:id` | Auth | Detalle de orden |
| POST | `/v1/orders` | Auth | Crear orden |
| PATCH | `/v1/orders/:id/status` | Admin | Actualizar estado |

---

## Conectar el frontend Vue

En el frontend, cambiá en `src/api/client.ts`:

```typescript
const USE_MOCK = false   // ← apagar mock
const BASE_URL = 'http://localhost:3000/v1'  // ← URL del backend
```

El backend ya devuelve exactamente la misma forma de datos que espera el frontend.

---

## Health check

```bash
curl http://localhost:3000/health
# {"success":true,"message":"API funcionando correctamente.","env":"development"}
```

---

## Seguridad implementada

- **Helmet** – Headers HTTP seguros
- **CORS** configurable por variable de entorno
- **Rate limiting** – 200 req/15min global, 10 req/15min en `/auth`
- **JWT** con expiración configurable
- **Zod** – Validación de todos los bodies
- **Row Level Security** en Supabase – los usuarios solo acceden a sus propios datos
- **Service Role Key** solo en el backend – nunca expuesta al cliente
