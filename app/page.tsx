import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from './chatgpt-auth';
import QoldanClient from './qoldan-client';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <QoldanClient
      isSignedIn={Boolean(user)}
      initialDisplayName={user?.displayName || null}
      signInPath={chatGPTSignInPath('/')}
      signOutPath={chatGPTSignOutPath('/')}
    />
  );
}
