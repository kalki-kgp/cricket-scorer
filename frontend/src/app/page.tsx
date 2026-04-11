import LiveScoreboard from '@/components/LiveScoreboard';
import type { Match, MatchState } from '@/types/cricket';

export const dynamic = 'force-dynamic';

const SERVER_API =
  process.env.API_URL_INTERNAL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

async function getLiveMatch(): Promise<MatchState | null> {
  try {
    const res = await fetch(`${SERVER_API}/api/match`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getAllMatches(): Promise<Match[]> {
  try {
    const res = await fetch(`${SERVER_API}/api/matches`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [initialData, initialSchedule] = await Promise.all([
    getLiveMatch(),
    getAllMatches(),
  ]);
  return <LiveScoreboard initialData={initialData} initialSchedule={initialSchedule} />;
}
