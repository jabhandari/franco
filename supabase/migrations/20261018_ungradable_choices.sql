-- Imported exam examples with no answer key cannot be graded. Keep them in
-- review until an editor supplies and verifies the correct choice.
UPDATE content_items AS item
SET status = 'pending_review', updated_at = NOW()
FROM content_revisions AS revision
WHERE revision.item_id = item.id
  AND revision.revision = item.current_revision
  AND item.status = 'published'
  AND item.item_type = 'multiple_choice'
  AND NULLIF(BTRIM(COALESCE(revision.response_json->>'answer', revision.evaluation_json->>'answer', '')), '') IS NULL;
