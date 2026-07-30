import { isAliExpressConfigured } from '@/lib/aliexpress'
import { isDatabaseConfigured, activeBackend } from '@/lib/products-store'
import { isUsingDefaultPassword } from '@/lib/admin-auth'

/**
 * Editable admin settings. Kept in a process-global so they survive hot reloads
 * in development. These are the defaults applied when creating products and a few
 * store-wide toggles surfaced in the admin panel.
 */
export interface AdminSettings {
  storeName: string
  defaultCurrency: string
  defaultType: string
  aiAssistantEnabled: boolean
  productsPerPage: number
}

const DEFAULT_SETTINGS: AdminSettings = {
  storeName: 'PescaPlus',
  defaultCurrency: 'EUR',
  defaultType: 'spinning',
  aiAssistantEnabled: true,
  productsPerPage: 12,
}

const globalForSettings = globalThis as unknown as {
  __pescaplusSettings?: AdminSettings
}

export function getSettings(): AdminSettings {
  if (!globalForSettings.__pescaplusSettings) {
    globalForSettings.__pescaplusSettings = { ...DEFAULT_SETTINGS }
  }
  return globalForSettings.__pescaplusSettings
}

export function updateSettings(patch: Partial<AdminSettings>): AdminSettings {
  const current = getSettings()
  const next: AdminSettings = {
    storeName: patch.storeName?.trim() || current.storeName,
    defaultCurrency: patch.defaultCurrency?.trim() || current.defaultCurrency,
    defaultType: patch.defaultType?.trim() || current.defaultType,
    aiAssistantEnabled:
      typeof patch.aiAssistantEnabled === 'boolean'
        ? patch.aiAssistantEnabled
        : current.aiAssistantEnabled,
    productsPerPage: Math.min(Math.max(Number(patch.productsPerPage) || current.productsPerPage, 4), 48),
  }
  globalForSettings.__pescaplusSettings = next
  return next
}

export interface IntegrationStatus {
  database: { configured: boolean; backend: 'database' | 'memory' }
  aliexpress: { configured: boolean }
  /**
   * IA. Se detalla PROVEEDOR A PROVEEDOR, no solo "sí/no".
   *
   * Cada uno tiene su propio cupo diario, y el pulido de un catálogo grande
   * agota cualquiera por separado — así que saber cuáles están configurados es
   * la diferencia entre "el pulido aguanta el catálogo entero" y "se planta a
   * las 40 fichas". Con un "configurado: sí" genérico no había forma de ver
   * desde el panel si faltaba una clave en producción.
   */
  ai: {
    configured: boolean
    groq: boolean
    nvidia: boolean
    openrouter: boolean
  }
  adminPassword: { usingDefault: boolean }
}

/** Read-only view of which optional integrations are wired up. */
export function getIntegrationStatus(): IntegrationStatus {
  const openrouterKey = process.env.OPENROUTER_API_KEY
  const hasOpenRouter = Boolean(openrouterKey && openrouterKey !== 'your_openrouter_api_key')
  const hasGroq = Boolean(process.env.GROQ_API_KEY)
  const hasNvidia = Boolean(process.env.NVIDIA_API_KEY)
  return {
    database: { configured: isDatabaseConfigured(), backend: activeBackend() },
    aliexpress: { configured: isAliExpressConfigured() },
    ai: {
      configured: hasGroq || hasOpenRouter || hasNvidia,
      groq: hasGroq,
      nvidia: hasNvidia,
      openrouter: hasOpenRouter,
    },
    adminPassword: { usingDefault: isUsingDefaultPassword() },
  }
}
