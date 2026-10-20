# Process

How work moves from the plan to merged code. GitHub issues are the only active backlog.

## Roles

| Role | Does | Never does | File |
|---|---|---|---|
| Orchestrator (main session) | Picks the next issue, starts the other roles in order | Writes code itself | this file |
| PM | Grooms the issue into the template; triages bugs | Writes code | `team/pm.md` |
| QA (test design) | Writes the `## Test cases` comment before implementation | Writes production code | `team/qa.md` |
| Software Engineer | Implements against the criteria and test cases, commits, comments | Changes the criteria, closes the issue | `team/software-engineer.md` |
| QA Engineer | Runs the app and the tests, posts the verdict, **closes the issue on PASS**, files `user-test-bug` issues | Changes code | `team/qa-engineer.md` |

## Where tasks come from

1. The brainstorm (`chat-brainstorm.md`) produced `_docs/plan.md`.
2. The plan was cut into small tasks in `_docs/tasks.md`, one section per task, and each task moved into a GitHub issue with `gh issue create`. The file was then deleted: issues are the backlog.
3. Bugs found while actually running the app become `user-test-bug` issues.

## Iterations (v1)

The first version (issues #2–#12) was a server-rendered prototype. v1 rebuilds it in the order the course requires, each iteration ending with a working app:

| Iteration | Result |
|---|---|
| 1. Frontend + mockService | React app fully clickable on mock data, through one service interface |
| 2. Contract | `openapi.yml` describes every endpoint, schema and error |
| 3. Backend in memory | Express API implementing the contract with in-memory repositories |
| 4. Connect | Frontend switches from `mockService` to `httpService` |
| 5. SQLite via ORM | Sequelize repositories replace the in-memory ones; data survives restarts |
| 6. Delivery | CI, real user testing, bug fixes, documentation |

## Issue lifecycle

```
pick ─► groom (PM) ─► test cases (QA) ─► implement (Engineer) ─► verify (QA Engineer) ─► close (QA Engineer)
                                               ▲                         │
                                               └────────── FAIL ─────────┘
```

1. **Pick** — the orchestrator takes the next open `mvp` issue of the current iteration whose dependencies are closed. One issue at a time.
2. **Groom** — the PM rewrites the body into `_docs/task-template.md` and comments `**Groomed.**`.
3. **Test cases** — QA comments `## Test cases` (positive, negative, boundary; test level for each).
4. **Implement** — the engineer writes code and the tests, commits with the issue number, and comments branch, commit and test result. The issue stays open.
5. **Verify** — the QA engineer runs the app and the tests and posts `## QA: PASS` or `## QA: FAIL` with every criterion.
6. **Loop** — on FAIL the engineer takes the QA comment as input; back to step 4.
7. **Close** — on PASS the QA engineer closes the issue.

## Bugs found by running the app

1. Whoever finds it (usually the QA engineer) opens an issue labeled `user-test-bug` with **Goal**, **Description**, **Steps to reproduce**, **Expected**, **Actual**.
2. PM grooms it (is it a defect or a new feature?), QA adds the regression test case.
3. Engineer fixes it with the regression test; QA engineer re-runs the steps and closes it.

## Labels

| Label | Meaning |
|---|---|
| `mvp` | Part of the MVP; must be closed before the deadline |
| `post-mvp` | Follow-up, parked outside the MVP |
| `user-test-bug` | Defect found by actually running the app; must be closed before the deadline |
| `frontend`, `backend`, `api`, `database`, `docs`, `qa` | Area filters |

## Rules

- One issue at a time; read the acceptance criteria before starting and again before closing.
- Commit regularly; every commit message mentions the issue (`#23`).
- Code reaches `main` through a pull request; nobody pushes to `main` directly.
- Questions go into the issue as comments, so the history stays in one place.
