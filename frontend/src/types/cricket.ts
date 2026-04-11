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
  is_live: number;
  is_paused: number;
  is_completed: number;
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
}

export interface MatchState {
  match: Match;
  batsmen: Batsman[];
  bowler: Bowler | null;
  balls: BallEntry[];
}
