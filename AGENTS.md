# Franco — agent source of truth

Franco is a French-learning web app (TCF-oriented): React 19 + Vite SPA in
`src/`, a dependency-light Node API in `server/`, Supabase PostgreSQL for
data. This file is the always-loaded reference for any agent session in this
repo. It is a static prefix: keep the section order, edit in place, no
timestamps or churn (see the last section).

## Always-on skills

Skills live in `.agents/skills/`. These apply to every session:

- **lightweight** — ALWAYS ON. Default output discipline: terse,
  front-loaded, no filler.
- **code-review** — MUST run before requesting review on any PR and when
  reviewing one. A review is not done until its checklist has been run
  (ticket criteria, FRA-21 boundary, presenters, API scopes, checks,
  screenshots). Reviews are comments only — never push to another author's
  PR branch.
- **orchestration** — not a skill; it lives in this file (next section),
  because the decision to orchestrate must be visible in every session,
  not loaded on demand. Its tripwire: only when a task decomposes into two
  or more independent work nodes AND the user explicitly asked for
  orchestration. Single mechanical edits are done directly, never
  orchestrated.

On-request only (never auto-invoke; `allow_implicit_invocation: false`):
**multi-approach** (option comparisons) and **bug-investigation**
(systematic debugging wrapper).

## Orchestration

Split work that is genuinely parallel or mixed-difficulty into a small DAG
of self-contained tasks, run each at the cheapest sufficient model tier,
and integrate only verified results. Orchestration is overhead: it must
earn its tokens by parallelism or by tier savings, or it shouldn't happen.

1. **Triage gate — decide whether to orchestrate at all.** Skip
   orchestration and do the work directly when ANY of these hold:
   - The task is a single mechanical edit (rename, format, one-file fix,
     config bump).
   - The work decomposes into fewer than 2 independent nodes.
   - Every node needs the same tier and they must run strictly in
     sequence.
   - The user didn't explicitly ask for orchestration.

   State the gate outcome in one line before proceeding
   ("Orchestrating: 4 nodes, 2 tiers" or "Not orchestrating: single
   mechanical edit — doing it directly").
2. **Build the DAG.** Nodes are self-contained work units with: a
   one-line goal, exact scope (files/area), acceptance criteria,
   dependencies (edges), and an output artifact (a diff, a file, or a
   report). A node brief must be executable by an agent that has never
   seen this conversation.
3. **Route each node** with the table below. Default to the cheapest
   tier; promote a node only when its acceptance criteria demand it
   (ambiguous requirements, cross-file reasoning, review/judgment work).

   | Task class | Examples | Tier | Effort |
   | --- | --- | --- | --- |
   | Mechanical | renames, formatting, scaffolding, boilerplate, find-and-replace, file moves | economy (smallest available) | low |
   | Standard implementation | a ticket node with clear acceptance criteria, tests to write against a known pattern, docs | standard (mid-tier) | medium |
   | Judgment / integration | cross-file refactors, architecture choices, code review, debugging unknown failures, final verification | frontier (strongest available) | high |

   Resolve `<model>` for each tier from the local `codex` configuration
   at dispatch time — model IDs change; this table pins classes and
   effort, not product names.
4. **Dispatch headlessly**, one `codex exec` per node, in dependency
   order; independent nodes may run in parallel:

   ```
   codex exec -m <model> -c model_reasoning_effort=<effort> --sandbox workspace-write -o <node-output-file> "<brief>"
   ```

   The brief repeats the goal, scope, acceptance criteria, and the
   standing prohibitions (never merge, never push to another author's
   branch, never touch files outside scope).
5. **Verify before integrate — mandatory, per node.** Read the node's
   diff/output yourself; run the repo checks that apply (`npm run
   lint:ui`, `npm test`, `npm run build`, or the node's own acceptance
   test). A node that fails verification is re-dispatched once with the
   failure attached; a second failure escalates to a higher tier or back
   to the user — it is never integrated on hope.
6. **Integrate in dependency order**, then run the full check suite once
   on the combined result (node-level green does not imply integration
   green).
7. **Report.** One summary: the triage verdict line, the DAG (nodes,
   tiers, edges), per-node verification results, total
   failures/re-dispatches, and what was integrated. No per-node
   transcripts unless asked.

Operating rules:

- Verify-before-integrate is not optional and cannot be waived by
  schedule pressure; unverified output is treated as not done.
- Workers get the minimum context their node needs — briefs are
  self-contained, and no node's brief leaks another node's in-progress
  output.
- Workers never merge PRs, never push to branches they weren't assigned,
  and never widen their own scope; scope questions come back to the
  orchestrator.
- Depth limit: one level. Workers do not orchestrate their own sub-DAGs.
- If dispatch tooling (`codex exec`) is unavailable, stop and say so —
  do not silently do all the work yourself and call it orchestration.

## Mandatory coding rules

- **Strict UI boundary (FRA-21).** Only `src/components/ui/` may render
  native/intrinsic JSX elements or use `style={}` props. Everything else in
  `src/` composes the component library. This is enforced, not eyeballed:
  `npm run lint:ui` must pass.
- **Component library (FRA-16).** Semantic components take NO `className` or
  `style` props — they expose semantic props (`variant`, `tone`, `gap`,
  `direction`, …) and own their visuals. If a treatment has no prop yet, add
  the prop to the component; never reach for `className`. Only the
  primitives `Box`, `Text`, `TextInput` accept `className`, to carry
  existing `styles.css` hooks. Import components from the barrel
  (`src/components/ui/index.js`). Full contract: `src/components/ui/README.md`.
- **Presenters.** Reusable display logic lives in `src/presenters/` as pure
  functions — `<name>.presenter.js` with a colocated
  `<name>.presenter.test.js`, wired into `npm test`. Presenters never render
  JSX and never touch the DOM. Only logic used more than once becomes a
  presenter; single-use logic stays in its component.
- **Global concerns use the established library — never a local
  reimplementation.** Theme is the worked example: the app is wrapped in
  next-themes' `ThemeProvider` (`attribute="data-theme"`,
  `defaultTheme="system"`, `storageKey="franco_theme"`); any component reads
  or sets the theme via `useTheme()`. Do not add theme `useState`s,
  `matchMedia` listeners, or localStorage plumbing in pages or `main.jsx`.
  The same rule applies to any future app-wide concern: adopt the library
  pattern once, consume it everywhere.
- **Styles.** One global stylesheet, `src/styles.css`. The dark-theme block
  (`html:not([data-theme="light"])`) is PAINT ONLY — colors, backgrounds,
  borders; never geometry (width, padding, margins, gaps, font sizes,
  min-heights). Layout metrics live in the shared base rules so both themes
  lay out identically (FRA-23). The standard page width is the broad layout
  (`.main-content` capped at 1440px).
- **TypeScript migration (incremental).** New frontend files are `.ts`/`.tsx`;
  convert an existing file when you touch it (convert-on-touch).
  `tsconfig.json` runs with `allowJs` until the closeout ticket flips
  `strict` on. `npm run typecheck` (`tsc --noEmit`) must pass — it is a CI
  gate, same as `lint:ui`.
- **Types live in `src/types.ts`.** Shared/domain types go there — import
  them, never redefine the same shape twice. Types used by only one module
  live in that module. During parallel migration waves, treat `src/types.ts`
  as read-only (define ticket-local types in your module and note them for
  the closeout ticket to consolidate) — parallel branches editing one file
  will conflict.
- **No escape hatches.** No `as` assertions (ever, unless explicitly
  justified with a comment at the usage site), no explicit `any`. Prefer
  precise types over `unknown`; `unknown` is acceptable only where the value
  is genuinely unknowable at the boundary (e.g. caught errors) and must be
  narrowed immediately, never passed through. Everything has a type.

## Architecture

- **Frontend** — React 19 + Vite SPA. `src/main.jsx` is the shell: auth
  gate, path-based routing (`viewPaths`), sidebar shell. Screens are
  `src/views/` (Home, Placement, Session, Content, PastQuestions, Progress,
  Conversation); feature components in `src/components/` (concepts roadmap,
  exercises); shared data access via `src/api/client.js` and
  `src/hooks/useApi.js`. Theme via next-themes (above).
- **Backend** — Node HTTP API, no framework, in `server/`. `index.js`
  routes; `config.js` reads env; `database.js` is the pg pool;
  `content-contract.js` validates content items against
  `schemas/content.v1.schema.json`; `evaluate.js` / `sm2.js` are the
  learning engine (scoring, spaced repetition); `speech.js` handles
  speaking transcription/feedback (shared logic in `shared/`).
- **Auth model** — custom, not Supabase Auth. Email/password users in the
  `users` table (salted hashes), opaque session tokens in `sessions`,
  sent as Bearer tokens. Content operations use a separate API-key scheme:
  `CONTENT_API_KEY` is hashed into `content_api_keys` at boot with scopes
  (`content:write`, `content:review`); clients send it as `x-api-key`.
  Non-published content and review actions require the `content:review`
  scope.
- **Database** — Supabase PostgreSQL. Schema of record:
  `supabase/schema.sql` (+ `supabase/README.md`). Content flows in through
  the `scripts/` import pipeline (UD-GSD, TV5Monde, normalized dataset)
  as `pending_review` and is published through the review flow — never
  hand-edit rows to publish content.
- **Services / hosting** — Cloudflare Pages serves the web app
  (`public/_redirects`, PR preview deploys via
  `.github/workflows/paired-preview.yml`); the API deploys to Render.
  Content API contract: `docs/content-api.openapi.yaml`.

## Directory map

```text
src/main.jsx            app shell: auth gate, routing, sidebar
src/views/              one component per screen/route
src/components/ui/      the component library (only place intrinsics live)
src/components/         feature components (concepts, exercises/)
src/presenters/         pure display logic + colocated tests
src/api/ , src/hooks/   API client, shared hooks
src/styles.css          the single global stylesheet
server/                 Node API (routes, db, learning engine, speech)
shared/                 logic shared by client and server (speech)
schemas/                content item JSON schema
scripts/                dev runner, tests, linters, content import pipeline
supabase/               schema.sql + data model docs
docs/                   API contract, feature plans
.agents/skills/         workspace skills (see Always-on skills)
```

## Dev workflows

Node is pinned (`22.12.0`, `.nvmrc` — use `nvm use`). Install with
`npm install` (never hand-edit `package-lock.json`).

| Task | Command |
| --- | --- |
| Run app + API together | `npm run dev` |
| Web only / API only | `npm run web` / `npm run api` |
| UI boundary lint (mandatory) | `npm run lint:ui` |
| Type check (mandatory) | `npm run typecheck` |
| Full test suite | `npm test` |
| Production build | `npm run build` |

Every change must pass `lint:ui`, `npm run typecheck`, `npm test`, and
`npm run build` before it is proposed. Content pipeline scripts (`import:*`, `publish:founding`,
`sync:founding`, `seed:concepts`) are data operations — run them only when
the ticket is about content, and say which ones you ran.

## Where to make changes (navigation)

- **New screen/route** → add `src/views/<Name>.jsx`, wire its path in
  `main.jsx` (`viewPaths` + render switch + nav item if it belongs in the
  sidebar).
- **New UI element** → `src/components/ui/` first (new component or new
  semantic prop on an existing one) + its CSS class in `styles.css`;
  consume it via the barrel import. Never style from the caller.
- **Reused display logic** → `src/presenters/<name>.presenter.js` +
  colocated test, and add the test to the `npm test` chain.
- **New exercise type** → component in `src/components/exercises/`,
  presenter for its logic, and the content contract
  (`schemas/content.v1.schema.json` + `server/content-contract.js`) if it
  introduces item fields.
- **New API endpoint** → route in `server/index.js`, logic in a
  `server/*.js` module, correct auth (Bearer session for learner data,
  scoped `x-api-key` for content), update `docs/content-api.openapi.yaml`.
- **Styling/theme** → `src/styles.css` only; theme overrides stay
  paint-only (above).
- **Content/data** → the `scripts/` pipeline; do not bypass the review
  flow to publish.

## Architecture diagrams

A change needs an architecture diagram (in the PR description or `docs/`)
when it: adds or removes a service or external dependency; changes a data
flow between frontend, API, database, or an external service; changes the
auth/session or API-key model; or adds a new content pipeline stage.
Within-page or within-component changes do not need one.

## File-read boundaries

- Never read `node_modules/`, `dist/`, `.git/`, `coverage/`, `*.map`, or
  `package-lock.json` unless the task explicitly requires it (dependency
  changes are made through `npm install`, not by editing the lockfile).
- Treat generated/data files (`normalized-content.json`, `previews/`) as
  search targets, not reading material: grep for the needle, read the
  smallest range that answers the question.
- Orient search-first: `rg` for symbols/strings before opening files;
  open targeted ranges, not whole large files (`server/index.js`,
  `src/styles.css`, `src/main.jsx` are all big — navigate by symbol).

## Working agreements

- Branch per ticket: `<KEY>/<slug>` (e.g. `FRA-29/agents-md-source-of-truth`).
- Reviews are comments only; the author makes the changes. Agents never
  merge PRs — a human merges.
- UI changes ship with before/after screenshots in the PR, both themes.
- Free-tier only: prefer solutions that cost $0 (hosting, CI, tooling).

## RTK Codex Guard — evaluation and decision

Evaluated for FRA-29 (source: https://github.com/v1kstrand/rtk-codex-hooks).

**What it is.** A single PreToolUse guard hook for Codex (companion to
RTK, https://github.com/rtk-ai/rtk). It intercepts noisy commands before
they run — `git diff`/`git log`, `rg`/`grep`, file listing/viewing, and,
per preset, test/build/lint commands — blocks the raw run, and tells the
agent to retry through `rtk`, which compacts the output. Presets:
`minimal` (exploration commands), `default` (adds tests/builds/lint),
`full` (adds cargo/npx/make/docker/kubectl/aws families). It only blocks
when RTK actually knows a rewrite; raw output stays available via
`NO_RTK <cmd>` or `RTK_DISABLED=1`. Requires Codex hooks, the `rtk`
binary, and Python 3.

**Fit and token overhead.** Franco's noisy commands are exactly the
covered ones (`npm test`, `npm run build`, `rg` searches, git diffs).
RTK claims ~60–90% output-token savings on common dev commands (search/git
~75–80% smaller, test output ~90%). The hook's own overhead is near zero:
no static context cost; it speaks only when a matched command is
attempted. Costs/risks: unofficial companion project; every dev machine
must have `rtk` installed or matched commands get blocked with a retry
instruction; a blocked raw run costs one retry round-trip.

**Decision: ADAPT.** Adopt project-scoped (`.codex/hooks.json`), preset
`default`, with these adaptations:
- Do NOT install globally (`~/.codex/hooks.json` persists across all of a
  user's projects — too broad).
- Keep raw output one step away for failure debugging: when a test/build
  failure needs full output, rerun with `NO_RTK` (this is expected, not a
  workaround).
- Prerequisite: install `rtk` on the dev machine first, then run the
  project's `install.py --target project --preset default`, and trust the
  hook in Codex (`/hooks`). Verify on a real dev machine before relying on
  it — if `rtk` is missing in an environment, work there proceeds with
  `RTK_DISABLED=1`.

## Static prefix discipline

This file is loaded into every session's context. Keep it stable: sections
stay in this order, wording changes only when a rule actually changes, and
no dates, changelogs, or per-ticket notes go here — those belong in Linear
and the PR. Small, ordered, and boring is the goal (prompt caching depends
on it).
