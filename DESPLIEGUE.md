# Desplegar PescaPlus en OCI con Coolify

Guía de la migración desde Vercel. El motivo del cambio está al final, en
«Por qué nos fuimos de Vercel» — conviene leerlo antes de tocar nada, porque
explica qué medir después.

## 1. La máquina en Oracle Cloud

Tramo **Always Free**, forma **VM.Standard.A1.Flex** (ARM Ampere):
**4 OCPU y 24 GB de RAM**, más 200 GB de disco y 10 TB de salida al mes.

- **Imagen:** Ubuntu 22.04 o 24.04 (ARM).
- **Aviso realista:** la capacidad ARM gratuita de OCI se agota a menudo y la
  consola responde *«Out of capacity»*. No es un error tuyo. Se resuelve
  reintentando en otra zona de disponibilidad o a otra hora; hay quien tarda
  días. **Compruébalo ANTES de dar por hecha la migración.**
- Si no hay ARM, el plan B son las 2 VM AMD gratuitas (1/8 OCPU y 1 GB cada
  una), pero **1 GB de RAM no basta** para construir Next: habría que
  construir la imagen fuera y desplegar solo el contenedor.

**Red — el error clásico:** OCI bloquea por partida doble.
1. En la consola: VCN → Security List → abrir 80 y 443 de entrada.
2. **Dentro de la máquina**, Ubuntu trae iptables cerrado igualmente:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```
   Sin esto la web no responde y todo parece roto sin motivo.

## 2. Coolify

```bash
curl -fsSL https://coolify.io/install.sh | sudo bash
```

Entra en `http://IP:8000`, crea la cuenta y añade el repositorio de GitHub.

**Configuración del recurso:**
- Tipo: **Dockerfile** (está en la raíz del repo).
- Puerto expuesto: **3000**.
- Health check: **`/api/salud`** — devuelve el estado del proceso y, aparte, si
  la base de datos responde. Lee el comentario de esa ruta: la base de datos
  **no** tumba el health check a propósito.
- Dominio: `pescaplus.es`. Coolify saca el certificado con Let's Encrypt.

## 3. Variables de entorno

Todas en Coolify (pestaña *Environment Variables*). La lista completa y
comentada está en `.env.example`.

> ⚠️ **`DATABASE_URL` y `DATABASE_CA_CERT` hay que marcarlas también como
> «Build Variable»** en Coolify, no solo de ejecución. Sin ellas durante el
> build, las páginas de catálogo se hornean con el catálogo semilla (84
> productos) y se sirven así hasta que revaliden — hasta una hora después de
> cada despliegue. Comprobado en el servidor: sin la variable salían 9 señuelos;
> con ella, los 67 reales.

Las que **no pueden faltar**:

| Variable | Por qué |
|---|---|
| `DATABASE_URL` | Sin ella la tienda sirve el catálogo semilla de 84 productos como si fuera el real. Ya pasó. |
| `DATABASE_CA_CERT` | Verifica el certificado de Aiven. Sin ella conecta igual, pero sin verificar. |
| `NEXT_PUBLIC_APP_URL` | `https://pescaplus.es`. Alimenta sitemap, metadatos y enlaces de los correos. |
| `ADMIN_PASSWORD` | Sin ella queda la de desarrollo. |
| `ADMIN_SESSION_SECRET` | Firma la sesión del panel. |
| `CRON_SECRET` | Protege `/api/cron/*`. Sin ella esas rutas devuelven 401. |
| `GROQ_API_KEY` · `NVIDIA_API_KEY` · `OPENROUTER_API_KEY` | Tres cupos diarios independientes. Con los tres, el pulido SEO recorre el catálogo entero; con uno solo se planta. |

`BLOB_READ_WRITE_TOKEN` es la única atadura que queda a Vercel (subida de fotos
de los patrones). Funciona desde cualquier sitio con el token, y sin él la
subida se desactiva sola y se pueden pegar URLs.

## 4. Los crons (esto NO se migra solo)

En Vercel los declaraba `vercel.json`. **Fuera de Vercel ese fichero no hace
nada**: hay que recrearlos en Coolify → *Scheduled Tasks*.

| Cuándo | Qué | Cron |
|---|---|---|
| Lunes 04:00 | `/api/cron/refresh` — repasa precios y enlaces de AliExpress | `0 4 * * 1` |
| Diario 05:00 | `/api/cron/diario` — verificación + alertas por email | `0 5 * * *` |

Comando de cada tarea:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://pescaplus.es/api/cron/diario
```

**Compruébalo el primer día.** Si el cron no corre, las alertas por email dejan
de salir y nadie se entera: no hay ningún error visible en la web.

## 5. Poner Cloudflare por delante (recomendado, gratis)

OCI está en una sola región; Cloudflare por delante da caché en el borde,
certificado y protección, sin tocar el código. Importa especialmente para
`/img/*`, que sirve las más de mil imágenes del catálogo y ya manda cabeceras
de caché de un año — con Cloudflare delante dejan de llegar al servidor.

## 6. Comprobar tras el despliegue

```bash
curl -s https://pescaplus.es/api/salud                      # {"ok":true,"bd":"ok"}
curl -s https://pescaplus.es/categories/senuelos | grep -c '/products/'
```

Ese segundo número debe cuadrar con `prisma.product.count()`. **Si sale 84, la
base de datos no está llegando** y se está sirviendo el catálogo semilla — ver
`DATABASE_URL` arriba.

En `/admin/ajustes` la fila «Asistente IA» dice qué proveedores hay
configurados. Deben aparecer los tres.

## Por qué nos fuimos de Vercel

El plan pausó el despliegue con `402 DEPLOYMENT_DISABLED`. Del informe de uso,
una sola métrica se salió:

**Fluid Active CPU: 12 h 21 s frente a un cupo de 4 h.** Todo lo demás holgado
(invocaciones 427K/1M, transferencia 9,7 de 100 GB). Y esa métrica **no cuenta
la espera de red**: eran 12 horas de cálculo real.

El origen: `/mejores-horas/[spot]` se regeneraba cada 30 minutos × 195 zonas, y
cada render ejecuta 14 fuentes de datos y el cálculo solunar de 7 días. Un
rastreo del sitemap (197 zonas + 1.122 páginas de la malla especie×zona) dispara
cientos de miles de regeneraciones al mes.

En un servidor propio ese trabajo **ya no se factura**, que es justo el motivo
del cambio. Pero sigue costando CPU real, y ahora la CPU es finita y es tuya:
los recortes que se hicieron antes de migrar (revalidate a 1 hora, imágenes
OpenGraph cacheadas 24 h) siguen siendo buena idea. Con 4 núcleos ARM hay
margen de sobra, pero conviene mirar `htop` la primera semana.
