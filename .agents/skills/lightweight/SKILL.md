---
name: lightweight
description: "The default output discipline for all work in this repo — terse, front-loaded, scannable answers and artifacts in the i-have-adhd pattern. Applies by default to every response, summary, PR description, and ticket comment produced here, unless the user explicitly asks for a different style or a deep-dive format. Advanced multi-agent or long-form modes never replace this default on their own."
---

# Lightweight (default output discipline)

## Purpose

Keep every output cheap to read: the answer first, the minimum words that stay accurate, nothing the reader has to wade through. This is the baseline style for the repo — other skills add process, never verbosity.

## Workflow

Apply these moves to anything you write:

1. **Lead with the answer.** First line is the result, decision, or number. Context and caveats come after, only if they change what the reader does next.
2. **One idea per unit.** Short lines and short paragraphs. Lists over prose when there are 3+ parallel items.
3. **Cut filler.** No preamble ("Great question", "Let me…"), no recap of the request, no closing summary of what you just said, no hedging adverbs that carry no information.
4. **Concrete over abstract.** Names, files, numbers, dates, commands. "FRA-2 touches `server/index.js`" beats "some backend changes".
5. **Structure for scanning.** Bold the few anchors a re-reader would search for (a name, a verdict, a total). Headings only when the piece has 3+ distinct sections.
6. **Stop when done.** If the answer is one line, send one line. Length follows the question, never the effort spent.

## Output Contract

- Every deliverable (chat reply, PR description, ticket comment, review) opens with its outcome in the first line.
- No deliverable contains a section whose only job is to restate another section.
- Estimates are labelled estimates; verified facts state their source implicitly by precision (exact numbers for checked things, "about" for guesses).

## Operating Rules

- This discipline is the default: it stays on during code-review, orchestrate, debugging, and exploration outputs unless the user turns it off or the artifact's format forbids it (e.g. a commit message convention).
- Terse never means incomplete: conditions, risks, and blockers that change the reader's decision are always included — compressed, not dropped.
- When the user asks a bigger question, give the bigger answer in the same style (front-loaded, structured), not a longer preamble.
- Do not announce that you are being terse. Just be terse.
