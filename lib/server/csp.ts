// Content-Security-Policy builder. NOT wired into any response yet: next.config.ts still sends the report-only policy.
// docs/CSP.md describes how to switch to this nonce-based policy once the published site shows no violations.
export type CspOptions = {
  /** Fresh random value for every response (base64, at least 16 bytes). */
  nonce: string;
  /** Hosts the pages load images from besides the site itself. */
  imageHosts?: string[];
};

const NONCE_PATTERN = /^[A-Za-z0-9+/=_-]{16,}$/;

export function buildCsp({ nonce, imageHosts = ['https://tile.openstreetmap.org'] }: CspOptions): string {
  if (!NONCE_PATTERN.test(nonce)) throw new Error('CSP nonce must be at least 16 base64 characters');
  return [
    "default-src 'self'",
    // No 'unsafe-inline' and no 'unsafe-eval' for scripts: only same-origin files and scripts carrying this nonce.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // React writes inline style attributes (positions, colours), so styles keep 'unsafe-inline'; scripts are what matters.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${imageHosts.join(' ')}`.trim(),
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
