# Franco

Franco is a React MVP shell for a French learning platform. The current app is authentication-first and uses a local Node API with SQLite for users, sessions, learner profiles, progress rows, attempts, and mistakes.

## Run locally

This project requires Node.js 22.12.0. If you use nvm, load the pinned version with:

```bash
nvm install
nvm use
```

Then install dependencies and start the app:

```bash
npm install
npm run dev
```

Content is stored in a local SQLite file and is not committed to Git (`data/` is ignored). After cloning, create it by running:

```bash
npm run import:all
```

Then start the API and web app with `npm run dev`. If the browser still shows loading, verify `http://127.0.0.1:8787/api/health` returns `{ "ok": true }` and open the Vite URL printed in the terminal.

The dev command starts both services:

- React/Vite: `http://127.0.0.1:5173/`
- API: `http://127.0.0.1:8787/`

The local SQLite database is created at `data/franco.sqlite`.

## Content API contract

The scraper-facing contract is [`schemas/content.v1.schema.json`](schemas/content.v1.schema.json). It is immutable: breaking changes require a new version. The same schema can be downloaded from `GET /api/content/v1/schema` and validated by the scraper before submission.

Set `CONTENT_API_KEY` in the API environment. Send it as `X-API-Key` to submit batches. The API validates and normalizes each batch, enforces idempotency, records exact and near-duplicate candidates, and stages accepted items as `pending_review`. Review actions are available through the versioned content API; only `published` items are returned by the published-item endpoint.

Example batch shape:

```json
{
  "schema_version": "content.v1",
  "batch_id": "ud-2026-09-15-01",
  "idempotency_key": "ud-2026-09-15-01-retry-safe",
  "source": {
    "id": "example-source",
    "name": "Example Source",
    "url": "https://example.com",
    "license": "CC BY 4.0",
    "attribution": "Example Source"
  },
  "items": []
}
```

Run the contract checks with `npm run test:content-contract`.

To refresh the French content from UD French GSD:

```bash
npm run import:ud-gsd
```

To import official free TCF sample questions:

```bash
npm run import:tcf-official
```

To import the public TV5MONDE exercise catalogue into its separate table:

```bash
npm run import:tv5
```

## Current MVP behavior

- Login and sign-up screens call the local API.
- User accounts and password hashes are stored in SQLite.
- Browser sessions use a bearer token stored in `sessionStorage`.
- The signed-in app shell includes Home, Session, Progress, and Conversation views.
- The Content view shows A1, A2, B1, and B2 sections imported into SQLite.
- Every usable UD sentence is retained; each produces reading, word-order, spelling, and grammar exercises.
- A1 includes database-backed vocabulary/topic tracks, and the Past questions view keeps exam items separate.
- Content endpoints include `GET /api/content/topics?section=A1` and `GET /api/exam/past-questions`.
- Official TCF sample questions can be imported into `exam_questions`.
- TV5MONDE activities are stored separately in `tv5_exercises`; they link back to the free activity pages for completion.
- No fake user progress or mistakes are rendered.

## Planned data sources

The app should fetch learner profile, progress, attempts, mistakes, and session queues from backend endpoints such as:

- `GET /api/me`
- `GET /api/me/session-plan`
- `GET /api/me/progress`
- `GET /api/me/conversation-targets`
- `POST /api/me/conversation-turns`

The UD French GSD treebank can be used later as an open corpus source for annotated sentence examples, subject to its CC BY-SA 4.0 license and attribution requirements:

https://universaldependencies.org/treebanks/fr_gsd/

The current A1-B2 labels are local difficulty sections generated from sentence length and UD annotations. UD French GSD does not provide official CEFR labels, so these should be improved later with CEFRLex/FLELex or a reviewed curriculum.

The TCF scraper imports examples from France Education international's official sample page. It does not scrape random past-paper sites, and it keeps those imported items in a separate `exam_questions` table with source attribution.

TV5MONDE reports more than 4,000 free exercises across A1-B2. The importer stores the paginated catalogue links and metadata in `tv5_exercises`, while the activity itself remains on TV5MONDE.
