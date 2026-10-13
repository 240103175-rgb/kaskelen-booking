# Process

How work moves from the plan to merged code. GitHub issues are the only active backlog.

## Roles

| Role | Does | Never does | File |
|---|---|---|---|
| Orchestrator (main session) | Picks the next issue, starts the other roles, closes the issue after QA PASS | Writes code itself | this file |
| PM | Grooms the issue into the template | Writes code | `team/pm.md` |
| Software Engineer | Implements against the acceptance criteria, writes tests, commits, comments | Changes the criteria, closes the issue | `team/software-engineer.md` |
| QA Engineer | Checks every criterion, runs the tests, posts a verdict | Changes code | `team/qa-engineer.md` |

## Where tasks come from

1. The brainstorm (`chat-brainstorm.md`) produced `_docs/plan.md`.
2. The plan was cut into small tasks in `_docs/tasks.md`, one section per task.
3. Each task was moved into a GitHub issue with `gh issue create`. After that `_docs/tasks.md` was deleted: issues are the backlog.

## Issue lifecycle

```
pick ──► groom (PM) ──► implement (Engineer) ──► verify (QA) ──► close
                              ▲                        │
                              └──────── FAIL ──────────┘
```

1. **Pick** — the orchestrator takes the lowest-numbered open issue labeled `mvp` whose dependencies are closed. One issue at a time.
2. **Groom** — the PM rewrites the issue body into `_docs/task-template.md` (Goal, Acceptance criteria, Out of scope, Constraints) and comments what changed. Out-of-scope items become linked follow-up issues labeled `later`.
3. **Implement** — the engineer reads the acceptance criteria first, writes code and tests, commits with the issue number in the message, and comments on the issue: branch, commit, test result, any decision the criteria did not settle. The issue stays open. If a criterion is wrong or contradictory, the engineer comments instead of guessing.
4. **Verify** — the QA engineer checks the running code, not the engineer's comment, and posts:
   ```markdown
   ## QA: PASS   (or ## QA: FAIL)

   - [x] <criterion> — PASS (how it was checked)
   - [ ] <criterion> — FAIL: <what happened>

   **Tests:** `npm test` — N passed, 0 failed
   ```
   FAIL if any criterion fails.
5. **Loop** — on FAIL a fresh engineer pass takes the QA comment as input; back to step 3.
6. **Close** — on PASS the orchestrator closes the issue. Repeat until no `mvp` issue is open.

## Labels

| Label | Meaning |
|---|---|
| `mvp` | Part of the MVP backlog |
| `later` | Follow-up, parked outside the MVP |

## Rules

- One issue at a time; read the acceptance criteria before starting and again before closing.
- Commit regularly; every commit message mentions the issue (`#12`).
- Code reaches `main` through the pull request; nobody pushes to `main` directly.
- Questions go into the issue as comments, so the history stays in one place.
