import { getChatGPTUser, chatGPTSignInPath } from '../chatgpt-auth';
import HousingClient from './housing-client';
import { requestLang } from '@/lib/server/request-lang';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Жильё на сутки в Казахстане | Qoldan', description: 'Гостиницы и посуточные квартиры. Поиск по регионам Казахстана и связь с владельцами.' };
export default async function HousingPage() {
  const [user, lang] = await Promise.all([getChatGPTUser(), requestLang()]);
  return <HousingClient signedIn={Boolean(user)} signInPath={chatGPTSignInPath('/housing')} lang={lang} />;
}
