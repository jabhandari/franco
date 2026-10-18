-- Backfill the fourteen TCF examples imported without their answer keys.
-- Answers were checked against the questions and illustrations on France
-- Éducation international's original examples page (see PR description).
-- This file is run on every API startup, so every statement is idempotent.
CREATE TEMP TABLE IF NOT EXISTS tcf_example_answers (
  number integer PRIMARY KEY, answer text NOT NULL, image_url text
) ON COMMIT DROP;
TRUNCATE tcf_example_answers;
INSERT INTO tcf_example_answers(number, answer, image_url) VALUES
  (1, 'D', 'https://www.france-education-international.fr/sites/default/files/medias/image/2021/05/tcf_comprehension-orale_livret1.png'),
  (2, 'C', 'https://www.france-education-international.fr/sites/default/files/medias/image/2021/05/image-comprehension-orale-exemple-2.jpg'),
  (3, 'C', NULL),
  (4, 'B', NULL),
  (5, 'B', NULL),
  (6, 'B', NULL),
  (7, 'C', NULL),
  (8, 'A', NULL),
  (9, 'C', NULL),
  (10, 'A', NULL),
  (11, 'D', 'https://www.france-education-international.fr/sites/default/files/medias/image/2021/05/tcf_comprehension-ecrite_livret1.png'),
  (12, 'C', 'https://www.france-education-international.fr/sites/default/files/medias/image/2021/05/tcf_comprehension-ecrite_livret2.png'),
  (13, 'B', 'https://www.france-education-international.fr/sites/default/files/medias/image/2021/05/ceexemple2.jpg'),
  (14, 'A', 'https://www.france-education-international.fr/sites/default/files/medias/image/2021/05/ceexemple4.jpg');

UPDATE content_revisions AS revision
SET response_json = jsonb_set(revision.response_json, '{answer}', to_jsonb(answers.answer))
FROM content_items AS item, tcf_example_answers AS answers
WHERE revision.item_id = item.id
  AND revision.revision = item.current_revision
  AND item.item_type = 'multiple_choice'
  AND item.external_id = 'legacy-exam:tcf-example-' || answers.number
  AND NULLIF(BTRIM(COALESCE(revision.response_json->>'answer', revision.evaluation_json->>'answer', '')), '') IS NULL;

-- The earlier version of this migration moved these rows into review. Restore
-- only the known examples after they have a verified answer.
UPDATE content_items AS item
SET status = 'published', updated_at = NOW()
FROM content_revisions AS revision, tcf_example_answers AS answers
WHERE revision.item_id = item.id
  AND revision.revision = item.current_revision
  AND item.external_id = 'legacy-exam:tcf-example-' || answers.number
  AND item.status = 'pending_review'
  AND revision.response_json->>'answer' = answers.answer;

-- Past Questions still reads the legacy table directly.
UPDATE exam_questions AS question
SET answer = CASE WHEN NULLIF(BTRIM(question.answer), '') IS NULL THEN answers.answer ELSE question.answer END,
    metadata_json = CASE WHEN answers.image_url IS NOT NULL
      THEN jsonb_set(question.metadata_json, '{image_url}', to_jsonb(answers.image_url))
      ELSE question.metadata_json END
FROM tcf_example_answers AS answers
WHERE question.external_id = 'tcf-example-' || answers.number
  AND (NULLIF(BTRIM(question.answer), '') IS NULL
       OR (answers.image_url IS NOT NULL AND question.metadata_json->>'image_url' IS DISTINCT FROM answers.image_url));

-- Six examples refer to an illustration which the original import omitted.
INSERT INTO media_assets(id, item_id, kind, url)
SELECT md5('tcf-example-image:' || item.id), item.id, 'image', answers.image_url
FROM content_items AS item
JOIN tcf_example_answers AS answers
  ON item.external_id = 'legacy-exam:tcf-example-' || answers.number
WHERE answers.image_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM media_assets AS media
    WHERE media.item_id = item.id AND media.kind = 'image'
  )
ON CONFLICT (id) DO NOTHING;

-- Other, still-unkeyed published MCQs must not present a false wrong answer.
UPDATE content_items AS item
SET status = 'pending_review', updated_at = NOW()
FROM content_revisions AS revision
WHERE revision.item_id = item.id
  AND revision.revision = item.current_revision
  AND item.status = 'published'
  AND item.item_type = 'multiple_choice'
  AND NULLIF(BTRIM(COALESCE(revision.response_json->>'answer', revision.evaluation_json->>'answer', '')), '') IS NULL;
