import { cookies } from 'next/headers';
import { LANG_COOKIE, parseLang, type Lang } from '@/lib/ui-copy';

/** Interface language of the current request (from the functional language cookie); Russian by default. */
export async function requestLang(): Promise<Lang> {
  try {
    return parseLang((await cookies()).get(LANG_COOKIE)?.value);
  } catch {
    return 'ru';
  }
}
