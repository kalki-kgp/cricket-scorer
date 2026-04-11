CREATE TABLE IF NOT EXISTS match (
  match_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT    NOT NULL DEFAULT 'Live Match',
  team_a_name    TEXT    NOT NULL DEFAULT 'Team A',
  team_b_name    TEXT    NOT NULL DEFAULT 'Team B',
  time_slot      TEXT    NOT NULL DEFAULT '',
  match_order    INTEGER NOT NULL DEFAULT 0,
  runs           INTEGER NOT NULL DEFAULT 0,
  wickets        INTEGER NOT NULL DEFAULT 0,
  overs          INTEGER NOT NULL DEFAULT 0,
  balls_in_over  INTEGER NOT NULL DEFAULT 0,
  last_ball_result TEXT  NOT NULL DEFAULT '',
  is_live        INTEGER NOT NULL DEFAULT 0,
  is_completed   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS batsman (
  batsman_id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id   INTEGER NOT NULL,
  name       TEXT    NOT NULL DEFAULT '',
  runs       INTEGER NOT NULL DEFAULT 0,
  balls      INTEGER NOT NULL DEFAULT 0,
  is_striker INTEGER NOT NULL DEFAULT 0,
  position   INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (match_id) REFERENCES match(match_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bowler (
  bowler_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id     INTEGER NOT NULL,
  name         TEXT    NOT NULL DEFAULT '',
  overs        INTEGER NOT NULL DEFAULT 0,
  balls_bowled INTEGER NOT NULL DEFAULT 0,
  runs_given   INTEGER NOT NULL DEFAULT 0,
  wickets      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (match_id) REFERENCES match(match_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL
);
