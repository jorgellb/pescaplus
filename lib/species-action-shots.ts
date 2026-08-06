/**
 * Fotos de acción: el pez entrando al señuelo, no el pez posando.
 *
 * Van aparte de `sp.images` a propósito. Aquéllas son retratos y sirven de
 * portada en la rejilla de /especies; éstas ilustran un gesto concreto de pesca,
 * así que su sitio es dentro de «Cómo pescarla» y siempre con pie de foto. Una
 * foto de acción sin explicar qué se está viendo es decoración; con el pie,
 * enseña el aparejo.
 *
 * Regla al añadir una: el pie NO puede contradecir lo que ya dice la guía de esa
 * especie ni su ficha técnica. Si la guía manda cebo a fondo y la foto enseña
 * spinning, sobra una de las dos.
 */
export interface ActionShot {
  /** Ruta en /public. */
  src: string
  /** Descripción de lo que se ve, para quien no puede ver la foto. */
  alt: string
  /** Qué está pasando y por qué importa. Es contenido, no epígrafe. */
  caption: string
}

export const ACTION_SHOTS: Record<string, ActionShot> = {
  pargos: {
    src: '/imagenesPeces/pargo_senuelo_atacando.jpg',
    alt: 'Un pargo con la boca abierta a punto de morder un señuelo de cabeza plomada y falda roja, bajo el agua y sobre un fondo rocoso',
    caption:
      'Un pargo entrando de frente a un kabura. Es justo el momento que persigue el jigging lento: la falda y el vinilo abiertos durante la caída, y el pez atacando casi parado sobre el veril. Los anzuelos asistidos van cortos y montados en la cabeza del señuelo — por eso clavan en el labio en lugar de engancharse en la roca.',
  },
}

export function actionShot(speciesId: string): ActionShot | null {
  return ACTION_SHOTS[speciesId] ?? null
}
