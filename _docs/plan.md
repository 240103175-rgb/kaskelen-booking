# Project plan — Kaskelen Booking

## 1. Goal

A mobile-first web app where people in Kaskelen book local services by the hour — football pitches, barbershops, beauty salons, massage, swimming pools, saunas (баня), gyms and restaurants — and venue owners manage their schedule, with no overbooking.

> Scope change (founder decision): the MVP started with football pitches only and was extended to all eight categories above.

## 2. Users

| Role | Needs |
|---|---|
| **Customer** | Find a place by category, book a free slot fast, see and cancel own bookings |
| **Venue owner / admin** | See the day's schedule, confirm or cancel bookings, block slots, set prices and hours |
| **Platform admin** | Add venues and owners |

## 3. MVP scope

### In scope
1. **Sign-in by phone** — phone number + 6-digit one-time code (code is logged to the server console in MVP).
2. **Venue list** — venues grouped by category (football, barbershop, beauty, massage, pool, sauna, gym, restaurant), with search by name or address.
3. **Schedule view** — for each resource of a venue (pitch, barber, massage room, pool lane, table…) and a chosen date, show 1-hour slots inside opening hours with status: free / full / blocked / past, and places left when capacity > 1.
4. **Booking** — a customer books a free slot; the system never lets bookings exceed the resource capacity.
5. **My bookings** — a customer sees upcoming and past bookings; cancels up to 3 hours before start.
6. **Owner dashboard** — owner picks one of their venues and sees bookings for its resources by day; confirms, cancels, blocks or unblocks slots.
7. **Venue settings** — opening hours, day price, evening price, evening start time.
8. **Languages** — UI in Kazakh and Russian, switchable.

### Out of scope (MVP)
Online payment, real SMS/WhatsApp messages, reviews, team finder, services longer or shorter than 1 hour, native mobile apps.

## 4. Business rules

- Slots are 1 hour long and start on the hour.
- A slot can be booked only if it is free, not blocked, and in the future.
- Each resource has a capacity (1 for a pitch, barber or table; more for a pool lane or gym). Active bookings per slot never exceed it (enforced in the database, not only in the UI).
- One customer can hold only one place per resource per slot.
- Customer cancellation is allowed until 3 hours before the slot start; after that only the owner can cancel.
- Price of a slot = evening price if the slot starts at or after the venue's evening start time, otherwise day price.
- All times are in Asia/Almaty time zone.

## 5. Data model (draft)

- **User** — id, phone, name, role (player = customer / owner / admin), language
- **Venue** — id, category, name, address, description, photo, opening time, closing time, day price, evening price, evening start, owner id
- **Resource** — id, venue id, name, capacity (a pitch, barber, room, pool lane, table…)
- **Booking** — id, resource id, user id, start time, price, status (pending / confirmed / cancelled), cancelled by, created at
- **Block** — id, resource id, start time, reason

## 6. Technical approach

See `_docs/architecture.md`. In short:

- **Frontend:** React + TypeScript + Vite, mobile-first; all data through one `BookingApi` interface with a `mockService` and an `httpService`.
- **Contract:** `openapi.yml` (OpenAPI 3.1), validated in CI; API tests check every response against it.
- **Backend:** Node.js + Express; routes → services (business rules) → repository interface.
- **Storage:** in-memory repository first, then **Sequelize ORM** over `DATABASE_URL` (SQLite by default) — DBMS-agnostic.
- Booking status: `pending` (new) → `confirmed` (by owner) or `cancelled`.
- Automated tests for every business rule in section 4; CI on Node 22 and 24.

## 7. Milestones

| # | Milestone | Result |
|---|---|---|
| M0 | Setup | Stack chosen, repo skeleton, CI running tests, local run instructions |
| M1 | Auth | Phone + code sign-in, user roles |
| M2 | Venues & schedule | Categories, venue list, resource schedule view with slot statuses |
| M3 | Booking | Book, my bookings, cancel with 3-hour rule, double-booking protection |
| M4 | Owner tools | Owner dashboard, confirm/cancel, block slots, venue settings |
| M5 | Languages & polish | Kazakh/Russian UI, mobile layout check |
| M6 | Pilot | Deploy, onboard 1–2 real venues per category, collect feedback |

## 8. Success criteria for the pilot

- 3–5 venues live.
- At least 50 bookings made through the app in the first month.
- Zero double bookings.
- Owners say they no longer need the notebook.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Owners keep taking phone bookings and forget to block slots | Owner can add a phone booking in 2 taps |
| Customers don't trust a new app | Owner shares the link in their existing WhatsApp groups |
| No-shows | Track no-shows per user; consider prepayment after MVP |
