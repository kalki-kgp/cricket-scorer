export interface Match {
  match_id: number;
  title: string;
  team_a_name: string;
  team_b_name: string;
  time_slot: string;
  match_order: number;
  runs: number;
  wickets: number;
  overs: number;
  balls_in_over: number;
  last_ball_result: string;
  overs_limit: number;
  /** 1 = Team A bats first; 2 = Team B chases */
  current_innings?: number;
  /** Frozen 1st-innings totals once 2nd innings starts */
  innings1_runs?: number;
  innings1_wickets?: number;
  innings1_overs?: number;
  innings1_balls_in_over?: number;
  is_live: number;
  is_paused: number;
  is_completed: number;
}

export function currentInnings(m: Match): number {
  return m.current_innings ?? 1;
}

/** Side batting in the current innings (1st → Team A, 2nd → Team B). */
export function battingSideName(m: Match): string {
  return currentInnings(m) === 1 ? m.team_a_name : m.team_b_name;
}

/** Runs needed to win in 2nd innings (typical “target” = this + 1 in limited overs). */
export function chaseTargetRuns(m: Match): number | null {
  if (currentInnings(m) !== 2) return null;
  const first = m.innings1_runs ?? 0;
  return first + 1;
}

/** Compact score for schedule rows (live / paused / done). */
export function scheduleInningsScoreLine(
  m: Match,
  ctx: 'live' | 'paused' | 'done'
): string | null {
  const ci = currentInnings(m);
  const i1r = m.innings1_runs ?? 0;
  const i1w = m.innings1_wickets ?? 0;
  const i1Played = i1r > 0 || i1w > 0 || (m.innings1_overs ?? 0) > 0;

  if (ctx === 'done') {
    if (ci >= 2 || i1Played) return `${i1r}/${i1w} · ${m.runs}/${m.wickets}`;
    if (m.runs > 0 || m.wickets > 0) return `${m.runs}/${m.wickets}`;
    return null;
  }
  if (ci >= 2) return `1st ${i1r}/${i1w} · ${m.runs}/${m.wickets}`;
  if (m.runs > 0 || m.wickets > 0) return `${m.runs}/${m.wickets}`;
  return null;
}

export interface Batsman {
  batsman_id: number;
  match_id: number;
  name: string;
  runs: number;
  balls: number;
  is_striker: number;
  position: number;
}

export interface Bowler {
  bowler_id: number;
  match_id: number;
  name: string;
  overs: number;
  balls_bowled: number;
  runs_given: number;
  wickets: number;
}

export interface BallEntry {
  id: number;
  match_id: number;
  over_num: number;
  ball_num: number;
  result: string;
  runs: number;
  is_legal: number;
  innings?: number;
}

export interface MatchState {
  match: Match;
  batsmen: Batsman[];
  bowler: Bowler | null;
  balls: BallEntry[];
}
