# Brainstorm history

The real brainstorm before building Re:Trace:

1. **ChatGPT** — choosing the app idea and the delivery plan under the course rules.
   Full conversation: https://chatgpt.com/share/6ad6f7f3-a1b0-83eb-8725-70fc3509a32e
2. **Claude Code** (the coding agent of this repository) — turning that plan into a scope that one developer can finish and test in 1–2 days.

The user's messages are quoted verbatim. The assistant's answers are long (≈55 000 characters), so they are condensed; the link above has them in full.

---

## Part 1 — ChatGPT: "Идеи приложений для проекта"

### User

> Напиши 10 превосходных идеи, чтобы удивить преподователя опираясь на эти условия:
>
> Pick a project idea, different from Part I, and come up with a non trivial app (no habit tracker, to-do list, etc). Come up with an idea you will be proud to show off.
>
> If interested in startup and money part, get ideas from: https://trustmrr.com/
>
> - Fully follow: https://aishippingblog.com/p/ai-native-development-specifications and https://aishippingblog.com/p/build-and-ship-a-full-stack-app-with — I know they start from different places, but think about how can you combine.
> - Utilize Github Issues as in ai-native-development-specifications.
> - Use Non generic design agents like Lovable / v0 / Claude Design. OR at least provide good references for the coding agent.
> - Close all mvp tags. It can be up to 100 issues. (more is ok)
> - Use persistent storage as sqlLite.
> - Use dbms agnostic tools like ORM.
> - Work in iterations. First front end with mockService -> openapi.yml (describe contract) -> backend in memory story -> backend sqllite storage -> connect frontend + backend.
> - Add all your .md files to the github repo. Improve them while you develop.
> - Add your chat history where you brainstormed before creating an app as text file. (.md)
> - Actually run your app and throughly test it.
> - If found a bug, create an issue Github describe with Goal and Description and ask pm.md to groom and qa.md to add more test cases. Use tag user-test-bug. So that we know you actually tested. (Overall you will have mvp, post-mvp, user-test-bug tags).
> - Work and test until it's fully working and well tested.
> - Submit everything to github repo and close (qa-engineer.md should close it) all issues with mvp and user-test-bug tags before the deadline.

### Assistant (condensed)

Ten ideas, each with features, MVP and why it would impress:

1. **Re:Trace** — investigating suspected online scams: evidence, entity graph, explainable risk score, report.
2. **SkillSwap** — students exchanging skills for credits.
3. **Echoes** — a map of forgotten local stories (Kazakhstan, Mangystau).
4. **FairShift** — fair shift scheduling for cafés and hotels.
5. **PitchLab** — startup and investor-negotiation simulator.
6. **TraceFood** — product traceability by QR code.
7. **CrowdSignal** — city problems map with prioritisation.
8. **MindMirror** — argument maps from text.
9. **WhatIf** — decision-tree simulator.
10. **BugArena** — debugging practice platform.

Recommended FairShift (best balance), Re:Trace (most impressive), PitchLab (startup angle), WhatIf (engineering). Proposed a repository layout and the development order from the course rules: frontend + mockService → OpenAPI contract → in-memory backend → SQLite + ORM → integration → QA with `mvp` / `post-mvp` / `user-test-bug` labels, real brainstorm history, and "do not close a bug without a fix and a re-check".

### User

> Подготовь детальный план Mobile Application Project по моим условиям. Выбранная идея: Re:Trace. Платформа: Mobile + web admin. Главный приоритет: Максимальная оценка. Команда: Один разработчик. Учитывай GitHub Issues и метки mvp/post-mvp/user-test-bug, OpenAPI-first контракт, mockService, in-memory backend, SQLite через ORM, Markdown-документацию, историю brainstorming, QA и реальный запуск. Сначала проверь требования двух исходных статей, затем составь архитектуру и полный список MVP Issues.

### Assistant (condensed)

A full plan for Re:Trace: how the two articles combine (spec-first + AI-native issue flow; frontend-first with mockService → OpenAPI → in-memory → SQLite/ORM → integration), product concept, stack (Expo, React admin, FastAPI, SQLAlchemy), MVP boundaries, repository layout, a design brief for Lovable / v0 / Claude Design, **42 MVP issues in 9 iterations**, 10 post-MVP issues, data model, OpenAPI routes, the PM → QA → developer → QA-engineer loop, a `user-test-bug` example, a 20-item acceptance checklist and the definition of done. Key advice kept for this project:

- issues are the working process, not a report; close only after verified acceptance criteria;
- each iteration ends with a working app;
- storage swaps must not change business services or API responses;
- `user-test-bug` issues must be real defects found by running the app;
- the brainstorm file must be the real conversation, not a reconstruction.

---

---

## Part 2 — Scoping Re:Trace for delivery (Claude Code)

- The idea is **Re:Trace** from Part 1: organise an investigation of a suspected online scam so that every conclusion is traced back to evidence.
- Before this, the same course workflow had been practised on another app (Kaskelen Booking). After reviewing the ChatGPT conversation the founder decided to build the idea the brainstorm actually chose: *"new folder, build it fully"*.
- Deadline 1–2 days, one developer. Decisions taken to make it finishable without dropping any course rule:

| ChatGPT plan | Decision here | Why |
|---|---|---|
| Expo mobile app + separate React admin | One **mobile-first React web app** with an **admin section** inside | One codebase, testable in a browser in the time available; native app → `post-mvp` |
| FastAPI + SQLAlchemy | **Express + Sequelize** (Node.js) | Same layering (routes → services → repositories → ORM), one language with the frontend |
| 42 MVP issues | ~20 `mvp` issues, grouped by iteration | Same iteration order, less ceremony |
| AI extraction / summaries | Out of MVP (`post-mvp`) | The core must work deterministically (Part 1 advice) |
| Login | Email + password, roles investigator / admin | As in the ChatGPT data model |

Kept exactly from Part 1:

- iteration order: frontend + mockService → `openapi.yml` → in-memory backend → SQLite through ORM → connect → test;
- labels `mvp`, `post-mvp`, `user-test-bug`; PM grooms, QA writes test cases, QA engineer verifies and closes;
- explainable, deterministic risk rules — the score is never presented as proof;
- report as an immutable snapshot; access checked on the backend for every request; audit log;
- design direction: dark navy, restrained cyan, investigation workspace, not a generic SaaS landing page;
- this file is the real history, not a reconstruction.
