# FRA-159 story expansion evidence

Historical review of the earlier 100–150-word edition. The current collection has been recalibrated by level; see [story calibration](story-calibration.md) for its current bands and sourcing. Counts below describe the prior edition.

All 50 stories contain 100–150 words and exactly six questions.

Counting method: `story.text.trim().split(/\s+/).length`, i.e. whitespace-split of the French body only. Titles, glosses, questions and explanations are excluded. `npm test` runs the count assertions in its pretest content check.

## Content review

Agent editorial review covered all 50 final texts and all 300 question/option/key/explanation sets. Original premises and keyed facts are retained. Prompts that became ambiguous after expansion now specify the scene or moment; references to old final sentences were corrected. All question IDs, options and correct keys remain unchanged, so versions stay at 1 and saved answers retain their meaning. All story IDs, titles, order indices, CEFR tags and provenance are unchanged. Every story gains one glossary entry in the existing `{french, english}` representation.

A1 expansions use present-tense sentences and concrete everyday vocabulary. A2 adds practical actions in familiar settings. B1 develops consequences and relationships; B2 develops discussion and evaluation. C1/C2 retain the original syntax and nuance. These are editorial judgments, not a formal CEFR certification.

Closer agent reading: 1 / 25 / 50 plus 6 / 14 / 31 / 38.

| Story | Review notes |
| --- | --- |
| 1 | Station and train premise retained; simple present throughout. The first location and ticket questions specify the relevant moment after the continuation was added. All six keys have explicit support. |
| 25 | Shared memories remain distinct from proof. The added bell memory extends the exhibition without resolving the disputed door/fruit details. All six questions remain supported. |
| 50 | Removed three optional words to reach 149. The letter, opposed solutions, dated margin and open-ended handover remain intact. All six questions remain supported. |
| 6 | Present-tense garden scene; final return to reading preserves the sixth question. Added vocabulary support for `ballon`. |
| 14 | Restaurant reservation remains four reduced to two, Friday evening, window table with Lina. The continuation adds an ordinary meal; six keys remain supported. |
| 31 | New readers help reformulate the rules after testing; the possibility/obligation mistranslation and six keyed inferences remain intact. |
| 38 | Accessibility expertise and lived experience remain complementary. The resident asks for results, without changing the identified timing problem or six keyed inferences. |

**Human review is pending.** The agent reading above does not fulfill the ticket's requested human spot-check. The PR remains draft for a person to read stories 1 / 25 / 50 plus a random sample for level fit, natural French and answerability before marking it ready.

## Service verification

Loaded the final catalog through `loadStories()` with the unchanged server validator. Exercised `createStoryService().detail()` for every story, with an in-memory progress adapter. All 50 responses return the final text and six questions, with no correct-option keys. Rechecked with empty progress after rebasing onto the merged FRA-158 change. No live database or content import/publish operation was used.

## Per-story counts

| Story | Level | Words | Questions |
| --- | --- | ---: | ---: |
| story-01 | A1 | 101 | 6 |
| story-02 | A1 | 106 | 6 |
| story-03 | A1 | 111 | 6 |
| story-04 | A1 | 115 | 6 |
| story-05 | A1 | 111 | 6 |
| story-06 | A1 | 111 | 6 |
| story-07 | A1 | 116 | 6 |
| story-08 | A1 | 113 | 6 |
| story-09 | A1 | 121 | 6 |
| story-10 | A2 | 113 | 6 |
| story-11 | A2 | 110 | 6 |
| story-12 | A2 | 114 | 6 |
| story-13 | A2 | 118 | 6 |
| story-14 | A2 | 112 | 6 |
| story-15 | A2 | 112 | 6 |
| story-16 | A2 | 115 | 6 |
| story-17 | A2 | 118 | 6 |
| story-18 | A2 | 112 | 6 |
| story-19 | B1 | 112 | 6 |
| story-20 | B1 | 113 | 6 |
| story-21 | B1 | 126 | 6 |
| story-22 | B1 | 112 | 6 |
| story-23 | B1 | 116 | 6 |
| story-24 | B1 | 114 | 6 |
| story-25 | B1 | 111 | 6 |
| story-26 | B1 | 107 | 6 |
| story-27 | B2 | 119 | 6 |
| story-28 | B2 | 118 | 6 |
| story-29 | B2 | 115 | 6 |
| story-30 | B2 | 123 | 6 |
| story-31 | B2 | 112 | 6 |
| story-32 | B2 | 127 | 6 |
| story-33 | B2 | 119 | 6 |
| story-34 | B2 | 120 | 6 |
| story-35 | C1 | 112 | 6 |
| story-36 | C1 | 125 | 6 |
| story-37 | C1 | 121 | 6 |
| story-38 | C1 | 123 | 6 |
| story-39 | C1 | 124 | 6 |
| story-40 | C1 | 117 | 6 |
| story-41 | C1 | 116 | 6 |
| story-42 | C1 | 120 | 6 |
| story-43 | C2 | 136 | 6 |
| story-44 | C2 | 144 | 6 |
| story-45 | C2 | 141 | 6 |
| story-46 | C2 | 141 | 6 |
| story-47 | C2 | 148 | 6 |
| story-48 | C2 | 149 | 6 |
| story-49 | C2 | 141 | 6 |
| story-50 | C2 | 149 | 6 |
