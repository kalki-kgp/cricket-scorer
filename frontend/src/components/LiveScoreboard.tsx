'use client';

import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import type { Match, MatchState } from '@/types/cricket';

// ── Helpers ────────────────────────────────────────────────────

function lastBallClass(result: string) {
  if (result === 'W') return 'bg-llr-brick text-white';
  if (result === '6') return 'bg-llr-pitch-bright text-white';
  if (result === '4') return 'bg-sky-600 text-white';
  if (result === 'Wd' || result === 'NB') return 'bg-llr-saffron text-llr-ink font-bold';
  if (result === 'B') return 'bg-orange-600 text-white';
  if (result === '•') return 'bg-llr-panel2 text-llr-muted';
  return 'bg-llr-pitch text-white';
}

function matchStatus(m: Match) {
  if (m.is_completed) return 'done';
  if (m.is_live) return 'live';
  return 'upcoming';
}

// ── Components ─────────────────────────────────────────────────

function ScheduleRow({ m }: { m: Match }) {
  const status = matchStatus(m);
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] last:border-0 transition-colors
        ${status === 'live' ? 'bg-llr-pitch/15' : ''}
        ${status === 'done' ? 'opacity-50' : ''}
      `}
    >
      {/* Status indicator */}
      <div className="w-6 flex-shrink-0 flex justify-center">
        {status === 'live' && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-llr-pitch-bright opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-llr-pitch-bright" />
          </span>
        )}
        {status === 'done' && (
          <svg className="w-4 h-4 text-llr-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === 'upcoming' && (
          <span className="w-1.5 h-1.5 rounded-full bg-llr-panel2 mt-0.5 ring-1 ring-white/10" />
        )}
      </div>

      {/* Time slot */}
      <span className="text-xs text-llr-muted w-28 flex-shrink-0 tabular-nums font-mono">
        {m.time_slot}
      </span>

      {/* Teams */}
      <span className={`text-sm font-medium flex-1 ${status === 'live' ? 'text-llr-cream' : 'text-llr-cream/85'}`}>
        {m.team_a_name}
        <span className="text-llr-muted mx-1.5 font-normal">vs</span>
        {m.team_b_name}
      </span>

      {/* Live badge */}
      {status === 'live' && (
        <span className="text-xs font-display font-bold text-llr-pitch-bright bg-llr-pitch/25 border border-llr-pitch-bright/35 px-2 py-0.5 rounded-full tracking-wide">
          LIVE
        </span>
      )}
      {status === 'done' && m.runs > 0 && (
        <span className="text-xs text-llr-muted tabular-nums font-mono">
          {m.runs}/{m.wickets}
        </span>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function LiveScoreboard({
  initialData,
  initialSchedule,
}: {
  initialData: MatchState | null;
  initialSchedule: Match[];
}) {
  const [data, setData] = useState<MatchState | null>(initialData);
  const [schedule, setSchedule] = useState<Match[]>(initialSchedule);
  const [scoreBump, setScoreBump] = useState(false);
  const prevRuns = useRef(initialData?.match.runs ?? 0);

  useEffect(() => {
    const socket = getSocket();

    if (initialData?.match?.match_id) {
      socket.emit('join_match', initialData.match.match_id);
    }

    socket.on('score_update', (updated: MatchState) => {
      if (updated.match.runs !== prevRuns.current) {
        setScoreBump(true);
        setTimeout(() => setScoreBump(false), 500);
        prevRuns.current = updated.match.runs;
      }
      setData(updated);
      if (updated.match.match_id !== initialData?.match?.match_id) {
        socket.emit('join_match', updated.match.match_id);
      }
    });

    socket.on('schedule_update', (updatedSchedule: Match[]) => {
      setSchedule(updatedSchedule);
      const live = updatedSchedule.find((m) => m.is_live);
      if (!live) setData(null);
    });

    return () => {
      socket.off('score_update');
      socket.off('schedule_update');
    };
  }, []);

  const liveMatch = data?.match ?? null;

  return (
    <div className="llr-page text-llr-cream">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-llr-saffron/20 bg-black/35 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="llr-reveal">
            <div className="flex items-start gap-3">
              <span className="text-3xl leading-none drop-shadow-[0_0_12px_rgba(225,154,15,0.35)]">🏏</span>
              <div>
                <p className="font-display font-extrabold text-2xl sm:text-3xl leading-tight tracking-tight text-llr-saffron-glow">
                  LLR HALL
                </p>
                <p className="text-llr-muted text-[10px] sm:text-xs font-semibold tracking-[0.28em] uppercase mt-1">
                  IIT Kharagpur
                </p>
                <p className="text-llr-cream/55 text-xs mt-2 font-medium italic border-l-2 border-llr-brick/80 pl-2.5 max-w-sm">
                  Lala Lajpat Rai Hall of Residence · Est. 1967
                </p>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right llr-reveal llr-reveal-delay-1">
            <p className="text-llr-cream font-display font-bold text-sm sm:text-base leading-tight">
              Intra-Hall Cricket
            </p>
            <p className="text-llr-saffron/90 text-xs font-semibold tracking-widest uppercase mt-1">
              Tournament 2025
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3 sm:justify-end">
              {['A1', 'A', 'B', 'C'].map((block) => (
                <span
                  key={block}
                  className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-llr-panel border border-white/10 text-llr-muted"
                >
                  Block {block}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* ── Live Scoreboard ─────────────────────────────────────── */}
        {liveMatch ? (
          <section className="llr-reveal llr-reveal-delay-2">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-2 text-xs font-display font-bold text-llr-pitch-bright bg-llr-pitch/20 border border-llr-pitch-bright/30 px-3 py-1.5 rounded-full tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-llr-pitch-bright opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-llr-pitch-bright" />
                </span>
                LIVE NOW
              </span>
              <span className="text-xs text-llr-saffron/80 font-mono tabular-nums">{liveMatch.time_slot}</span>
            </div>

            <div className="text-center mb-5">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="text-xl sm:text-3xl font-display font-extrabold text-llr-cream text-right flex-1 min-w-[6rem] leading-tight">
                  {liveMatch.team_a_name}
                </span>
                <span className="text-llr-saffron font-display font-bold text-lg flex-shrink-0">vs</span>
                <span className="text-xl sm:text-3xl font-display font-extrabold text-llr-cream text-left flex-1 min-w-[6rem] leading-tight">
                  {liveMatch.team_b_name}
                </span>
              </div>
            </div>

            <div className="llr-card rounded-3xl p-8 sm:p-10 text-center mb-4 llr-reveal llr-reveal-delay-3">
              <div
                className={`flex items-baseline justify-center gap-2 transition-transform ${
                  scoreBump ? 'animate-score-bump' : ''
                }`}
              >
                <span className="text-8xl sm:text-[108px] font-mono font-bold tabular-nums leading-none text-llr-cream tracking-tighter">
                  {liveMatch.runs}
                </span>
                <span className="text-5xl sm:text-7xl font-mono font-semibold text-llr-brick leading-none">
                  /{liveMatch.wickets}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-llr-pitch-bright">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xl font-display font-semibold">
                  {liveMatch.overs}.{liveMatch.balls_in_over} overs
                </span>
              </div>
            </div>

            {liveMatch.last_ball_result && (
              <div className="flex justify-center mb-5">
                <div
                  className={`px-6 py-2 rounded-full font-display font-bold text-sm shadow-lg ${lastBallClass(
                    liveMatch.last_ball_result
                  )}`}
                >
                  Last ball: <span className="text-base ml-1 font-mono">{liveMatch.last_ball_result}</span>
                </div>
              </div>
            )}

            {data!.batsmen.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-display font-bold uppercase tracking-[0.2em] text-llr-saffron/85 mb-2 flex items-center gap-2">
                  <span className="w-8 h-px bg-llr-saffron/40" />
                  Batting
                </p>
                <div className="llr-card-muted rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_3rem_3rem] text-[10px] text-llr-muted uppercase px-4 py-2.5 bg-white/[0.04] tracking-widest font-display font-semibold">
                    <span>Batsman</span>
                    <span className="text-right">R</span>
                    <span className="text-right">B</span>
                  </div>
                  {data!.batsmen.map((b) => (
                    <div
                      key={b.batsman_id}
                      className="grid grid-cols-[1fr_3rem_3rem] px-4 py-3 border-t border-white/[0.06]"
                    >
                      <span className="font-medium text-llr-cream flex items-center gap-2">
                        {b.name || 'TBA'}
                        {Boolean(b.is_striker) && (
                          <span className="text-llr-saffron-glow drop-shadow-[0_0_8px_rgba(240,180,41,0.4)]">★</span>
                        )}
                      </span>
                      <span className="text-right font-mono font-bold tabular-nums text-llr-cream">{b.runs}</span>
                      <span className="text-right font-mono tabular-nums text-llr-muted">{b.balls}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data!.bowler && (
              <div>
                <p className="text-xs font-display font-bold uppercase tracking-[0.2em] text-sky-400/90 mb-2 flex items-center gap-2">
                  <span className="w-8 h-px bg-sky-500/40" />
                  Bowling
                </p>
                <div className="llr-card-muted rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] text-[10px] text-llr-muted uppercase px-4 py-2.5 bg-white/[0.04] tracking-widest font-display font-semibold">
                    <span>Bowler</span>
                    <span className="text-right">O</span>
                    <span className="text-right">R</span>
                    <span className="text-right">W</span>
                  </div>
                  <div className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] px-4 py-3 border-t border-white/[0.06]">
                    <span className="font-medium text-llr-cream">{data!.bowler.name || 'TBA'}</span>
                    <span className="text-right font-mono tabular-nums text-llr-cream/90">
                      {data!.bowler.overs}.{data!.bowler.balls_bowled ?? 0}
                    </span>
                    <span className="text-right font-mono tabular-nums text-llr-cream/90">{data!.bowler.runs_given}</span>
                    <span className="text-right font-mono font-bold tabular-nums text-llr-cream">{data!.bowler.wickets}</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="llr-card rounded-3xl text-center py-14 px-6 llr-reveal">
            <div className="text-6xl mb-4 opacity-90">🏏</div>
            <p className="font-display font-bold text-xl text-llr-cream">Waiting for the next match</p>
            <p className="text-llr-muted text-sm mt-2 max-w-xs mx-auto leading-relaxed">
              Floodlights on, pavilion ready — the umpire will go live when play begins.
            </p>
          </div>
        )}

        {/* ── Tournament Schedule ────────────────────────────────── */}
        <section className="llr-reveal llr-reveal-delay-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-llr-saffron/35 to-transparent" />
            <h2 className="text-llr-saffron/90 text-[11px] font-display font-bold uppercase tracking-[0.35em] whitespace-nowrap">
              Match Schedule
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-llr-saffron/35 to-transparent" />
          </div>

          <div className="llr-card-muted rounded-xl overflow-hidden">
            {schedule.length === 0 ? (
              <p className="text-llr-muted text-sm text-center py-8 font-medium">Loading schedule…</p>
            ) : (
              schedule.map((m) => <ScheduleRow key={m.match_id} m={m} />)
            )}
          </div>
        </section>

        <footer className="text-center text-llr-muted/70 text-[11px] pb-6 font-medium tracking-wide">
          <span className="text-llr-saffron/50">पंजाब केसरी</span>
          <span className="mx-2 text-llr-muted/40">·</span>
          LLR Hall · IIT Kharagpur · Cricket 2025
        </footer>
      </div>
    </div>
  );
}
