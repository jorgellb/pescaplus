import { enumerar, precioEnTexto, recortarPorPalabras, TITULO_MAX, DESCRIPCION_MAX } from '@/lib/seo-producto'

/**
 * SEO de las páginas de tipo (subcategoría): /categories/canas/spinning…
 *
 * Son las páginas que la gente busca con intención de compra («cañas de
 * spinning», «carretes de surfcasting», «vinilos»), y eran las más pobres del
 * sitio: H1 «Trenzado», título «Trenzado · Líneas de pesca» sin marca, una
 * frase de plantilla y la rejilla. Aquí van el nombre completo de cada tipo, una
 * guía corta escrita para cada uno y el título y la descripción con datos
 * reales (cuántos modelos hay y desde qué precio).
 *
 * El admin puede escribir su propio texto y sus metas por tipo: si lo hace,
 * manda el suyo. Esto es lo que se ve mientras tanto.
 */

export interface TipoSeo {
  /** Cómo lo busca la gente: «Cañas de spinning», no «Spinning». */
  nombre: string
  /** Guía corta: qué es, para qué sirve y cómo elegir. */
  guia: string
  /** Técnica de lib/enlazado.ts cuyas especies enlazar, si el tipo tiene una. */
  tecnica?: string
}

export const TIPOS_SEO: Record<string, TipoSeo> = {
  'anzuelos/simples': {
    nombre: 'Anzuelos simples',
    guia: 'El anzuelo simple es el de toda la vida: una sola punta para cebo natural (gusana, gamba, sardina) o para montar un vinilo. Se elige por número, y cuanto más alto, más pequeño: los /0 (1/0, 2/0…) son los grandes. Adáptalo a la boca de la especie y al tamaño del cebo, y en el mar elige acero con tratamiento anticorrosión.',
  },
  'anzuelos/triples': {
    nombre: 'Anzuelos triples',
    guia: 'Los triples son los anzuelos de tres puntas que llevan los señuelos duros: minnows, poppers y cucharillas. Cambiarlos cuando pierden filo o se oxidan es la mejora más barata de un señuelo. Elígelos del mismo número que los originales, o uno menor si el señuelo pierde acción.',
  },
  'anzuelos/montaje': {
    nombre: 'Anzuelos para montajes y carpa',
    guia: 'Anzuelos pensados para montajes concretos: los de carpfishing con ojal girado para el montaje al pelo, los de vástago largo para gusana y los offset para montar vinilos a la texana. Cada diseño resuelve un problema: que el pez no lo note, que no se enganche o que el cebo no se suelte.',
  },
  'anzuelos/especiales': {
    nombre: 'Anzuelos especiales',
    guia: 'Los anzuelos que no caben en las demás categorías: circulares, con muelle cebador, magnéticos o con cabeza plomada. Cada uno está pensado para una técnica concreta, así que mira bien para qué sirve antes de elegir.',
  },
  'lineas/trenzado': {
    nombre: 'Líneas trenzadas (PE)',
    guia: 'El trenzado no estira: transmite cada toque y, a igual resistencia, es mucho más fino que el nailon, así que lanza más lejos. Es la línea del spinning, el jigging y el eging. Su punto débil es el roce y que se ve en el agua, por eso casi siempre se remata con un bajo de fluorocarbono unido con un nudo FG o Albright.',
  },
  'lineas/monofilamento': {
    nombre: 'Líneas de monofilamento',
    guia: 'El monofilamento (nailon) estira, y eso es una ventaja a fondo o con flotador: amortigua los tirones y perdona errores. Es barato, fácil de anudar y aguanta bien el roce. En surfcasting se usa como línea madre y, en diámetros gruesos, como cola de rata para el lance.',
  },
  'lineas/fluorocarbono': {
    nombre: 'Líneas de fluorocarbono',
    guia: 'El fluorocarbono casi no se ve bajo el agua y aguanta el roce mejor que el nailon: por eso es el material de los bajos de línea. Es más rígido y se hunde, lo que ayuda a pescar a fondo. Con agua clara y peces desconfiados, como la dorada o la lubina, marca la diferencia.',
  },
  'senuelos/vinilos': {
    nombre: 'Vinilos y cebos blandos',
    guia: 'Los vinilos imitan peces, gusanos o cangrejos con un cuerpo blando que el pez retiene un instante más antes de soltarlo. Con cabeza plomada se pesca toda la columna de agua: cuanto más peso, más rápido baja. Son baratos, así que conviene llevar varios colores y tamaños.',
  },
  'senuelos/duros': {
    nombre: 'Señuelos duros: minnow y crankbait',
    guia: 'Minnows, jerkbaits y crankbaits son señuelos rígidos que nadan solos al recogerlos. La paleta decide a qué profundidad trabajan: corta para ir arriba, larga para bajar. Son los señuelos clásicos del spinning a lubina, black bass y lucio.',
    tecnica: 'spinning',
  },
  'senuelos/cucharillas': {
    nombre: 'Cucharillas y jigs metálicos',
    guia: 'Las cucharillas giran y vibran con poca velocidad de recogida: es el señuelo de la trucha y del spinning ligero. Los jigs de metal pesan mucho para su tamaño, lanzan lejísimos y bajan rápido, así que sirven para buscar peces lejos o profundos, desde la orilla o en vertical desde barco.',
    tecnica: 'jigging',
  },
  'senuelos/superficie': {
    nombre: 'Señuelos de superficie',
    guia: 'Poppers, paseantes y stickbaits trabajan en la superficie: el ataque se ve, y es lo más emocionante de la pesca con señuelo. Funcionan sobre todo con poca luz y con peces cazando arriba, como la lubina, la anjova o el palometón.',
    tecnica: 'superficie',
  },
  'canas/spinning': {
    nombre: 'Cañas de spinning',
    guia: 'Las cañas de spinning son para lanzar y recoger señuelos. Se eligen por longitud y por peso de lance: de 1,80 a 2,40 m para río y embarcación, y de 2,70 a 3,30 m para lanzar desde la orilla del mar. Respeta el rango de gramos que marca la caña: por debajo no carga y por encima se puede romper.',
    tecnica: 'spinning',
  },
  'canas/mar': {
    nombre: 'Cañas de mar y surfcasting',
    guia: 'Las cañas de surfcasting son largas, de 3,90 a 4,50 m, para lanzar lejos un plomo desde la playa y mantener la línea por encima de las olas. Las de mar más cortas sirven para pescar a fondo desde roca o espigón. Fíjate en el peso de lance: en la playa se trabaja con plomos de 100 a 200 g.',
    tecnica: 'surfcasting',
  },
  'canas/telescopicas': {
    nombre: 'Cañas telescópicas',
    guia: 'Las telescópicas se recogen dentro de sí mismas y caben en una mochila o en el maletero: son la caña para llevar siempre encima. A cambio, son algo menos sensibles que las de tramos. Para empezar o para viajar, son la opción más práctica.',
  },
  'canas/baitcasting': {
    nombre: 'Cañas de baitcasting y otras',
    guia: 'Las cañas de baitcasting llevan el carrete encima y las anillas hacia arriba: más precisión y fuerza para señuelos pesados y para sacar peces de entre la vegetación. Aquí van también otras cañas especiales.',
  },
  'carretes/spinning': {
    nombre: 'Carretes de spinning',
    guia: 'El carrete de spinning (frontal) es el más versátil: lanza fácil y casi no se enreda. El tamaño marca el uso: 1000-2500 para pesca ligera y trucha, 3000-4000 para spinning en el mar, y de 5000 en adelante para piezas grandes. Mira que el freno sea progresivo y que la bobina admita la línea que vas a usar.',
    tecnica: 'spinning',
  },
  'carretes/baitcasting': {
    nombre: 'Carretes de baitcasting',
    guia: 'El carrete de baitcasting va encima de la caña y su bobina gira al lanzar: más precisión y fuerza, pero pide práctica para que no se enrede. Es el carrete del black bass y de los señuelos pesados. Un buen freno magnético o centrífugo facilita mucho el aprendizaje.',
  },
  'carretes/mar': {
    nombre: 'Carretes de surfcasting y mar',
    guia: 'Los carretes de surfcasting tienen la bobina larga y cónica para que la línea salga sin rozar en los lances largos, y tamaños grandes, de 5000 en adelante. Para el mar, que aguanten la corrosión, y enjuágalos con agua dulce después de cada jornada.',
    tecnica: 'surfcasting',
  },
  'electronica/sondas': {
    nombre: 'Sondas y GPS de pesca',
    guia: 'Una sonda enseña la profundidad, el tipo de fondo y los peces bajo la embarcación o el kayak. Las portátiles e inalámbricas se lanzan desde la orilla y se leen en el móvil. Con GPS puedes guardar los puntos donde has pescado para volver.',
  },
  'electronica/camaras': {
    nombre: 'Cámaras de pesca',
    guia: 'Las cámaras submarinas enseñan lo que la sonda solo dibuja: si hay peces, de qué especie y cómo reaccionan al cebo. Se bajan con su propio cable y se ven en una pantalla o en el móvil.',
  },
  'electronica/accesorios': {
    nombre: 'Accesorios electrónicos de pesca',
    guia: 'Linternas frontales, luces de atracción, alarmas de picada, baterías y cargadores: lo que hace falta para pescar de noche o para alimentar la electrónica a bordo.',
  },
  'embarcaciones/floattube': {
    nombre: 'Float tubes',
    guia: 'El float tube es un flotador individual en el que vas sentado y te mueves con aletas: llega a donde no llega la orilla, sin barca ni amarre. Se usa sobre todo en embalses y lagos para black bass y lucio. Siempre con chaleco salvavidas.',
  },
  'embarcaciones/kayaks': {
    nombre: 'Kayaks y botes de pesca',
    guia: 'Kayaks y botes hinchables para pescar a flote: caben en el coche y te llevan a los puntos buenos lejos de la orilla. Antes de salir al mar, revisa la normativa de navegación de tu zona y lleva siempre chaleco.',
  },
  'embarcaciones/accesorios': {
    nombre: 'Accesorios náuticos de pesca',
    guia: 'Portacañas, anclas, remos y accesorios para equipar el kayak o la embarcación de pesca.',
  },
  'minuteria/emerillones': {
    nombre: 'Emerillones y giratorios',
    guia: 'Los emerillones (giratorios) unen la línea madre con el bajo y evitan que la línea se retuerza cuando gira el señuelo o el cebo. Los de rodamiento giran mejor bajo carga. Elige uno con más resistencia que tu línea: así, si algo rompe, no es el emerillón.',
  },
  'minuteria/conectores': {
    nombre: 'Grapas y conectores de pesca',
    guia: 'Las grapas permiten cambiar de señuelo en segundos sin volver a anudar. Las de tipo coastlock son de las más seguras. Como con los emerillones, que su resistencia supere la de la línea.',
  },
  'minuteria/montaje': {
    nombre: 'Perlas, gomas y piezas de montaje',
    guia: 'Perlas, topes, gomas y tubos antienredo: piezas pequeñas que protegen los nudos, separan los anzuelos del plomo y hacen que un bajo de surfcasting funcione.',
  },
  'minuteria/kits': {
    nombre: 'Kits de montaje de pesca',
    guia: 'Cajas con anzuelos, emerillones, grapas, plomos y perlas surtidos: la forma más barata de empezar o de reponer todo de una vez.',
  },
  'plomos/fondo': {
    nombre: 'Plomos de fondo y surfcasting',
    guia: 'Los plomos de fondo llevan el cebo al suelo y lo mantienen ahí. Con corriente, los de garras o pirámide agarran mejor; en fondos limpios y mar en calma, los de pera o bala bastan. El peso depende del mar y de la caña.',
    tecnica: 'surfcasting',
  },
  'plomos/jig': {
    nombre: 'Jigs de plomo y lastres',
    guia: 'Jigs de plomo, cabezas plomadas y lastres para bajar señuelos y cebos a la profundidad buscada. En jigging, el peso depende de la profundidad y de la corriente: más fondo o más corriente, más gramos.',
    tecnica: 'jigging',
  },
  'plomos/especiales': {
    nombre: 'Plomos especiales',
    guia: 'Plomos con formas pensadas para técnicas concretas: correderos, de oliva, de drop shot, de carpfishing o con clip para lanzar.',
  },
  'herramientas/alicates': {
    nombre: 'Alicates y pinzas de pesca',
    guia: 'Unos alicates de pesca sirven para desanzuelar sin tocar la boca del pez, abrir anillas partidas y cortar trenzado. Las pinzas de agarre sujetan el pez sin dañarlo. Si pescas en el mar, mejor de aluminio o acero inoxidable.',
  },
  'herramientas/corte': {
    nombre: 'Tijeras y cortahilos de pesca',
    guia: 'El trenzado no se corta con cualquier cosa: hacen falta tijeras con filo microdentado o un cortahilos específico. Con un retráctil colgado del chaleco las tienes siempre a mano.',
  },
  'herramientas/otras': {
    nombre: 'Medición y otras herramientas de pesca',
    guia: 'Básculas, cintas y reglas para medir las capturas, imprescindibles para respetar las tallas mínimas, y otras herramientas útiles en la jornada.',
  },
  'equipo/almacenaje': {
    nombre: 'Cajas y bolsas de pesca',
    guia: 'Cajas con separadores para señuelos y minutería, bolsas impermeables y fundas de cañas y carretes: lo que mantiene el equipo ordenado, seco y listo para salir.',
  },
  'equipo/vestuario': {
    nombre: 'Guantes y ropa de pesca',
    guia: 'Guantes que protegen del sol y de las espinas sin perder tacto, gorras, bragas de cuello y ropa técnica para pasar el día en el agua.',
  },
  'equipo/accesorios': {
    nombre: 'Accesorios de pesca',
    guia: 'Portacañas, soportes, sillas, rederos y el resto de accesorios que hacen más cómoda la jornada.',
  },
}

export function tipoSeo(categoria: string, sub: string): TipoSeo | null {
  return TIPOS_SEO[`${categoria}/${sub}`] ?? null
}

/** El nombre completo de un tipo; si es nuevo (creado en el admin), se compone. */
export function nombreDeTipo(categoria: string, sub: { id: string; name: string }, nombreCategoria: string): string {
  return tipoSeo(categoria, sub.id)?.nombre ?? `${nombreCategoria}: ${sub.name.toLowerCase()}`
}

const MARCA = ' · PescaPlus'

/**
 * «12 modelos desde 2,99 €, ordenados por valoraciones y ventas», o con uno solo
 * «1 modelo, a 71,53 €»: con un único producto, ni «desde» ni «ordenados».
 */
export function resumenDeTipo(modelos: number, desde: number | null): string {
  const precio = desde ? precioEnTexto(desde, 'EUR') : null
  if (modelos === 1) return `1 modelo${precio ? `, a ${precio}` : ''}`
  return `${modelos} modelos${precio ? ` desde ${precio}` : ''}, ordenados por valoraciones y ventas`
}

/**
 * El título de la página de un tipo: el primero de estos que quepa en 60
 * caracteres. Con datos («12 modelos desde 2,99 €») el resultado de Google dice
 * algo que los de la competencia no dicen.
 */
export function tituloDeTipo(nombre: string, modelos: number, desde: number | null): string {
  const unidad = modelos === 1 ? 'modelo' : 'modelos'
  const sep = nombre.includes(':') ? ' ·' : ':'
  const precio = desde ? precioEnTexto(desde, 'EUR') : null
  const conPrecio = `${nombre}${sep} ${modelos} ${unidad} ${modelos === 1 ? 'a' : 'desde'} ${precio}`
  const opciones = [
    ...(precio ? [`${conPrecio}${MARCA}`, conPrecio] : []),
    `${nombre}${sep} ${modelos} ${unidad}${MARCA}`,
    `${nombre}${MARCA}`,
  ]
  return opciones.find((t) => t.length <= TITULO_MAX) ?? recortarPorPalabras(nombre, TITULO_MAX)
}

/** La meta descripción de un tipo, con datos y frases enteras. */
export function descripcionDeTipo(nombre: string, modelos: number, desde: number | null, destacados: string[]): string {
  // «Los más elegidos» y «compara» solo tienen sentido con dos o más.
  const frases = [
    `${nombre}: ${resumenDeTipo(modelos, desde)}.`,
    ...(modelos > 1 && destacados.length > 1 ? [`Los más elegidos: ${enumerar(destacados.map((d) => recortarPorPalabras(d, 38)))}.`] : []),
    ...(modelos > 1 ? ['Compara y elige el tuyo.'] : []),
  ]
  let salida = ''
  for (const f of frases) {
    const junta = salida ? `${salida} ${f}` : f
    if (junta.length > DESCRIPCION_MAX) continue
    salida = junta
  }
  return salida || recortarPorPalabras(frases[0], DESCRIPCION_MAX)
}
