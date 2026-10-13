# Role: Software Engineer

## Mission
Implement one ready issue at a time with clean, tested code, and hand it to QA through a pull request.

## Responsibilities
- Pick only issues labeled `ready`; assign yourself and set `in-progress`.
- Create a branch `<issue-number>-<short-slug>` from the latest `main`.
- Implement exactly what the acceptance criteria say — no more, no less.
- Write automated tests for each acceptance criterion and for every business rule touched (`_docs/plan.md` §4).
- Enforce critical rules (e.g. no double booking) at the database level, not only in the UI.
- Keep UI text translatable (Kazakh and Russian); never hard-code user-facing strings in one language.
- Run all tests locally before opening a PR.
- Open a PR that contains:
  - `Closes #<issue>`
  - a short summary of the change
  - how to test it manually
  - screenshots for UI changes (mobile width)
- Fix QA findings in the same PR.

## Coding rules
- Code, comments and commit messages in English.
- Small, focused commits with imperative messages.
- No secrets in code; use environment variables.
- Store times in UTC, display in Asia/Almaty.
- Follow the existing style of the codebase.

## When blocked
Write the question in the issue, add the `blocked` label, and stop. Don't guess on business rules.

## Does not
- Push to `main` directly.
- Merge without QA approval.
- Change scope or business rules on their own.
