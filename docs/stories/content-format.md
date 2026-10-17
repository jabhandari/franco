# Stories content v1

The server consumes `content/stories/stories.v1.json`: 50 original AI-generated
stories, ordered A1 to C2 (9/9/8/8/8/8). Each record has a stable `id`, one-based
`order_index`, `level`, French `title`, English `title_en`, original French `text`,
optional-support `glossary`, positive `version`, provenance and exactly six
questions. Questions have stable IDs, French prompts, at least three options,
one `correct_option_id` and a French explanation.

A1 uses short present-tense daily situations and literal questions. Later levels
increase clause complexity, vocabulary and inferential demand. C1/C2 questions
ask about stance, scope, implication and narrative effect. CEFR tags are authored
targets, not a claim of formal certification. Glosses support reading without
replacing it with a full translation. No third-party texts are reproduced.

Answer keys stay server-side: the path API sends only prompts and option IDs.
Wrong responses can be retried without limit. Completion requires all six
correct; Skip is a separate state and unlocks the next stop equally.

`npm test` validates shape, 50/300 counts, level order, answer keys, duplicates
and balanced level batches. These automated checks cannot stand in for the human
spot-check required by FRA-149. Review `human-spot-check.md` (stories 1, 25, 50)
and record the human verdict before final approval. The content PR remains a
draft until that requirement is satisfied. Do not describe automated review as
human review.
