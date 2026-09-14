import { getChatGPTUser, chatGPTSignInPath } from '../chatgpt-auth';
import HousingClient from './housing-client';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Жильё на сутки в Казахстане | Qoldan', description: 'Гостиницы и посуточные квартиры. Поиск по регионам Казахстана и связь с владельцами.' };
export default async function HousingPage() {
  const user = await getChatGPTUser();
  return <HousingClient signedIn={Boolean(user)} signInPath={chatGPTSignInPath('/housing')} />;
}
