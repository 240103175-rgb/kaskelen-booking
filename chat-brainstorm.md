# Brainstorm history

The real brainstorm before building the app, in two parts:

1. **ChatGPT** — choosing an app idea and a delivery plan under the course rules.
   Full conversation: https://chatgpt.com/share/6ad6f7f3-a1b0-83eb-8725-70fc3509a32e
2. **Claude Code** (this repository's coding agent) — the decision to build **Kaskelen Booking** and to rebuild it in the iteration order from part 1.

The user's messages are quoted verbatim. The assistant's answers are long (≈55 000 characters), so they are condensed here; the link above has them in full.

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

## Part 2 — Choosing Kaskelen Booking (Claude Code session)

- The app idea chosen in the end was **Kaskelen Booking**: online booking of local services in Kaskelen by the hour — football pitches, barbershops, beauty salons, massage, swimming pools, saunas, gyms and restaurants. Reason: a real local problem (bookings by phone and WhatsApp, double bookings), several user roles, non-trivial rules (capacity, cancellation window, evening prices, time zone) — and it can be finished and tested properly by one developer.
- A first server-rendered prototype was built (issues #2–#12).
- After reviewing the ChatGPT plan above, the founder decided: *keep Kaskelen Booking, but rebuild it with every course rule from Part 1* — React frontend on a mockService, `openapi.yml`, in-memory backend, SQLite through Sequelize ORM, connection, then real testing with `user-test-bug` issues closed by the QA engineer (issues #20–#40).
- Deadline: 1–2 days, so the founder asked to focus on the main flows rather than every detail.

Decisions taken from Part 1 and applied here:

| Course rule | Where it lives in this repo |
|---|---|
| GitHub Issues, groom → test cases → implement → QA close | `_docs/process.md`, `_docs/team/*.md` |
| Labels `mvp`, `post-mvp`, `user-test-bug` | GitHub labels |
| Frontend first on a mockService | `frontend/src/services/mockService.ts` |
| Contract first | `openapi.yml` |
| In-memory backend, then SQLite via ORM | `backend/src/repositories/memory.js`, `sql.js` (Sequelize) |
| Design references | `_docs/design-system.md` |
| Real running and testing | `_docs/test-plan.md`, `user-test-bug` issues |
