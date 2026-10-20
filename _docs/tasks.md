# Tasks — initial backlog

Cut from `_docs/plan.md` in the iteration order of `_docs/process.md`. Each `###` becomes one GitHub issue labeled `mvp`; then this file is deleted.

## Iteration 0 — Specification

### Specification, process and design references
Goal: the product, the rules and the way of working are written down before any code.
Description: `_docs/plan.md`, `_docs/process.md`, roles, task template, `_docs/design-system.md`, `AGENTS.md`, real brainstorm history.

## Iteration 1 — Frontend with mockService

### Monorepo with backend and frontend workspaces
Goal: one repository, two npm workspaces, one `npm test`.
Description: React + TypeScript + Vite in `frontend/`, Express in `backend/`.

### Frontend service layer and mockService
Goal: UI gets all data through one typed interface, first backed by synthetic cases.
Description: `RetraceApi` interface, `mockService` with demo users and three demo cases; the risk rules live in one pure module used by both mock and backend.

### App shell, design tokens and sign-in
Goal: the dark investigation workspace look, navigation, and email + password sign-in.

### Case list with search, status filter and sorting
Goal: an investigator finds a case quickly among their own cases.

### Case detail and status changes
Goal: a case page with summary, status, counts and a timeline of evidence; status can be changed.

### Evidence management
Goal: add, edit, delete evidence with type, source, date and verification status.

### Entities and relationships
Goal: add entities and link two of them with a typed relationship backed by evidence.

### Relationship graph
Goal: see the case's entities and links as a graph and inspect a node.

### Explainable risk assessment
Goal: see the score, the level and every triggered rule with the evidence behind it.

### Reports
Goal: generate an immutable report snapshot and print it.

### Admin: statistics, users and audit log
Goal: an admin sees all cases, statistics, changes roles and reads the audit log.

### Frontend tests on the mock service
Goal: the main flows are covered by Vitest + Testing Library tests.

## Iteration 2 — API contract

### API contract in openapi.yml
Goal: every endpoint, schema, error and auth rule is described before the backend exists.

## Iteration 3 — Backend in memory

### Backend API with in-memory repositories
Goal: Express API implementing the contract: auth, cases, evidence, entities, relationships, graph, risk, reports, admin, audit.

### API contract and access-control tests
Goal: tests prove responses match the contract and nobody reads another investigator's case.

## Iteration 4 — Connect

### Connect the frontend to the API
Goal: the app works on the real API; mock mode stays available.

## Iteration 5 — SQLite through an ORM

### Sequelize models and SQLite repositories
Goal: data is stored in SQLite through Sequelize without changing services or API responses.

### Persistence and integrity checks
Goal: data survives a restart and the database rejects broken references.

## Iteration 6 — Delivery

### CI for contract, backend, frontend and build
Goal: GitHub Actions checks everything on every push.

### Real user testing session
Goal: the app is run end to end in a browser; every defect becomes a `user-test-bug` issue.

### Documentation of the delivered app
Goal: README, architecture, data model and test plan describe the app as it is.
