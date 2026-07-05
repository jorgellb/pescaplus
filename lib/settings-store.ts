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
  nvidia: { configured: boolean }
  adminPassword: { usingDefault: boolean }
}

/** Read-only view of which optional integrations are wired up. */
export function getIntegrationStatus(): IntegrationStatus {
  const nvidiaKey = process.env.NVIDIA_API_KEY
  return {
    database: { configured: isDatabaseConfigured(), backend: activeBackend() },
    aliexpress: { configured: isAliExpressConfigured() },
    nvidia: { configured: Boolean(nvidiaKey && nvidiaKey !== 'your_nvidia_api_key') },
    adminPassword: { usingDefault: isUsingDefaultPassword() },
  }
}
