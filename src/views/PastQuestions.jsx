import React from 'react';
import { Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { normalizeChoices } from '../presenters/collections.presenter.js';
import { capitalize, choiceLabel } from '../presenters/format.presenter.js';
import { CEFR_LEVELS } from '../presenters/levels.presenter.js';
import {
  Box,
  Button,
  CollapsibleSection,
  EmptyState,
  ExerciseShell,
  Feedback,
  OptionList,
  Page,
  PageHeader,
  Panel,
  ReadingPassage,
  Tabs,
  Text,
  Toolbar,
} from '../components/ui';

const SECTIONS = CEFR_LEVELS;
const SKILLS = ['all', 'reading', 'listening', 'language structures'];
const PAGE_SIZE = 12;

// Restored original exam archive display: the collapsible "Exam practice"
// module with the reading-passage card, correct/incorrect states, and retry.
// Skill tabs are new (the original was reading-only).

function ExamQuestionCard({ question, selected, onSelect, onRetry }) {
  const choices = React.useMemo(() => normalizeChoices(question.choices ?? question.choices_json), [question.choices, question.choices_json]);
  const correct = question.answer ? String(question.answer).trim().toLowerCase() : null;
  const selectedChoice = choices.find((choice) => choice.key === selected || choice.text === selected);
  const isCorrect = Boolean(selected && correct && (String(selected).trim().toLowerCase() === correct || selectedChoice?.key?.toLowerCase() === correct));
  const prompt = String(question.prompt || '').trim();
  let passage = String(question.context || '').trim();
  if (passage && prompt && passage.toLowerCase().startsWith(prompt.toLowerCase())) passage = passage.slice(prompt.length).trim();
  const answered = selected && correct ? (isCorrect ? 'correct' : 'wrong') : null;
  return (
    <ExerciseShell eyebrow={`${question.exam_name} - ${question.skill}`} answered={answered}>
      {passage && passage.toLowerCase() !== prompt.toLowerCase() && <ReadingPassage text={passage} />}
      <Text as="h2">{prompt}</Text>
      {choices.length > 0 && (
        <OptionList
          options={choices.map((choice) => ({ key: choice.key, label: choiceLabel(choice) }))}
          selectedKey={selected}
          answered={Boolean(selected && correct)}
          correct={Boolean(selectedChoice && selectedChoice.key.toLowerCase() === correct)}
          disabled={Boolean(selected)}
          onSelect={onSelect}
        />
      )}
      {selected && correct && (
        <Feedback
          tone={isCorrect ? 'correct' : 'incorrect'}
          title={isCorrect ? 'Correct!' : 'Not quite.'}
          message={isCorrect ? (question.explanation || 'Well done.') : `Correct answer: ${question.answer}`}
          onRetry={isCorrect ? undefined : onRetry}
        />
      )}
      {!correct && <Text as="small">{question.explanation}</Text>}
    </ExerciseShell>
  );
}

function ExamQuestionList({ data }) {
  const [showAll, setShowAll] = React.useState(false);
  const [answers, setAnswers] = React.useState({});
  const visible = showAll ? data.questions : data.questions.slice(0, PAGE_SIZE);
  const reset = () => setAnswers({});
  React.useEffect(() => { setShowAll(false); setAnswers({}); }, [data.section]);
  return (
    <CollapsibleSection title="Exam practice" badge={`${data.questions.length} questions`} defaultOpen>
      <Panel>
        <Toolbar
          meta={data.section}
          actions={<Button variant="reset" onClick={reset}>Reset all</Button>}
        />
      </Panel>
      <Box className="exercise-list">
        {visible.map((question) => (
          <ExamQuestionCard
            key={question.id}
            question={question}
            selected={answers[question.id] || null}
            onSelect={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
            onRetry={() => setAnswers(({ [question.id]: _removed, ...rest }) => rest)}
          />
        ))}
      </Box>
      {data.questions.length > PAGE_SIZE && (
        <Button variant="text" centered onClick={() => setShowAll((value) => !value)}>
          {showAll ? 'Show fewer questions' : `Show all ${data.questions.length} questions`}
        </Button>
      )}
    </CollapsibleSection>
  );
}

export function PastQuestions({ token }) {
  const [section, setSection] = React.useState('A1');
  const [skill, setSkill] = React.useState('all');

  const { data, loading, error } = useApiResource(`/api/exam/questions?section=${section}`, token);
  const all = data?.questions || [];
  const filtered = skill === 'all' ? all : all.filter((q) => (q.skill || 'reading').toLowerCase() === skill);
  const skillLabel = skill === 'all' ? 'All skills' : capitalize(skill);

  return (
    <Page>
      <PageHeader
        eyebrow="Exam archive"
        title="Past questions"
        lede="Real exam-format questions from the archive. Pick an answer to check yourself — retry any you miss."
      />
      <Tabs
        variant="section"
        options={SECTIONS.map((s) => ({ id: s, label: s }))}
        value={section}
        onChange={setSection}
        ariaLabel="Choose a level"
      />
      <Tabs
        variant="section"
        options={SKILLS.map((s) => ({ id: s, label: s === 'all' ? 'All skills' : capitalize(s) }))}
        value={skill}
        onChange={setSkill}
        compact
        strongLabels={false}
        ariaLabel="Choose a skill"
      />
      {loading && <EmptyState icon={Database} title="Loading past questions" text="Fetching the exam archive." />}
      {error && <EmptyState icon={Database} title="Couldn't load past questions" text={error} />}
      {!loading && !error && (
        <ExamQuestionList data={{ questions: filtered, section: `${section} · ${skillLabel}` }} />
      )}
    </Page>
  );
}
