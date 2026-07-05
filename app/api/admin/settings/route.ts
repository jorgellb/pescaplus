import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { getSettings, updateSettings, getIntegrationStatus } from '@/lib/settings-store'

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  return NextResponse.json({
    success: true,
    settings: getSettings(),
    integrations: getIntegrationStatus(),
  })
}

const settingsSchema = z.object({
  storeName: z.string().min(1).max(60).optional(),
  defaultCurrency: z.string().min(1).max(8).optional(),
  defaultType: z.string().min(1).max(40).optional(),
  aiAssistantEnabled: z.boolean().optional(),
  productsPerPage: z.number().int().min(4).max(48).optional(),
})

export async function PUT(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Ajustes inválidos' }, { status: 400 })
  }

  const settings = updateSettings(parsed.data)
  return NextResponse.json({ success: true, settings })
}
