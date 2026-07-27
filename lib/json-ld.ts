/**
 * JSON-LD embebido de forma segura.
 *
 * `JSON.stringify` NO escapa `</script>`. Si el objeto lleva texto que no
 * controlamos del todo —un título de producto que viene de un feed de
 * AliExpress, la descripción de una guía— y ese texto contiene literalmente
 * `</script><script>…</script>`, el navegador cierra la etiqueta ahí mismo y
 * ejecuta lo que venga detrás como HTML: inyección real, no teórica.
 *
 * La solución estándar es escapar `<` como `<` dentro del JSON: sigue
 * siendo JSON válido (los `\uXXXX` son parte de la gramática) y ya no hay
 * ninguna secuencia `</` que un navegador pueda interpretar como cierre de
 * etiqueta.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
