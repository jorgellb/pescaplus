import { NextRequest, NextResponse } from 'next/server'
import { deleteZoneAlert } from '@/lib/zone-alerts-store'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (id) await deleteZoneAlert(id)
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:520px;margin:60px auto;text-align:center;color:#111">
     <h1>🎣 Baja confirmada</h1><p>Ya no recibirás avisos de quedadas de esa zona.</p>
     <p><a href="/quedadas" style="color:#0f766e">Volver a las quedadas</a></p></body>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
