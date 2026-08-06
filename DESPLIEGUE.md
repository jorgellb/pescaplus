# Desplegar PescaPlus en OCI con Coolify

Guía de la migración desde Vercel. El motivo del cambio está al final, en
«Por qué nos fuimos de Vercel» — conviene leerlo antes de tocar nada, porque
explica qué medir después.

## 1. La máquina en Oracle Cloud

**La que está en marcha:** Ubuntu 24.04, **x86_64, 2 núcleos, 11 GB de RAM**,
96 GB de disco. Sobra para este sitio: construye la imagen completa en unos
minutos y sirve sin despeinarse.

- La idea inicial era ARM (VM.Standard.A1.Flex), pero **la capacidad gratuita de
  ARM en OCI se agota constantemente** — la consola responde *«Out of capacity»*
  una y otra vez. No es un error del usuario. Si se quiere ARM, hay que insistir
  cambiando de dominio de disponibilidad o probar a otras horas; x86 se consigue
  al primer intento y para esta carga da igual.
- **Ojo con el tramo Always Free de ARM:** en junio de 2026 Oracle lo recortó de
  4 OCPU/24 GB a **2 OCPU/12 GB**.

**Swap: obligatorio.** La máquina viene con 0 B y `next build` con 2 núcleos
tiene picos de memoria; sin swap el kernel mata el proceso y el fallo aparece
como un error críptico a mitad de build:

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

**Red — el error clásico:** OCI bloquea por partida doble.
1. En la consola: VCN → Security List → abrir 80 y 443 de entrada.
2. **Dentro de la máquina**, Ubuntu trae iptables cerrado igualmente:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```
   Sin esto la web no responde y todo parece roto sin motivo.
3. **Y 443 también por UDP**, que es lo que casi nadie abre. Traefik anuncia
   HTTP/3 con `alt-svc: h3=":443"` y escucha en UDP, pero las reglas de OCI se
   crean por protocolo y lo normal es abrir solo TCP. El resultado no es un
   error claro: el navegador intenta QUIC, no le contesta nadie, espera y acaba
   cayendo a TCP. Funciona, pero perdiendo tiempo en cada visita.

   Se comprueba en un segundo:
   ```bash
   curl --http3-only -s -o /dev/null -w "%{http_code} %{http_version}\n" https://pescaplus.es/
   ```
   `200 3` es correcto; `000` significa que UDP 443 está cerrado. Entonces, o se
   abre en la Security List, o hay que quitar `--entrypoints.https.http3` del
   proxy para dejar de anunciar algo que no funciona.

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
>
> ⚠️ **Y `DATABASE_CA_CERT` en base64, no con `\n`.** Coolify inyecta las
> variables de construcción **reescribiendo el Dockerfile** (se nota en el log:
> el fichero pasa de 3,5 kB a 12,23 kB), y el parser de Dockerfile **se come las
> barras invertidas**:
>
> ```
> ENV X=inicio\nfinal      →      X vale "inicionfinal"
> ```
>
> Los 24 `\n` del certificado se convierten en una `n` pegada al base64, el PEM
> deja de ser válido, Node lo descarta **en silencio** y verifica contra el
> almacén del sistema — que no conoce a Aiven. El build muere con
> `Error opening a TLS connection: self-signed certificate in certificate chain`
> (`P1011`) al recoger los datos de `/categories/[category]/[subcategory]`, sin
> ninguna pista de que el problema sea el formato de una variable.
>
> Genera el valor así y pégalo tal cual:
>
> ```bash
> base64 -w0 ca.pem
> ```
>
> La app entiende las dos formas e incluso reconstruye el PEM destrozado
> (`lib/db-ca.ts`, con pruebas en `tests/db-ca.test.ts`), pero **el base64 es la
> forma que no puede romperse**, así que es la que hay que usar en cualquier
> panel de despliegue.

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

## 3 bis. El volumen de las fotos (si falta, se pierden)

Las fotos de los barcos ya **no** van a Vercel Blob: se guardan en el disco de la
máquina. Con eso desaparece la última atadura con Vercel.

En Coolify → *Storages*, monta un volumen persistente en:

```
/app/datos/fotos
```

**Si no lo montas, las fotos se escriben dentro del contenedor y el siguiente
despliegue se las lleva por delante — sin dar ningún error.** Por eso
`/api/salud` publica el estado del almacenamiento:

| Valor | Qué significa |
|---|---|
| `"fotos":"ok"` | volumen montado, las fotos sobreviven |
| `"fotos":"efimero"` | **se puede escribir, pero se perderá en el próximo despliegue** |
| `"fotos":"no-escribible"` | no hay dónde guardar; la subida se desactiva sola y el patrón puede pegar una URL |

Se detecta comparando el dispositivo de la carpeta con el de la raíz: un volumen
montado siempre es otro dispositivo.

## 3 ter. El volumen de la caché de imágenes (opcional, pero se nota)

Convertir una foto a AVIF cuesta **~2 s por imagen en este servidor**, y varias a
la vez se estorban: medido en producción, 8 en paralelo pasan de 2,0 s a 4,4-5,5 s
cada una. `/especies` tiene 29 fotos, así que una carga en frío se arrastra.

Next guarda el resultado en `.next/cache/images` y a partir de ahí sirve en 0,13 s
(`x-nextjs-cache: HIT`). El problema es que esa carpeta vive **dentro** del
contenedor: cada despliegue la borra y el primer visitante vuelve a pagarlo todo.

En Coolify → *Storages*, un volumen persistente en:

```
/app/.next/cache/images
```

Con eso la conversión se paga una vez en la vida de cada foto, no una vez por
despliegue. No es imprescindible —el sitio funciona igual— pero es la diferencia
entre que la primera visita tras cada despliegue tarde o no.

Relacionado: `minimumCacheTTL` está en un año en `next.config.ts` (por defecto son
4 horas). Si alguna vez cambias una foto, **cámbiale también el nombre**: la caché
se clava por URL y la vieja seguiría sirviéndose.

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

**Y el service worker: hay que subirle el número de versión.** Al cambiar de
alojamiento el sitio se reconstruye entero y *todos* los ficheros de
`/_next/static` cambian de nombre, así que quien ya había visitado la web se
queda con una copia guardada que pide ficheros inexistentes: **salen los menús y
no sale ni el cuerpo ni las imágenes**. Y no da ningún error — la web parece
rota solo para quien ya la conocía, que son justo los clientes que vuelven.

Se arregla subiendo `VERSION` y `PAGES` en `public/sw.js`: el evento `activate`
borra las cachés viejas en la siguiente visita, sin que nadie tenga que vaciar
nada a mano. **`TILES` y `SEABED` no se tocan**: son teselas del mapa y sondas
del fondo, que no dependen del alojamiento, y borrarlas deja sin carta náutica a
quien la lleve descargada para salir al mar.

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
OpenGraph cacheadas 24 h) siguen siendo buena idea. Con 2 núcleos hay margen,
pero conviene mirar `htop` la primera semana: el mismo trabajo que costaba 12 h
de CPU al mes en Vercel sigue ejecutándose, solo que ahora no se factura.
