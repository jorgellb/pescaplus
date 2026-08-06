# PescaPlus — imagen para autoalojamiento (OCI + Coolify).
#
# Multi-etapa para que la imagen final lleve solo lo necesario para servir:
# ni el código fuente, ni las dependencias de desarrollo, ni la caché de npm.
#
# Funciona igual en x86 y en ARM (Ampere A1, que es el tramo gratuito de OCI):
# no se fija plataforma en ningún FROM, así que se construye para la del host.

# ---------------------------------------------------------------------------
# 1) Dependencias
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
# Prisma necesita OpenSSL; sin él, el motor no arranca y el fallo aparece en
# tiempo de ejecución con un mensaje que no lo dice claro.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
# 2) Build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Telemetría de Next fuera: no queremos llamadas de salida desde el build.
ENV NEXT_TELEMETRY_DISABLED=1

# La base de datos SÍ hace falta durante el build, y esto no es opcional.
#
# Sin ella, `isDatabaseConfigured()` da false y las páginas de catálogo se
# hornean con el CATÁLOGO SEMILLA (84 productos de lib/catalog-data.ts) en lugar
# de los reales. Y como son ISR, ese HTML con el catálogo equivocado se sirve
# hasta que revalide — hasta una hora después de cada despliegue. Es exactamente
# el fallo que tuvo el sitio en Vercel durante días.
#
# Se pasa como ARG para que Coolify pueda inyectarla marcando la variable como
# "Build Variable". OJO: un ARG queda en el historial de la imagen, así que esta
# imagen NO debe publicarse en un registro público.
ARG DATABASE_URL
ARG DATABASE_CA_CERT
ENV DATABASE_URL=$DATABASE_URL
ENV DATABASE_CA_CERT=$DATABASE_CA_CERT

# Pool pequeño durante el build: el prerender abre páginas en paralelo y el plan
# de Aiven corta en 20 conexiones. Con 2 por worker no se llega al límite —
# `TooManyConnections` a mitad de build deja páginas horneadas con datos vacíos.
ENV DATABASE_POOL_MAX=2

RUN npm run build

# ---------------------------------------------------------------------------
# 3) Runtime
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sin privilegios: si alguien logra ejecutar algo dentro del
# contenedor, que no sea como root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# `output: standalone` deja en .next/standalone el servidor con SOLO las
# dependencias que usa. Pero NO incluye ni public/ ni .next/static: si se
# olvidan, el sitio arranca y se ve sin estilos ni imágenes.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Fotos de los barcos que suben los patrones. Van al disco del servidor desde
# que dejamos Vercel Blob.
#
# ESTA CARPETA TIENE QUE SER UN VOLUMEN. Se crea aquí para que exista y sea del
# usuario sin privilegios, pero si Coolify no monta un volumen encima, las fotos
# se escriben en el sistema de ficheros del contenedor y el siguiente despliegue
# se las lleva por delante SIN dar ningún error. /api/salud lo publica como
# `"fotos":"efimero"` precisamente para que se vea antes de perder nada.
ENV PHOTOS_DIR=/app/datos/fotos
RUN mkdir -p /app/datos/fotos && chown -R nextjs:nodejs /app/datos

# Caché de imágenes optimizadas. Aquí guarda Next el AVIF ya convertido, que en
# este servidor cuesta ~2 s por foto (y varias a la vez se estorban: 8 en
# paralelo pasan de 2,0 s a 4,4-5,5 s cada una).
#
# Se crea AQUÍ, vacía y con el dueño correcto, y esa es toda la gracia:
# `output: standalone` no copia `.next/cache`, así que la carpeta no existía en
# la imagen. Al montarle encima un volumen, Docker habría creado el punto de
# montaje como root y el usuario `nextjs` se habría quedado sin poder escribir
# —la caché no fallaría de forma visible, simplemente no guardaría nada y CADA
# visita reconvertiría las fotos—. Existiendo antes, el volumen hereda
# `nextjs:nodejs` y funciona.
#
# Sin volumen montado esto sigue valiendo; lo único que pasa es que cada
# despliegue borra la caché y la primera visita la regenera entera.
RUN mkdir -p /app/.next/cache/images && chown -R nextjs:nodejs /app/.next/cache

USER nextjs
EXPOSE 3000

# Coolify (y cualquier orquestador) usa esto para saber si el contenedor está
# vivo antes de mandarle tráfico.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
