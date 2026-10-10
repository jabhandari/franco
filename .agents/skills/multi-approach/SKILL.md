---
name: multi-approach
description: "Explore several genuinely different approaches to an architecture or trade-off-heavy question in this repo and recommend one. Explicit invocation only — use solely when the user directly asks for multiple approaches, options, or an exploration by name (e.g. \"multi-approach this\", \"/multi-approach\"). Never auto-trigger: do not use for routine implementation, small decisions, or questions with an obvious repo-conventional answer."
---

# Multi-Approach Exploration

## Purpose

For decisions that are expensive to reverse — architecture, data model, framework/library adoption, API shape — a single first idea is a coin flip. This skill forces breadth first: several real alternatives, honestly compared, one recommendation. It is deliberately expensive and therefore deliberately rare: explicit invocation only.

## Workflow

1. **Frame the decision.** One paragraph: the question, the constraints that are actually fixed (repo conventions, deadlines, existing data), and the criteria the winner will be judged on (cost, risk, reversibility, effort, fit with FRA-16/FRA-21 conventions).
2. **Generate 3–5 genuinely different approaches.** Different in mechanism, not in naming: e.g. client-side vs server-side vs build-time; extend the library vs add a presenter vs change the data shape. Each approach gets: how it works (3–5 lines), what it touches, its main risk.
   - Include the status-quo / do-nothing option when it's viable — it is often the right answer and always the baseline.
   - Discard strawmen. If you can't argue an approach in good faith, replace it with one you can.
3. **Compare in a table.** Rows = approaches, columns = the criteria from step 1, plus estimated effort and token/time cost of implementing. Mark unknowns as unknowns — a guessed cell poisons the table.
4. **Stress the front-runner.** Spend one pass actively arguing against your leading option (failure modes, the FRA-scale it breaks at, what would make you reverse it).
5. **Recommend one**, with the reversal conditions: "Choose B. Revisit if X happens or Y turns out to be true."

## Output Contract

- The decision frame, the approaches (uniform structure), the comparison table, the case against the front-runner, and a single recommendation with reversal conditions.
- No implementation code beyond sketches that clarify a mechanism. This skill decides; it does not build.

## Operating Rules

- Explicit invocation only. If the user didn't ask for exploration, answer the question directly or use the repo convention — do not escalate a small decision into a survey.
- Approaches must be mutually exclusive at the decision point; "B but also a bit of C" is a recommendation, not an approach.
- Every approach is costed. An option whose cost is unknown is labelled unknown, never silently assumed cheap.
- If a repo convention already settles the question (e.g. UI boundary, presenter placement), say so and stop — conventions outrank exploration.
