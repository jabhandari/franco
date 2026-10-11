---
name: orchestrate
description: "Coordinate a multi-part piece of work in this repo as a task DAG — triage first, then dispatch each node headlessly to the cheapest model tier that meets its acceptance criteria via codex exec, and verify every node's output before integrating it. Use only when the user explicitly asks to orchestrate, fan out, or run subagents/workers on a task. Never trigger for a single mechanical edit or a task one agent can finish directly."
---

# Orchestrate

## Purpose

Split work that is genuinely parallel or mixed-difficulty into a small DAG of self-contained tasks, run each at the cheapest sufficient model tier, and integrate only verified results. Orchestration is overhead: it must earn its tokens by parallelism or by tier savings, or it shouldn't happen.

## Workflow

1. **Triage gate — decide whether to orchestrate at all.** Skip orchestration and do the work directly when ANY of these hold:
   - The task is a single mechanical edit (rename, format, one-file fix, config bump).
   - The work decomposes into fewer than 2 independent nodes.
   - Every node needs the same tier and they must run strictly in sequence.
   - The user didn't explicitly ask for orchestration.
   State the gate outcome in one line before proceeding ("Orchestrating: 4 nodes, 2 tiers" or "Not orchestrating: single mechanical edit — doing it directly").
2. **Build the DAG.** Nodes are self-contained work units with: a one-line goal, exact scope (files/area), acceptance criteria, dependencies (edges), and an output artifact (a diff, a file, or a report). A node brief must be executable by an agent that has never seen this conversation.
3. **Route each node** with the table below. Default to the cheapest tier; promote a node only when its acceptance criteria demand it (ambiguous requirements, cross-file reasoning, review/judgment work).
4. **Dispatch headlessly**, one `codex exec` per node, in dependency order; independent nodes may run in parallel:
   ```
   codex exec -m <model> -c model_reasoning_effort=<effort> --sandbox workspace-write -o <node-output-file> "<brief>"
   ```
   The brief repeats the goal, scope, acceptance criteria, and the standing prohibitions (never merge, never push to another author's branch, never touch files outside scope).
5. **Verify before integrate — mandatory, per node.** Read the node's diff/output yourself; run the repo checks that apply (`npm run lint:ui`, `npm test`, `npm run build`, or the node's own acceptance test). A node that fails verification is re-dispatched once with the failure attached; a second failure escalates to a higher tier or back to the user — it is never integrated on hope.
6. **Integrate in dependency order**, then run the full check suite once on the combined result (node-level green does not imply integration green).
7. **Report.** One summary: DAG outcome per node (tier used, verified how), total failures/re-dispatches, and what was integrated. No per-node transcripts unless asked.

## Routing table

| Task class | Examples | Tier | Effort |
|---|---|---|---|
| Mechanical | renames, formatting, scaffolding, boilerplate, find-and-replace, file moves | economy (smallest available) | low |
| Standard implementation | a ticket node with clear acceptance criteria, tests to write against a known pattern, docs | standard (mid-tier) | medium |
| Judgment / integration | cross-file refactors, architecture choices, code review, debugging unknown failures, final verification | frontier (strongest available) | high |

Resolve `<model>` for each tier from the local `codex` configuration at dispatch time — model IDs change; this table pins *classes and effort*, not product names.

## Output Contract

- The triage verdict line, the DAG (nodes, tiers, edges), per-node verification results, and a final integrated result with the full-suite check output.
- Any node that was re-dispatched or escalated is named, with the reason.

## Operating Rules

- Verify-before-integrate is not optional and cannot be waived by schedule pressure; unverified output is treated as not done.
- Workers get the minimum context their node needs — briefs are self-contained, and no node's brief leaks another node's in-progress output.
- Workers never merge PRs, never push to branches they weren't assigned, and never widen their own scope; scope questions come back to the orchestrator.
- Depth limit: one level. Workers do not orchestrate their own sub-DAGs.
- If dispatch tooling (`codex exec`) is unavailable, stop and say so — do not silently do all the work yourself and call it orchestration.
