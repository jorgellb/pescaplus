# Copia de seguridad

Un backup completo de PescaPlus son **cuatro piezas**, y viven en cuatro sitios
distintos. Copiar solo la base de datos es el error clásico: se restaura y las
fotos de los barcos han desaparecido.

| Pieza | Dónde vive | ¿Cubierta? |
|---|---|---|
| Código | GitHub (`origin main`) | Sí, con cada push |
| Base de datos | Aiven Postgres | `npx tsx scripts/backup.ts` |
| Fotos de los patrones | volumen `/app/datos/fotos` del servidor | **No. Hay que hacerlo a mano** |
| Variables de entorno | Coolify | **No. Hay que hacerlo a mano** |

---

## 1. Base de datos

```bash
npx tsx scripts/backup.ts              # a copias/AAAA-MM-DD-HHMM/
npx tsx scripts/backup.ts /ruta/que/sea
```

Deja un `.ndjson.gz` por tabla y un `manifiesto.json` con la fecha, el número de
filas y **el commit exacto** — que es lo que dice qué `prisma/schema.prisma` toca
para restaurarla.

No usa `pg_dump` a propósito: no está instalado y además su versión tiene que
coincidir con la del servidor, que es la forma más habitual de descubrir que tu
copia no servía. Esto solo usa el cliente `pg` que ya trae la aplicación.

Al terminar **vuelve a abrir todo lo que ha escrito** y cuenta las filas de
verdad. Si no cuadran, falla. Una copia que nunca se ha abierto no es una copia,
es un fichero.

Referencia de tamaño: 6.630 filas en 29 tablas ocupan unos 23 MB comprimidos, y
casi todo es `NauticalPoi` y `ProtectedArea`.

`copias/` está en `.gitignore`, y tiene que seguir estándolo: ahí dentro van
`User`, `Session`, `LoginToken` y `ContactMessage`. Son datos personales y
credenciales de sesión.

**Aiven hace además sus propias copias automáticas**, pero la retención depende
del plan contratado y no cubre un borrado que se replique. Ésta es tu copia, la
que tú controlas.

## 2. Fotos de los patrones

Viven en un volumen de Docker, así que ni el código ni la base de datos las
tienen. Desde el servidor:

```bash
docker volume ls                       # localiza el volumen de /app/datos/fotos
docker run --rm -v NOMBRE_DEL_VOLUMEN:/v -v "$PWD":/salida alpine \
  tar czf /salida/fotos-$(date +%F).tar.gz -C /v .
```

Para comprobar que la copia no está vacía antes de fiarte:

```bash
tar tzf fotos-$(date +%F).tar.gz | head
```

Si `/api/salud` dice `"fotos":"efimero"`, no hay volumen montado y esas fotos ya
se están perdiendo en cada despliegue: eso se arregla antes de pensar en copias.

## 3. Variables de entorno

En Coolify → *Environment Variables*. Cópialas a un gestor de contraseñas, **no
a un fichero suelto ni al repositorio**: ahí están `DATABASE_URL`,
`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `CRON_SECRET` y las claves de
OpenRouter, AEMET y AliExpress.

Sin ellas, un servidor nuevo no arranca aunque tengas el código y los datos.

## 4. Código

Ya está en GitHub con cada push. Dos avisos:

- El `.env` local **no** está en el repositorio (ni debe estarlo). Es la misma
  información del punto 3.
- La carpeta `.github/` se excluye de los commits a propósito, así que si algún
  día hay flujos de trabajo ahí, no están respaldados por git.

---

## Cómo restaurar

1. Base de datos vacía, con PostGIS: `CREATE EXTENSION IF NOT EXISTS postgis;`
2. Ponte en el commit que dice el manifiesto y crea el esquema:
   `git checkout <commit>` y `npx prisma db push`.
3. Vuelve a insertar las filas de cada `.ndjson.gz`, **en orden de dependencias**
   (primero `User`, `Product`, `Operator`; después lo que les apunta con clave
   ajena). Las columnas de PostGIS salieron como texto EWKT y vuelven a entrar
   con un cast: `ST_GeomFromEWKT($1)`.
4. Restaura el volumen de fotos y las variables de entorno.
5. Comprueba con `/api/salud`: `bd`, `fotos` e `imagenes`.

El paso 3 **no está automatizado todavía**. Es la pieza que falta y conviene
escribirla con calma, no el día del incendio: un script de restauración se prueba
contra una base de datos de usar y tirar, nunca contra la buena.
