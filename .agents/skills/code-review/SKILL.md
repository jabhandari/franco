---
name: code-review
description: "Review a franco pull request (or a branch/diff on request) against the repo's own conventions — correctness, the FRA-21 UI boundary, the FRA-16 component-library rules, presenter conventions, content-API scopes, test/build health, and proportional visual evidence for UI changes. Use when asked to review a PR, a diff, or changes in this repo. A review produces comments and a verdict only; it never pushes changes to the author's branch."
---

# Code Review (franco)

## Purpose

Give every franco PR the same review, in the same order, against the conventions this repo actually adopted — not generic advice. The checklist encodes FRA-16 (component library), FRA-21 (strict UI boundary + presenters), the content-API scope model, and the working rules the team reviews by.

## Workflow

1. **Scope the diff.** List changed files (`gh pr diff <n>` or the compare view). Classify the change: UI, presenter/logic, server/API, content/data, or infra. Read the PR description and the linked Linear ticket first — review against the ticket's acceptance criteria, not taste.
2. **Correctness pass.** Read every hunk in context (open the full file when a hunk is ambiguous). Look for: logic errors, broken edge cases, state that can go stale, async races, error paths that swallow failures, and claims in the description the code doesn't support ("passes in both views" means *both views were actually exercised*).
3. **FRA-21 UI boundary** (any change touching `src/`):
   - No intrinsic JSX elements (`div`, `span`, `p`, `button`, `input`, …) and no `style={}` props outside `src/components/ui/`.
   - `className` only on the primitives that accept it (`Box`, `Text`, `TextInput`); semantic components keep their fixed classes.
   - No style props in any component's public API — layout via explicit props (`display`, `direction`, `gap`, `align`, `justify`, `wrap`) only.
   - Confirm `npm run lint:ui` passes — run it; don't eyeball this.
- **TypeScript clean-code** (any change touching `.ts`/`.tsx`):
   - Shared/domain types come from `src/types.ts` — flag any locally redefined shape that already lives there.
   - Prefer `type` over `interface` — flag `interface` declarations (blocker unless a genuine use case like declaration merging).
   - No `as` assertions (blocker, unless explicitly justified with a comment at the usage site). Never `any` or `unknown` — not as annotations, generic defaults, or index-signature values (blocker). Payloads with unclear shapes must be investigated (server response + call sites) and typed for real. At genuine type boundaries (catch clauses, `response.json()`), the parameter must not be annotated — narrow immediately with a type guard or `instanceof`.
   - Everything has a type: no implicit `any`, no untyped exports. Confirm `npm run typecheck` passes — run it; don't eyeball this.
4. **FRA-16 library use.** New UI composes library components from `src/components/ui` (import from the index, not individual files). A new presentational pattern that appears twice belongs in the library, not copied into a second view.
5. **Presenters.** Helper logic used more than once lives in `src/presenters/` as `<name>.presenter.js` with a colocated `<name>.presenter.test.js`. Single-use logic may stay in its component. Presenter tests must run as part of `npm test`.
6. **Server / content API** (any change touching `server/` or `supabase/`):
   - Scope model intact: non-published item listings and approve/publish/reject require a `content:review` key; batch ingest requires `content:write`; published reads stay public.
   - Verify workflow claims against the codepath that actually ships (the guard you remember from another branch may not exist on `main` — check).
   - DB changes ship as a migration under `supabase/`; no manual-DB-steps-only changes.
7. **Checks.** Run, and report actual output: `npm ci`, `npm run lint:ui` (UI changes), `npm test`, `npm run build`. A check you didn't run is a check that didn't pass — say which ones you skipped and why.
8. **Visual evidence (UI changes only).** Inspect the rendered UI at the PR commit. Use the PR's existing screenshots when they show the changed state; otherwise capture one representative after screenshot for each changed view or distinct visual state. Add a before screenshot when a comparison clarifies the change. Capture additional mobile, dark-theme, or alternate-mode views only when the diff could affect them; verify those modes even if no extra image is needed. Confirm the preview URL actually serves the reviewed commit, since Cloudflare's hash URLs are immutable snapshots. Backend-only, documentation, and nonvisual changes need tests or API examples, not screenshots. No visual claim without a rendered check.
9. **Write the review.** Findings first, ordered by severity, each anchored to a file/line with the concrete failure it causes. End with one verdict: approve, approve with nits, or request changes.

## Output Contract

- A GitHub review (or PR comments) containing: findings by severity with file/line anchors; the checks table (command → pass/fail/not run); a link to representative visual evidence for UI changes; one explicit verdict.
- Blocking vs non-blocking is labelled per finding. Nits are marked as nits, never padded into blockers.
- Nothing is posted that the diff doesn't support: every claim names the file, test, or command output behind it.

## Operating Rules

- **Comments only.** A review never commits to, pushes to, or rewrites the author's branch — the author applies changes. (Team rule; the only exception is an explicit instruction from the PR author or repo owner for that PR.)
- Never approve a change whose checks you haven't seen pass, or whose UI you haven't seen rendered, when those apply.
- Review the code that's there, not the code you wish was written. Refactor suggestions beyond the ticket's scope are follow-up tickets, not blockers.
- If the PR description and the code disagree, the code is the finding.
