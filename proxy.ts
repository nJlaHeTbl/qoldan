import { NextResponse } from 'next/server';
import { crossSiteWriteBlock } from '@/lib/server/request-guard';

// Runs before every API route: rejects data-changing requests sent from other sites (see lib/server/request-guard.ts).
export function proxy(request: Request) {
  return crossSiteWriteBlock(request) ?? NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
