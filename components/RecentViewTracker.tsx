'use client';

import { useEffect } from 'react';

const RECENT_VIEWS_KEY = 'qoldan-recent-views-v1';

type RecentView = {
  kind: 'listing' | 'request';
  id: string;
  viewedAt: number;
};

export function RecentViewTracker({
  kind,
  itemId,
}: {
  kind: RecentView['kind'];
  itemId: string;
}) {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_VIEWS_KEY);
      const parsed = stored ? (JSON.parse(stored) as unknown) : [];
      const current = Array.isArray(parsed)
        ? parsed.filter(
            (item): item is RecentView =>
              Boolean(item) &&
              typeof item === 'object' &&
              ((item as RecentView).kind === 'listing' ||
                (item as RecentView).kind === 'request') &&
              typeof (item as RecentView).id === 'string' &&
              typeof (item as RecentView).viewedAt === 'number',
          )
        : [];
      const next: RecentView[] = [
        { kind, id: itemId, viewedAt: Date.now() },
        ...current.filter((item) => item.kind !== kind || item.id !== itemId),
      ].slice(0, 12);
      window.localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(next));
    } catch {
      // Private browsing or restricted storage should not block the detail page.
    }
  }, [kind, itemId]);

  return null;
}
