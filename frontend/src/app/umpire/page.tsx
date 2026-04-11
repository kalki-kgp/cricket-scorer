'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  quickAction,
  updateScore,
  swapStrike,
  setMatchLive,
  completeMatch,
  fetchAllMatches,
  checkAuth,
  AuthError,
} from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { Match, MatchState, Batsman, Bowler } from '@/types/cricket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ActionResult = { success: boolean; state: MatchState };

// ── Match selector row ─────────────────────────────────────────
function MatchRow({
  m,
  onSetLive,
  onComplete,
  busy,
}: {
  m: Match;
  onSetLive: () => void;
  onComplete: () => void;
  busy: boolean;
}) {
  const isLive = Boolean(m.is_live);
  const isDone = Boolean(m.is_completed);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] last:border-0 transition-colors
        ${isLive ? 'bg-llr-saffron/10 border-l-2 border-l-llr-saffron' : ''}
        ${isDone ? 'opacity-40' : ''}
      `}
    >
      {/* Status dot */}
      <div className="w-5 flex-shrink-0 flex justify-center">
        {isLive ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-llr-saffron-glow opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-llr-saffron" />
          </span>
        ) : isDone ? (
          <svg className="w-3.5 h-3.5 text-llr-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-llr-panel2 ring-1 ring-white/10" />
        )}
      </div>

      {/* Match info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-llr-muted font-mono">{m.time_slot}</p>
        <p className="text-sm text-llr-cream font-medium truncate">
          {m.team_a_name} <span className="text-llr-muted">vs</span> {m.team_b_name}
        </p>
      </div>

      {/* Score if done */}
      {isDone && m.runs > 0 && (
        <span className="text-xs text-llr-muted tabular-nums flex-shrink-0 font-mono">{m.runs}/{m.wickets}</span>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="flex gap-1.5 flex-shrink-0">
          {isLive ? (
            <button
              onClick={onComplete}
              disabled={busy}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-llr-panel2 hover:bg-llr-brick-deep/80 text-llr-cream/90 hover:text-white border border-white/10 hover:border-llr-brick/60 transition disabled:opacity-40 font-medium"
            >
              Done
            </button>
          ) : (
            <button
              onClick={onSetLive}
              disabled={busy}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-llr-saffron/15 hover:bg-llr-saffron/25 text-llr-saffron-glow border border-llr-saffron/35 transition disabled:opacity-40 font-display font-semibold"
            >
              Set Live
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function UmpirePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [liveState, setLiveState] = useState<MatchState | null>(null);
  const [form, setForm] = useState<MatchState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastActionLabel, setLastActionLabel] = useState('');
  const [toast, setToast] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(true);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  const syncState = useCallback((state: MatchState) => {
    setLiveState(state);
    setForm(JSON.parse(JSON.stringify(state)));
  }, []);

  // ── Auth error handler — clears stale token and redirects ────────
  const kickToLogin = useCallback(() => {
    localStorage.removeItem('token');
    router.replace('/login');
  }, [router]);

  // ── Bootstrap ─────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.replace('/login'); return; }

    // Validate token against the server BEFORE trusting it.
    // A stale/mismatched JWT (e.g. from a previous Docker secret) will fail here
    // instead of silently failing only when a protected action is triggered.
    checkAuth(t).then(valid => {
      if (!valid) { kickToLogin(); return; }

      setToken(t);

      // Fetch schedule + live match in parallel
      Promise.all([
        fetchAllMatches(),
        fetch(`${API_URL}/api/match`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
      ]).then(([matches, liveData]) => {
        setAllMatches(matches);
        if (liveData) {
          syncState(liveData);
          getSocket().emit('join_match', liveData.match.match_id);
        }
      }).catch(() => kickToLogin());

      const socket = getSocket();
      socket.on('score_update', (updated: MatchState) => { setLiveState(updated); });
      socket.on('schedule_update', (updatedMatches: Match[]) => { setAllMatches(updatedMatches); });
    });

    return () => {
      const socket = getSocket();
      socket.off('score_update');
      socket.off('schedule_update');
    };
  }, [router, syncState, kickToLogin]);

  // ── Quick actions ──────────────────────────────────────────────
  async function handleQuickAction(action: string, value?: number) {
    if (!token || !liveState || busy) return;
    setLastActionLabel(action === 'run' ? String(value ?? 0) : action);
    setBusy(true);
    try {
      const res: ActionResult = await quickAction(token, liveState.match.match_id, action, value);
      syncState(res.state);
      setAllMatches(prev => prev.map(m =>
        m.match_id === res.state.match.match_id
          ? { ...m, runs: res.state.match.runs, wickets: res.state.match.wickets }
          : m
      ));
    } catch (err) {
      if (err instanceof AuthError) { kickToLogin(); return; }
      showToast('Action failed');
    } finally { setBusy(false); }
  }

  async function handleSwap() {
    if (!token || !liveState || busy) return;
    setBusy(true);
    try {
      const res: ActionResult = await swapStrike(token, liveState.match.match_id);
      syncState(res.state);
      showToast('Strike swapped');
    } catch (err) {
      if (err instanceof AuthError) { kickToLogin(); return; }
      showToast('Swap failed');
    } finally { setBusy(false); }
  }

  async function handleSave() {
    if (!token || !form) return;
    setSaving(true);
    try {
      const res: ActionResult = await updateScore(token, {
        match_id: form.match.match_id,
        match: form.match,
        batsmen: form.batsmen,
        bowler: form.bowler,
      });
      syncState(res.state);
      showToast('Saved!');
    } catch (err) {
      if (err instanceof AuthError) { kickToLogin(); return; }
      showToast('Save failed');
    } finally { setSaving(false); }
  }

  async function handleSetLive(matchId: number) {
    if (!token || busy) return;
    setBusy(true);
    try {
      const res = await setMatchLive(token, matchId);
      syncState(res.state);
      setAllMatches(prev => prev.map(m => ({
        ...m,
        is_live: m.match_id === matchId ? 1 : 0,
      })));
      getSocket().emit('join_match', matchId);
      showToast('Match is now LIVE');
    } catch (err) {
      if (err instanceof AuthError) { kickToLogin(); return; }
      showToast('Failed to set live');
    } finally { setBusy(false); }
  }

  async function handleComplete(matchId: number) {
    if (!token || busy) return;
    setBusy(true);
    try {
      await completeMatch(token, matchId);
      setAllMatches(prev => prev.map(m => ({
        ...m,
        is_live: m.match_id === matchId ? 0 : m.is_live,
        is_completed: m.match_id === matchId ? 1 : m.is_completed,
      })));
      setLiveState(null);
      setForm(null);
      showToast('Match marked as done');
    } catch (err) {
      if (err instanceof AuthError) { kickToLogin(); return; }
      showToast('Failed to complete match');
    } finally { setBusy(false); }
  }

  // ── Form helpers ──────────────────────────────────────────────
  function patchMatch(key: keyof Match, value: unknown) {
    setForm(p => p ? { ...p, match: { ...p.match, [key]: value } } : p);
  }
  function patchBatsman(idx: number, key: keyof Batsman, value: unknown) {
    setForm(p => {
      if (!p) return p;
      const b = [...p.batsmen];
      b[idx] = { ...b[idx], [key]: value };
      return { ...p, batsmen: b };
    });
  }
  function patchBowler(key: keyof Bowler, value: unknown) {
    setForm(p => {
      if (!p?.bowler) return p;
      return { ...p, bowler: { ...p.bowler, [key]: value } };
    });
  }

  // ── Render ────────────────────────────────────────────────────
  const live = liveState?.match ?? null;

  return (
    <div className="llr-page min-h-screen text-llr-cream pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-llr-saffron text-llr-ink text-sm font-display font-bold px-5 py-2.5 rounded-full shadow-xl shadow-llr-saffron/25 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-black/50 border-b border-llr-saffron/20 px-4 py-3 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xl drop-shadow-[0_0_10px_rgba(225,154,15,0.25)]">🏏</span>
          <div>
            <p className="text-llr-saffron-glow font-display font-extrabold text-sm leading-tight tracking-tight">
              LLR HALL
            </p>
            <p className="text-llr-muted text-[10px] font-semibold uppercase tracking-widest">Umpire</p>
          </div>
        </div>
        {live ? (
          <div className="text-right">
            <p className="text-xl font-mono font-bold tabular-nums text-llr-cream">
              {live.runs}
              <span className="text-llr-brick">/{live.wickets}</span>
            </p>
            <p className="text-xs text-llr-muted">
              {live.overs}.{live.balls_in_over} ov
              {live.last_ball_result && (
                <span className="ml-1.5 text-llr-saffron font-mono">[{live.last_ball_result}]</span>
              )}
            </p>
          </div>
        ) : (
          <span className="text-xs text-llr-muted">No live match</span>
        )}
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* ── Match Schedule / Selector ─────────────────────── */}
        <section className="llr-card-muted rounded-xl border border-llr-saffron/15 overflow-hidden">
          <button
            onClick={() => setScheduleOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <h3 className="text-[10px] font-display font-bold text-llr-saffron uppercase tracking-[0.2em]">
              Match Schedule
            </h3>
            <svg
              className={`w-4 h-4 text-llr-muted transition-transform ${scheduleOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {scheduleOpen && (
            <div className="border-t border-white/[0.06]">
              {allMatches.length === 0 ? (
                <p className="text-llr-muted text-sm text-center py-4">Loading…</p>
              ) : (
                allMatches.map(m => (
                  <MatchRow
                    key={m.match_id}
                    m={m}
                    onSetLive={() => handleSetLive(m.match_id)}
                    onComplete={() => handleComplete(m.match_id)}
                    busy={busy}
                  />
                ))
              )}
            </div>
          )}
        </section>

        {/* ── Scoring Panel (only shown when a match is live) ── */}
        {live && form ? (
          <>
            {/* Match label */}
            <div className="text-center">
              <p className="text-xs text-llr-saffron/80 font-mono">{live.time_slot}</p>
              <p className="text-llr-cream font-display font-bold">
                {live.team_a_name} <span className="text-llr-muted font-sans font-medium">vs</span> {live.team_b_name}
              </p>
            </div>

            {/* Quick Actions */}
            <section className="llr-card rounded-xl p-4 border border-white/[0.08]">
              <h3 className="text-[10px] font-display font-bold text-llr-muted uppercase tracking-[0.2em] mb-3">
                Quick Actions
              </h3>

              {/* Run buttons */}
              <div className="grid grid-cols-6 gap-2 mb-2">
                {[0, 1, 2, 3, 4, 6].map(r => (
                  <button
                    key={r}
                    onClick={() => handleQuickAction('run', r)}
                    disabled={busy}
                    className={`py-4 rounded-xl font-mono font-bold text-xl transition-all active:scale-90 disabled:opacity-40
                      ${r === 4 ? 'bg-sky-600 hover:bg-sky-500 text-white'
                        : r === 6 ? 'bg-llr-pitch-bright hover:bg-llr-pitch text-white'
                        : r === 0 ? 'bg-llr-panel2 hover:bg-llr-panel text-llr-muted'
                        : 'bg-llr-panel2 hover:bg-llr-panel text-llr-cream'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Extras + Wicket */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Wd',  action: 'wide',    cls: 'bg-llr-saffron hover:bg-llr-saffron-glow text-llr-ink font-display' },
                  { label: 'NB',  action: 'no_ball', cls: 'bg-llr-saffron hover:bg-llr-saffron-glow text-llr-ink font-display' },
                  { label: 'Bye', action: 'bye',     cls: 'bg-llr-panel2 hover:bg-llr-panel text-llr-cream' },
                  { label: 'WKT', action: 'wicket',  cls: 'bg-llr-brick hover:bg-red-600 text-white font-display' },
                ].map(({ label, action, cls }) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    disabled={busy}
                    className={`py-3.5 rounded-xl font-bold transition-all active:scale-90 disabled:opacity-40 ${cls}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Swap */}
              <button
                onClick={handleSwap}
                disabled={busy}
                className="w-full py-2.5 rounded-xl font-medium text-llr-saffron-glow bg-llr-saffron/10 hover:bg-llr-saffron/15 border border-llr-saffron/25 transition disabled:opacity-40 text-sm"
              >
                ⇄ Swap Strike
              </button>

              {lastActionLabel && (
                <p className="text-center text-xs text-llr-muted mt-2">
                  Last: <span className="text-llr-cream font-mono font-medium">{lastActionLabel}</span>
                </p>
              )}
            </section>

            {/* Batsmen */}
            <section className="llr-card-muted rounded-xl border border-white/[0.08] p-4">
              <h3 className="text-[10px] font-display font-bold text-llr-muted uppercase tracking-[0.2em] mb-3">Batsmen</h3>
              {form.batsmen.map((b, idx) => (
                <div
                  key={b.batsman_id}
                  className={`mb-3 last:mb-0 p-3 rounded-lg border ${
                    b.is_striker ? 'bg-llr-saffron/10 border-llr-saffron/25' : 'border-white/[0.06]'
                  }`}
                >
                  <div className="mb-2">
                    {b.is_striker
                      ? <span className="text-llr-saffron-glow text-xs font-display font-bold tracking-wide">★ ON STRIKE</span>
                      : <span className="text-llr-muted text-xs">off strike</span>}
                  </div>
                  <input
                    className="w-full bg-llr-ink rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 mb-2 font-medium text-llr-cream"
                    value={b.name}
                    onChange={e => patchBatsman(idx, 'name', e.target.value)}
                    placeholder="Batsman name"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-llr-muted">Runs
                      <input type="number" min="0"
                        className="block w-full bg-llr-ink rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 font-mono text-llr-cream"
                        value={b.runs}
                        onChange={e => patchBatsman(idx, 'runs', parseInt(e.target.value) || 0)}
                      />
                    </label>
                    <label className="text-xs text-llr-muted">Balls
                      <input type="number" min="0"
                        className="block w-full bg-llr-ink rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 font-mono text-llr-cream"
                        value={b.balls}
                        onChange={e => patchBatsman(idx, 'balls', parseInt(e.target.value) || 0)}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </section>

            {/* Bowler */}
            {form.bowler && (
              <section className="llr-card-muted rounded-xl border border-white/[0.08] p-4">
                <h3 className="text-[10px] font-display font-bold text-llr-muted uppercase tracking-[0.2em] mb-3">Current Bowler</h3>
                <input
                  className="w-full bg-llr-ink rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 mb-2 font-medium text-llr-cream"
                  value={form.bowler.name}
                  onChange={e => patchBowler('name', e.target.value)}
                  placeholder="Bowler name"
                />
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Overs',      key: 'overs' as keyof Bowler },
                    { label: 'Runs Given', key: 'runs_given' as keyof Bowler },
                    { label: 'Wickets',    key: 'wickets' as keyof Bowler },
                  ].map(({ label, key }) => (
                    <label key={key} className="text-xs text-llr-muted">{label}
                      <input type="number" min="0"
                        className="block w-full bg-llr-ink rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 font-mono text-llr-cream"
                        value={form.bowler![key] as number}
                        onChange={e => patchBowler(key, parseInt(e.target.value) || 0)}
                      />
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Match Details */}
            <section className="llr-card-muted rounded-xl border border-white/[0.08] p-4">
              <h3 className="text-[10px] font-display font-bold text-llr-muted uppercase tracking-[0.2em] mb-3">Match Details</h3>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-llr-muted">Team A
                    <input className="block w-full bg-llr-ink rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream"
                      value={form.match.team_a_name}
                      onChange={e => patchMatch('team_a_name', e.target.value)} />
                  </label>
                  <label className="text-xs text-llr-muted">Team B
                    <input className="block w-full bg-llr-ink rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream"
                      value={form.match.team_b_name}
                      onChange={e => patchMatch('team_b_name', e.target.value)} />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Runs',    key: 'runs' as keyof Match },
                    { label: 'Wickets', key: 'wickets' as keyof Match },
                    { label: 'Overs',   key: 'overs' as keyof Match },
                  ].map(({ label, key }) => (
                    <label key={key} className="text-xs text-llr-muted">{label}
                      <input type="number" min="0"
                        className="block w-full bg-llr-ink rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 font-mono text-llr-cream"
                        value={form.match[key] as number}
                        onChange={e => patchMatch(key, parseInt(e.target.value) || 0)} />
                    </label>
                  ))}
                </div>
                <label className="text-xs text-llr-muted block">Last Ball
                  <input className="block w-full bg-llr-ink rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream font-mono"
                    value={form.match.last_ball_result}
                    onChange={e => patchMatch('last_ball_result', e.target.value)}
                    placeholder="e.g. 4, 6, W, Wd" />
                </label>
              </div>
            </section>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-xl font-display font-bold text-lg bg-llr-saffron hover:bg-llr-saffron-glow text-llr-ink disabled:opacity-50 transition active:scale-95 shadow-lg shadow-llr-saffron/20"
            >
              {saving ? 'Saving…' : 'Save Manual Changes'}
            </button>
          </>
        ) : (
          // No live match
          <div className="text-center py-10 llr-card-muted border border-llr-saffron/15 rounded-2xl">
            <p className="text-llr-muted text-sm">
              Select a match above and tap <span className="text-llr-saffron-glow font-display font-bold">Set Live</span> to start scoring
            </p>
          </div>
        )}

        <button
          onClick={() => { localStorage.removeItem('token'); router.replace('/login'); }}
          className="w-full py-3 rounded-xl font-medium text-llr-muted hover:text-llr-cream border border-white/10 hover:border-llr-saffron/30 transition text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
