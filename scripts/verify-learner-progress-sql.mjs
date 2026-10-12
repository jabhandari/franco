import { SKILL_AGGREGATES_SQL,CONCEPT_PROGRESS_SQL,RECENT_MISTAKES_SQL } from '../server/learner-progress.js';
const sql = `BEGIN;
DO $$
DECLARE
  test_user text := 'fra89-check-' || gen_random_uuid();
  other_user text := 'fra89-other-' || gen_random_uuid();
  first_item text; second_item text; concept text;
  done integer; correct_count integer; total integer; state text; mistake_count integer;
BEGIN
  SELECT id INTO first_item FROM content_items WHERE status='published' AND item_type='reading' AND cefr_level='A1' ORDER BY id LIMIT 1;
  SELECT id INTO second_item FROM content_items WHERE status='published' AND item_type='reading' AND cefr_level='A1' AND id<>first_item ORDER BY id LIMIT 1;
  SELECT id INTO concept FROM concepts WHERE status='active' ORDER BY id LIMIT 1;
  IF first_item IS NULL OR second_item IS NULL OR concept IS NULL THEN RAISE EXCEPTION 'Fixture inventory unavailable'; END IF;
  INSERT INTO users(id,email,name,password_hash,password_salt) VALUES
    (test_user,test_user||'@example.test','Progress verification','fixture','fixture'),
    (other_user,other_user||'@example.test','Isolation verification','fixture','fixture');
  INSERT INTO learning_attempts(id,user_id,item_id,item_kind,revision,response_json,evaluation_json,correct,created_at) VALUES
    (gen_random_uuid()::text,test_user,first_item,'content_item',1,'"B"','{"correct":false}',false,NOW()-INTERVAL '2 minutes'),
    (gen_random_uuid()::text,test_user,first_item,'content_item',1,'"A"','{"correct":true}',true,NOW()-INTERVAL '1 minute'),
    (gen_random_uuid()::text,test_user,second_item,'content_item',1,'"B"','{"correct":false}',false,NOW()),
    (gen_random_uuid()::text,other_user,second_item,'content_item',1,'"A"','{"correct":true}',true,NOW());
  SELECT exercises_done,exercises_correct,exercises_total INTO done,correct_count,total FROM
    (${SKILL_AGGREGATES_SQL.replaceAll('$1','test_user')}) summary WHERE skill='lire' AND level='A1';
  IF done<>2 OR correct_count<>1 OR total<2 THEN RAISE EXCEPTION 'Unique answers/isolation failed: %, %, %',done,correct_count,total; END IF;
  SELECT COUNT(*) INTO mistake_count FROM (${RECENT_MISTAKES_SQL.replaceAll('$1','test_user')}) mistakes;
  IF mistake_count<>2 THEN RAISE EXCEPTION 'Incorrect attempt history failed: %',mistake_count; END IF;
  SELECT progress.state INTO state FROM (${CONCEPT_PROGRESS_SQL.replaceAll('$1','test_user')}) progress WHERE concept_id=concept;
  IF state<>'not_started' THEN RAISE EXCEPTION 'Fresh concept state failed'; END IF;
  INSERT INTO learner_concept_mastery(user_id,concept_id,mastery,total_attempts,evidence_count) VALUES(test_user,concept,0.4,1,1);
  SELECT progress.state INTO state FROM (${CONCEPT_PROGRESS_SQL.replaceAll('$1','test_user')}) progress WHERE concept_id=concept;
  IF state<>'in_progress' THEN RAISE EXCEPTION 'Practiced concept state failed'; END IF;
  UPDATE learner_concept_mastery SET mastery=0.8 WHERE user_id=test_user AND concept_id=concept;
  SELECT progress.state INTO state FROM (${CONCEPT_PROGRESS_SQL.replaceAll('$1','test_user')}) progress WHERE concept_id=concept;
  IF state<>'completed' THEN RAISE EXCEPTION 'Mastered concept state failed'; END IF;
END $$;
ROLLBACK;`;
process.stdout.write(sql);
