/**
 * Nudos y montajes.
 *
 * El hueco de contenido más grande que tenía el sitio. Hay 44 fichas de especie
 * que dicen «bajo largo de fluorocarbono» o «montaje al pelo» y ni una sola
 * página que explique cómo se hace ninguna de las dos cosas.
 *
 * Es además el contenido que mejor convierte de todo lo que se puede escribir en
 * pesca: quien busca cómo empatar trenzado a fluorocarbono está a un paso de
 * comprar fluorocarbono. Y no caduca — un nudo palomar se hará igual dentro de
 * veinte años, al revés que la previsión, que vale para hoy.
 *
 * SOBRE LOS PASOS: van redactados para hacerse con las manos ocupadas y el móvil
 * apoyado en la nevera, con el mismo criterio que un manual de a bordo. Cada paso
 * dice UNA acción y termina en una comprobación de que ha salido bien, porque en
 * un nudo el error casi siempre está tres pasos antes de donde se nota.
 */

export type TipoFicha = 'nudo' | 'montaje'

export interface Ficha {
  id: string
  name: string
  /** Cómo lo llama la gente además de por su nombre: se busca por ahí. */
  alias: string[]
  tipo: TipoFicha
  /** Una línea: para qué sirve. Es lo que decide si sigues leyendo. */
  para: string
  /** 1 fácil · 2 requiere práctica · 3 hay que ensayarlo en casa. */
  dificultad: 1 | 2 | 3
  /**
   * Porcentaje de la resistencia de la línea que conserva el nudo.
   *
   * Se declara porque es el dato que nadie cuenta y el que explica las roturas:
   * un nudo mal elegido convierte un hilo de 10 kg en uno de 5 sin avisar.
   */
  resistencia: string
  /** Cuándo usarlo, con nombres de pesca real. */
  cuando: string
  pasos: { t: string; d: string }[]
  /** Los fallos que lo estropean. Casi todos los nudos fallan por lo mismo. */
  errores: string[]
  /** Categorías de la tienda con las que se relaciona. */
  gearCats: string[]
  /** Especies cuyas fichas lo mencionan, para enlazar en los dos sentidos. */
  especies?: string[]
}

export const FICHAS: Ficha[] = [
  {
    id: 'nudo-palomar',
    name: 'Nudo palomar',
    alias: ['palomar', 'palomar knot', 'nudo palomar anzuelo'],
    tipo: 'nudo',
    para: 'Atar un anzuelo, un emerillón o un señuelo con la máxima resistencia y en quince segundos.',
    dificultad: 1,
    resistencia: '95-100 % de la línea',
    cuando:
      'Es el nudo por defecto para casi todo, y sobre todo con trenzado, donde muchos otros patinan. Si solo vas a aprender un nudo en tu vida, aprende éste.',
    pasos: [
      { t: 'Dobla y pasa', d: 'Haz un bucle de unos 15 cm con la punta de la línea y pásalo entero por el ojal del anzuelo. Te quedan el bucle por un lado y las dos hebras por el otro.' },
      { t: 'Nudo simple', d: 'Con el bucle y las dos hebras juntas, haz un nudo simple corriente, sin apretar. Deja el bucle suelto y largo, que aún tiene que trabajar.' },
      { t: 'Pasa el anzuelo por el bucle', d: 'Coge el bucle que sobra y pásalo por encima del anzuelo entero, de la punta a la curva, hasta que quede por debajo. Éste es el paso que todo el mundo hace al revés la primera vez.' },
      { t: 'Moja y aprieta', d: 'Humedece el nudo con saliva o agua y tira a la vez de la línea madre y de la punta, despacio. El nudo baja y se cierra sobre el ojal.' },
      { t: 'Comprueba', d: 'Las vueltas deben quedar ordenadas y pegadas al ojal, sin cruces. Corta la punta a 2 mm. Si ves una vuelta montada sobre otra, córtalo y repítelo: ese cruce es por donde va a romper.' },
    ],
    errores: [
      'No mojarlo antes de apretar. El calor del rozamiento quema el hilo por dentro y lo deja a la mitad de su resistencia sin que se vea nada por fuera.',
      'Apretar de golpe. Hay que cerrarlo despacio para que las vueltas se coloquen; a tirón seco se montan unas sobre otras.',
      'Dejar la punta larga. Se engancha en todo y en trenzado hace ruido en las anillas.',
    ],
    gearCats: ['anzuelos', 'lineas'],
    especies: ['Dorada', 'Lubina', 'Sargo', 'Black bass'],
  },
  {
    id: 'nudo-clinch-mejorado',
    name: 'Clinch mejorado',
    alias: ['clinch', 'nudo clinch', 'improved clinch', 'nudo de pescador'],
    tipo: 'nudo',
    para: 'Atar anzuelo o emerillón con monofilamento y fluorocarbono. El clásico de toda la vida.',
    dificultad: 1,
    resistencia: '90-95 % con nailon; con trenzado NO se recomienda',
    cuando:
      'Con nailon y fluorocarbono va perfecto, y muchos lo prefieren al palomar porque deja el anzuelo con algo más de libertad. Con trenzado, mejor el palomar: el clinch resbala.',
    pasos: [
      { t: 'Pasa y enrolla', d: 'Pasa la punta por el ojal y dale 5 o 6 vueltas alrededor de la línea madre, subiendo. Con hilos gruesos bastan 4; con muy finos, 7.' },
      { t: 'Vuelve al primer hueco', d: 'Mete la punta por el hueco que queda justo encima del ojal, el que has dejado en la primera vuelta.' },
      { t: 'Y ahora la mejora', d: 'Pasa la punta también por el bucle grande que acabas de formar. Esto es lo que lo convierte en «mejorado» y lo que impide que se escurra.' },
      { t: 'Moja y cierra', d: 'Humedece y tira despacio de la madre mientras sujetas la punta. Las vueltas se aprietan en espiral ordenada hacia el ojal.' },
      { t: 'Comprueba', d: 'Debe verse una espiral limpia, sin vueltas montadas. Corta a 2 mm.' },
    ],
    errores: [
      'Olvidar el último paso. Sin pasar por el bucle grande es un clinch simple, y ése sí se escurre.',
      'Pocas vueltas con hilo fino: por debajo de cinco, resbala.',
      'Usarlo con trenzado. El trenzado es liso y este nudo necesita rozamiento.',
    ],
    gearCats: ['anzuelos', 'lineas'],
    especies: ['Dorada', 'Trucha común', 'Barbo'],
  },
  {
    id: 'nudo-fg',
    name: 'Nudo FG',
    alias: ['fg knot', 'nudo fg trenzado fluorocarbono', 'empalme trenzado'],
    tipo: 'nudo',
    para: 'Unir trenzado con fluorocarbono. Es el empalme más fino y más resistente que existe.',
    dificultad: 3,
    resistencia: '95-100 %, y pasa por las anillas casi sin notarse',
    cuando:
      'Siempre que lances con trenzado y quieras un bajo de fluorocarbono: spinning de lubina, black bass, jigging. Su gracia es el perfil — es tan fino que atraviesa las anillas sin golpear, así que puedes recoger el nudo dentro de la caña y seguir lanzando.',
    pasos: [
      { t: 'Tensa el trenzado', d: 'Necesitas el trenzado tenso para trabajar. Sujétalo con la boca o pásalo por la rodilla; sin tensión este nudo no sale.' },
      { t: 'Trenza alternando', d: 'Pasa el fluorocarbono por encima y por debajo del trenzado alternativamente, 18 o 20 veces. Cada pasada aprieta contra la anterior: es una trenza, no vueltas.' },
      { t: 'Media llave de seguridad', d: 'Con la punta del trenzado, haz dos medias llaves alrededor del fluorocarbono para fijar la trenza y que no se deshaga.' },
      { t: 'Remate', d: 'Tres o cuatro medias llaves más con el trenzado sobre las dos líneas juntas, para rematar.' },
      { t: 'Moja, aprieta y prueba', d: 'Humedece bien, tira fuerte de las dos líneas y corta las puntas. Y antes de pescar, PRUÉBALO: tira con las manos con toda tu fuerza. Un FG mal hecho no avisa, se abre con el primer pez bueno.' },
    ],
    errores: [
      'Poca tensión al trenzar. Es el fallo número uno: si el trenzado no está tenso, las vueltas no muerden y el nudo se abre.',
      'Pocas pasadas. Menos de dieciséis y se escurre con líneas de mucha diferencia de diámetro.',
      'No probarlo antes de pescar. Cuesta cinco segundos y te ahorra perder el pez de la temporada.',
    ],
    gearCats: ['lineas'],
    especies: ['Lubina', 'Black bass', 'Lecha (pez limón)'],
  },
  {
    id: 'nudo-albright',
    name: 'Nudo Albright',
    alias: ['albright', 'albright knot', 'unir dos lineas'],
    tipo: 'nudo',
    para: 'Unir dos líneas de grosor muy distinto. Es el FG del que no tiene paciencia.',
    dificultad: 2,
    resistencia: '85-90 %',
    cuando:
      'Cuando necesites empatar trenzado con fluorocarbono y no domines el FG, o cuando haga frío y con los dedos entumecidos no haya forma. Es más grueso que el FG y roza algo más en las anillas, pero se hace en un minuto y aguanta de sobra.',
    pasos: [
      { t: 'Bucle en el grueso', d: 'Haz un bucle con la línea gruesa (el fluorocarbono) y sujétalo entre los dedos.' },
      { t: 'Entra con la fina', d: 'Pasa la línea fina (el trenzado) por dentro de ese bucle, dejando unos 20 cm de punta para trabajar.' },
      { t: 'Diez vueltas hacia fuera', d: 'Enrolla la línea fina alrededor de las dos hebras del bucle, empezando por dentro y avanzando hacia el extremo. Diez o doce vueltas apretadas y ordenadas.' },
      { t: 'Sal por donde entraste', d: 'Mete la punta de la línea fina de vuelta por el bucle, entrando por el MISMO lado por el que entró al principio. Si sale por el otro, el nudo no aguanta.' },
      { t: 'Moja y aprieta', d: 'Humedece y tira de las cuatro puntas poco a poco para que las vueltas se compacten. Corta al ras.' },
    ],
    errores: [
      'Salir por el lado contrario. Es el error clásico y hace que se deshaga solo.',
      'Vueltas desordenadas, montadas unas sobre otras: pierde la mitad de la resistencia.',
      'No apretar en dos tiempos. Primero acomoda las vueltas, luego aprieta de verdad.',
    ],
    gearCats: ['lineas'],
    especies: ['Lubina', 'Lucio', 'Atún'],
  },
  {
    id: 'nudo-rapala',
    name: 'Nudo de bucle (Rapala)',
    alias: ['nudo rapala', 'loop knot', 'nudo de lazo', 'nudo para senuelos'],
    tipo: 'nudo',
    para: 'Atar un señuelo dejándole un bucle libre para que se mueva sin ataduras.',
    dificultad: 2,
    resistencia: '85-90 %',
    cuando:
      'Con minnows, jerkbaits, paseantes y cualquier señuelo cuya acción dependa de moverse. Atado en corto, el nudo bloquea el balanceo; con bucle, el señuelo trabaja como lo diseñaron. La diferencia se ve en el agua a simple vista.',
    pasos: [
      { t: 'Nudo simple flojo', d: 'Haz un nudo simple en la línea, a unos 15 cm de la punta, sin apretarlo. Déjalo abierto.' },
      { t: 'Pasa por el señuelo', d: 'Mete la punta por el ojal del señuelo y devuélvela por dentro del nudo simple que has dejado abierto.' },
      { t: 'Tres vueltas', d: 'Con esa punta, da tres vueltas alrededor de la línea madre, subiendo.' },
      { t: 'Vuelve al nudo simple', d: 'Mete la punta otra vez por dentro del nudo simple, en el mismo sentido en que salió.' },
      { t: 'Cierra midiendo el bucle', d: 'Antes de apretar, ajusta el tamaño del bucle: uno o dos centímetros basta. Humedece, aprieta despacio y corta.' },
    ],
    errores: [
      'Bucle demasiado grande. Se engancha en los anzuelos del propio señuelo en cada lance.',
      'Bucle demasiado pequeño: entonces no aporta nada y podías haber usado un palomar.',
      'Usarlo con señuelos que ya llevan anilla partida: ahí no hace falta, la anilla ya da libertad.',
    ],
    gearCats: ['senuelos', 'lineas'],
    especies: ['Lubina', 'Anjova (chova)', 'Lucio'],
  },
  {
    id: 'montaje-plomo-corredizo',
    name: 'Plomo corredizo',
    alias: ['plomo corredero', 'montaje corredizo', 'running ledger', 'aparejo de fondo'],
    tipo: 'montaje',
    para: 'Pescar a fondo dejando que el pez se lleve el cebo sin notar el peso del plomo.',
    dificultad: 1,
    resistencia: '—',
    cuando:
      'El montaje de fondo por excelencia: dorada, pargo, corvina, barbo, anguila. Su gracia es que la línea corre libre por dentro del plomo, así que cuando el pez coge el cebo y tira, no arrastra los cien gramos de plomo — y por eso no lo suelta.',
    pasos: [
      { t: 'Plomo primero', d: 'Pasa la línea madre por el orificio del plomo corredizo (o por su perlita/tubito guía). Que corra suelto de verdad: si roza, el montaje pierde todo el sentido.' },
      { t: 'Tope de goma', d: 'Ensarta una perla o un tope de goma por debajo del plomo. Protege el nudo del golpeteo, que si no acaba abriéndolo.' },
      { t: 'Emerillón', d: 'Ata el emerillón a la línea madre con un palomar. El emerillón hace de tope: el plomo no puede pasar de ahí.' },
      { t: 'Bajo largo', d: 'Al otro lado del emerillón, el bajo de fluorocarbono. Aquí manda la longitud: cuanto más largo, más natural va el cebo. Metro y medio o dos para dorada y pargo.' },
      { t: 'Anzuelo y comprueba', d: 'Anzuelo al final con palomar. Y antes de lanzar, tira de la línea con el plomo apoyado: debe deslizarse sin agarrarse.' },
    ],
    errores: [
      'El plomo justo, y ni un gramo más. Se pone el que aguanta la corriente, no el que llega más lejos: cuanto menos peso note el pez al chupar, más rato se queda.',
      'Bajo corto. Con el cebo pegado al plomo, el pez nota el peso enseguida y lo suelta.',
      'Olvidar la perla. El plomo golpea el nudo del emerillón cientos de veces por sesión y acaba rompiéndolo justo cuando pica algo grande.',
    ],
    gearCats: ['plomos', 'anzuelos', 'lineas'],
    especies: ['Dorada', 'Pargo', 'Corvina', 'Barbo'],
  },
  {
    id: 'montaje-al-pelo',
    name: 'Montaje al pelo',
    alias: ['hair rig', 'pelo', 'montaje carpfishing', 'boilie'],
    tipo: 'montaje',
    para: 'Presentar el cebo COLGANDO del anzuelo en vez de clavado en él, para que el anzuelo quede libre.',
    dificultad: 2,
    resistencia: '—',
    cuando:
      'Es la base del carpfishing moderno y funciona con boilies, maíz y pellets. La idea es astuta: la carpa succiona el cebo y, como el anzuelo va aparte y sin nada que lo tape, entra en la boca desnudo y se clava en el labio al escupir. Con el cebo ensartado en el anzuelo, la punta queda tapada y muchas veces no clava.',
    pasos: [
      { t: 'Deja un pelo', d: 'Al atar el anzuelo, deja un cabo de línea sobrante de 1 a 2 cm saliendo por detrás. Ése es el «pelo».' },
      { t: 'Bucle en la punta', d: 'Haz un bucle pequeño en el extremo del pelo. Ahí es donde irá sujeto el cebo.' },
      { t: 'Ensarta el cebo', d: 'Con una aguja de cebar, pasa el boilie o los granos de maíz y pásalos al bucle del pelo.' },
      { t: 'Fija con el stopper', d: 'Atraviesa el bucle con un tope de plástico (stopper) para que el cebo no se salga. Debe quedar a un par de milímetros del anzuelo, no pegado ni colgando lejos.' },
      { t: 'Comprueba la punta', d: 'La punta del anzuelo tiene que quedar totalmente libre y afilada. Pásala por la uña: si no engancha, cambia el anzuelo.' },
    ],
    errores: [
      'Pelo demasiado largo. El cebo se separa del anzuelo y la carpa lo coge sin llevarse el hierro.',
      'Pelo demasiado corto: el cebo tapa la punta y anula todo el invento.',
      'Anzuelo romo. En este montaje todo depende de que la punta entre sola al escupir; uno gastado no clava.',
    ],
    gearCats: ['anzuelos', 'lineas'],
    especies: ['Carpa', 'Barbo', 'Tenca'],
  },
  {
    id: 'montaje-texas',
    name: 'Montaje texano',
    alias: ['texas rig', 'texano', 'vinilo antienganche'],
    tipo: 'montaje',
    para: 'Pescar con vinilo entre ramas, piedras y vegetación sin engancharse en todo.',
    dificultad: 2,
    resistencia: '—',
    cuando:
      'Black bass entre estructura, lucio en el herbazal, y en general cualquier sitio donde un montaje normal te costaría un señuelo cada tres lances. La punta del anzuelo va escondida dentro del propio vinilo: pasa entre la maleza y solo asoma cuando el pez muerde y aplasta el cuerpo blando.',
    pasos: [
      { t: 'Plomo bala', d: 'Ensarta un plomo cónico (bala) en la línea, con la punta hacia arriba, mirando a la caña.' },
      { t: 'Ata el anzuelo offset', d: 'Un anzuelo offset —el que tiene ese escalón en forma de Z junto al ojal— con un palomar.' },
      { t: 'Entra por la cabeza', d: 'Clava la punta en el morro del vinilo, sácala a un centímetro y desliza el vinilo hasta que el escalón del anzuelo quede metido en la cabeza.' },
      { t: 'Gira y mide', d: 'Gira el anzuelo 180 grados y apoya la punta sobre el lomo del vinilo para ver por dónde tiene que entrar. El vinilo debe quedar RECTO: si queda torcido, girará sobre sí mismo y rizará la línea.' },
      { t: 'Esconde la punta', d: 'Clava la punta atravesando el vinilo y sácala justo por el lomo, y entonces retrocédela un pelín para que quede apoyada en la superficie, sin llegar a salir. Ahí está el antienganche.' },
    ],
    errores: [
      'Vinilo torcido. Es el fallo más común y el más caro: gira, riza la línea y el pez ni se acerca.',
      'Punta demasiado enterrada. Si está muy dentro, no sale al clavar y pierdes las picadas.',
      'Plomo del revés. La punta del bala tiene que mirar hacia la caña para que se abra paso entre la maleza.',
    ],
    gearCats: ['senuelos', 'anzuelos', 'plomos'],
    especies: ['Black bass', 'Lucio'],
  },
]

const PORid = new Map(FICHAS.map((f) => [f.id, f]))
export function ficha(id: string): Ficha | undefined {
  return PORid.get(id)
}
export const NUDOS = FICHAS.filter((f) => f.tipo === 'nudo')
export const MONTAJES = FICHAS.filter((f) => f.tipo === 'montaje')
