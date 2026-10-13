# AGENTS.md

Instructions for any AI agent working in this repository.

## Project

**Kaskelen Booking** — a mobile-first web app for booking football pitches in Kaskelen by the hour. Read `_docs/plan.md` for goals, scope, business rules and milestones.

## Read before you start

1. `_docs/plan.md` — what we build and why.
2. `_docs/process.md` — how work moves from idea to merged code.
3. Your role file in `_docs/team/`:
   - `pm.md` — planning and issues
   - `software-engineer.md` — implementation
   - `qa-engineer.md` — testing and review
4. `_docs/task-template.md` — the format every task/issue must follow.

If you were not told your role, ask before doing anything.

## Rules for all agents

- Work only on the task you were given. One task = one issue = one branch = one pull request.
- Never push directly to `main`. All changes go through a pull request.
- Do not change `_docs/plan.md` scope without the founder's approval; propose changes in the issue or PR instead.
- Business rules in `_docs/plan.md` section 4 are the source of truth. If code and plan disagree, raise it — don't silently pick one.
- Keep code, comments, commit messages and docs in English. UI text is in Kazakh and Russian.
- Never commit secrets, `.env` files or real user phone numbers.
- If something is unclear, write the question in the issue and stop, rather than guess.

## Branches and commits

- Branch name: `<issue-number>-<short-slug>`, e.g. `12-booking-cancel-rule`.
- Commit messages: imperative mood, short subject, e.g. `Add 3-hour cancellation rule`.
- PR title references the issue, PR body contains `Closes #<issue-number>`.

## Definition of done

A task is done when:
- all acceptance criteria in the issue are met,
- tests cover the new behavior and pass in CI,
- QA has approved the PR,
- the PR is merged into `main`.
