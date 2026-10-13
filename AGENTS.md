# AGENTS.md

Context for any AI agent working in this repository. Read it every time.

## Project

**Kaskelen Booking** — a mobile-first web app for booking local services in Kaskelen by the hour: football pitches, barbershops, beauty salons, massage, swimming pools, saunas, gyms and restaurants. Full spec: `_docs/plan.md`.

Stack: Node.js ≥ 22.13, Express 5, server-rendered HTML, plain CSS, SQLite via built-in `node:sqlite`.

## Commands

```bash
npm install        # install dependencies
npm start          # run on http://localhost:3100 (creates data/kaskelen.db with demo data)
npm run dev        # same, restarts on file changes
npm test           # run all tests (node:test)
```

Demo venue owner phone: `+7 701 000 00 01`. In development the login code is shown on the page.

## Where things are

| Path | What |
|---|---|
| `src/booking.js` | Business rules (capacity, cancellation, prices) |
| `src/auth.js` | Phone + code sign-in, sessions |
| `src/db.js` | SQLite schema |
| `src/app.js` | Routes |
| `src/views.js` | HTML pages |
| `src/i18n.js` | Kazakh and Russian texts |
| `test/` | Tests |

## Docs

- `_docs/plan.md` — goals, scope, business rules (§4 is the source of truth).
- `_docs/process.md` — how issues move: groom → implement → QA → close.
- `_docs/task-template.md` — the issue format.
- `_docs/team/pm.md`, `_docs/team/software-engineer.md`, `_docs/team/qa-engineer.md` — role instructions.

If you were not told your role, ask before doing anything.

## Rules

- GitHub issues are the backlog. Work on one issue at a time.
- Do not add dependencies without asking.
- Do not push to `main`; changes go through a pull request.
- Every user-facing string goes through `src/i18n.js` in both Kazakh and Russian.
- Never commit secrets, `.env` files, the `data/` folder or real phone numbers.
- If code and `_docs/plan.md` disagree, raise it in the issue — don't silently pick one.
- Keep code, comments, commits and docs in English.
