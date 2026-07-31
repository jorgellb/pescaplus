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

# El build hace `prisma generate`, así que el cliente queda dentro de la imagen.
#
# NO se pasa DATABASE_URL a propósito: durante el prerender, este proyecto ya ha
# tropezado con el límite de conexiones de Aiven al abrir muchas en paralelo. Sin
# la variable, las páginas que consultan datos se generan bajo demanda al
# arrancar, que es lo que queremos en un servidor propio (no se paga por render).
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

USER nextjs
EXPOSE 3000

# Coolify (y cualquier orquestador) usa esto para saber si el contenedor está
# vivo antes de mandarle tráfico.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
