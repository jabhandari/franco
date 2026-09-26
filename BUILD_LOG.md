# Build log — French exam-prep normalized dataset

Built 2026-09-26. Deliverable: `normalized-content.json` (4.38 MB, validation OK).

## Sources included

| # | Source | License | Rows → tables |
|---|--------|---------|---------------|
| 1 | Tatoeba (`src_tatoeba`) | CC-BY 2.0 FR (default; sentences individually licensed) | 8,000 → `example_sentences` |
| 2 | Lexique 3.83 (`src_lexique383`) | CC-BY-SA 4.0 | 1,500 → `learning_topics` (vocabulary) |
| 3 | Wikibooks French (`src_wikibooks`) | CC-BY-SA 4.0 | 12 → `learning_topics` (grammar) |
| 4 | Lingua Libre / Wikimedia Commons (`src_lingualibre`) | CC-BY-SA 4.0 | 150 → `content_items` + `content_revisions` + `media_assets` |
| 5 | Multilingual LibriSpeech French (`src_mls`) | CC-BY 4.0 | 80 → `content_items` + `content_revisions` + `media_assets` |
| 6 | Original authored items (`src_original_authored`) | Original (no third-party rights) | 46 → `exam_questions` (34) + `content_items`/`content_revisions` (12) |

## License obligations (summary)

- **CC-BY (attribution only):** Tatoeba, MLS French. Keep attribution in `content_sources.attribution`.
- **CC-BY-SA 4.0 (attribution + share-alike):** Lexique 3.83, Wikibooks, Lingua Libre. Share-alike applies to adapted derivatives of this content — the attribution chain is preserved in `content_sources.attribution`.
- **Original authored items:** no third-party rights; task types mirror public exam descriptors only, every word of text is original.

## Sources excluded

- **FrenchBench (manu/french-bench-grammar-vocab-reading)** — 309 MCQs were pulled, then **dropped** before assembly. Its MIT dataset tag does not clear the underlying homestudies.ch item provenance, so it fails the "clearly free to redistribute" bar. Listed here under *excluded pending provenance review*; do not use in production until cleared.
- **Never touched (redistribution forbidden):** official DELF/DALF/TCF/TEF sample papers, TV5Monde Apprendre, Podcast Français Facile, RFI Savoirs, francaisfacile.com, Forvo, Audio Lingua.

## Methods per source

- **Tatoeba:** streamed `sentences.tar.bz2` (727,168 French sentences scanned), deduplicated by text, kept 3–40 tokens, deterministic reservoir sample (seed 42) of 8,000. POS counts via spaCy `fr_core_news_sm`. Difficulty = min(100, round(tokens×3 + 15 if subordination + avg_token_len×2)); CEFR bands ≤20 A1 / ≤35 A2 / ≤50 B1 / ≤70 B2 / ≤85 C1 / else C2. Subordination matched against multi-word French subordinators (parce que, puisque, bien que, lorsque, …).
- **Lexique:** top 1,500 unique lemmas by `freqlemfilms2`; CEFR by rank (≤300 A1, ≤800 A2, else B1); `item` holds JSON `{lemma, pos, gender, number, freq_rank, freqlemfilms2}`.
- **Wikibooks:** 12 grammar pages from `en.wikibooks.org/wiki/French` fetched via `action=parse`, HTML stripped, first 1,500 chars + page URL kept. No CEFR level keywords on these pages → defaulted to A2 (editorial default).
- **Lingua Libre:** 150 most frequent French words with `LL-Q150 (fra)` recordings on Wikimedia Commons; direct file URLs stored, no audio downloaded. CEFR heuristic (rank ≤500 → A1 else A2), confidence 0.5.
- **MLS:** 80 dictation clips from the `french` train split (streaming). This split's clips run ~10–20 s (0 <8 s clips in 1,500 scanned), so the <12 s fallback from the brief was used. No per-clip audio URLs exist (clips sit inside per-chapter Hub tarballs); `media_assets.url` points to the chapter's LibriVox recording on archive.org with the clip's `[begin_time, end_time]` segment in `metadata_json`. No audio binaries downloaded; durations from dataset metadata. CEFR heuristic by transcript word count.
- **Authored (clean-room):** 46 original items. 34 `exam_questions` (`exam_name='Original'`): 12 reading QCM (6 original 60–150-word passages × 2), 12 grammar QCM, 10 listening QCM written against MLS transcripts. 12 `content_items` + revisions: 6 writing prompts (A1–C2) with a 4-criterion rubric in `evaluation_json`, 6 speaking prompts (A1–C2) with expected points and follow-up questions. All authored rows: `cefr_method='editorial-original'`, confidence 0.8, `status='pending_review'`, `metadata_json={"format_reference": …, "original": true}`. `source_url` uses placeholder `https://example.com/original-authored-items` (no external source exists for original content).

## Authored items breakdown

| Skill | Count | CEFR spread |
|---|---|---|
| reading (QCM) | 12 | A1×2 A2×2 B1×2 B2×2 C1×2 C2×2 |
| grammar (QCM) | 12 | A1×3 A2×3 B1×3 B2×3 |
| listening (QCM) | 10 | B1×2 B2×8 |
| writing (prompts) | 6 | A1–C2 ×1 each |
| speaking (prompts) | 6 | A1–C2 ×1 each |

## Validation performed

JSON parses; every row carries exactly the table's column keys; IDs unique per table; `(item_id, revision)` unique in `content_revisions`; all `source_id` / `media_assets.item_id` / revision `item_id` foreign keys resolve; `metadata_json`/`choices_json`/`response_json`/`evaluation_json` are valid JSON objects. File size 4.38 MB (< 25 MB budget).

## Known limitations

- CEFR labels on Tatoeba/Lexique/Wikibooks/Lingua Libre/MLS rows are heuristics, not expert judgments (`cefr_method` records which).
- MLS `media_assets.url` is chapter-level (clip = timestamped segment); the app must seek to `chapter_segment.begin_time`.
- `example_sentences.pos_method` may read `lexique-lookup-fallback` if spaCy failed (this build: `spacy-fr_core_news_sm`).
- All `pending_review` rows (authored, Lingua Libre, MLS) should be spot-checked before production use.
