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
   * Solo en `panel`: la proporción REAL de la foto, y de ahí sale la maqueta.
   *
   * Se anota el ratio y no un «vertical/apaisada» porque encajar a la fuerza una
   * foto de 4:3 en un hueco de 16:9 le corta un cuarto — y en estas fotos lo que
   * se recorta suele ser justo el aparejo.
   *
   * - `4/5` (vertical): va a un lado y el texto al otro. Se usa cuando la
   *   verticalidad ES el contenido — el sabiki del jurel enseña la línea madre
   *   entera de arriba abajo.
   * - `16/9` y `4/3` (apaisadas): la foto va arriba a todo el ancho y el texto
   *   debajo. De lado medirían 190 px de alto y no se vería nada.
   */
  ratio?: '16/9' | '4/3' | '4/5'
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
      ratio: '16/9',
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

  lubina: [
    {
      src: '/imagenesPeces/lubina_senuelo_web.jpg',
      alt: 'Una lubina con la boca completamente abierta engullendo un pecesillo de vinilo translúcido montado en cabeza plomada, bajo el agua sobre un fondo de rocas con algas',
      caption:
        'La lubina no muerde el vinilo: lo succiona. Ahí está el momento exacto, con la boca abierta del todo y el señuelo entrando de frente. Es un vinilo fino y translúcido en cabeza plomada ligera, sobre roca con alga y a poca profundidad — el escenario de siempre.',
      layout: 'panel',
      ratio: '4/3',
      heading: 'Vinilos: el señuelo que se adapta a la lubina, y no al revés',
      why: [
        'La lubina de costa vive del lanzón, la aguja y el chanquete: peces finos, alargados y casi transparentes. Un vinilo delgado como el de la foto no se parece a esa presa, es esa presa. Por eso funciona incluso cuando el agua está clara y plana, que es cuando la lubina se vuelve desconfiada y deja de entrar a lo demás.',
        'Pero la ventaja de verdad es la cabeza plomada. Un paseante trabaja arriba y un jerkbait a su profundidad y punto; con el mismo vinilo, cambiando de 5 a 20 gramos pasas de rascar la superficie a peinar el fondo. Un solo señuelo cubre toda la columna de agua, y eso importa porque la lubina no está siempre a la misma altura: al amanecer caza arriba y con el sol alto se descuelga.',
        'Además es blando, y ése es el detalle que más peces mete en el copo. Un señuelo rígido lo escupe en cuanto lo nota; el vinilo lo retiene un instante más, y ese instante es el que te da tiempo a clavar. A eso se suma que la pala trabaja a velocidades ridículas — justo la recuperación lenta que pide esta especie.',
        'Y son baratos. Diez colores y tres tamaños caben en un bolsillo por lo que cuesta un jerkbait, así que puedes probar hasta dar con lo que quieren ese día en vez de insistir con lo único que llevas.',
      ],
      care: {
        title: 'Los cuatro fallos que lo estropean',
        intro:
          'Un vinilo pesca solo si se mueve bien, y se mueve bien por muy poco: casi todo lo que falla está en cómo lo montas, no en el color que elegiste.',
        items: [
          {
            t: 'Ensártalo recto o no pesca',
            d: 'Apoya el anzuelo a lo largo del cuerpo y mira por dónde tiene que salir ANTES de pinchar. Un vinilo torcido gira sobre sí mismo, riza la línea y la lubina ni se acerca — y desde arriba no se nota, así que lo achacas al día.',
          },
          {
            t: 'Elige el plomo por profundidad, no por distancia',
            d: 'Es el fallo más común: se monta el más pesado porque llega más lejos, y entonces el señuelo va arrastrando por el fondo o pasa demasiado rápido. Primero decides a qué altura está el pez, y luego el peso que lo deja ahí.',
          },
          {
            t: 'Más despacio de lo que crees',
            d: 'La pala de un shad ya trabaja a velocidad de paseo. Recupera lento, deja que la ola haga parte del trabajo y mete alguna caída muerta: la mayoría de las picadas llegan cuando el vinilo baja, no cuando tira.',
          },
          {
            t: 'Cámbialo en cuanto se rasgue',
            d: 'Un vinilo con el lomo abierto o el rabo mordido pierde la acción entera. Cuesta céntimos y te está costando la sesión; y si vas a pescar entre roca, monta anzuelo offset al estilo texano y te ahorras la mitad de los enganches.',
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
      ratio: '4/5',
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
