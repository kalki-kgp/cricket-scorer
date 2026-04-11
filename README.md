# Cricket Scorer — Live Intra-Hall League Scoring

A real-time cricket scoring web app with a public scoreboard and a protected umpire panel.

## Stack

| Layer     | Tech                                    |
|-----------|-----------------------------------------|
| Frontend  | Next.js 14 (App Router), Tailwind CSS   |
| Backend   | Node.js, Express, Socket.IO             |
| Database  | SQLite (better-sqlite3)                 |
| Auth      | JWT (8h expiry)                         |
| Realtime  | WebSockets via Socket.IO                |

---

## Quick Start (local)

### 1. Backend

```bash
cd backend
cp .env.example .env        # edit JWT_SECRET in production
npm install
npm run seed                # creates DB + default umpire user
npm run dev                 # runs on http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                 # runs on http://localhost:3000
```

### Default credentials

| Field    | Value      |
|----------|------------|
| Username | `umpire`   |
| Password | `umpire123`|

---

## URLs

| Page           | URL                        | Auth required |
|----------------|----------------------------|---------------|
| Public score   | `http://localhost:3000/`   | No            |
| Umpire login   | `http://localhost:3000/login` | No         |
| Umpire panel   | `http://localhost:3000/umpire` | Yes (JWT) |

---

## Docker (production)

```bash
# Copy and customise env vars
cp backend/.env.example .env
# Edit JWT_SECRET and FRONTEND_URL in .env

docker-compose up --build
```

Frontend: http://localhost:3000  
Backend: http://localhost:3001

### Cloud deployment

For platforms like Railway, Render, or DigitalOcean App Platform:

1. Set `NEXT_PUBLIC_API_URL` to your backend's public URL at build time.
2. Set `FRONTEND_URL` on the backend to your frontend's public URL.
3. Set a strong `JWT_SECRET`.
4. Mount a persistent volume at `/app/data` for the SQLite file.

---

## API

| Method | Path                   | Auth | Description                     |
|--------|------------------------|------|---------------------------------|
| POST   | `/api/login`           | No   | Returns JWT token               |
| GET    | `/api/match`           | No   | Returns live match state        |
| POST   | `/api/update-score`    | JWT  | Full manual state update        |
| POST   | `/api/quick-action`    | JWT  | Single ball event               |
| POST   | `/api/swap-strike`     | JWT  | Swap who is on strike           |

### Quick action payload

```json
{
  "match_id": 1,
  "action": "run",
  "value": 4
}
```

`action` values: `run` (with `value` 0–6), `wide`, `no_ball`, `bye`, `wicket`

### WebSocket event

```
score_update  →  { match, batsmen, bowler }
```

Clients join a room by emitting `join_match` with the match ID.

---

## Project structure

```
cricket-scorer/
├── backend/
│   ├── migrations/001_init.sql   # DB schema
│   ├── seed.js                   # Creates default user + match
│   └── src/
│       ├── index.js              # Express + Socket.IO server
│       ├── db.js                 # SQLite connection
│       ├── auth.js               # JWT helpers + middleware
│       ├── socket.js             # Socket.IO setup
│       └── routes/
│           ├── auth.js           # POST /api/login
│           └── match.js          # Match CRUD + quick actions
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # Public scoreboard (SSR + live socket)
│       │   ├── login/page.tsx    # Umpire login
│       │   └── umpire/page.tsx   # Scoring panel
│       ├── components/
│       │   └── LiveScoreboard.tsx
│       ├── lib/
│       │   ├── api.ts            # Fetch wrappers
│       │   └── socket.ts         # Socket.IO singleton
│       └── types/cricket.ts      # TypeScript types
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── README.md
```
