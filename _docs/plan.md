# Project plan — Kaskelen Booking

## 1. Goal

A mobile-first web app where players in Kaskelen book football pitches by the hour, and venue owners manage their schedule — with no double bookings.

## 2. Users

| Role | Needs |
|---|---|
| **Player** | Find a free slot fast, book it, see and cancel own bookings |
| **Venue owner / admin** | See the day's schedule, confirm or cancel bookings, block slots, set prices and hours |
| **Platform admin** | Add venues and owners |

## 3. MVP scope

### In scope
1. **Sign-in by phone** — phone number + 6-digit one-time code (code is logged to the server console in MVP).
2. **Venue list** — venues with name, address, photo, pitches.
3. **Schedule view** — for a chosen pitch and date, show 1-hour slots inside opening hours with status: free / booked / blocked.
4. **Booking** — a player books a free slot; the system guarantees one booking per pitch per slot.
5. **My bookings** — a player sees upcoming and past bookings; cancels up to 3 hours before start.
6. **Owner dashboard** — owner sees bookings for their pitches by day; confirms, cancels, blocks or unblocks slots.
7. **Venue settings** — opening hours, day price, evening price, evening start time.
8. **Languages** — UI in Kazakh and Russian, switchable.

### Out of scope (MVP)
Online payment, real SMS/WhatsApp messages, reviews, team finder, non-football venues, native mobile apps.

## 4. Business rules

- Slots are 1 hour long and start on the hour.
- A slot can be booked only if it is free, not blocked, and in the future.
- Only one active booking per pitch per slot (enforced in the database, not only in the UI).
- Player cancellation is allowed until 3 hours before the slot start; after that only the owner can cancel.
- Price of a slot = evening price if the slot starts at or after the venue's evening start time, otherwise day price.
- All times are in Asia/Almaty time zone.

## 5. Data model (draft)

- **User** — id, phone, name, role (player / owner / admin), language
- **Venue** — id, name, address, photo, opening time, closing time, day price, evening price, evening start, owner id
- **Pitch** — id, venue id, name
- **Booking** — id, pitch id, user id, start time, status (active / cancelled), cancelled by, created at
- **Block** — id, pitch id, start time, reason

## 6. Technical approach

- Single web application, mobile-first, server-rendered or SPA + API — decided in milestone M0 and recorded here.
- Relational database (PostgreSQL or SQLite for local development).
- Automated tests for every business rule in section 4.
- Deployed to one small server; configuration through environment variables.

## 7. Milestones

| # | Milestone | Result |
|---|---|---|
| M0 | Setup | Stack chosen, repo skeleton, CI running tests, local run instructions |
| M1 | Auth | Phone + code sign-in, user roles |
| M2 | Venues & schedule | Venue list, pitch schedule view with slot statuses |
| M3 | Booking | Book, my bookings, cancel with 3-hour rule, double-booking protection |
| M4 | Owner tools | Owner dashboard, confirm/cancel, block slots, venue settings |
| M5 | Languages & polish | Kazakh/Russian UI, mobile layout check |
| M6 | Pilot | Deploy, onboard 3–5 real pitches, collect feedback |

## 8. Success criteria for the pilot

- 3–5 venues live.
- At least 50 bookings made through the app in the first month.
- Zero double bookings.
- Owners say they no longer need the notebook.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Owners keep taking phone bookings and forget to block slots | Owner can add a phone booking in 2 taps |
| Players don't trust a new app | Owner shares the link in their existing WhatsApp groups |
| No-shows | Track no-shows per user; consider prepayment after MVP |
