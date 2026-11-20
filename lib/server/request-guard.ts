// Defence against cross-site request forgery for the JSON API: a page on another site must not be able to make a
// signed-in visitor's browser change data on Qoldan (publish, bid, delete the account…).
//
// Browsers mark every request with Sec-Fetch-Site and send Origin on POST/PATCH/PUT/DELETE, so a forged request is
// recognisable. Requests without these headers come from non-browser clients (tests, scripts, server-to-server);
// they carry no visitor's cookies, so they are not a forgery risk and are let through.

export const CROSS_SITE_ERROR = 'Запрос с другого сайта отклонён';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const hostOf = (value: string | null) => {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
};

/** Hosts this site answers on: the request URL, the Host header and the proxy's forwarded host. */
function ownHosts(request: Request) {
  const hosts = new Set<string>();
  const add = (value: string | null | undefined) => {
    for (const part of (value ?? '').split(',')) {
      const host = part.trim().toLowerCase();
      if (host) hosts.add(host);
    }
  };
  add(hostOf(request.url));
  add(request.headers.get('host'));
  add(request.headers.get('x-forwarded-host'));
  return hosts;
}

/** Returns a 403 response for a cross-site write to the API, or null when the request may proceed. */
export function crossSiteWriteBlock(request: Request): Response | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;
  const fetchSite = request.headers.get('sec-fetch-site');
  // "same-origin": our own page; "none": typed by the user / bookmark. Both are fine.
  if (fetchSite === 'same-origin' || fetchSite === 'none') return null;
  const origin = request.headers.get('origin');
  if (origin === null) {
    // No Origin: a non-browser client, unless the browser itself says the request is cross-site.
    return fetchSite === 'cross-site' || fetchSite === 'same-site' ? blocked() : null;
  }
  const originHost = hostOf(origin);
  if (originHost && ownHosts(request).has(originHost)) return null;
  return blocked();
}

const blocked = () =>
  Response.json({ error: CROSS_SITE_ERROR }, { status: 403, headers: { 'cache-control': 'no-store' } });
