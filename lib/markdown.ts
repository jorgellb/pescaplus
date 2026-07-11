/**
 * Minimal, XSS-safe description renderer.
 *
 * Product descriptions are authored in a lightweight markup (a safe subset of
 * Markdown) so admins can add links, bold, italics and bullet lists without ever
 * injecting raw HTML. Everything is HTML-escaped first, then only our own tags
 * are emitted, with link URLs validated to http(s)/relative schemes. Affiliate
 * links get rel="nofollow sponsored" automatically.
 *
 * Supported: **bold**, _italic_, [texto](https://url), ![alt](https://img),
 * and `- ` bullet lists.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(text: string): string {
  return text
    // images: ![alt](url) — validated URL, escaped alt. Must run before links.
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => {
      if (/^(https?:\/\/|\/)/i.test(url)) {
        return `<img src="${url}" alt="${alt}" loading="lazy" class="my-4 max-w-full h-auto border-2 border-ink" />`
      }
      return ''
    })
    // links: [texto](url) — only http(s) or relative URLs are allowed
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
      if (/^(https?:\/\/|\/)/i.test(url)) {
        return `<a href="${url}" target="_blank" rel="nofollow noopener sponsored" class="text-sky-600 underline underline-offset-2 hover:text-sky-700">${label}</a>`
      }
      return label
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
}

/** Render authored description markup to safe HTML for dangerouslySetInnerHTML. */
export function renderDescription(markup: string): string {
  if (!markup?.trim()) return ''
  const escaped = escapeHtml(markup)

  return escaped
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').filter((l) => l.trim().length > 0)
      if (lines.length === 0) return ''
      const isList = lines.every((l) => /^\s*[-*]\s+/.test(l))
      if (isList) {
        const items = lines
          .map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`)
          .join('')
        return `<ul class="list-disc pl-5 space-y-1 my-2">${items}</ul>`
      }
      return `<p class="my-2">${lines.map(inline).join('<br/>')}</p>`
    })
    .join('')
}
