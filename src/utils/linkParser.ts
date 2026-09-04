/**
 * Check if a URL belongs to dark-core.ru or its subdomains
 */
export function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase();
    return host === 'dark-core.ru' || host.endsWith('.dark-core.ru') || host === 'localhost' || host === window.location.hostname;
  } catch (e) {
    return false;
  }
}

/**
 * Handle link clicks with external redirect warning dialog.
 */
let externalLinkHandler: ((url: string) => void) | null = null;

export function registerExternalLinkHandler(handler: (url: string) => void) {
  externalLinkHandler = handler;
}

export function handleLinkClick(e: MouseEvent, url: string) {
  e.preventDefault();
  e.stopPropagation();

  // Normalize URL
  const targetUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

  if (isInternalUrl(targetUrl)) {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  } else {
    if (externalLinkHandler) {
      externalLinkHandler(targetUrl);
    } else {
      if (window.confirm(`Вы покидаете наш сайт и переходите на сторонний ресурс:\n${targetUrl}\n\nВы уверены, что хотите продолжить?`)) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  }
}

/**
 * Safely parse markdown links [text](url) and raw URLs into formatted HTML strings or structured tokens.
 */
export function parseMarkdownLinks(text: string): string {
  if (!text) return '';

  // Escape basic HTML tags first for XSS safety except our link placeholders
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Markdown link regex: [text](url)
  const mdLinkRegex = /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s\)]+)\)/g;

  escaped = escaped.replace(mdLinkRegex, (_match, linkText, url) => {
    const safeUrl = url.replace(/"/g, '&quot;');
    const isInternal = isInternalUrl(safeUrl);
    const internalBadge = isInternal ? '' : '<svg class="w-3 h-3 inline-block ml-0.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>';
    return `<a href="${safeUrl}" data-external-link="${safeUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium transition-colors cursor-pointer group/link">${linkText}${internalBadge}</a>`;
  });

  return escaped;
}
