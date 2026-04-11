'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  quickAction,
  updateScore,
  swapStrike,
  setMatchLive,
  pauseMatch,
  resumeMatch,
  completeMatch,
  fetchAllMatches,
  fetchAllSquads,
  saveTeamSquad,
  checkAuth,
  fetchMatchById,
  createMatch,
  patchMatch,
  moveMatch,
  AuthError,
} from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { Match, MatchState, Batsman, Bowler, BallEntry } from '@/types/cricket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ActionResult = { success: boolean; state: MatchState };

// ── Player select input (custom dropdown, replaces datalist) ──
function PlayerSelectInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const query = value.toLowerCase();
  const filtered = query
    ? suggestions.filter(s => s.toLowerCase().includes(query))
    : suggestions;

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        placeholder={placeholder}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-0.5 bg-llr-panel2 border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {(filtered.length > 0 ? filtered : suggestions).map(name => (
            <button
              key={name}
              onMouseDown={() => { onChange(name); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-sm transition
                ${name === value ? 'text-llr-saffron-glow bg-llr-saffron/10' : 'text-llr-cream hover:bg-white/[0.05]'}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ball badge ────────────────────────────────────────────────
function BallBadge({ result }: { result: string }) {
  const cls =
    result === 'W'  ? 'bg-llr-brick text-white ring-llr-brick/40' :
    result === '4'  ? 'bg-sky-600 text-white ring-sky-600/40' :
    result === '6'  ? 'bg-llr-pitch-bright text-white ring-llr-pitch/40' :
    result === 'Wd' || result === 'NB' ? 'bg-llr-saffron text-llr-ink ring-llr-saffron/30' :
    result === '•'  ? 'bg-llr-panel text-llr-muted ring-white/5' :
    'bg-llr-panel2 text-llr-cream ring-white/10';
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-mono font-bold ring-1 ${cls}`}>
      {result}
    </span>
  );
}

function BallsDisplay({ balls }: { balls: BallEntry[] }) {
  if (!balls.length) return null;
  // Group by over
  const groups = new Map<number, BallEntry[]>();
  for (const b of balls) {
    if (!groups.has(b.over_num)) groups.set(b.over_num, []);
    groups.get(b.over_num)!.push(b);
  }
  const entries = [...groups.entries()];
  return (
    <div className="flex gap-3 flex-wrap">
      {entries.map(([overNum, bs], gi) => (
        <div key={overNum} className="flex items-center gap-1">
          {gi > 0 && <span className="w-px h-5 bg-white/10 mx-0.5" />}
          <span className="text-[10px] text-llr-muted font-mono mr-0.5">{overNum}.</span>
          {bs.map(b => <BallBadge key={b.id} result={b.result} />)}
        </div>
      ))}
    </div>
  );
}

// ── Add Match Modal ───────────────────────────────────────────
function AddMatchModal({
  allTeamNames,
  onConfirm,
  onClose,
}: {
  allTeamNames: string[];
  onConfirm: (data: { team_a_name: string; team_b_name: string; time_slot: string; overs_limit: number }) => void;
  onClose: () => void;
}) {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [slot, setSlot] = useState('');
  const [overs, setOvers] = useState(6);
  const ok = teamA.trim() && teamB.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-llr-panel2 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm border border-llr-saffron/20 shadow-2xl">
        <p className="text-[10px] font-display font-bold text-llr-saffron uppercase tracking-[0.2em] mb-4">New Match</p>
        <datalist id="add-team-names">
          {allTeamNames.map(n => <option key={n} value={n} />)}
        </datalist>
        <div className="space-y-3">
          <label className="text-xs text-llr-muted block">Team A
            <input list="add-team-names" value={teamA} onChange={e => setTeamA(e.target.value)} placeholder="Team A name"
              className="block w-full bg-llr-ink rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream" />
          </label>
          <label className="text-xs text-llr-muted block">Team B
            <input list="add-team-names" value={teamB} onChange={e => setTeamB(e.target.value)} placeholder="Team B name"
              className="block w-full bg-llr-ink rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-llr-muted block">Time Slot
              <input value={slot} onChange={e => setSlot(e.target.value)} placeholder="e.g. 4:00–4:30"
                className="block w-full bg-llr-ink rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream" />
            </label>
            <label className="text-xs text-llr-muted block">Overs
              <input type="number" min="1" max="50" value={overs} onChange={e => setOvers(parseInt(e.target.value) || 6)}
                className="block w-full bg-llr-ink rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 font-mono text-llr-cream" />
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm text-llr-muted border border-white/10 hover:border-white/20 transition">Cancel</button>
          <button disabled={!ok} onClick={() => onConfirm({ team_a_name: teamA.trim(), team_b_name: teamB.trim(), time_slot: slot.trim(), overs_limit: overs })}
            className="flex-1 py-3 rounded-xl text-sm font-display font-bold bg-llr-saffron hover:bg-llr-saffron-glow text-llr-ink transition disabled:opacity-40">
            Add Match
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Match Modal ──────────────────────────────────────────
function EditMatchModal({
  match,
  onConfirm,
  onClose,
}: {
  match: Match;
  onConfirm: (data: { team_a_name: string; team_b_name: string; time_slot: string; overs_limit: number }) => void;
  onClose: () => void;
}) {
  const [teamA, setTeamA] = useState(match.team_a_name);
  const [teamB, setTeamB] = useState(match.team_b_name);
  const [slot, setSlot] = useState(match.time_slot);
  const [overs, setOvers] = useState(match.overs_limit || 6);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-llr-panel2 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm border border-llr-saffron/20 shadow-2xl">
        <p className="text-[10px] font-display font-bold text-llr-saffron uppercase tracking-[0.2em] mb-4">Edit Match</p>
        <div className="space-y-3">
          <label className="text-xs text-llr-muted block">Team A
            <input value={teamA} onChange={e => setTeamA(e.target.value)}
              className="block w-full bg-llr-ink rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream" />
          </label>
          <label className="text-xs text-llr-muted block">Team B
            <input value={teamB} onChange={e => setTeamB(e.target.value)}
              className="block w-full bg-llr-ink rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-llr-muted block">Time Slot
              <input value={slot} onChange={e => setSlot(e.target.value)}
                className="block w-full bg-llr-ink rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream" />
            </label>
            <label className="text-xs text-llr-muted block">Overs
              <input type="number" min="1" max="50" value={overs} onChange={e => setOvers(parseInt(e.target.value) || 6)}
                className="block w-full bg-llr-ink rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 font-mono text-llr-cream" />
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm text-llr-muted border border-white/10 hover:border-white/20 transition">Cancel</button>
          <button onClick={() => onConfirm({ team_a_name: teamA.trim(), team_b_name: teamB.trim(), time_slot: slot.trim(), overs_limit: overs })}
            className="flex-1 py-3 rounded-xl text-sm font-display font-bold bg-llr-saffron hover:bg-llr-saffron-glow text-llr-ink transition">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Match Details Modal ───────────────────────────────────────
function MatchDetailsModal({
  state,
  onClose,
}: {
  state: MatchState;
  onClose: () => void;
}) {
  const { match, batsmen, bowler, balls } = state;
  const statusLabel = match.is_live ? 'LIVE' : match.is_paused ? 'PAUSED' : match.is_completed ? 'DONE' : 'UPCOMING';
  const statusCls = match.is_live ? 'text-llr-saffron' : match.is_completed ? 'text-llr-muted' : 'text-yellow-400';
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-llr-panel2 rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-mono text-llr-muted">{match.time_slot}</p>
            <span className={`text-[10px] font-display font-bold uppercase tracking-widest ${statusCls}`}>{statusLabel}</span>
          </div>
          <p className="text-base font-display font-bold text-llr-cream">
            {match.team_a_name} <span className="text-llr-muted font-normal text-sm">vs</span> {match.team_b_name}
          </p>
          {(match.is_live || match.is_paused || match.is_completed) && (
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-mono font-bold tabular-nums text-llr-cream">{match.runs}<span className="text-llr-brick">/{match.wickets}</span></span>
              <span className="text-sm text-llr-muted font-mono">{match.overs}.{match.balls_in_over} ov</span>
              <span className="text-xs text-llr-muted">({match.overs_limit} ov match)</span>
            </div>
          )}
        </div>
        {/* Batsmen */}
        {batsmen.length > 0 && (
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <p className="text-[10px] font-display font-bold text-llr-muted uppercase tracking-widest mb-2">Batsmen</p>
            {batsmen.map(b => (
              <div key={b.batsman_id} className={`flex items-center justify-between py-1.5 ${b.is_striker ? 'text-llr-saffron-glow' : 'text-llr-cream/80'}`}>
                <span className="text-sm font-medium">{b.name || '—'} {b.is_striker ? '★' : ''}</span>
                <span className="text-sm font-mono tabular-nums">{b.runs} <span className="text-llr-muted text-xs">({b.balls})</span></span>
              </div>
            ))}
          </div>
        )}
        {/* Bowler */}
        {bowler && (
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <p className="text-[10px] font-display font-bold text-llr-muted uppercase tracking-widest mb-2">Bowler</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-llr-cream font-medium">{bowler.name || '—'}</span>
              <span className="text-xs text-llr-muted font-mono">{bowler.overs}.{bowler.balls_bowled} ov · {bowler.runs_given}R · {bowler.wickets}W</span>
            </div>
          </div>
        )}
        {/* Ball log */}
        {(balls?.length ?? 0) > 0 && (
          <div className="px-5 py-3">
            <p className="text-[10px] font-display font-bold text-llr-muted uppercase tracking-widest mb-2">Ball Log</p>
            <BallsDisplay balls={balls} />
          </div>
        )}
        <div className="px-5 pb-5 pt-2">
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm text-llr-muted border border-white/10 hover:border-white/20 transition">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Match selector row ─────────────────────────────────────────
function MatchRow({
  m,
  onSetLive,
  onPause,
  onResume,
  onResumeReset,
  onComplete,
  onEdit,
  onDetails,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  busy,
}: {
  m: Match;
  onSetLive: () => void;
  onPause: () => void;
  onResume: () => void;
  onResumeReset: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onDetails: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
}) {
  const isLive = Boolean(m.is_live);
  const isPaused = Boolean(m.is_paused);
  const isDone = Boolean(m.is_completed);

  return (
    <div className={`border-b border-white/[0.06] last:border-0 transition-colors
      ${isLive ? 'bg-llr-saffron/10 border-l-2 border-l-llr-saffron' : ''}
      ${isPaused ? 'bg-yellow-500/5 border-l-2 border-l-yellow-500/40' : ''}
      ${isDone ? 'opacity-50' : ''}
    `}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status indicator */}
        <div className="w-5 flex-shrink-0 flex justify-center">
          {isLive ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-llr-saffron-glow opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-llr-saffron" />
            </span>
          ) : isPaused ? (
            <span className="flex gap-0.5">
              <span className="w-[3px] h-3 rounded-sm bg-yellow-500/70" />
              <span className="w-[3px] h-3 rounded-sm bg-yellow-500/70" />
            </span>
          ) : isDone ? (
            <svg className="w-3.5 h-3.5 text-llr-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-llr-panel2 ring-1 ring-white/10" />
          )}
        </div>

        {/* Match info — clickable for details */}
        <button onClick={onDetails} className="flex-1 min-w-0 text-left">
          <p className="text-xs text-llr-muted font-mono">{m.time_slot || '—'}</p>
          <p className="text-sm text-llr-cream font-medium truncate">
            {m.team_a_name} <span className="text-llr-muted">vs</span> {m.team_b_name}
          </p>
          {isPaused && <p className="text-[10px] text-yellow-500/60 font-mono tracking-wide">PAUSED</p>}
        </button>

        {/* Score badge */}
        {(isDone || isPaused || isLive) && m.runs > 0 && (
          <span className="text-xs text-llr-muted tabular-nums flex-shrink-0 font-mono">{m.runs}/{m.wickets}</span>
        )}

        {/* Primary actions */}
        {!isDone && (
          <div className="flex gap-1.5 flex-shrink-0">
            {isLive ? (
              <>
                <button onClick={onPause} disabled={busy}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/30 transition disabled:opacity-40 font-medium">
                  Pause
                </button>
                <button onClick={onComplete} disabled={busy}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-llr-panel2 hover:bg-llr-brick-deep/80 text-llr-cream/90 border border-white/10 hover:border-llr-brick/60 transition disabled:opacity-40 font-medium">
                  Done
                </button>
              </>
            ) : isPaused ? (
              <>
                <button onClick={onResume} disabled={busy}
                  className="text-xs px-2 py-1.5 rounded-lg bg-llr-saffron/15 hover:bg-llr-saffron/25 text-llr-saffron-glow border border-llr-saffron/35 transition disabled:opacity-40 font-display font-semibold">
                  Resume
                </button>
                <button onClick={onResumeReset} disabled={busy}
                  className="text-xs px-2 py-1.5 rounded-lg bg-llr-panel2 hover:bg-llr-panel text-llr-cream/70 border border-white/10 transition disabled:opacity-40 font-medium"
                  title="Resume with scores reset to 0">
                  Reset
                </button>
                <button onClick={onComplete} disabled={busy}
                  className="text-xs px-2 py-1.5 rounded-lg bg-llr-panel2 hover:bg-llr-brick-deep/80 text-llr-cream/90 border border-white/10 hover:border-llr-brick/60 transition disabled:opacity-40 font-medium">
                  Done
                </button>
              </>
            ) : (
              <button onClick={onSetLive} disabled={busy}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-llr-saffron/15 hover:bg-llr-saffron/25 text-llr-saffron-glow border border-llr-saffron/35 transition disabled:opacity-40 font-display font-semibold">
                Set Live
              </button>
            )}
          </div>
        )}
      </div>

      {/* Secondary actions row */}
      <div className="flex items-center gap-3 px-4 pb-2">
        <div className="w-5 flex-shrink-0" />
        <div className="flex items-center gap-2 flex-1">
          <button onClick={onEdit} disabled={busy}
            className="text-[11px] text-llr-muted hover:text-llr-cream transition flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-3 .75.75-3a4 4 0 01.828-1.414z" />
            </svg>
            Edit
          </button>
          <span className="text-white/10">·</span>
          <button onClick={onDetails} disabled={busy}
            className="text-[11px] text-llr-muted hover:text-llr-cream transition">
            Details
          </button>
          {!isFirst && (
            <>
              <span className="text-white/10">·</span>
              <button onClick={onMoveUp} disabled={busy}
                className="text-[11px] text-llr-muted hover:text-llr-cream transition">↑</button>
            </>
          )}
          {!isLast && (
            <>
              <span className="text-white/10">·</span>
              <button onClick={onMoveDown} disabled={busy}
                className="text-[11px] text-llr-muted hover:text-llr-cream transition">↓</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Match Config Modal ─────────────────────────────────────────
function MatchConfigModal({
  match,
  onConfirm,
  onClose,
}: {
  match: Match;
  onConfirm: (config: { overs_limit: number }) => void;
  onClose: () => void;
}) {
  const [oversLimit, setOversLimit] = useState(match.overs_limit || 6);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-llr-panel2 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm border border-llr-saffron/20 shadow-2xl shadow-black/50">
        <p className="text-[10px] font-display font-bold text-llr-saffron uppercase tracking-[0.2em] mb-1">Match Config</p>
        <p className="text-llr-cream font-semibold mb-5 truncate">
          {match.team_a_name} <span className="text-llr-muted font-normal">vs</span> {match.team_b_name}
        </p>
        <label className="text-xs text-llr-muted block mb-4">
          Overs
          <input
            type="number" min="1" max="50"
            className="block w-full bg-llr-ink rounded-lg px-3 py-2.5 text-base mt-1.5 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 font-mono text-llr-cream"
            value={oversLimit}
            onChange={e => setOversLimit(parseInt(e.target.value) || 6)}
          />
        </label>
        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm text-llr-muted border border-white/10 hover:border-white/20 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ overs_limit: oversLimit })}
            className="flex-1 py-3 rounded-xl text-sm font-display font-bold bg-llr-saffron hover:bg-llr-saffron-glow text-llr-ink transition shadow-lg shadow-llr-saffron/20"
          >
            Set Live
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Player add combobox ────────────────────────────────────────
function PlayerAddDropdown({
  allPlayerNames,
  existingPlayers,
  onAdd,
}: {
  allPlayerNames: string[];
  existingPlayers: string[];
  onAdd: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const suggestions = allPlayerNames
    .filter(n => !existingPlayers.includes(n) && n.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const canCreate = query.trim() && !allPlayerNames.includes(query.trim());

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        placeholder="Search or add player…"
        className="w-full bg-llr-ink rounded-lg px-3 py-1.5 text-sm border border-llr-saffron/30 text-llr-cream outline-none focus:ring-2 focus:ring-llr-saffron/35 placeholder:text-llr-muted/50"
      />
      {open && (suggestions.length > 0 || canCreate) && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-llr-panel2 border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
          {suggestions.map(name => (
            <button
              key={name}
              onMouseDown={() => { onAdd(name); setQuery(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-llr-cream hover:bg-llr-saffron/10 transition"
            >
              {name}
            </button>
          ))}
          {canCreate && (
            <button
              onMouseDown={() => { onAdd(query.trim()); setQuery(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-llr-saffron-glow hover:bg-llr-saffron/10 transition border-t border-white/[0.06]"
            >
              + Add &ldquo;{query.trim()}&rdquo;
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
  const [squadsOpen, setSquadsOpen] = useState(false);
  const [squadDraft, setSquadDraft] = useState<Record<string, string[]>>({});
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [savingSquad, setSavingSquad] = useState<string | null>(null);
  const [squadsLoaded, setSquadsLoaded] = useState(false);
  const [configModalMatch, setConfigModalMatch] = useState<Match | null>(null);
  const [addMatchOpen, setAddMatchOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [detailsState, setDetailsState] = useState<MatchState | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  const syncState = useCallback((state: MatchState) => {
    const safe = { ...state, balls: state.balls ?? [] };
    setLiveState(safe);
    setForm(JSON.parse(JSON.stringify(safe)));
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

      // Fetch schedule, live match, and squads in parallel
      Promise.all([
        fetchAllMatches(),
        fetch(`${API_URL}/api/match`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
        fetchAllSquads(),
      ]).then(([matches, liveData, squads]) => {
        setAllMatches(matches);
        if (liveData) {
          syncState(liveData);
          getSocket().emit('join_match', liveData.match.match_id);
        }
        setSquadDraft(squads);
        setSquadsLoaded(true);
      }).catch(() => kickToLogin());

      const socket = getSocket();
      socket.on('score_update', (updated: MatchState) => {
        if (updated) setLiveState({ ...updated, balls: updated.balls ?? [] });
        else setLiveState(null);
      });
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

  async function handleSetLive(matchId: number, config: { overs_limit: number }) {
    if (!token || busy) return;
    setConfigModalMatch(null);
    setBusy(true);
    try {
      const res = await setMatchLive(token, matchId, config);
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
        is_paused: m.match_id === matchId ? 0 : m.is_paused,
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

  async function handlePause(matchId: number) {
    if (!token || busy) return;
    setBusy(true);
    try {
      await pauseMatch(token, matchId);
      setAllMatches(prev => prev.map(m => ({
        ...m,
        is_live: m.match_id === matchId ? 0 : m.is_live,
        is_paused: m.match_id === matchId ? 1 : m.is_paused,
      })));
      setLiveState(null);
      setForm(null);
      showToast('Match paused');
    } catch (err) {
      if (err instanceof AuthError) { kickToLogin(); return; }
      showToast('Failed to pause match');
    } finally { setBusy(false); }
  }

  async function handleResume(matchId: number, reset: boolean) {
    if (!token || busy) return;
    setBusy(true);
    try {
      const res = await resumeMatch(token, matchId, reset);
      syncState(res.state);
      setAllMatches(prev => prev.map(m => ({
        ...m,
        is_live: m.match_id === matchId ? 1 : 0,
        is_paused: m.match_id === matchId ? 0 : m.is_paused,
      })));
      getSocket().emit('join_match', matchId);
      showToast(reset ? 'Match reset & resumed' : 'Match resumed');
    } catch (err) {
      if (err instanceof AuthError) { kickToLogin(); return; }
      showToast('Failed to resume match');
    } finally { setBusy(false); }
  }

  async function handleCreateMatch(data: { team_a_name: string; team_b_name: string; time_slot: string; overs_limit: number }) {
    if (!token) return;
    setBusy(true);
    try {
      const res = await createMatch(token, data);
      setAllMatches(res.matches);
      setAddMatchOpen(false);
      showToast('Match added!');
    } catch (err) {
      if (err instanceof AuthError) { kickToLogin(); return; }
      showToast('Failed to add match');
    } finally { setBusy(false); }
  }

  async function handleEditMatch(matchId: number, data: Parameters<typeof patchMatch>[2]) {
    if (!token) return;
    setBusy(true);
    try {
      const res = await patchMatch(token, matchId, data);
      setAllMatches(res.matches);
      setEditingMatch(null);
      showToast('Match updated');
    } catch (err) {
      if (err instanceof AuthError) { kickToLogin(); return; }
      showToast('Update failed');
    } finally { setBusy(false); }
  }

  async function handleMoveMatch(matchId: number, direction: 'up' | 'down') {
    if (!token || busy) return;
    setBusy(true);
    try {
      const res = await moveMatch(token, matchId, direction);
      setAllMatches(res.matches);
    } catch (err) {
      if (err instanceof AuthError) { kickToLogin(); return; }
      showToast('Reorder failed');
    } finally { setBusy(false); }
  }

  async function openDetails(match: Match) {
    // For live match use already-loaded state; otherwise fetch
    if (liveState && liveState.match.match_id === match.match_id) {
      setDetailsState(liveState);
      return;
    }
    setLoadingDetails(true);
    const s = await fetchMatchById(match.match_id);
    setLoadingDetails(false);
    if (s) setDetailsState(s);
  }

  // ── Form helpers ──────────────────────────────────────────────
  function patchFormMatch(key: keyof Match, value: unknown) {
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
  const allKnownPlayers = [...new Set(Object.values(squadDraft).flat())].filter(Boolean).sort();
  const matchTeamPlayers = live
    ? [...(squadDraft[live.team_a_name] ?? []), ...(squadDraft[live.team_b_name] ?? [])].filter(Boolean)
    : [];

  return (
    <div className="llr-page min-h-screen text-llr-cream pb-24">
      {/* Match config modal */}
      {configModalMatch && (
        <MatchConfigModal
          match={configModalMatch}
          onConfirm={config => handleSetLive(configModalMatch.match_id, config)}
          onClose={() => setConfigModalMatch(null)}
        />
      )}
      {/* Add match modal */}
      {addMatchOpen && (
        <AddMatchModal
          allTeamNames={[...new Set(allMatches.flatMap(m => [m.team_a_name, m.team_b_name]))].sort()}
          onConfirm={handleCreateMatch}
          onClose={() => setAddMatchOpen(false)}
        />
      )}
      {/* Edit match modal */}
      {editingMatch && (
        <EditMatchModal
          match={editingMatch}
          onConfirm={data => handleEditMatch(editingMatch.match_id, data)}
          onClose={() => setEditingMatch(null)}
        />
      )}
      {/* Match details modal */}
      {detailsState && (
        <MatchDetailsModal state={detailsState} onClose={() => setDetailsState(null)} />
      )}
      {/* Details loading overlay */}
      {loadingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <p className="text-llr-saffron font-display font-bold text-sm">Loading…</p>
        </div>
      )}

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
                <>
                  {allMatches.map((m, idx) => (
                    <MatchRow
                      key={m.match_id}
                      m={m}
                      onSetLive={() => setConfigModalMatch(m)}
                      onPause={() => handlePause(m.match_id)}
                      onResume={() => handleResume(m.match_id, false)}
                      onResumeReset={() => handleResume(m.match_id, true)}
                      onComplete={() => handleComplete(m.match_id)}
                      onEdit={() => setEditingMatch(m)}
                      onDetails={() => openDetails(m)}
                      onMoveUp={() => handleMoveMatch(m.match_id, 'up')}
                      onMoveDown={() => handleMoveMatch(m.match_id, 'down')}
                      isFirst={idx === 0}
                      isLast={idx === allMatches.length - 1}
                      busy={busy}
                    />
                  ))}
                  <button
                    onClick={() => setAddMatchOpen(true)}
                    className="w-full py-3 text-xs text-llr-saffron-glow/70 hover:text-llr-saffron-glow border-t border-white/[0.06] transition font-display font-semibold"
                  >
                    + Add Match
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        {/* ── Team Squads ──────────────────────────────────────── */}
        <section className="llr-card-muted rounded-xl border border-llr-saffron/15 overflow-hidden">
          <button
            onClick={() => {
              setSquadsOpen(o => !o);
              if (!squadsLoaded) {
                fetchAllSquads().then(data => {
                  setSquadDraft(JSON.parse(JSON.stringify(data)));
                  setSquadsLoaded(true);
                });
              }
            }}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <h3 className="text-[10px] font-display font-bold text-llr-saffron uppercase tracking-[0.2em]">
              Team Squads
            </h3>
            <svg
              className={`w-4 h-4 text-llr-muted transition-transform ${squadsOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {squadsOpen && (
            <div className="border-t border-white/[0.06]">
              {!squadsLoaded ? (
                <p className="text-llr-muted text-sm text-center py-4">Loading squads…</p>
              ) : (
                [...new Set(allMatches.flatMap(m => [m.team_a_name, m.team_b_name]))].sort().map(team => {
                  const isExpanded = expandedTeam === team;
                  const draft = squadDraft[team] ?? [];
                  return (
                    <div key={team} className="border-b border-white/[0.06] last:border-0">
                      <button
                        onClick={() => setExpandedTeam(isExpanded ? null : team)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.02]"
                      >
                        <span className="text-sm text-llr-cream font-medium">{team}</span>
                        <span className="text-xs text-llr-muted">
                          {draft.filter(Boolean).length} players {isExpanded ? '▲' : '▶'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-1.5">
                          {/* Existing players — editable inline with suggestions */}
                          <datalist id={`players-${team.replace(/\s+/g, '-')}`}>
                            {allKnownPlayers.map(n => <option key={n} value={n} />)}
                          </datalist>
                          {draft.map((name, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input
                                list={`players-${team.replace(/\s+/g, '-')}`}
                                className="flex-1 bg-llr-ink rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream"
                                value={name}
                                placeholder="Player name"
                                onChange={e => {
                                  const updated = [...draft];
                                  updated[idx] = e.target.value;
                                  setSquadDraft(p => ({ ...p, [team]: updated }));
                                }}
                              />
                              <button
                                onClick={() => {
                                  setSquadDraft(p => ({
                                    ...p,
                                    [team]: draft.filter((_, i) => i !== idx),
                                  }));
                                }}
                                className="text-llr-brick hover:text-red-400 text-xl leading-none px-1 flex-shrink-0"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {/* Player search/add combobox */}
                          <PlayerAddDropdown
                            allPlayerNames={allKnownPlayers}
                            existingPlayers={draft.filter(Boolean)}
                            onAdd={name => setSquadDraft(p => ({ ...p, [team]: [...(p[team] ?? []), name] }))}
                          />
                          <button
                            disabled={savingSquad === team}
                            onClick={async () => {
                              if (!token) return;
                              setSavingSquad(team);
                              try {
                                const cleaned = draft.filter(Boolean);
                                await saveTeamSquad(token, team, cleaned);
                                setSquadDraft(p => ({ ...p, [team]: cleaned }));
                                showToast(`${team} squad saved`);
                              } catch (err) {
                                if (err instanceof AuthError) { kickToLogin(); return; }
                                showToast('Save failed');
                              } finally { setSavingSquad(null); }
                            }}
                            className="w-full py-2 rounded-lg bg-llr-saffron/15 hover:bg-llr-saffron/25 text-llr-saffron-glow border border-llr-saffron/30 text-sm font-display font-semibold transition disabled:opacity-40 mt-1"
                          >
                            {savingSquad === team ? 'Saving…' : 'Save Squad'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
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

            {/* Ball log */}
            {liveState && (liveState.balls?.length ?? 0) > 0 && (
              <section className="llr-card-muted rounded-xl border border-white/[0.08] p-4">
                <h3 className="text-[10px] font-display font-bold text-llr-muted uppercase tracking-[0.2em] mb-3">This Over</h3>
                <BallsDisplay balls={liveState.balls} />
              </section>
            )}

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
                  <PlayerSelectInput
                    value={b.name}
                    onChange={v => patchBatsman(idx, 'name', v)}
                    suggestions={matchTeamPlayers}
                    placeholder="Select batsman"
                    className="w-full bg-llr-ink rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 mb-2 font-medium text-llr-cream"
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
                <PlayerSelectInput
                  value={form.bowler.name}
                  onChange={v => patchBowler('name', v)}
                  suggestions={matchTeamPlayers}
                  placeholder="Select bowler"
                  className="w-full bg-llr-ink rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 mb-2 font-medium text-llr-cream"
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
                      onChange={e => patchFormMatch('team_a_name', e.target.value)} />
                  </label>
                  <label className="text-xs text-llr-muted">Team B
                    <input className="block w-full bg-llr-ink rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream"
                      value={form.match.team_b_name}
                      onChange={e => patchFormMatch('team_b_name', e.target.value)} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Runs',        key: 'runs' as keyof Match },
                    { label: 'Wickets',     key: 'wickets' as keyof Match },
                    { label: 'Overs Done',  key: 'overs' as keyof Match },
                    { label: 'Overs Limit', key: 'overs_limit' as keyof Match },
                  ].map(({ label, key }) => (
                    <label key={key} className="text-xs text-llr-muted">{label}
                      <input type="number" min="0"
                        className="block w-full bg-llr-ink rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 font-mono text-llr-cream"
                        value={form.match[key] as number}
                        onChange={e => patchFormMatch(key, parseInt(e.target.value) || 0)} />
                    </label>
                  ))}
                </div>
                <label className="text-xs text-llr-muted block">Last Ball
                  <input className="block w-full bg-llr-ink rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-llr-saffron/35 border border-white/10 text-llr-cream font-mono"
                    value={form.match.last_ball_result}
                    onChange={e => patchFormMatch('last_ball_result', e.target.value)}
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
