/** Shared, XSS-safe formatting for chat messages (advice page + floating widget). */

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function toSafeHtml(line: string): string {
  return escapeHtml(line)
    // links (e.g. category recommendations) — only relative or https URLs
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) =>
      /^(https?:\/\/|\/)/i.test(url)
        ? `<a href="${url}" class="text-accent underline font-semibold hover:opacity-80">${label}</a>`
        : label,
    )
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-accent">$1</strong>')
}
