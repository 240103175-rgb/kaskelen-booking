# Task template

Copy this into every new GitHub issue.

```markdown
## Title
<Verb + object, e.g. "Add 3-hour cancellation rule for players">

## Milestone
M<number> — <milestone name>

## Type
feature | bug | chore

## Context
Why this task exists. Link to the section of `_docs/plan.md` it comes from.

## Goal
One or two sentences: what is true when this task is done.

## User story
As a <player | owner | admin>, I want <action>, so that <benefit>.

## Acceptance criteria
- [ ] Given <state>, when <action>, then <result>.
- [ ] Given <state>, when <action>, then <result>.
- [ ] Tests cover the criteria above.

## Out of scope
What this task does NOT include.

## Dependencies
- Blocked by #<issue> (or "none")

## Notes for engineer
Optional hints: files, data model, edge cases.

## How QA will test
Steps QA will follow to verify the result.
```

## Example

```markdown
## Title
Add 3-hour cancellation rule for players

## Milestone
M3 — Booking

## Type
feature

## Context
`_docs/plan.md` §4: players can cancel until 3 hours before start.

## Goal
Players can cancel their own bookings only until 3 hours before the slot starts.

## User story
As a player, I want to cancel my booking in time, so that the owner can give the slot to another team.

## Acceptance criteria
- [ ] Given a booking starting in 4 hours, when the player cancels, then the booking status becomes `cancelled` and the slot is free.
- [ ] Given a booking starting in 2 hours, when the player cancels, then the request is rejected with a clear message.
- [ ] Given a booking starting in 2 hours, when the owner cancels, then it is cancelled.
- [ ] Tests cover all three cases.

## Out of scope
Notifications about the cancellation.

## Dependencies
- Blocked by #<booking issue>

## How QA will test
Create bookings 4 h and 2 h ahead, try cancelling each as player and as owner.
```
