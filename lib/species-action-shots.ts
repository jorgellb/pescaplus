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
   * Dónde vive la foto.
   *
   * - `cabecera`: encabeza la tarjeta «Cómo pescarla». Solo una por especie, y
   *   solo apaisada: la tarjeta es estrecha.
   * - `panel`: sección propia a ancho completo, con titular y texto. Puede haber
   *   varias.
   */
  layout: 'cabecera' | 'panel'
  /**
   * Solo en `panel`: la forma de la foto manda la maqueta, no al revés.
   *
   * - `vertical` (4:5): la foto va a un lado y el texto al otro. Se usa cuando la
   *   verticalidad ES el contenido — el sabiki del jurel enseña la línea madre
   *   entera de arriba abajo, y recortarlo a apaisado se cargaría lo que hay que
   *   ver.
   * - `apaisada` (16:9): la foto va arriba a todo el ancho y el texto debajo. De
   *   lado mediría 190 px de alto y no se vería nada.
   */
  orientacion?: 'vertical' | 'apaisada'
  /** Solo en `panel`: titular de la sección. */
  heading?: string
  /**
   * Solo en `panel`: por qué el aparejo o el cebo funciona, en párrafos.
   *
   * Es una lista y no un texto suelto porque en un solo bloque salían diez
   * líneas seguidas sin respiro; partido se lee, y cada párrafo defiende una
   * sola idea.
   */
  why?: string[]
  /** Solo en `panel`: cómo no estropearlo. */
  care?: CareBlock
}

export const ACTION_SHOTS: Record<string, ActionShot[]> = {
  pargos: [
    {
      src: '/imagenesPeces/pargo_senuelo_atacando.jpg',
      alt: 'Un pargo con la boca abierta a punto de morder un señuelo de cabeza plomada y falda roja, bajo el agua y sobre un fondo rocoso',
      caption:
        'Un pargo entrando de frente a un kabura. Es justo el momento que persigue el jigging lento: la falda y el vinilo abiertos durante la caída, y el pez atacando casi parado sobre el veril. Los anzuelos asistidos van cortos y montados en la cabeza del señuelo — por eso clavan en el labio en lugar de engancharse en la roca.',
      layout: 'cabecera',
    },
    {
      src: '/imagenesPeces/pargo_calamar_web.jpg',
      alt: 'Un pargo grande con la boca abierta atacando por detrás a un calamar vivo montado en un aparejo con plomo corredizo; el calamar suelta una nube de tinta',
      caption:
        'El pargo entrando por detrás, a la altura del manto, y el calamar soltando tinta justo antes. El montaje es el de toda la vida: plomo corredizo por encima del emerillón, bajo largo de fluorocarbono y el cefalópodo enganchado de forma que siga nadando. Esa nube de tinta no lo esconde — lo delata.',
      layout: 'panel',
      orientacion: 'apaisada',
      heading: 'Calamar vivo: el cebo que elige el tamaño',
      why: [
        'Tres cosas se suman, y de ahí viene su fama. La primera es que selecciona. Un calamar entero es un bocado que la morralla no puede abarcar: las mojarras y los sargos pequeños que te dejan una sardina en la espina en veinte minutos aquí ni lo intentan. Lo que entra, entra grande — y eso es justo lo que se busca en un pez que convive con mucho pescado pequeño en los mismos veriles.',
        'La segunda es que aguanta. Un cefalópodo vivo resiste la bajada, la corriente y una hora larga de espera sin descomponerse, así que puedes dejarlo trabajando abajo el tiempo que haga falta. Y el pargo se pesca así: esperando a que pase.',
        'La tercera es el movimiento. Un calamar asustado nada a tirones y suelta tinta, como en la foto. Esa nube en el fondo no lo tapa: avisa de que hay una presa nerviosa, y es de las señales que más rápido levantan a un pargo del cantil.',
        'La sepia viva hace el mismo papel con dos matices: dura todavía más en el anzuelo y trabaja mejor pegada a la arena junto al veril, mientras que el calamar rinde algo más despegado del fondo.',
      ],
      care: {
        title: 'Cómo montarlo para que llegue vivo',
        intro:
          'Un cefalópodo muerto sigue pescando, pero deja de seleccionar: en cuanto se queda quieto, la morralla se atreve con él y vuelves a sacar cebo pelado. Casi todo el trabajo consiste en que baje entero y siga nadando.',
        items: [
          {
            t: 'Cógelo mojado y cógelo poco',
            d: 'Con las manos secas le arrancas la mucosa que lo protege y dura la mitad. Cubo con agua de mar y renuévala; del cubo al anzuelo directo, sin pasearlo por la cubierta.',
          },
          {
            t: 'El anzuelo, en la punta del manto',
            d: 'Un circle del 4/0 al 6/0 pinchado en el extremo del manto o entre los ojos, sin tocar vísceras. Así nada natural y no se apaga a los diez minutos, que es lo que pasa cuando se pincha por el centro.',
          },
          {
            t: 'Plomo corredizo, y el justo',
            d: 'Como en la foto: por encima del emerillón y corriendo libre. El suficiente para tocar fondo y ni un gramo más. Si lo clavas al plomo deja de nadar, y sin movimiento este cebo pierde media ventaja.',
          },
          {
            t: 'Bajo largo de fluorocarbono',
            d: 'Metro y medio o dos, del 0,50 al 0,70. Largo para que el calamar trabaje lejos del plomo, y fluorocarbono porque al pargo se le busca en agua clara y sobre fondo limpio.',
          },
          {
            t: 'No claves de golpe',
            d: 'Agarra y sale hacia la piedra. Con anzuelo circle deja que cargue y aplica presión progresiva: se coloca solo en la comisura. Un tirón seco a destiempo lo único que hace es sacarle el calamar de la boca.',
          },
          {
            t: 'El freno, puesto antes de soltar',
            d: 'La primera carrera va derecha a la roca, así que el freno se ajusta en cubierta, no con el pez corriendo. Si tienes que apretarlo sobre la marcha, ya llegas tarde.',
          },
        ],
      },
    },
  ],

  jurel: [
    {
      src: '/imagenesPeces/jureles_sabiki_web.jpg',
      alt: 'Un aparejo de sabiki desplegado en vertical bajo el agua, con seis plumillas escalonadas sobre la línea madre y un plomo al final, rodeado por un banco de jureles; uno de ellos ya ha mordido una de las plumillas',
      caption:
        'Un sabiki trabajando con el banco encima: seis plumillas escalonadas sobre la línea madre, el plomo abajo manteniéndola recta y tensa, y los jureles entrando desde todos los lados. Uno ya ha mordido. Ésta es exactamente la escena que busca el aparejo, y cuando pasa no sube uno: suben tres o cuatro a la vez.',
      layout: 'panel',
      orientacion: 'vertical',
      heading: 'Por qué el sabiki puede con todo lo demás',
      why: [
        'El jurel come en banco y por competencia: en cuanto uno se lanza, los de al lado van detrás. El sabiki juega con eso. Las plumillas imitan un puñado de alevines o quisquilla desperdigados, y el tinsel y las perlitas rematan — con luz, ese destello es lo que dispara la agresividad.',
        'La otra mitad del truco son los 25-30 cm que separan una plumilla de la siguiente: cubres metro y medio o dos de columna de agua de una sola bajada. El banco casi nunca está donde crees, y en vez de adivinar la profundidad la barres entera hasta que una plumilla encuentra el pescado.',
        'Con el banco encima no hay señuelo que lo iguale. El problema del sabiki nunca es que no pesque; es cómo lo dejas después.',
      ],
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
  ],
}

export function actionShots(speciesId: string): ActionShot[] {
  return ACTION_SHOTS[speciesId] ?? []
}
