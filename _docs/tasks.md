# Tasks — v1 backlog

The rebuild of Kaskelen Booking in the iteration order the course requires. Each section becomes one GitHub issue labeled `mvp`; after that this file is deleted.

## Iteration 1 — Frontend with mockService

### Restructure the repository into backend and frontend workspaces
Goal: one repository with `backend/` and `frontend/` npm workspaces and one `npm test` for both.
Description: Move the current server code to `backend/`, create a React + Vite + TypeScript app in `frontend/`. The server-rendered pages are retired once the React app covers them.

### Design references and design system
Goal: the coding agent builds the UI from written references, not from guesswork.
Description: `_docs/design-system.md` with reference products, tokens (colour, type, radius, spacing), components and states (loading, empty, error).

### Frontend service layer with mockService
Goal: UI components get all data through one typed service interface, first backed by realistic mock data.
Description: `frontend/src/services` — types, the interface, `mockService` with 15 demo venues in 8 categories, simulated latency and errors.

### Home page: categories, search and venue list
Goal: a customer finds a place by category or by name/address on the mock data.

### Venue page: day schedule and booking
Goal: a customer picks a day and a free hour and books it on the mock data.

### Phone sign-in flow
Goal: sign in with phone number and a 6-digit code on the mock data.

### My bookings and cancellation
Goal: a customer sees upcoming and past bookings and cancels up to 3 hours before start.

### Business panel and venue settings
Goal: an owner sees each day's bookings, confirms/cancels, blocks hours and edits hours and prices.

### Kazakh and Russian translations in the frontend
Goal: every screen in Kazakh (default) and Russian, switchable anywhere.

### Frontend tests on the mock service
Goal: the main user flows are covered by Vitest + Testing Library tests against `mockService`.

## Iteration 2 — API contract

### Describe the API in openapi.yml
Goal: every endpoint, schema, error code and auth rule is written down before the backend exists.

## Iteration 3 — Backend with in-memory storage

### Backend API with in-memory repositories
Goal: an Express API under `/api/v1` implements the contract with business services over in-memory repositories.

### API contract tests
Goal: tests prove every API response matches `openapi.yml`, including errors.

## Iteration 4 — Connect frontend and backend

### Connect the frontend to the real API
Goal: the frontend uses `httpService` against the backend, with loading, error and retry states; mock mode stays available.

## Iteration 5 — SQLite through an ORM

### Persist data in SQLite through Sequelize
Goal: Sequelize repositories replace the in-memory ones without changing services or API responses; `DATABASE_URL` selects the database.

### Verify persistence and data integrity
Goal: data survives a backend restart and the database rejects broken references and overbooking.

## Iteration 6 — Delivery

### CI for backend, frontend and contract
Goal: GitHub Actions runs backend tests, frontend tests, OpenAPI validation and the frontend build.

### Real user testing session
Goal: the app is run and clicked through end to end; every defect found becomes a `user-test-bug` issue.

### Documentation for the new architecture
Goal: README, AGENTS.md, architecture, data model and test plan describe the app as it is.

### Brainstorm history from the real chat
Goal: `chat-brainstorm.md` contains the real brainstorm conversation, not a reconstruction.
