# Architecture

```
React UI (frontend/src/pages, components)
   │ only through
BookingApi interface (frontend/src/services/api.ts)
   ├── mockService   — in-browser demo data, same rules (iteration 1)
   └── httpService   — fetch /api/v1 with a bearer token (iteration 4)
          │  contract: openapi.yml (iteration 2)
Express routes (backend/src/app.js) — auth, JSON errors, no business rules
   │
Services (backend/src/services) — booking rules, sign-in
   │ only through
Repository interface
   ├── memory.js — in RAM (iteration 3, STORAGE=memory)
   └── sql.js    — Sequelize ORM, DATABASE_URL (iteration 5, default SQLite)
```

The backend also serves the built React app (`frontend/dist`) with an SPA fallback, so one process runs everything.

## Data model

| Table | Fields |
|---|---|
| users | id, phone (unique), name, role (player/owner/admin), lang (kk/ru), createdAt |
| login_codes | phone (PK), codeHash (SHA-256), expiresAt, createdAt, attempts |
| sessions | token (PK), userId → users, expiresAt |
| venues | id, category, name, address, description, openHour, closeHour, dayPrice, eveningPrice, eveningStartHour, ownerId → users |
| resources | id, venueId → venues, name, capacity ≥ 1 |
| bookings | id, resourceId → resources, userId → users, startAt, price, status (pending/confirmed/cancelled), cancelledBy, createdAt; unique (resourceId, startAt, userId) where not cancelled |
| blocks | id, resourceId → resources, startAt; unique (resourceId, startAt) |

Times are UTC milliseconds in storage and ISO strings in the API; dates and hours in requests are local Asia/Almaty.

## Integrity

- Capacity: the SQL repository counts and inserts inside one `IMMEDIATE` transaction, so concurrent requests cannot take the same last place (tested with 5 parallel requests).
- One place per person per slot: partial unique index.
- Foreign keys on; venue hours and resource capacity validated by the ORM model.
