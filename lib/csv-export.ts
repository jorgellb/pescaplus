'use client'

/**
 * Exporta un array de objetos a CSV y dispara la descarga. Cliente puro (usa
 * Blob + un enlace efímero) — mismo patrón que ya usaba la exportación de
 * catálogo en /admin/settings, generalizado para cualquier lista del admin.
 */
export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | boolean | null | undefined
}

function escapeCsvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(';')
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(';'))
  // BOM para que Excel detecte UTF-8 (acentos/ñ) sin preguntar.
  const csv = '﻿' + [header, ...lines].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
