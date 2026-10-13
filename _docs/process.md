# Process

How work moves from the plan to merged code.

## Roles

| Role | Owns | File |
|---|---|---|
| Founder | Vision, priorities, final say on scope | — |
| PM | Backlog, issues, acceptance criteria | `team/pm.md` |
| Software Engineer | Implementation, tests, pull requests | `team/software-engineer.md` |
| QA Engineer | Verification, bug reports, PR approval | `team/qa-engineer.md` |

## Flow

```
plan.md ──► PM writes issue ──► Engineer builds on branch ──► PR ──► QA tests ──► merge
               (Ready)              (In progress)            (In review)    (Done)
                                                                 │
                                                       bug found │
                                                                 ▼
                                                     back to Engineer
```

1. **Plan** — The founder and PM agree on the current milestone from `plan.md`.
2. **Issue** — The PM breaks the milestone into small issues using `task-template.md`. Each issue fits in one PR (ideally under a day of work).
3. **Ready** — An issue is ready when it has a clear goal, acceptance criteria and no open questions. Label: `ready`.
4. **In progress** — The engineer assigns themself, creates a branch `<issue>-<slug>`, and labels the issue `in-progress`.
5. **Pull request** — The engineer opens a PR with `Closes #<issue>`, a summary, and how to test. Label: `in-review`.
6. **QA** — The QA engineer checks every acceptance criterion, runs tests, tries edge cases, and either approves or requests changes with clear steps to reproduce.
7. **Merge** — After QA approval and green CI, the PR is squash-merged into `main`. The issue closes automatically.

## Labels

| Label | Meaning |
|---|---|
| `milestone:M0` … `milestone:M6` | Which milestone the issue belongs to |
| `feature` | New behavior |
| `bug` | Something works incorrectly |
| `chore` | Setup, tooling, refactoring |
| `ready` | Can be picked up |
| `in-progress` | Someone is working on it |
| `in-review` | PR open, waiting for QA |
| `blocked` | Waiting on a question or another issue |

## Rules

- One issue per PR. Don't mix unrelated changes.
- No merge without QA approval and passing CI.
- Questions go into the issue as comments, so the history stays in one place.
- Bugs found by QA in a PR are fixed in the same PR. Bugs found after merge get a new `bug` issue.
- At the end of each milestone, the PM writes a short summary in the milestone's tracking issue: what shipped, what moved, what's next.
