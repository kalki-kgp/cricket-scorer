const express = require('express');
const db = require('../db');
const { verifyToken } = require('../auth');

function getMatchState(matchId) {
  const match = db.prepare('SELECT * FROM match WHERE match_id = ?').get(matchId);
  if (!match) return null;
  const batsmen = db.prepare(
    'SELECT * FROM batsman WHERE match_id = ? ORDER BY position'
  ).all(matchId);
  const bowler = db.prepare(
    'SELECT * FROM bowler WHERE match_id = ? ORDER BY bowler_id DESC LIMIT 1'
  ).get(matchId);
  const balls = db.prepare(
    'SELECT * FROM ball_log WHERE match_id = ? ORDER BY id DESC LIMIT 30'
  ).all(matchId).reverse();
  return { match, batsmen, bowler: bowler || null, balls };
}

module.exports = function (io) {
  const router = express.Router();

  // ── GET /api/matches ── full tournament schedule (all matches)
  router.get('/matches', (req, res) => {
    const matches = db.prepare(
      'SELECT * FROM match ORDER BY match_order ASC'
    ).all();
    res.json(matches);
  });

  // ── GET /api/matches/:id ── full state for any single match
  router.get('/matches/:id', (req, res) => {
    const matchId = parseInt(req.params.id);
    const state = getMatchState(matchId);
    if (!state) return res.status(404).json({ error: 'Match not found' });
    res.json(state);
  });

  // ── POST /api/matches ── create a new match
  router.post('/matches', verifyToken, (req, res) => {
    const { team_a_name, team_b_name, time_slot, overs_limit } = req.body;
    if (!team_a_name || !team_b_name) {
      return res.status(400).json({ error: 'team_a_name and team_b_name required' });
    }
    const maxOrder = db.prepare('SELECT COALESCE(MAX(match_order), 0) AS m FROM match').get().m;
    const order = maxOrder + 1;
    const title = `${team_a_name} vs ${team_b_name}`;

    const insertMatch = db.prepare(
      'INSERT INTO match (title, team_a_name, team_b_name, time_slot, match_order, overs_limit) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertBatsman = db.prepare(
      'INSERT INTO batsman (match_id, name, runs, balls, is_striker, position) VALUES (?, ?, 0, 0, ?, ?)'
    );
    const insertBowler = db.prepare(
      'INSERT INTO bowler (match_id, name, overs, runs_given, wickets) VALUES (?, ?, 0, 0, 0)'
    );

    let newMatchId;
    db.transaction(() => {
      const { lastInsertRowid: mid } = insertMatch.run(
        title, team_a_name, team_b_name,
        time_slot || '', overs_limit || 6
      );
      newMatchId = mid;
      insertBatsman.run(mid, 'Batsman 1', 1, 1);
      insertBatsman.run(mid, 'Batsman 2', 0, 2);
      insertBowler.run(mid, 'Bowler 1');
    })();

    const matches = db.prepare('SELECT * FROM match ORDER BY match_order ASC').all();
    io.emit('schedule_update', matches);
    res.json({ success: true, match_id: newMatchId, matches });
  });

  // ── PATCH /api/matches/:id ── edit match metadata
  router.patch('/matches/:id', verifyToken, (req, res) => {
    const matchId = parseInt(req.params.id);
    const target = db.prepare('SELECT * FROM match WHERE match_id = ?').get(matchId);
    if (!target) return res.status(404).json({ error: 'Match not found' });

    const teamA = req.body.team_a_name ?? target.team_a_name;
    const teamB = req.body.team_b_name ?? target.team_b_name;
    const timeSlot = req.body.time_slot ?? target.time_slot;
    const oversLimit = req.body.overs_limit ?? target.overs_limit;
    const title = `${teamA} vs ${teamB}`;

    db.prepare(
      'UPDATE match SET title=?, team_a_name=?, team_b_name=?, time_slot=?, overs_limit=? WHERE match_id=?'
    ).run(title, teamA, teamB, timeSlot, oversLimit, matchId);

    const matches = db.prepare('SELECT * FROM match ORDER BY match_order ASC').all();
    io.emit('schedule_update', matches);
    res.json({ success: true, matches });
  });

  // ── POST /api/matches/:id/move ── reorder (swap with neighbour)
  router.post('/matches/:id/move', verifyToken, (req, res) => {
    const matchId = parseInt(req.params.id);
    const { direction } = req.body; // 'up' | 'down'
    const current = db.prepare('SELECT match_id, match_order FROM match WHERE match_id = ?').get(matchId);
    if (!current) return res.status(404).json({ error: 'Match not found' });

    const neighbour = direction === 'up'
      ? db.prepare('SELECT match_id, match_order FROM match WHERE match_order < ? ORDER BY match_order DESC LIMIT 1').get(current.match_order)
      : db.prepare('SELECT match_id, match_order FROM match WHERE match_order > ? ORDER BY match_order ASC  LIMIT 1').get(current.match_order);

    if (!neighbour) return res.json({ success: true, matches: db.prepare('SELECT * FROM match ORDER BY match_order ASC').all() });

    db.transaction(() => {
      db.prepare('UPDATE match SET match_order=? WHERE match_id=?').run(neighbour.match_order, matchId);
      db.prepare('UPDATE match SET match_order=? WHERE match_id=?').run(current.match_order, neighbour.match_id);
    })();

    const matches = db.prepare('SELECT * FROM match ORDER BY match_order ASC').all();
    io.emit('schedule_update', matches);
    res.json({ success: true, matches });
  });

  // ── GET /api/match ── returns the currently live match
  router.get('/match', (req, res) => {
    const match = db.prepare('SELECT * FROM match WHERE is_live = 1').get();
    if (!match) return res.status(404).json({ error: 'No live match found' });
    res.json(getMatchState(match.match_id));
  });

  // ── POST /api/matches/:id/set-live ── activate a match (deactivates others)
  router.post('/matches/:id/set-live', verifyToken, (req, res) => {
    const matchId = parseInt(req.params.id);
    const { overs_limit } = req.body;
    const target = db.prepare('SELECT * FROM match WHERE match_id = ?').get(matchId);
    if (!target) return res.status(404).json({ error: 'Match not found' });
    if (target.is_completed) {
      return res.status(400).json({ error: 'Cannot activate a completed match' });
    }

    db.transaction(() => {
      db.prepare('UPDATE match SET is_live = 0').run(); // deactivate all
      if (overs_limit != null) {
        db.prepare('UPDATE match SET is_live = 1, is_paused = 0, overs_limit = ? WHERE match_id = ?').run(overs_limit, matchId);
      } else {
        db.prepare('UPDATE match SET is_live = 1, is_paused = 0 WHERE match_id = ?').run(matchId);
      }
    })();

    const state = getMatchState(matchId);
    io.emit('schedule_update', db.prepare('SELECT * FROM match ORDER BY match_order ASC').all());
    io.emit('score_update', state);
    res.json({ success: true, state });
  });

  // ── POST /api/matches/:id/pause ── pause the live match
  router.post('/matches/:id/pause', verifyToken, (req, res) => {
    const matchId = parseInt(req.params.id);
    const target = db.prepare('SELECT * FROM match WHERE match_id = ?').get(matchId);
    if (!target) return res.status(404).json({ error: 'Match not found' });
    if (!target.is_live) return res.status(400).json({ error: 'Match is not live' });

    db.prepare(
      'UPDATE match SET is_live = 0, is_paused = 1, is_completed = 0 WHERE match_id = ?'
    ).run(matchId);

    const matches = db.prepare('SELECT * FROM match ORDER BY match_order ASC').all();
    io.emit('schedule_update', matches);
    io.emit('score_update', null); // no live match
    res.json({ success: true });
  });

  // ── POST /api/matches/:id/resume ── resume a paused match (optionally reset scores)
  router.post('/matches/:id/resume', verifyToken, (req, res) => {
    const matchId = parseInt(req.params.id);
    const { reset } = req.body;
    const target = db.prepare('SELECT * FROM match WHERE match_id = ?').get(matchId);
    if (!target) return res.status(404).json({ error: 'Match not found' });
    if (!target.is_paused) return res.status(400).json({ error: 'Match is not paused' });

    db.transaction(() => {
      db.prepare('UPDATE match SET is_live = 0').run(); // deactivate all first
      if (reset) {
        db.prepare(`
          UPDATE match
          SET is_live = 1, is_paused = 0, is_completed = 0,
              runs = 0, wickets = 0, overs = 0, balls_in_over = 0, last_ball_result = ''
          WHERE match_id = ?
        `).run(matchId);
        db.prepare(
          'UPDATE batsman SET runs = 0, balls = 0 WHERE match_id = ?'
        ).run(matchId);
        db.prepare(
          'UPDATE bowler SET overs = 0, balls_bowled = 0, runs_given = 0, wickets = 0 WHERE match_id = ?'
        ).run(matchId);
        db.prepare('DELETE FROM ball_log WHERE match_id = ?').run(matchId);
      } else {
        db.prepare(
          'UPDATE match SET is_live = 1, is_paused = 0, is_completed = 0 WHERE match_id = ?'
        ).run(matchId);
      }
    })();

    const state = getMatchState(matchId);
    const matches = db.prepare('SELECT * FROM match ORDER BY match_order ASC').all();
    io.emit('schedule_update', matches);
    io.emit('score_update', state);
    res.json({ success: true, state });
  });

  // ── POST /api/matches/:id/complete ── mark a match as finished
  router.post('/matches/:id/complete', verifyToken, (req, res) => {
    const matchId = parseInt(req.params.id);
    db.prepare(
      'UPDATE match SET is_live = 0, is_paused = 0, is_completed = 1 WHERE match_id = ?'
    ).run(matchId);

    const matches = db.prepare('SELECT * FROM match ORDER BY match_order ASC').all();
    io.emit('schedule_update', matches);
    io.emit('score_update', null);
    res.json({ success: true, matches });
  });

  // ── GET /api/teams ── all team squads
  router.get('/teams', (req, res) => {
    const rows = db.prepare('SELECT team_name, player_name FROM team_players ORDER BY id ASC').all();
    const result = {};
    for (const row of rows) {
      if (!result[row.team_name]) result[row.team_name] = [];
      result[row.team_name].push(row.player_name);
    }
    res.json(result);
  });

  // ── POST /api/teams/:teamName/players ── replace squad for a team
  router.post('/teams/:teamName/players', verifyToken, (req, res) => {
    const teamName = decodeURIComponent(req.params.teamName);
    const { players } = req.body;
    if (!Array.isArray(players)) {
      return res.status(400).json({ error: 'players must be an array' });
    }
    const filtered = players.map(p => String(p).trim()).filter(Boolean);
    db.transaction(() => {
      db.prepare('DELETE FROM team_players WHERE team_name = ?').run(teamName);
      const insert = db.prepare('INSERT INTO team_players (team_name, player_name) VALUES (?, ?)');
      for (const name of filtered) insert.run(teamName, name);
    })();
    res.json({ success: true, team: teamName, players: filtered });
  });

  // ── POST /api/update-score ── manual full-state update from umpire form
  router.post('/update-score', verifyToken, (req, res) => {
    const { match_id, match, batsmen, bowler } = req.body;
    if (!match_id) return res.status(400).json({ error: 'match_id required' });

    db.transaction(() => {
      if (match) {
        db.prepare(`
          UPDATE match
          SET title=?, team_a_name=?, team_b_name=?,
              runs=?, wickets=?, overs=?, balls_in_over=?, last_ball_result=?,
              overs_limit=?
          WHERE match_id=?
        `).run(
          match.title, match.team_a_name, match.team_b_name,
          match.runs, match.wickets, match.overs,
          match.balls_in_over, match.last_ball_result,
          match.overs_limit ?? 6,
          match_id
        );
      }
      if (batsmen) {
        for (const b of batsmen) {
          db.prepare(`
            UPDATE batsman SET name=?, runs=?, balls=?, is_striker=?
            WHERE batsman_id=?
          `).run(b.name, b.runs, b.balls, b.is_striker ? 1 : 0, b.batsman_id);
        }
      }
      if (bowler) {
        db.prepare(`
          UPDATE bowler SET name=?, overs=?, balls_bowled=?, runs_given=?, wickets=?
          WHERE bowler_id=?
        `).run(
          bowler.name, bowler.overs, bowler.balls_bowled ?? 0,
          bowler.runs_given, bowler.wickets, bowler.bowler_id
        );
      }
    })();

    const state = getMatchState(match_id);
    io.to(`match_${match_id}`).emit('score_update', state);
    res.json({ success: true, state });
  });

  // ── POST /api/quick-action ── single-ball event (run/wide/no-ball/bye/wicket)
  router.post('/quick-action', verifyToken, (req, res) => {
    const { match_id, action, value } = req.body;
    if (!match_id || !action) {
      return res.status(400).json({ error: 'match_id and action required' });
    }

    const matchRow = db.prepare('SELECT * FROM match WHERE match_id = ?').get(match_id);
    if (!matchRow) return res.status(404).json({ error: 'Match not found' });

    const striker = db.prepare(
      'SELECT * FROM batsman WHERE match_id = ? AND is_striker = 1'
    ).get(match_id);
    const currentBowler = db.prepare(
      'SELECT * FROM bowler WHERE match_id = ? ORDER BY bowler_id DESC LIMIT 1'
    ).get(match_id);

    let legalDelivery = true;
    let ballResult = '•';
    let ballRuns = 0;

    // Wrap all writes in a single transaction for atomicity
    try {
    db.transaction(() => {
      switch (action) {
        case 'run': {
          const r = parseInt(value) || 0;
          ballResult = r === 0 ? '•' : String(r);
          ballRuns = r;
          db.prepare(
            'UPDATE match SET runs = runs + ?, last_ball_result = ? WHERE match_id = ?'
          ).run(r, ballResult, match_id);
          if (striker) {
            db.prepare(
              'UPDATE batsman SET runs = runs + ?, balls = balls + 1 WHERE batsman_id = ?'
            ).run(r, striker.batsman_id);
          }
          if (currentBowler) {
            db.prepare(
              'UPDATE bowler SET runs_given = runs_given + ? WHERE bowler_id = ?'
            ).run(r, currentBowler.bowler_id);
          }
          break;
        }
        case 'wide': {
          ballResult = 'Wd'; ballRuns = 1; legalDelivery = false;
          db.prepare(
            'UPDATE match SET runs = runs + 1, last_ball_result = ? WHERE match_id = ?'
          ).run('Wd', match_id);
          if (currentBowler) {
            db.prepare(
              'UPDATE bowler SET runs_given = runs_given + 1 WHERE bowler_id = ?'
            ).run(currentBowler.bowler_id);
          }
          break;
        }
        case 'no_ball': {
          ballResult = 'NB'; ballRuns = 1; legalDelivery = false;
          db.prepare(
            'UPDATE match SET runs = runs + 1, last_ball_result = ? WHERE match_id = ?'
          ).run('NB', match_id);
          if (currentBowler) {
            db.prepare(
              'UPDATE bowler SET runs_given = runs_given + 1 WHERE bowler_id = ?'
            ).run(currentBowler.bowler_id);
          }
          break;
        }
        case 'bye': {
          ballResult = 'B'; ballRuns = 1;
          db.prepare(
            'UPDATE match SET runs = runs + 1, last_ball_result = ? WHERE match_id = ?'
          ).run('B', match_id);
          if (striker) {
            db.prepare(
              'UPDATE batsman SET balls = balls + 1 WHERE batsman_id = ?'
            ).run(striker.batsman_id);
          }
          break;
        }
        case 'wicket': {
          ballResult = 'W'; ballRuns = 0;
          db.prepare(
            'UPDATE match SET wickets = wickets + 1, last_ball_result = ? WHERE match_id = ?'
          ).run('W', match_id);
          if (striker) {
            db.prepare(
              'UPDATE batsman SET balls = balls + 1 WHERE batsman_id = ?'
            ).run(striker.batsman_id);
          }
          if (currentBowler) {
            db.prepare(
              'UPDATE bowler SET wickets = wickets + 1 WHERE bowler_id = ?'
            ).run(currentBowler.bowler_id);
          }
          break;
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Log the ball (capture current over/ball before progression)
      db.prepare(
        'INSERT INTO ball_log (match_id, over_num, ball_num, result, runs, is_legal) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(match_id, matchRow.overs, matchRow.balls_in_over + 1, ballResult, ballRuns, legalDelivery ? 1 : 0);

      // Manage over progression on legal deliveries
      if (legalDelivery) {
        const refreshed = db.prepare(
          'SELECT balls_in_over, overs_limit FROM match WHERE match_id = ?'
        ).get(match_id);
        const newBalls = refreshed.balls_in_over + 1;
        const ballsPerOver = 6; // always 6 balls per over

        if (newBalls >= ballsPerOver) {
          db.prepare(
            'UPDATE match SET overs = overs + 1, balls_in_over = 0 WHERE match_id = ?'
          ).run(match_id);
          if (currentBowler) {
            db.prepare(
              'UPDATE bowler SET overs = overs + 1, balls_bowled = 0 WHERE bowler_id = ?'
            ).run(currentBowler.bowler_id);
          }
        } else {
          db.prepare(
            'UPDATE match SET balls_in_over = ? WHERE match_id = ?'
          ).run(newBalls, match_id);
          if (currentBowler) {
            db.prepare(
              'UPDATE bowler SET balls_bowled = ? WHERE bowler_id = ?'
            ).run(newBalls, currentBowler.bowler_id);
          }
        }
      }
    })(); // end transaction

    const state = getMatchState(match_id);
    io.to(`match_${match_id}`).emit('score_update', state);
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Action failed' });
  }
  });

  // ── POST /api/swap-strike ── swap who is on strike
  router.post('/swap-strike', verifyToken, (req, res) => {
    const { match_id } = req.body;
    if (!match_id) return res.status(400).json({ error: 'match_id required' });
    db.prepare(`
      UPDATE batsman
      SET is_striker = CASE WHEN is_striker = 1 THEN 0 ELSE 1 END
      WHERE match_id = ?
    `).run(match_id);
    const state = getMatchState(match_id);
    io.to(`match_${match_id}`).emit('score_update', state);
    res.json({ success: true, state });
  });

  return router;
};
