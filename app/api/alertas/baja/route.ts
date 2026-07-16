import { NextRequest, NextResponse } from 'next/server'
import { removeAlert } from '@/lib/alerts-store'

/** One-click unsubscribe (linked from every alert email). */
export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  const ok = id.length > 3 ? await removeAlert(id) : false
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>PescaPlus</title></head>
<body style="font-family:system-ui;background:#f2efe6;color:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="text-align:center;max-width:420px;padding:24px">
<p style="font-size:40px;margin:0">🎣</p>
<h1 style="font-size:24px">${ok ? 'Alerta cancelada' : 'Enlace no válido'}</h1>
<p style="color:#555">${ok ? 'No volverás a recibir avisos de esta zona. Puedes reactivarlos cuando quieras desde su página.' : 'La suscripción ya no existe o el enlace ha caducado.'}</p>
<a href="/mejores-horas" style="color:#0f766e">Volver a Mejores horas</a>
</div></body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
