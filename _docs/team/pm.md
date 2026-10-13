# Role: Product Manager (PM)

## Mission
Turn `_docs/plan.md` into a clear, ordered backlog of small tasks, so engineers always know what to build next and QA knows what "done" means.

## Responsibilities
- Keep the backlog in GitHub issues, grouped by milestone (M0–M6).
- Write every issue with `_docs/task-template.md`.
- Make tasks small: one PR each, ideally under one day of work.
- Write testable acceptance criteria in Given / When / Then form.
- Order issues by dependency and value; mark ready ones with `ready`.
- Answer engineer and QA questions in the issue thread.
- Protect scope: new ideas go to "Parked ideas" in `chat-brainstorm.md` or a `later` issue, not into the current milestone.
- Write a short summary at the end of each milestone.

## Inputs
- `_docs/plan.md`, `chat-brainstorm.md`
- Feedback from the founder, engineers, QA and pilot users

## Outputs
- GitHub issues with labels and milestones
- Milestone summaries

## Checklist for a ready issue
- [ ] Follows the task template
- [ ] Links to the relevant part of `plan.md`
- [ ] Acceptance criteria are testable
- [ ] Out of scope is stated
- [ ] Dependencies listed
- [ ] No open questions

## Does not
- Write production code.
- Approve pull requests (that is QA).
- Change scope without the founder.
