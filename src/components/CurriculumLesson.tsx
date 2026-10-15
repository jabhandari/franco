import React from 'react';
import type { CurriculumLesson as Lesson, CurriculumQuestion, CurriculumProvenance } from '../types';
import { curriculumAnswer, curriculumReviewDays } from '../presenters/curriculum.presenter';
import { Box, Button, Card, Text, TextInput } from './ui';

function Attribution({ provenance }: { provenance: CurriculumProvenance }) {
  if (provenance.kind === 'original') return null;
  return <Text as="small">{provenance.attribution_text} · {provenance.source_author} · {provenance.license_id} {provenance.source_url && <Box as="a" href={provenance.source_url} target="_blank" rel="noreferrer">Source</Box>}</Text>;
}
function Question({ question, onResult }: { key?: React.Key; question: CurriculumQuestion; onResult?: (id: string, correct: boolean) => void }) {
  const [answer, setAnswer] = React.useState('');
  const [result, setResult] = React.useState<{ correct: boolean; message: string } | null>(null);
  function check() { const next = curriculumAnswer(question, answer); setResult(next); onResult?.(question.id, next.correct); }
  return <Card>
    <Text>{question.prompt}</Text>
    {question.choices ? <Box display="flex" gap="sm" wrap>{question.choices.map(choice => <Button key={choice.id} variant={answer === choice.id ? 'primary' : 'text'} onClick={() => { setAnswer(choice.id); setResult(null); }}>{choice.text}</Button>)}</Box> : <TextInput value={answer} aria-label={question.prompt} onChange={event => { setAnswer(event.target.value); setResult(null); }} />}
    <Button variant="text" disabled={!answer.trim()} onClick={check}>Check answer</Button>
    {result && <Box role="status"><Text>{result.message}</Text>{!result.correct && <Text>Answer: {question.correct_answers.map(value => question.choices?.find(c => c.id === value)?.text ?? value).join(' / ')}</Text>}</Box>}
    <Attribution provenance={question.provenance} />
  </Card>;
}
export function CurriculumLesson({ lesson }: { key?: React.Key; lesson: Lesson }) {
  const [mastery, setMastery] = React.useState<Record<string, boolean>>({});
  if (lesson.review_status !== 'published') return <Text>In preparation. You can freely explore other topics while this lesson is reviewed.</Text>;
  const attempted = Object.keys(mastery).length;
  const correct = Object.values(mastery).filter(Boolean).length;
  return <Box>
    <Box id="lesson-overview"><Text as="h3">1. Your outcome</Text><Text>{lesson.outcome}</Text></Box>
    <Box id="lesson-theory"><Text as="h3">2. Understand and notice</Text><Text>{lesson.explanation}</Text>
      <Box id="lesson-examples">{lesson.example_items.map((example, i) => <Card key={i}><Text as="strong">{example.french}</Text><Text>{example.english}</Text><Attribution provenance={example.provenance} /></Card>)}</Box>
    </Box>
    <Text as="h3">3. Recognition check</Text>{lesson.recognition.map(q => <Question key={q.id} question={q} />)}
    <Text as="h3">4. Guided production</Text>{lesson.guided_production.map(q => <Question key={q.id} question={q} />)}
    <Text as="h3">5. Read for meaning</Text><Card><Text>{lesson.reading.french}</Text><Text>{lesson.reading.prompt}</Text><Box as="details"><Box as="summary">English support</Box><Text>{lesson.reading.english}</Text></Box><Attribution provenance={lesson.reading.provenance} /></Card>
    <Text as="h3">6. Use it in real life</Text><Card><Text>{lesson.realistic_use.prompt}</Text>{lesson.realistic_use.rubric.map(line => <Text key={line}>• {line}</Text>)}<Box as="details"><Box as="summary">Compare with a model after you try</Box><Text>{lesson.realistic_use.model}</Text><Text>{lesson.realistic_use.model_translation}</Text></Box></Card>
    <Text as="h3">7. Feedback and repair</Text><Text>{lesson.feedback.rule}</Text><Text>{lesson.feedback.error}</Text><Text>{lesson.feedback.remediation}</Text>
    <Text as="h3">8. Mastery and review</Text>{lesson.mastery.map(q => <Question key={q.id} question={q} onResult={(id, passed) => setMastery(current => ({ ...current, [id]: passed }))} />)}
    {attempted === lesson.mastery.length && <Text>Self-check: {correct}/{lesson.mastery.length}. Review in {curriculumReviewDays(correct, lesson.mastery.length, lesson.review_due_policy)} day(s). This practice does not change your recorded mastery.</Text>}
    <Text as="small">Lesson version {lesson.version}. Review again after {lesson.review_due_policy.subsequent_days.join(', ')} days as recall improves.</Text>
  </Box>;
}
