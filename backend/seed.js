require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/db');

console.log('[seed] LLR Hall Cricket Tournament 2025');

// ── Umpire user ────────────────────────────────────────────────
const passwordHash = bcrypt.hashSync('umpire123', 10);
db.prepare('INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)')
  .run('umpire', passwordHash);
console.log('[seed] User ready: umpire / umpire123');

// ── Tournament schedule ────────────────────────────────────────
const MATCHES = [
  { order: 1,  slot: '4:00 – 4:30',   teamA: 'Sultanate',       teamB: 'Strong Wing'     },
  { order: 2,  slot: '4:30 – 5:00',   teamA: 'Sutta Gang',      teamB: 'Peace Makers'    },
  { order: 3,  slot: '5:00 – 5:30',   teamA: 'SekCEast Mofos',  teamB: 'Charsi'          },
  { order: 4,  slot: '5:30 – 6:00',   teamA: 'Satya-The Don',   teamB: 'HUKUMAT'         },
  { order: 5,  slot: '6:00 – 6:30',   teamA: 'Akram Blasters',  teamB: 'Telugu Models'   },
  { order: 6,  slot: '6:30 – 7:00',   teamA: 'Sultanate',       teamB: 'Sutta Gang'      },
  { order: 7,  slot: '7:00 – 7:30',   teamA: 'Strong Wing',     teamB: 'Peace Makers'    },
  { order: 8,  slot: '7:30 – 8:00',   teamA: 'Charsi',          teamB: 'Telugu Blasters' },
  { order: 9,  slot: '8:00 – 8:30',   teamA: 'HUKUMAT',         teamB: 'Chess Champion'  },
  { order: 10, slot: '8:30 – 9:00',   teamA: '2024 Winners',    teamB: 'Chuchi Lovers'   },
  { order: 11, slot: '9:00 – 9:30',   teamA: 'Sultanate',       teamB: 'Peace Makers'    },
  { order: 12, slot: '9:30 – 10:00',  teamA: 'Strong Wing',     teamB: 'Sutta Gang'      },
  { order: 13, slot: '10:00 – 10:30', teamA: 'SekCEast Mofos',  teamB: 'Telugu Blasters' },
  { order: 14, slot: '10:30 – 11:00', teamA: 'Satya-The Don',   teamB: 'Chess Champion'  },
];

// Detect stale data: wrong count or first match isn't the LLR tournament
const existingCount = db.prepare('SELECT COUNT(*) as c FROM match').get().c;
const firstMatch = existingCount > 0
  ? db.prepare('SELECT team_a_name FROM match ORDER BY match_order ASC, match_id ASC LIMIT 1').get()
  : null;

const isStale = existingCount !== MATCHES.length || firstMatch?.team_a_name !== 'Sultanate';

if (isStale) {
  console.log(`[seed] Stale data detected (${existingCount} matches, first="${firstMatch?.team_a_name || 'none'}") — reseeding...`);
  // Foreign key cascade will remove batsmen + bowlers automatically
  db.prepare('DELETE FROM match').run();

  const insertMatch = db.prepare(`
    INSERT INTO match (title, team_a_name, team_b_name, time_slot, match_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertBatsman = db.prepare(
    'INSERT INTO batsman (match_id, name, runs, balls, is_striker, position) VALUES (?, ?, 0, 0, ?, ?)'
  );
  const insertBowler = db.prepare(
    'INSERT INTO bowler (match_id, name, overs, runs_given, wickets) VALUES (?, ?, 0, 0, 0)'
  );

  db.transaction(() => {
    for (const m of MATCHES) {
      const title = `Match ${m.order} — ${m.teamA} vs ${m.teamB}`;
      const { lastInsertRowid: mid } = insertMatch.run(title, m.teamA, m.teamB, m.slot, m.order);
      insertBatsman.run(mid, 'Batsman 1', 1, 1); // striker
      insertBatsman.run(mid, 'Batsman 2', 0, 2);
      insertBowler.run(mid, 'Bowler 1');
    }
  })();

  console.log(`[seed] Seeded ${MATCHES.length} matches.`);
} else {
  console.log(`[seed] Tournament data already present (${existingCount} matches) — skipping.`);
}

// ── Team squads ────────────────────────────────────────────────
const TEAM_PLAYERS = {
  'Sultanate':       ['Navdeep', 'Keshav', 'Divyam', 'Mandeep', 'Ayush', 'Akshat', 'Rahul', 'Aditya', 'Yaman'],
  'SekCEast Mofos':  ['Ayush', 'Sayan', 'Nikhil', 'Revanth', 'Saurabh', 'Saptarshi', 'Deepak', 'Mirza', 'Alok'],
  'Satya-The Don':   ['Satya', 'Soumya', 'Ankit', 'Abhishek', 'Sagnik', 'Sahil', 'Sohan', 'Ankit B', 'Harshil'],
  'Telugu Models':   ['Tharun', 'Kushal', 'Eswar', 'Srinu', 'Mahender', 'Revanth', 'Sandeep', 'Gaurav'],
  'HUKUMAT':         ['Sujan', 'Arman Barik', 'Krishna Chaudhary', 'Vivek Patel', 'Suryansh Singh', 'Soham Jagtap', 'Naidu', 'Zubair'],
  '2024 Winners':    ['Sharwan', 'Akash', 'Kartik', 'Naidu', 'Ganaeshwer', 'Sumit', 'Hitesh'],
  'Strong Wing':     ['Anmol Dureja', 'Daksh Dadeech', 'Eashaan Vyas', 'Ishan Singh', 'Moulik Mishra', 'Sneh Shekhar', 'Yash Gupta'],
  'Charsi':          ['Suraj Kumar', 'Vikrant Bagra', 'Jai Raj', 'Akash', 'Sneh Shekhar', 'Omkar Karkhile', 'Shiv'],
  'Chuchi Lovers':   ['Saurav', 'Venugopal', 'Devansh', 'Himesh', 'Soumadip', 'Harsh', 'Suvam'],
  'Sutta Gang':      ['Lalit', 'Sarthak', 'Milind', 'Tejaswi', 'Soham', 'Aritra', 'Suthirth', 'Afrin', 'Abhishek'],
  'Peace Makers':    ['Metla Gautam', 'Abhiram Reddy', 'Pabitra', 'Shree Hari', 'Avinash', 'Gunda Gnanesh', 'Prabhav', 'Subham'],
  'Telugu Blasters': ['Ajay', 'Abhiram Naik', 'Vishal B', 'Santosh', 'Srikant', 'Chandu', 'Mohan', 'Yashwant'],
  'Chess Champion':  ['Archit', 'Nadish', 'Nikhil', 'Siddhant', 'Ishan', 'Sanskar', 'Yogesh Singh', 'Naveen'],
  'Akram Blasters':  ['Devansh', 'Jagtar', 'Amish', 'Vishesh', 'Shreyash', 'Vishal Pratap', 'Ayush', 'Yogesh Khatri'],
};

const playerCount = db.prepare('SELECT COUNT(*) as c FROM team_players').get().c;

if (playerCount === 0) {
  console.log('[seed] Seeding team squads...');
  const insertPlayer = db.prepare('INSERT INTO team_players (team_name, player_name) VALUES (?, ?)');
  db.transaction(() => {
    for (const [team, players] of Object.entries(TEAM_PLAYERS)) {
      for (const name of players) {
        insertPlayer.run(team, name);
      }
    }
  })();
  console.log('[seed] Squads seeded.');
} else {
  console.log(`[seed] Squad data already present (${playerCount} players) — skipping.`);
}

console.log('[seed] Done. Delete data/cricket.db to fully reset.');
