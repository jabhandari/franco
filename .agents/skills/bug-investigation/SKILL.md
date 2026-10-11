---
name: bug-investigation
description: "A disciplined wrapper around systematic debugging for hard bugs in this repo — reproduce first, gather evidence, test one hypothesis at a time, fix the root cause, add a regression test. Explicit invocation only — use solely when the user directly asks for a bug investigation or systematic debugging by name. Never auto-trigger for ordinary fixes, known-cause errors, or questions. Experimental: every use is measured against plain debugging (see Operating Rules) until the team decides otherwise."
---

# Bug Investigation (experimental wrapper)

## Purpose

Stop the two failure modes that waste the most time on hard bugs: fixing symptoms, and changing three things at once until something works. This skill wraps the Superpowers systematic-debugging discipline in franco's specifics — it is slower than intuition on easy bugs, which is why it is explicit-only and under evaluation.

## Workflow

1. **Reproduce.** Before any theory: a minimal, repeatable reproduction (steps, a failing test, a curl, a click path). If it can't be reproduced, the deliverable is the evidence-gathering plan, not a guess-fix. Record the exact error/output — verbatim, not paraphrased.
2. **Gather evidence.** Read the failing codepath end to end. Check what changed (recent commits on the branch, related tickets). Compare the broken path with a working sibling path (FRA-21 presenters, a passing view, the same endpoint with different input) — differences are the suspect list.
3. **Hypothesize — one at a time.** State a single root-cause hypothesis with the observation that would confirm it and the one that would kill it. Rank hypotheses by evidence, test the cheapest discriminator first.
4. **Test minimally.** One variable per experiment. Log results against the hypothesis (confirmed / killed / inconclusive). A killed hypothesis is progress — record it so it isn't retried.
5. **Fix the root cause**, at the layer the cause lives in (not a guard at the call site that masks it, unless the call site *is* the cause). Keep the fix minimal and in repo conventions (UI boundary, presenters, API scopes).
6. **Regression-test.** Add or extend a test that fails on the pre-fix code and passes now (presenter test, content-contract test, or a scripted browser scenario for UI bugs). Re-run the full suite (`npm test`, `npm run build`, `npm run lint:ui` when UI is touched) and the original reproduction.

## Output Contract

- A short investigation record: reproduction, hypotheses tested (with verdicts), root cause, the fix, and the regression test that proves it.
- If the root cause is not found, the record says so and lists what was ruled out — never a speculative "fix" dressed up as a conclusion.

## Operating Rules

- Explicit invocation only. Known-cause fixes (a typo, a failing assertion naming its own bug) skip this skill entirely.
- No fix before a reproduction exists. No second change before the first is tested. These are the wrapper's whole point.
- **Evaluation (while experimental):** each use is logged on FRA-35 with (a) root cause found? (b) was the stated root cause correct? (c) tokens/time vs a plain-debugging attempt at the same bug, when available. The team promotes or drops the wrapper based on that record — until then it stays explicit-only and is never widened to auto-trigger.
- Escalate out when the evidence points outside the repo (infra, third-party, data corruption): report the evidence boundary instead of continuing to hypothesize.
