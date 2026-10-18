# Franco workspace skills — routing policy

Skills live in `.agents/skills/` inside this repo. Codex auto-discovers them on clone — there is no install step for anyone working in this repo. (Personal/global skills, if ever needed, are distributed separately via `npx skills add <repo>` or a repo `install.sh` — not pip; skills are markdown plus optional scripts, not Python packages.)

## Which skill when

| Situation | Skill | Trigger |
|---|---|---|
| Any output at all (baseline style) | `lightweight` | Always on — the repo default |
| Reviewing a PR, branch, or diff | `code-review` | On request ("review PR #n") |
| Work that is parallel or mixed-difficulty AND the user asked to fan out | `orchestrate` | Explicit request only |
| Architecture / trade-off decision that's expensive to reverse | `multi-approach` | Explicit invocation only (`allow_implicit_invocation: false`) |
| A hard, unknown-cause bug | `bug-investigation` | Explicit invocation only (`allow_implicit_invocation: false`) |

If two skills could apply, the more specific one wins for the task and `lightweight` still governs the output format. A repo convention (FRA-16 library, FRA-21 boundary, presenter placement) always outranks a skill's suggestion.

## Token-cost notes

- `lightweight` — negative cost. It exists to make every other skill's output cheaper to produce and to read.
- `code-review` — one agent, one pass, plus commands. Cost ≈ reading the diff twice. Reuse representative UI screenshots; extra captures and image inspection consume time and model context without helping every review.
- `orchestrate` — the expensive one: DAG planning + per-node dispatch + per-node verification + a full-suite run at integration. Only worth it when parallelism or tier savings (mechanical nodes on the economy tier) outweigh the coordination overhead. The triage gate exists to say no.
- `multi-approach` — bounded by design (3–5 approaches, sketches only, no implementation). Cheap relative to reversing a wrong architecture.
- `bug-investigation` — costs more than intuition on easy bugs, less on hard ones. Experimental: each use is measured against plain debugging on FRA-35 (root-cause accuracy + token cost) before any wider use.
