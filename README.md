# Tienda de Afiliados de Pesca - PescaPlus

[![CI](https://github.com/jorgellb/pescaplus/actions/workflows/ci.yml/badge.svg)](https://github.com/jorgellb/pescaplus/actions/workflows/ci.yml)

Tienda de afiliados de pesca con integración de AliExpress y asistente IA de NVIDIA.

> **Funciona sin configuración.** El catálogo de productos vive en `lib/catalog.ts`
> y es la fuente de la verdad: puedes ejecutar `npm run dev` y navegar toda la web
> (catálogo, categorías, fichas de producto y el asistente IA) sin base de datos ni
> claves de API. La base de datos (Neon/Prisma) y las APIs de AliExpress y NVIDIA son
> **mejoras opcionales** que se activan solas cuando defines sus variables de entorno,
> y cualquier fallo degrada de forma transparente al catálogo local y al asistente
> experto offline.

## Tecnologías

- **Next.js 16** - Framework React
- **TypeScript** - Tipado estático
- **Prisma** - ORM para base de datos
- **Neon PostgreSQL** - Base de datos serverless
- **AliExpress API** - Productos y afiliados
- **NVIDIA AI** - Asistente de IA para consejos de pesca
- **LangChain** - Integración con modelos de IA
- **Tailwind CSS** - Estilos
- **Vercel** - Despliegue

## Configuración

### 1. Clonar el proyecto

```bash
cd pescaplus
npm install
```

### 2. Configurar base de datos Neon

1. Crea una cuenta en [Neon](https://neon.tech)
2. Crea una nueva base de datos
3. Copia la URL de conexión

### 3. Configurar variables de entorno

Copia `.env.example` a `.env` y completa las variables:

```bash
cp .env.example .env
```

Variables (todas **opcionales** — la app funciona sin ellas):

- `DATABASE_URL`: URL de Neon PostgreSQL. Si está, el panel persiste en la DB; si no, usa un store en memoria.
- `ALIEXPRESS_APP_KEY` / `ALIEXPRESS_APP_SECRET` / `ALIEXPRESS_APP_TOKEN`: credenciales de afiliado.
- `ALIEXPRESS_TRACKING_ID`: tracking id de afiliado (por defecto `pescaplus`).
- `NVIDIA_API_KEY`: clave de NVIDIA para el asistente y la generación de fichas con IA.
- `NVIDIA_MODEL` / `NVIDIA_BASE_URL`: modelo y endpoint (opcional; hay valores por defecto).
- `ADMIN_PASSWORD`: contraseña del **panel de administración** (`/admin`). Sin ella, se usa
  `pescaplus-admin` en desarrollo (con aviso). **Defínela antes de desplegar.**

### 4. Configurar AliExpress API

1. Regístrate en [AliExpress Portals](https://portals.aliexpress.com/)
2. Crea una nueva aplicación
3. Obtén tus credenciales (app key, app secret)

### 5. Configurar NVIDIA API

1. Regístrate en [NVIDIA API Catalog](https://build.nvidia.com/)
2. Obtén una API key para los modelos que quieras usar

### 6. Inicializar base de datos

```bash
npm run db:generate
npm run db:push
```

### 7. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Despliegue en Vercel

```bash
npm run build
```

O despliega directamente desde Vercel:

1. Instala Vercel CLI: `npm i -g vercel`
2. Ejecuta: `vercel`
3. Sigue las instrucciones

## Estructura del proyecto

```
pescaplus/
├── app/
│   ├── api/
│   │   ├── products/
│   │   │   ├── [id]/route.ts
│   │   │   └── route.ts
│   │   ├── chat/route.ts
│   │   └── aliexpress/search/route.ts
│   ├── categories/[category]/page.tsx
│   ├── products/[id]/page.tsx
│   ├── advice/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── ProductCard.tsx
│   ├── ProductImage.tsx   # imagen con fallback ante 404
│   └── Layout.tsx
├── lib/
│   ├── fishing.ts         # fuente única de modalidades
│   ├── catalog.ts         # catálogo local (fuente de la verdad)
│   ├── prisma.ts          # DB opcional
│   ├── aliexpress.ts      # API opcional (firmada)
│   └── nvidia-ai.ts       # IA con fallback offline
├── prisma/
│   └── schema.prisma
├── types/
│   └── index.ts
└── package.json
```

## Características

- ✅ Catálogo curado local (`lib/catalog.ts`) — la app arranca sin servicios externos
- ✅ Modalidades centralizadas en `lib/fishing.ts` (una sola fuente de labels/iconos/keywords)
- ✅ Categorías por tipo de pesca con búsqueda sin acentos y ordenación (precio/valoración)
- ✅ Asistente IA con experto offline de alta calidad como fallback
- ✅ Integración AliExpress opcional con **firma TOP correcta** (HMAC-SHA256)
- ✅ Validación de entradas con Zod en las rutas API
- ✅ Render de chat seguro (HTML escapado, sin XSS) e imágenes con fallback
- ✅ Recomendaciones de productos relacionados por modalidad
- ✅ Diseño responsive con Tailwind CSS y persistencia del chat en el navegador
- ✅ **Panel de administración** (`/admin`) con login, CRUD de productos y generación con IA
- ✅ Base de datos PostgreSQL con Prisma (opcional) y despliegue en Vercel

## Panel de administración (`/admin`)

Backend intuitivo protegido por contraseña (`ADMIN_PASSWORD`) para gestionar la tienda:

- **Productos**: dashboard con métricas (total, modalidades, valoración y precio medios) y una
  tabla para **crear, editar y eliminar** productos.
- **Creación manual**: formulario completo (título, modalidad, precio, moneda, valoración,
  reseñas, imagen, enlace de afiliado, descripción, stock) con vista previa de imagen.
- **Creación con IA** ✨: describe el producto en una frase y la IA (NVIDIA, con *fallback*
  offline) rellena toda la ficha; luego la revisas y ajustas antes de guardar.
- **Configuración**: estado de las integraciones (DB, AliExpress, NVIDIA, contraseña), valores
  por defecto (moneda, modalidad, nº por página) y mantenimiento del catálogo (exportar a JSON,
  restablecer al catálogo original).
- **Persistencia**: usa la base de datos cuando `DATABASE_URL` está configurada; si no, un store
  en memoria (ideal para demos; se reinicia con el servidor).

## Scripts disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run start` - Iniciar servidor de producción
- `npm run lint` - Ejecutar ESLint
- `npm run db:generate` - Generar Prisma Client
- `npm run db:push` - Sincronizar esquema con base de datos
- `npm run db:studio` - Abrir Prisma Studio

## Licencia

MIT