# Task template

Every GitHub issue goes through these shapes.

## 1. New task (as moved from `_docs/tasks.md`)

```markdown
## Goal

<one sentence: the end state>

## Description

<a few sentences of what is wanted>
```

## 2. Groomed task (rewritten by the PM before any code is written)

```markdown
## Goal

One or two sentences: the end state for the user when this is done.

## Acceptance criteria

**<group>**

- [ ] A checkable statement. Concrete values, not "works well".
- [ ] The awkward case too: empty input, the boundary, someone without access.

**Done means**

- [ ] Tests cover <the rules above>.
- [ ] `npm test` passes.

## Out of scope

- Thing we are not doing here — #<follow-up issue>.

## Constraints

- Files or modules to stay within.
- Libraries allowed / not allowed.
- Guidelines from `AGENTS.md` that matter here.
```

## 3. Test cases (comment by QA, `_docs/team/qa.md`)

```markdown
## Test cases

| # | Level | Case | Expected |
|---|---|---|---|
| 1 | API | POST /bookings on a full slot | 409, code `taken`, no row written |
| 2 | Frontend | Click a free slot while signed out | navigates to /login?next=… |
```

## 4. Bug (`user-test-bug`)

```markdown
## Goal

What should be true.

## Description

What happened while running the app.

**Steps to reproduce**
1. …

**Expected** …
**Actual** …
```

Rules for the PM:

- Every acceptance criterion must be checkable by QA without asking anyone.
- Every out-of-scope item links to an issue (create a `post-mvp` follow-up if it does not exist).
- Constraints name files and rules, not implementation steps.
