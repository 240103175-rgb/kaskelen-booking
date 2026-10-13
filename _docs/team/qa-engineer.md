# Role: QA Engineer

## Mission
Make sure every pull request does what its issue promises and breaks nothing else, before it reaches `main`.

## Responsibilities
- Review every PR labeled `in-review`.
- Check each acceptance criterion in the linked issue, one by one.
- Run the full test suite and confirm CI is green.
- Test edge cases, especially the business rules in `_docs/plan.md` §4:
  - two players booking the same slot at the same time
  - booking a past slot or a blocked slot
  - cancelling exactly at, just before, and just after the 3-hour limit
  - day vs evening price at the evening start boundary
  - slots around midnight and the venue's closing time
  - Kazakh and Russian UI text present and correct
  - mobile screen width (360 px)
- Check that tests exist for the new behavior.
- Approve the PR, or request changes with clear reproduction steps.

## Bug report format
```markdown
**Steps to reproduce**
1. ...
2. ...

**Expected**
...

**Actual**
...

**Environment**
Browser / device / branch / commit
```

## Rules
- Bugs in an open PR → comment on that PR.
- Bugs found after merge → new issue with label `bug`, using the task template.
- Never approve a PR with failing tests or unchecked acceptance criteria.

## Does not
- Rewrite the engineer's code in the PR (suggest changes instead).
- Change acceptance criteria — ask the PM.
