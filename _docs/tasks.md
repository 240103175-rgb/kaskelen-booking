# Tasks — initial backlog

Cut from `_docs/plan.md`. Each section becomes one GitHub issue; after that this file is deleted and the issues are the backlog.

## 1. Project setup and database schema

Goal: an empty but runnable Node.js project with the SQLite schema for users, venues, resources, bookings, blocks and sessions.

Description: Choose the stack (M0), create `package.json`, the database module and Asia/Almaty time helpers. `npm start` runs a server, `npm test` runs tests.

## 2. Run tests on every push (CI)

Goal: every push and pull request runs `npm test` on GitHub, and a red build is visible on the PR.

Description: Add a GitHub Actions workflow. Plan milestone M0 lists "CI running tests".

## 3. Sign in with phone number and one-time code

Goal: a customer signs in with a Kazakhstan phone number and a 6-digit code.

Description: No real SMS in the MVP — the code is printed in the server console (and shown on the page in development). Sessions in a cookie. New numbers become customers automatically.

## 4. Service categories, venue list and search

Goal: the home page lists venues of all 8 categories, filterable by category and searchable by name or address.

Description: Categories: football, barbershop, beauty salon, massage, pool, sauna, gym, restaurant. Demo data for each category.

## 5. Venue page with the day schedule

Goal: a venue page shows each bookable resource with 1-hour slots for a chosen day and their status.

Description: Resources are pitches, barbers, rooms, pool lanes, tables. Statuses free / full / blocked / past; places left when a resource takes several people.

## 6. Book a slot without overbooking

Goal: a signed-in customer books a free slot in one tap and the system never exceeds a resource's capacity.

Description: Day/evening price, one place per person per slot, rule enforced by the database.

## 7. My bookings and cancellation

Goal: a customer sees upcoming and past bookings and cancels up to 3 hours before start.

## 8. Business panel: confirm, cancel and block slots

Goal: a venue owner sees each day's bookings with customer contacts and manages them.

## 9. Venue settings

Goal: an owner changes opening hours, day price, evening price and the evening start hour.

## 10. Kazakh and Russian interface

Goal: every page is available in Kazakh (default) and Russian, switchable from any page.

## 11. Modern responsive design

Goal: the site looks like a modern booking product on phones and desktops, including dark mode.
