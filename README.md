# Kaskelen Booking

[![Tests](https://github.com/240103175-rgb/kaskelen-booking/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/240103175-rgb/kaskelen-booking/actions/workflows/test.yml)

Book local services in Kaskelen by the hour: football pitches, barbershops, beauty salons, massage, swimming pools, saunas, gyms and restaurants. Customers see free hours and book in one tap; venue owners confirm bookings, close hours and set prices. No overbooking. Kazakh and Russian.

**Stack:** React + TypeScript + Vite (frontend) · Node.js + Express (API) · Sequelize ORM + SQLite · OpenAPI 3.1 contract · Vitest, node:test, GitHub Actions.

## Run

Requires Node.js 22.13+.

```bash
npm install
npm run build     # build the React app
npm start         # API + app on http://localhost:3100 (SQLite in backend/data/kaskelen.db, demo data on first start)
```

Development with hot reload (API on :3100, Vite on :5173 with a proxy):

```bash
npm run dev
```

Other modes:

| Command | What it does |
|---|---|
| `VITE_API_MODE=mock npm run dev -w frontend` | Frontend only, on in-browser demo data (`mockService`) |
| `STORAGE=memory npm start` | API with in-memory storage (lost on restart) |
| `DATABASE_URL=postgres://… npm start` | Any database Sequelize supports (driver must be installed) |

### Sign in

Phone number + 6-digit code. No real SMS in the MVP: the code is printed in the server console and shown on the page outside production.

- Any `+7 7xx …` number signs in as a **customer**.
- `+7 701 000 00 01` is the demo **venue owner** of all 15 demo venues (business panel at `/owner`).

## Test

```bash
npm test                # backend (memory + SQLite) and frontend
npm run validate:api    # openapi.yml is a valid OpenAPI 3.1 document
```

## Docs

| File | What |
|---|---|
| `chat-brainstorm.md` | Real brainstorm history |
| `_docs/plan.md` | Goals, scope, business rules |
| `_docs/architecture.md` | Layers, data model, iterations |
| `_docs/design-system.md` | Design references and tokens |
| `_docs/test-plan.md` | Test levels and the manual test session |
| `_docs/process.md`, `_docs/task-template.md`, `_docs/team/*.md` | How issues move: PM → QA → engineer → QA engineer |
| `openapi.yml` | API contract |
| `AGENTS.md` | Context for coding agents |
