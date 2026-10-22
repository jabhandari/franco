import React from 'react';
import { AlertTriangle, BookOpen, Languages, Lightbulb, MessageCircle, PenLine, Target, Trophy, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CurriculumLesson as Lesson, CurriculumQuestion, CurriculumProvenance } from '../types';
import { curriculumAnswer, curriculumCorrectAnswerText, parseWordBank } from '../presenters/curriculum.presenter';
import type { WordBank } from '../presenters/curriculum.presenter';
import { shuffle } from '../presenters/collections.presenter';
import { Box, Button, Checklist, CollapsibleSection, ExerciseShell, Feedback, OptionList, ReadingPassage, Text, Textarea, TextInput, TokenTray, WordToken } from './ui';
import type { AnsweredState } from './ui';
import { featureFlags } from '../feature-flags';

type ResultHandler = (id: string, correct: boolean | null) => void;

function Attribution({ provenance }: { provenance: CurriculumProvenance }) {
  if (provenance.kind === 'original') return null;
  return <Text as="small" className="learn-attribution">{provenance.attribution_text} · {provenance.source_author} · {provenance.license_id} {provenance.source_url && <Box as="a" href={provenance.source_url} target="_blank" rel="noreferrer">Source</Box>}</Text>;
}

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return <Box className="learn-section-heading"><Box as="span" className="learn-section-icon"><Icon size={17} /></Box><Text as="h3">{title}</Text></Box>;
}

function AnswerFeedback({ question, correct, onRetry }: { question: CurriculumQuestion; correct: boolean; onRetry: () => void }) {
  if (correct) return null;
  return <Feedback
    tone="incorrect"
    title="Not quite."
    message={`Correct answer: ${curriculumCorrectAnswerText(question)}`}
    onRetry={onRetry}
    retryLabel="Retry"
  />;
}

// Multiple choice: tapping an option grades it instantly, exactly like
// the Practice page — there is no separate check step.
function ChoiceAnswer({ question, onResult }: { question: CurriculumQuestion; onResult: ResultHandler }) {
  // Shuffle display order once per question: authored content keeps the
  // correct choice at a fixed position, so static rendering would make
  // answers position-predictable. Grading stays id-based, unaffected.
  const [options] = React.useState(() => shuffle(question.choices ?? []));
  const [selected, setSelected] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ correct: boolean } | null>(null);
  const correctKey = options.find(option => question.correct_answers.includes(option.id))?.id;
  function select(key: string) {
    if (result) return;
    const graded = curriculumAnswer(question, key);
    setSelected(key);
    setResult(graded);
    onResult(question.id, graded.correct);
  }
  function retry() {
    setSelected(null);
    setResult(null);
    onResult(question.id, null);
  }
  return <>
    <OptionList
      options={options.map(choice => ({ key: choice.id, label: choice.text }))}
      selectedKey={selected ?? undefined}
      answered={Boolean(result)}
      correct={result?.correct ?? false}
      correctKey={correctKey}
      disabled={Boolean(result)}
      onSelect={select}
    />
    {result && <AnswerFeedback question={question} correct={result.correct} onRetry={retry} />}
  </>;
}

// Typed answer: submit on Enter (form submit), no visible submit button.
function TypedAnswer({ question, onResult }: { question: CurriculumQuestion; onResult: ResultHandler }) {
  const [value, setValue] = React.useState('');
  const [result, setResult] = React.useState<{ correct: boolean } | null>(null);
  const [retries, setRetries] = React.useState(0);
  function submit() {
    if (result || !value.trim()) return;
    const graded = curriculumAnswer(question, value);
    setResult(graded);
    onResult(question.id, graded.correct);
  }
  function retry() {
    setValue('');
    setResult(null);
    setRetries(count => count + 1);
    onResult(question.id, null);
  }
  return <>
    <Box as="form" className="learn-answer-form" onSubmit={event => { event.preventDefault(); submit(); }}>
      <TextInput key={retries} value={value} disabled={Boolean(result)} autoFocus={retries > 0} aria-label={question.prompt} placeholder="Type your answer…" onChange={event => setValue(event.target.value)} />
    </Box>
    {!result && <Text variant="muted" size="sm">Type your answer, then press Enter</Text>}
    {result && <AnswerFeedback question={question} correct={result.correct} onRetry={retry} />}
  </>;
}

// Word bank: chips assemble in tap order; placing the last chip grades
// the sentence instantly.
function WordBankAnswer({ question, bank, onResult }: { question: CurriculumQuestion; bank: WordBank; onResult: ResultHandler }) {
  const [order] = React.useState(() => shuffle(bank.tokens.map((_, index) => index)));
  const [placed, setPlaced] = React.useState<number[]>([]);
  const [result, setResult] = React.useState<{ correct: boolean } | null>(null);
  const available = order.filter(index => !placed.includes(index));
  function place(index: number) {
    if (result) return;
    const next = [...placed, index];
    setPlaced(next);
    if (next.length === bank.tokens.length) {
      const graded = curriculumAnswer(question, next.map(token => bank.tokens[token]).join(' '));
      setResult(graded);
      onResult(question.id, graded.correct);
    }
  }
  function remove(index: number) {
    if (result) return;
    setPlaced(current => current.filter(token => token !== index));
  }
  function retry() {
    setPlaced([]);
    setResult(null);
    onResult(question.id, null);
  }
  return <>
    <Text variant="muted">Tap or swipe words into your sentence. Tap or swipe a placed word to remove it.</Text>
    <Text as="strong" className="practice-tray-label">Your sentence</Text>
    <TokenTray variant="answer" label="Your sentence" emptyHint="Tap a word below to begin.">
      {placed.map(index => <WordToken key={`placed-${index}`} placed disabled={Boolean(result)} onSwipe={() => remove(index)} onClick={() => remove(index)}>{bank.tokens[index]}</WordToken>)}
    </TokenTray>
    <Text as="strong" className="practice-tray-label">Word bank</Text>
    <TokenTray variant="bank" label="Word bank">
      {available.map(index => <WordToken key={`bank-${index}`} disabled={Boolean(result)} onSwipe={() => place(index)} onClick={() => place(index)}>{bank.tokens[index]}</WordToken>)}
    </TokenTray>
    {result && <AnswerFeedback question={question} correct={result.correct} onRetry={retry} />}
  </>;
}

function QuestionBody({ question, onResult }: { key?: React.Key; question: CurriculumQuestion; onResult: ResultHandler }) {
  const bank = question.choices?.length ? null : parseWordBank(question.prompt);
  return <>
    <Text as="h2">{bank ? bank.prompt : question.prompt}</Text>
    {question.choices?.length
      ? <ChoiceAnswer question={question} onResult={onResult} />
      : bank
        ? <WordBankAnswer question={question} bank={bank} onResult={onResult} />
        : <TypedAnswer question={question} onResult={onResult} />}
    <Attribution provenance={question.provenance} />
  </>;
}

// Guided production stacks one card per question, like the Practice page.
function StackQuestion({ question, eyebrow, onResult }: { key?: React.Key; question: CurriculumQuestion; eyebrow: string; onResult: ResultHandler }) {
  const [answered, setAnswered] = React.useState<AnsweredState | null>(null);
  function handle(id: string, correct: boolean | null) {
    setAnswered(correct === null ? null : correct ? 'correct' : 'wrong');
    onResult(id, correct);
  }
  return <ExerciseShell eyebrow={eyebrow} answered={answered}>
    <QuestionBody question={question} onResult={handle} />
  </ExerciseShell>;
}

function ReadingTranslation({ english }: { english: string }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return <Box className="learn-translation">
    <Button variant="text" icon={Languages} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>{open ? 'Hide translation' : 'Translate'}</Button>
    {open && <Box id={id}><Text variant="muted">{english}</Text></Box>}
  </Box>;
}

function RealisticUse({ lesson }: { lesson: Lesson }) {
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const [draft, setDraft] = React.useState('');
  return <ExerciseShell>
    <Text as="h2">{lesson.realistic_use.prompt}</Text>
    <Checklist
      items={lesson.realistic_use.rubric.map((line, index) => ({ id: `rubric-${index}`, title: line }))}
      checked={checked}
      onToggle={id => setChecked(current => ({ ...current, [id]: !current[id] }))}
    />
    <Textarea rows={3} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write your version here…" aria-label="Your version" />
    <CollapsibleSection title="Compare with a model after you try">
      <Text as="strong">{lesson.realistic_use.model}</Text>
      <Text variant="muted">{lesson.realistic_use.model_translation}</Text>
    </CollapsibleSection>
  </ExerciseShell>;
}

export function CurriculumLesson({ lesson, onComplete, onProgress }: { key?: React.Key; lesson: Lesson; onComplete?: () => void; onProgress?: (done: number, total: number) => void }) {
  const [results, setResults] = React.useState<Record<string, boolean>>({});
  const handleResult = React.useCallback<ResultHandler>((id, correct) => {
    setResults(current => {
      if (correct === null) {
        if (!(id in current)) return current;
        const next = { ...current };
        delete next[id];
        return next;
      }
      return current[id] === correct ? current : { ...current, [id]: correct };
    });
  }, []);
  const total = lesson.recognition.length + lesson.guided_production.length + lesson.mastery.length;
  const done = Object.values(results).filter(Boolean).length;
  React.useEffect(() => { onProgress?.(done, total); }, [done, total, onProgress]);
  const masteryComplete = lesson.mastery.length > 0 && lesson.mastery.every(q => results[q.id] === true);
  React.useEffect(() => { if (masteryComplete) onComplete?.(); }, [masteryComplete, onComplete]);
  if (lesson.review_status !== 'published') return <Text>In preparation. You can freely explore other topics while this lesson is reviewed.</Text>;
  return <Box className="learn-pack">
    <Box className="learn-section learn-outcome">
      <SectionHeading icon={Target} title="What you’ll learn" />
      <Text>{lesson.outcome}</Text>
    </Box>
    <Box className="learn-section">
      <SectionHeading icon={Lightbulb} title="The idea, in plain English" />
      <Text>{lesson.explanation}</Text>
    </Box>
    <Box className="learn-section">
      <SectionHeading icon={Languages} title="See it in French" />
      <Box className="learn-examples">
        {lesson.example_items.map((example, i) => <Box className="learn-example" key={i}>
          <Text as="strong">{example.french}</Text>
          <Text variant="muted">{example.english}</Text>
          <Attribution provenance={example.provenance} />
        </Box>)}
      </Box>
    </Box>
    {lesson.recognition.length > 0 && <Box className="learn-section">
      <SectionHeading icon={Zap} title="Quick check" />
      <Box className="learn-question-stack">{lesson.recognition.map((q, i) => <StackQuestion key={q.id} question={q} eyebrow={`Question ${i + 1} of ${lesson.recognition.length}`} onResult={handleResult} />)}</Box>
    </Box>}
    {lesson.guided_production.length > 0 && <Box className="learn-section">
      <SectionHeading icon={PenLine} title="Your turn" />
      <Text variant="muted">Write the French answer. Spelling and word order count; case, accents, punctuation and spaces don’t.</Text>
      <Box className="learn-question-stack">
        {lesson.guided_production.map((q, i) => <StackQuestion key={q.id} question={q} eyebrow={`Question ${i + 1} of ${lesson.guided_production.length}`} onResult={handleResult} />)}
      </Box>
    </Box>}
    <Box className="learn-section">
      <SectionHeading icon={BookOpen} title="Read for meaning" />
      <ExerciseShell>
        <ReadingPassage text={lesson.reading.french} />
        <ReadingTranslation english={lesson.reading.english} />
        <Text>Try to understand the passage. Use Translate if you need a hand.</Text>
        <Attribution provenance={lesson.reading.provenance} />
      </ExerciseShell>
    </Box>
    {featureFlags.realLifeCoach && <Box className="learn-section">
      <SectionHeading icon={MessageCircle} title="Use it in real life" />
      <RealisticUse lesson={lesson} />
    </Box>}
    <Box className="learn-section learn-watchout">
      <SectionHeading icon={AlertTriangle} title="Watch out" />
      <Text>{lesson.feedback.error}</Text>
      <Text>{lesson.feedback.remediation}</Text>
    </Box>
    {lesson.mastery.length > 0 && <Box className="learn-section">
      <SectionHeading icon={Trophy} title="Master it" />
      <Box className="learn-question-stack">{lesson.mastery.map((q, i) => <StackQuestion key={q.id} question={q} eyebrow={`Question ${i + 1} of ${lesson.mastery.length}`} onResult={handleResult} />)}</Box>
    </Box>}
  </Box>;
}
