import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import SignInForm from '@/components/SignInForm';
import { authMode, enabledChannels } from '@/lib/server/auth';
import { getMarketplaceBindings } from '@/lib/server/marketplace-db';
import { chatGPTSignInPath, safeRelativeReturnPath } from '../chatgpt-auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Вход | Qoldan', robots: { index: false } };

type Props = { searchParams: Promise<{ return_to?: string }> };

// Own sign-in page (self-hosting). On the ChatGPT platform it forwards to the platform sign-in.
export default async function SignInPage({ searchParams }: Props) {
  const { return_to: returnTo = '/' } = await searchParams;
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  const env = getMarketplaceBindings();
  if (authMode(env) !== 'own') redirect(chatGPTSignInPath(safeReturnTo));
  return (
    <main id="main-content" tabIndex={-1} className="signin-page">
      <Link href="/" className="brand">Qoldan</Link>
      <SignInForm channels={enabledChannels(env)} returnTo={safeReturnTo} />
    </main>
  );
}
