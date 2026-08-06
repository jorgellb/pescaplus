/**
 * Fotos de acción: el pez entrando al señuelo, no el pez posando.
 *
 * Van aparte de `sp.images` a propósito. Aquéllas son retratos y sirven de
 * portada en la rejilla de /especies; éstas ilustran un gesto concreto de pesca,
 * así que su sitio es junto a «Cómo pescarla» y siempre con pie de foto. Una
 * foto de acción sin explicar qué se está viendo es decoración; con el pie,
 * enseña el aparejo.
 *
 * Regla al añadir una: el pie NO puede contradecir lo que ya dice la guía de esa
 * especie ni su ficha técnica. Si la guía manda cebo a fondo y la foto enseña
 * spinning, sobra una de las dos.
 */
export interface CareBlock {
  title: string
  /** Por qué pasa el problema. Sin esto, la lista son reglas a ciegas. */
  intro: string
  items: { t: string; d: string }[]
}

export interface ActionShot {
  /** Ruta en /public. */
  src: string
  /** Descripción de lo que se ve, para quien no puede ver la foto. */
  alt: string
  /** Qué está pasando y por qué importa. Es contenido, no epígrafe. */
  caption: string
  /**
   * La forma de la foto manda la maqueta, no al revés.
   *
   * - `cabecera`: apaisada (16:9). Encabeza la tarjeta «Cómo pescarla».
   * - `panel`: vertical (4:5). Sección propia a ancho completo, con la foto a un
   *   lado y el texto al otro. Se usa cuando la verticalidad ES el contenido —el
   *   sabiki del jurel enseña la línea madre entera de arriba abajo, y recortarlo
   *   a apaisado se cargaría justo lo que hay que ver.
   */
  layout: 'cabecera' | 'panel'
  /** Solo en `panel`: titular de la sección. */
  heading?: string
  /** Solo en `panel`: por qué el aparejo funciona. */
  why?: string
  /** Solo en `panel`: cómo no estropearlo. */
  care?: CareBlock
}

export const ACTION_SHOTS: Record<string, ActionShot> = {
  pargos: {
    src: '/imagenesPeces/pargo_senuelo_atacando.jpg',
    alt: 'Un pargo con la boca abierta a punto de morder un señuelo de cabeza plomada y falda roja, bajo el agua y sobre un fondo rocoso',
    caption:
      'Un pargo entrando de frente a un kabura. Es justo el momento que persigue el jigging lento: la falda y el vinilo abiertos durante la caída, y el pez atacando casi parado sobre el veril. Los anzuelos asistidos van cortos y montados en la cabeza del señuelo — por eso clavan en el labio en lugar de engancharse en la roca.',
    layout: 'cabecera',
  },

  jurel: {
    src: '/imagenesPeces/jureles_sabiki_web.jpg',
    alt: 'Un aparejo de sabiki desplegado en vertical bajo el agua, con seis plumillas escalonadas sobre la línea madre y un plomo al final, rodeado por un banco de jureles; uno de ellos ya ha mordido una de las plumillas',
    caption:
      'Un sabiki trabajando con el banco encima: seis plumillas escalonadas sobre la línea madre, el plomo abajo manteniéndola recta y tensa, y los jureles entrando desde todos los lados. Uno ya ha mordido. Ésta es exactamente la escena que busca el aparejo, y cuando pasa no sube uno: suben tres o cuatro a la vez.',
    layout: 'panel',
    heading: 'Por qué el sabiki puede con todo lo demás',
    why:
      'El jurel come en banco y por competencia: en cuanto uno se lanza, los de al lado van detrás. El sabiki juega con eso. Las plumillas imitan un puñado de alevines o quisquilla desperdigados, y al ir escalonadas cada 25-30 cm cubres metro y medio o dos de columna de agua de una sola bajada — que es la otra mitad del truco, porque el banco casi nunca está donde crees, y en vez de adivinar la profundidad la barres entera hasta que una plumilla encuentra el pescado. El tinsel y las perlitas rematan: con luz, ese destello es lo que dispara la agresividad. Con el banco encima no hay señuelo que lo iguale; el problema del sabiki nunca es que no pesque, es cómo lo dejas después.',
    care: {
      title: 'Cómo no acabar con un ovillo',
      intro:
        'Un sabiki son seis brazoladas finas colgando de una misma madre. Todo lo que las haga girar o perder tensión las trenza entre sí, y un sabiki trenzado no se desenreda: se tira. Casi todos los enredos salen de estos seis descuidos.',
      items: [
        {
          t: 'Sácalo tirando del plomo, nunca de golpe',
          d: 'Viene enrollado en su funda de cartón por una razón. Engancha el extremo del plomo, y ve soltando plumilla a plumilla dejando la funda puesta hasta la última. Sacarlo de un tirón es empezar ya con el aparejo cruzado.',
        },
        {
          t: 'El plomo, puesto antes de que toque el agua',
          d: 'Sin peso abajo la madre no se estira, las brazoladas se abrazan a ella y bajas con el ovillo hecho. Con corriente es mejor pasarse de gramos que quedarse corto: lo que mantiene esto ordenado es la tensión.',
        },
        {
          t: 'Tirones cortos y suaves, nunca un latigazo',
          d: 'Caída controlada y toques secos pero pequeños. Un tirón fuerte lanza las brazoladas hacia arriba, se cruzan entre ellas en el camino y de ahí sale la mitad de los enredos. La velocidad no aporta nada aquí.',
        },
        {
          t: 'No lo metas por las anillas',
          d: 'Recoge solo hasta que la primera plumilla llegue a la puntera y para. Pasar el aparejo por dentro de las anillas dobla los anzuelos y riza el fluorocarbono, y un fluorocarbono rizado ya se enreda solo por muy bien que lo manejes después.',
        },
        {
          t: 'Con varios peces, no lo dejes colgando',
          d: 'Un jurel en el aire gira sobre sí mismo y trenza su brazolada con la de al lado; con tres colgando a la vez es cuestión de segundos. Sube despacio, agarra la línea madre con la mano y ve descolgando de uno en uno sin soltar la tensión en ningún momento.',
        },
        {
          t: 'Guárdalo en su tubo, y jubílalo a tiempo',
          d: 'Suelto en la caja se engancha con todo lo que toca. Tubo de sabiki, o el propio cartón con los anzuelos clavados en orden. Y cuando las brazoladas empiecen a salir rizadas, tíralo: cuesta poco y te va a costar una mañana entera de nudos.',
        },
      ],
    },
  },
}

export function actionShot(speciesId: string): ActionShot | null {
  return ACTION_SHOTS[speciesId] ?? null
}
