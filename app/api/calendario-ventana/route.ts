import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSpot } from '@/lib/fishing-spots'

const schema = z.object({
  zona: z.string().min(1).max(60),
  inicio: z.coerce.number().int().positive(),
  fin: z.coerce.number().int().positive(),
  puntuacion: z.coerce.number().int().min(0).max(100).optional(),
})

/** YYYYMMDDTHHMMSSZ, el formato de fecha que exige iCalendar (RFC 5545). */
function icsDate(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

/** Escapa comas, punto y coma y saltos de línea según RFC 5545. */
function icsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

/** Genera un .ics de un solo evento para la mejor ventana de pesca del día,
 * para que el pescador se la ponga directamente en su calendario. Deriva el
 * nombre de la zona del propio slug (nunca de un parámetro sin verificar). */
export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Parámetros no válidos.' }, { status: 400 })
  const { zona, inicio, fin, puntuacion } = parsed.data
  const spot = getSpot(zona)
  if (!spot) return NextResponse.json({ success: false, error: 'Zona no válida.' }, { status: 400 })
  if (fin <= inicio || fin - inicio > 24 * 3600000) {
    return NextResponse.json({ success: false, error: 'Ventana no válida.' }, { status: 400 })
  }

  const url = `${request.nextUrl.origin}/mejores-horas/${spot.slug}`
  const summary = icsText(`Pesca en ${spot.name}${puntuacion != null ? ` (puntuación ${puntuacion}/100)` : ''}`)
  const description = icsText(`Mejor ventana de pesca prevista por PescaPlus para ${spot.name}. Previsión orientativa, puede cambiar — revisa la ficha antes de salir: ${url}`)
  const uid = `pescaplus-${spot.slug}-${inicio}@pescaplus.es`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PescaPlus//Previsión de pesca//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsDate(Date.now())}`,
    `DTSTART:${icsDate(inicio)}`,
    `DTEND:${icsDate(fin)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="pesca-${spot.slug}.ics"`,
    },
  })
}
