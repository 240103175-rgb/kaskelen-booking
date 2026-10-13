# Brainstorm chat — Kaskelen Booking

A cleaned-up record of the first brainstorm that produced `_docs/plan.md`.

---

**Founder:** In Kaskelen, people book football pitches by calling the owner or texting on WhatsApp. Half the time nobody answers, or two teams show up for the same hour. I want to fix that.

**Assistant:** So the core problem is double bookings and slow, phone-only booking. Who are the users?

**Founder:** Two sides. Players — usually one person books for the whole team. And pitch owners or admins, who keep the schedule in a notebook or in their head.

**Assistant:** Then the MVP needs three things:
1. Players see free time slots and book one.
2. Owners see their schedule and can confirm, cancel or block slots.
3. The system never allows two bookings for the same pitch and hour.

Do players need to pay online?

**Founder:** Not at first. People here pay cash or by Kaspi transfer on the spot. Online payment can come later.

**Assistant:** Good, payment stays out of the MVP. How does a player identify themselves?

**Founder:** Phone number. Everyone has WhatsApp. Email is rare.

**Assistant:** Then sign-in is phone number + one-time SMS code. For the MVP we can log the code to the server console instead of sending a real SMS, and add a real SMS provider later.

**Founder:** What about languages?

**Assistant:** Kazakh and Russian in the UI from day one. English only for the code and docs.

**Founder:** How many pitches do we start with?

**Assistant:** Start with the pitches you can personally onboard — say 3 to 5. The data model should still support many venues, each with several pitches.

**Founder:** Slots — always one hour?

**Assistant:** One hour by default, starting on the hour, with opening hours set per venue (for example 08:00–00:00). Prices can differ by time of day: day price and evening price.

**Founder:** And cancellations?

**Assistant:** A player can cancel up to 3 hours before the slot. After that, only the owner can cancel. That rule protects owners from lost evenings.

**Founder:** How do we work on this? I want to use AI agents for most of the work.

**Assistant:** Then we write down roles and a process so agents behave the same way every time:
- a **PM** who turns the plan into small GitHub issues,
- a **Software Engineer** who implements one issue per branch and opens a PR,
- a **QA Engineer** who tests each PR against its acceptance criteria.

Every task uses one template, and `AGENTS.md` tells any agent where to start.

**Founder:** Tech stack?

**Assistant:** Keep it boring and cheap: a single web app (mobile-first, because players book from phones), a relational database, one server. The exact stack is decided in the first engineering task and recorded in `_docs/plan.md`.

**Founder:** Okay. Write the plan.

---

## Decisions taken

| Topic | Decision |
|---|---|
| Problem | Phone/WhatsApp booking causes double bookings and lost time |
| Users | Players (booker), venue owners/admins |
| MVP payment | None — paid on site |
| Sign-in | Phone number + one-time code |
| Languages | Kazakh, Russian (UI); English (code, docs) |
| Slot size | 1 hour, on the hour, per-venue opening hours |
| Cancellation | Player: until 3 h before start; later only owner |
| Work process | PM → Engineer → QA, via GitHub issues and PRs |

## Parked ideas (not MVP)

- Online payment (Kaspi, cards)
- Real SMS / WhatsApp notifications
- Splitting the price between team members
- Finding opponents / "looking for a team"
- Other venue types (saunas, tennis, computer clubs)
- Ratings and reviews
