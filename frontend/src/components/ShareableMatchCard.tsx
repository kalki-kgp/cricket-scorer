'use client';

import { useRef, useState } from 'react';
import type { Match, MatchState } from '@/types/cricket';
import { currentInnings } from '@/types/cricket';

// Dynamic import for html2canvas to avoid SSR issues
async function captureCard(element: HTMLElement): Promise<Blob | null> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element, {
    backgroundColor: '#05070c',
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function StatBox({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="text-center">
      <div className={`text-xl sm:text-2xl font-mono font-bold tabular-nums ${accent || 'text-llr-cream'}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-[0.15em] text-llr-muted mt-0.5 font-display font-semibold">
        {label}
      </div>
    </div>
  );
}

export default function ShareableMatchCard({
  data,
  match,
}: {
  data: MatchState | null;
  match: Match;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const blob = await captureCard(cardRef.current);
      if (!blob) return;

      const file = new File([blob], `llr-cricket-${match.team_a_name}-vs-${match.team_b_name}.png`, {
        type: 'image/png',
      });

      // Try Web Share API first (mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${match.team_a_name} vs ${match.team_b_name} - LLR Cricket`,
          files: [file],
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const isLive = Boolean(match.is_live);
  const isCompleted = Boolean(match.is_completed);
  const batsmen = data?.batsmen ?? [];
  const bowler = data?.bowler ?? null;

  return (
    <div>
      {/* The card that gets captured */}
      <div
        ref={cardRef}
        className="share-card relative overflow-hidden rounded-2xl border border-llr-saffron/25 p-5 sm:p-6"
        style={{
          background: 'linear-gradient(145deg, #0d1520 0%, #080e18 50%, #0a1420 100%)',
          minWidth: 320,
          maxWidth: 420,
        }}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none">
          <svg viewBox="0 0 100 100" fill="currentColor" className="text-llr-saffron w-full h-full">
            <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M50 2 C55 25, 75 45, 98 50 C75 55, 55 75, 50 98 C45 75, 25 55, 2 50 C25 45, 45 25, 50 2Z" />
          </svg>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏏</span>
            <div>
              <p className="font-display font-extrabold text-sm text-llr-saffron-glow leading-tight">
                LLR HALL
              </p>
              <p className="text-[8px] text-llr-muted tracking-[0.2em] uppercase font-semibold">
                IIT Kharagpur
              </p>
            </div>
          </div>
          {isLive && (
            <span className="flex items-center gap-1.5 text-[10px] font-display font-bold text-llr-pitch-bright bg-llr-pitch/25 border border-llr-pitch-bright/30 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-llr-pitch-bright animate-pulse" />
              LIVE
            </span>
          )}
          {isCompleted && (
            <span className="text-[10px] font-display font-bold text-llr-muted bg-white/[0.06] px-2 py-1 rounded-full">
              COMPLETED
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-3">
            <span className="text-base sm:text-lg font-display font-extrabold text-llr-cream flex-1 text-right leading-tight">
              {match.team_a_name}
            </span>
            <span className="text-llr-saffron/80 font-display font-bold text-xs flex-shrink-0">vs</span>
            <span className="text-base sm:text-lg font-display font-extrabold text-llr-cream flex-1 text-left leading-tight">
              {match.team_b_name}
            </span>
          </div>
          {match.time_slot && (
            <p className="text-[10px] text-llr-muted mt-1.5 font-mono">{match.time_slot}</p>
          )}
        </div>

        {/* Score */}
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 text-center mb-4 space-y-3">
          {(currentInnings(match) >= 2 || (match.innings1_runs ?? 0) > 0 || (match.innings1_wickets ?? 0) > 0) && (
            <div className="text-left text-[10px] text-llr-muted font-mono border-b border-white/[0.06] pb-2 mb-1">
              <span className="text-llr-muted/80 font-display uppercase tracking-wider text-[9px]">1st inns</span>
              <span className="block text-llr-cream font-bold text-sm mt-0.5">
                {match.team_a_name}: {match.innings1_runs ?? 0}/{match.innings1_wickets ?? 0} · {match.innings1_overs ?? 0}.
                {match.innings1_balls_in_over ?? 0} ov
              </span>
            </div>
          )}
          <div>
            <p className="text-[9px] font-display font-bold text-llr-saffron uppercase tracking-widest mb-1">
              {currentInnings(match) >= 2 ? '2nd innings' : '1st innings'}
            </p>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-5xl sm:text-6xl font-mono font-bold tabular-nums text-llr-cream leading-none">
                {match.runs}
              </span>
              <span className="text-3xl sm:text-4xl font-mono font-semibold text-llr-brick leading-none">
                /{match.wickets}
              </span>
            </div>
            <p className="text-sm text-llr-pitch-bright font-display font-semibold mt-2">
              {match.overs}.{match.balls_in_over} overs
              {match.overs_limit > 0 && (
                <span className="text-llr-muted"> / {match.overs_limit}</span>
              )}
            </p>
            {currentInnings(match) >= 2 && (
              <p className="text-xs text-llr-pitch-bright font-display font-bold mt-1">
                Target {(match.innings1_runs ?? 0) + 1} to win
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-around mb-4">
          {batsmen.length > 0 && batsmen.filter(b => b.is_striker).map((b) => (
            <StatBox key={b.batsman_id} label="Striker" value={`${b.runs}(${b.balls})`} accent="text-llr-saffron-glow" />
          ))}
          {bowler && (
            <StatBox
              label="Bowler"
              value={`${bowler.wickets}-${bowler.runs_given}`}
              accent="text-sky-400"
            />
          )}
          {match.runs > 0 && match.overs > 0 && (
            <StatBox
              label="Run Rate"
              value={(match.runs / (match.overs + match.balls_in_over / 6)).toFixed(1)}
            />
          )}
        </div>

        {/* Batsmen details */}
        {batsmen.length > 0 && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] overflow-hidden mb-3">
            <div className="grid grid-cols-[1fr_2.5rem_2.5rem] text-[8px] text-llr-muted uppercase px-3 py-1.5 bg-white/[0.03] tracking-widest font-display font-semibold">
              <span>Batting</span>
              <span className="text-right">R</span>
              <span className="text-right">B</span>
            </div>
            {batsmen.map((b) => (
              <div
                key={b.batsman_id}
                className="grid grid-cols-[1fr_2.5rem_2.5rem] px-3 py-1.5 border-t border-white/[0.04] text-xs"
              >
                <span className="text-llr-cream font-medium flex items-center gap-1.5">
                  {b.name || 'TBA'}
                  {Boolean(b.is_striker) && (
                    <span className="text-llr-saffron-glow text-[10px]">★</span>
                  )}
                </span>
                <span className="text-right font-mono font-bold tabular-nums text-llr-cream">{b.runs}</span>
                <span className="text-right font-mono tabular-nums text-llr-muted">{b.balls}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer watermark */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <p className="text-[8px] text-llr-muted/60 font-mono">
            LLR Cricket · IIT Kharagpur
          </p>
          <p className="text-[8px] text-llr-saffron/40 font-display font-bold">
            पंजाब केसरी
          </p>
        </div>
      </div>

      {/* Share / Download button */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-xs tracking-wider uppercase
            bg-llr-saffron/15 border border-llr-saffron/30 text-llr-saffron hover:bg-llr-saffron/25
            disabled:opacity-50 transition-all duration-200"
        >
          {sharing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-llr-saffron/30 border-t-llr-saffron rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Scorecard
            </>
          )}
        </button>
      </div>
    </div>
  );
}
