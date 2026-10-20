# Design system

Direction from the brainstorm: **premium investigation workspace** — dark navy surfaces, restrained cyan accents, crisp type, dense but readable data. Not a generic SaaS landing page: no big gradients, no glassmorphism, no decorative AI imagery.

## References

| Reference | What we take |
|---|---|
| Linear | Dense lists, keyboard-friendly, quiet status pills, sidebar navigation |
| Maltego / i2 Analyst's Notebook | Entity graph: typed nodes, labelled directed edges, a detail panel |
| GitHub Security advisories | Severity shown as **text + colour**, never colour alone |
| Stripe Radar | Risk explanation as a list of triggered rules with their weight |

## Tokens (`frontend/src/styles.css`)

- Background `#0b1220`, surface `#111a2e`, surface-2 `#17223a`, border `#24324f`.
- Text `#e6edf7`, secondary `#9aa8c2`, muted `#64748b`.
- Accent cyan `#22d3ee`; links and focus rings use it.
- Risk: low `#34d399`, medium `#fbbf24`, high `#f87171` — always with the word (Низкий / Средний / Высокий).
- Verification: confirmed green, unverified grey, disputed amber.
- Font: Inter 400–700; monospace (JetBrains Mono) for identifiers, URLs, card numbers.
- Radius 10px, spacing scale 4 / 8 / 12 / 16 / 24 / 32.

## Components

App shell (top bar + side nav on desktop, bottom nav on phones), case card, status pill, risk badge, evidence row, entity chip with type icon, graph canvas with detail panel, rule list, report sheet (printable, light), forms, dialogs for destructive actions, toasts.

## States every screen must have

Loading (skeleton or spinner), empty (what to do next), error with Retry, confirmation before delete, disabled busy buttons.

## Wording

- Confirmed facts, unverified observations and system assessments are visually distinct.
- The risk panel always ends with: «Это индикатор риска, а не доказательство мошенничества».
- Demo data shows a «Демо-данные» badge.
