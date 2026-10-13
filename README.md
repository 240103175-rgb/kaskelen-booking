# Kaskelen Booking

[![Tests](https://github.com/240103175-rgb/kaskelen-booking/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/240103175-rgb/kaskelen-booking/actions/workflows/test.yml)

Book local services in Kaskelen by the hour: football pitches, barbershops, beauty salons, massage, swimming pools, saunas, gyms and restaurants. Customers see free slots and book in one tap; venue owners confirm bookings and manage their schedule. No overbooking.

Modern responsive design with automatic dark mode.

UI languages: Kazakh (default) and Russian.

## Run locally

Requires Node.js 22.13 or newer (uses the built-in `node:sqlite`).

```bash
npm install
npm start
```

Open http://localhost:3100. On first start the database is created in `data/kaskelen.db` and filled with 15 demo venues across all 8 categories (names and addresses are made up).

### Sign in

Sign-in is by phone number and a 6-digit code. There is no real SMS yet: the code is printed in the server console, and in development it is also shown on the page.

- Any Kazakhstan mobile number (`+7 7xx ...`) signs in as a **customer**.
- `+7 701 000 00 01` is the demo **venue owner** of all demo venues (business panel at `/owner`).

## Tests

```bash
npm test
```

Covers every business rule in `_docs/plan.md` §4 (capacity and overbooking, 3-hour cancellation, evening price, time zone) plus sign-in and the main HTTP flows.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3100` | HTTP port |
| `DB_PATH` | `data/kaskelen.db` | SQLite database file |
| `NODE_ENV` | — | `production` hides the login code, skips demo data and sets secure cookies |

## Project structure

```
src/
  server.js    entry point
  app.js       routes (Express)
  booking.js   booking rules
  auth.js      phone + code sign-in, sessions
  db.js        SQLite schema
  categories.js service categories
  time.js      Asia/Almaty time helpers
  i18n.js      Kazakh and Russian texts
  views.js     HTML pages
  seed.js      demo data
public/style.css
test/          node:test suites
_docs/         plan, process, roles
```

See `AGENTS.md` and `_docs/` for how work on this project is organized.
