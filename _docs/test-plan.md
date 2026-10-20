# Test plan

## Levels

| Level | Tool | Where | What |
|---|---|---|---|
| Service (unit) | node:test | `backend/test/services.test.js` | Every rule in `_docs/plan.md` §4, run against **both** repositories |
| API contract | node:test + Ajv | `backend/test/api.test.js` | Real HTTP; every response validated against `openapi.yml`; every operation exercised |
| Persistence | node:test | `backend/test/persistence.test.js` | Reopen keeps data; FK / validation / unique rejected; 5 concurrent requests for one place |
| Frontend | Vitest + Testing Library | `frontend/src/test` | Main flows on `mockService`, error + retry state, httpService mapping, date formatting |
| Manual | Browser | below | The running app end to end |

`npm test` runs all automated levels; CI runs them on Node 22 and 24 plus `validate:api` and the frontend build.

## Manual session (QA engineer)

Run `npm run build && npm start`, open http://localhost:3100.

1. Home: 8 categories with counts, category chip filters, Cyrillic search, empty state.
2. Venue: day strip (14 days), slot statuses, places left on pool lanes.
3. Sign in with a new number (code on the page), with a wrong code, with a bad number.
4. Book a free hour → "Броньдарым" shows it as pending; the slot shows "Сіздің броньыңыз".
5. Cancel it; try to cancel within 3 hours (refused).
6. Sign in as `+7 701 000 00 01`: business panel, confirm, block / unblock, settings with invalid and valid values.
7. Restart the server → bookings and sign-in survive.
8. Switch to Russian on every page; check dates.
9. 375 px width, light and dark mode.

Every defect found becomes a `user-test-bug` issue (see `_docs/process.md`).
