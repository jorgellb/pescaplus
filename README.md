# Tienda de Afiliados de Pesca - PescaPlus

Tienda de afiliados de pesca con integración de AliExpress y asistente IA de NVIDIA.

## Tecnologías

- **Next.js 15** - Framework React
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

Variables necesarias:

- `DATABASE_URL`: URL de conexión a Neon PostgreSQL
- `ALIEXPRESS_APP_KEY`: Clave de aplicación de AliExpress
- `ALIEXPRESS_APP_SECRET`: Secreto de aplicación de AliExpress
- `ALIEXPRESS_APP_TOKEN`: Token de aplicación de AliExpress
- `NVIDIA_API_KEY`: Clave de API de NVIDIA

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
│   └── Layout.tsx
├── lib/
│   ├── prisma.ts
│   ├── aliexpress.ts
│   └── nvidia-ai.ts
├── prisma/
│   └── schema.prisma
├── types/
│   └── index.ts
└── package.json
```

## Características

- ✅ Catálogo de productos de pesca de AliExpress
- ✅ Categorías por tipo de pesca (spinning, fly fishing, carp, sea, baitcasting)
- ✅ Asistente IA para consejos de pesca
- ✅ Recomendaciones de productos basadas en tipo de pesca
- ✅ Sistema de afiliados con AliExpress
- ✅ Diseño responsive con Tailwind CSS
- ✅ Base de datos PostgreSQL con Prisma
- ✅ Preparado para despliegue en Vercel

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