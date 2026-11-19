// Lazy front door to lib/server-messages.ts: the 60 KB translation table is downloaded only when an error has
// to be shown in Kazakh or English. Russian users (and error-free sessions) never load it.

export const currentUiLang = () =>
  typeof document === 'undefined' ? 'ru' : document.documentElement.lang || 'ru';

export async function localizeError(message: string, lang: string | undefined = currentUiLang()): Promise<string> {
  if (!message || (lang !== 'kk' && lang !== 'en')) return message;
  try {
    const { translateServerMessage } = await import('@/lib/server-messages');
    return translateServerMessage(message, lang);
  } catch {
    return message;
  }
}
