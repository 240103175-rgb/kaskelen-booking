# AGENTS.md

Context for any AI agent working in this repository. Read it every time.

## Project

**Kaskelen Booking** — a mobile-first web app for booking local services in Kaskelen by the hour: football pitches, barbershops, beauty salons, massage, swimming pools, saunas, gyms and restaurants. Full spec: `_docs/plan.md`.

Stack: React + TypeScript + Vite (`frontend/`), Node.js ≥ 22.13 + Express 5 (`backend/`), Sequelize ORM over SQLite, OpenAPI 3.1 contract (`openapi.yml`). Architecture: `_docs/architecture.md`.

## Commands

```bash
npm install            # install both workspaces
npm run dev            # API on :3100 + Vite on :5173
npm run build          # build the React app
npm start              # API + built app on http://localhost:3100 (SQLite)
npm test               # backend + frontend tests
npm run validate:api   # validate openapi.yml
```

Demo venue owner phone: `+7 701 000 00 01`. Outside production the login code is shown on the page.

## Where things are

| Path | What |
|---|---|
| `openapi.yml` | API contract — change it first, then the code |
| `backend/src/services/` | Business rules (booking, sign-in) |
| `backend/src/repositories/` | `memory.js` and `sql.js` (Sequelize) — same interface |
| `backend/src/app.js` | Routes and JSON errors |
| `frontend/src/services/` | `BookingApi` interface, `mockService`, `httpService` |
| `frontend/src/pages/` | Screens |
| `frontend/src/lib/dictionaries.ts` | Kazakh and Russian texts |

## Docs

- `_docs/plan.md` — goals, scope, business rules (§4 is the source of truth).
- `_docs/process.md` — how issues move: groom → test cases → implement → QA engineer verifies and closes.
- `_docs/architecture.md`, `_docs/design-system.md`, `_docs/test-plan.md`.
- `_docs/task-template.md` — the issue format.
- `_docs/team/pm.md`, `_docs/team/qa.md`, `_docs/team/software-engineer.md`, `_docs/team/qa-engineer.md` — role instructions.

If you were not told your role, ask before doing anything.

## Rules

- GitHub issues are the backlog. Work on one issue at a time.
- Do not add dependencies without asking.
- Do not push to `main`; changes go through a pull request.
- Every user-facing string goes through `frontend/src/lib/dictionaries.ts` in both Kazakh and Russian.
- Never commit secrets, `.env` files, the `data/` folder or real phone numbers.
- If code and `_docs/plan.md` disagree, raise it in the issue — don't silently pick one.
- Keep code, comments, commits and docs in English.
