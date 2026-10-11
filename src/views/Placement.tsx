import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { apiPost } from '../api/client.js';
import { getErrorMessage } from '../presenters/format.presenter.js';
import { shuffle } from '../presenters/collections.presenter.js';
import { levelGuides } from '../components/concepts';
import { formatLevelWithClb } from '../presenters/levels.presenter.js';
import { Box as BoxJsx, ErrorMessage as ErrorMessageJsx, ExerciseShell as ExerciseShellJsx, Page as PageJsx, PageHeader as PageHeaderJsx, Text as TextJsx } from '../components/ui';

// FRA-66 interim bridge: src/components/ui/ is still .jsx (typed by FRA-63),
// so these imports carry no prop types. Each is pinned to the minimal prop
// subset this view passes via an explicit annotation (no `as`) so JSX is
// checked against real props instead of the inferred ones.
// Justification: proper component typing is impossible until FRA-63 ships
// real prop types for src/components/ui — delete this block then. Box's
// props vary too widely for a minimal interface, so it bridges on the
// per-view prop subset only.
type BoxProps = {
  as?: string;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
};
type ErrorMessageProps = {
  message?: string;
};
type ExerciseShellProps = {
  eyebrow?: string;
  children?: React.ReactNode;
};
type PageProps = {
  children?: React.ReactNode;
};
type PageHeaderProps = {
  eyebrow?: string;
  title?: React.ReactNode;
  lede?: string;
};
type TextProps = {
  as?: string;
  variant?: string;
  size?: string;
  children?: React.ReactNode;
};
const Box: React.ComponentType<BoxProps> = BoxJsx;
const ErrorMessage: React.ComponentType<ErrorMessageProps> = ErrorMessageJsx;
const ExerciseShell: React.ComponentType<ExerciseShellProps> = ExerciseShellJsx;
const Page: React.ComponentType<PageProps> = PageJsx;
const PageHeader: React.ComponentType<PageHeaderProps> = PageHeaderJsx;
const Text: React.ComponentType<TextProps> = TextJsx;

// --- Local types (FRA-66; for FRA-68: centralize into shared API types) ---

/** One MCQ choice in the placement quiz. */
type PlacementChoice = {
  key: string;
  text: string;
};

/** One static placement question; answer is the winning choice key. */
type PlacementQuestion = {
  prompt: string;
  choices: PlacementChoice[];
  answer: string;
};

/** CEFR code returned by levelForScore. */
type PlacementLevel = 'A1' | 'A2' | 'B1' | 'B2';

/** POST /api/me/placement response. */
type PlacementResponse = {
  level: string;
  placement_status: string;
};

/** Result state once the quiz is submitted. */
type PlacementResult = {
  score: number;
  level: PlacementLevel;
  placementStatus?: string;
};

type PlacementProps = {
  token?: string | null;
  onPlaced?: () => void;
};

// Original 10-question placement quiz, A1 → B2 gradient. The resulting CEFR
// level is submitted to POST /api/me/placement and becomes the learner's
// current level for adaptive sessions.
const QUESTIONS: PlacementQuestion[] = [
  { prompt: '___ livre est sur la table.', choices: [{ key: 'A', text: 'Le' }, { key: 'B', text: 'La' }, { key: 'C', text: 'Les' }, { key: 'D', text: 'Des' }], answer: 'A' },
  { prompt: '___ suis fatigué aujourd’hui.', choices: [{ key: 'A', text: 'Je' }, { key: 'B', text: 'Tu' }, { key: 'C', text: 'Il' }, { key: 'D', text: 'Nous' }], answer: 'A' },
  { prompt: 'Elle ___ à Paris.', choices: [{ key: 'A', text: 'habite' }, { key: 'B', text: 'habites' }, { key: 'C', text: 'habitent' }, { key: 'D', text: 'habiter' }], answer: 'A' },
  { prompt: 'Hier, nous ___ au cinéma.', choices: [{ key: 'A', text: 'allons' }, { key: 'B', text: 'sommes allés' }, { key: 'C', text: 'irons' }, { key: 'D', text: 'aller' }], answer: 'B' },
  { prompt: 'Je ne ___ pas.', choices: [{ key: 'A', text: 'comprends' }, { key: 'B', text: 'comprendre' }, { key: 'C', text: 'compris' }, { key: 'D', text: 'comprend' }], answer: 'A' },
  { prompt: 'C’est le livre ___ je t’ai parlé.', choices: [{ key: 'A', text: 'que' }, { key: 'B', text: 'qui' }, { key: 'C', text: 'dont' }, { key: 'D', text: 'où' }], answer: 'C' },
  { prompt: 'Si j’avais su, je ___ venu.', choices: [{ key: 'A', text: 'serais' }, { key: 'B', text: 'étais' }, { key: 'C', text: 'suis' }, { key: 'D', text: 'viendrais' }], answer: 'A' },
  { prompt: 'Il faut que tu ___ tes devoirs.', choices: [{ key: 'A', text: 'fais' }, { key: 'B', text: 'fasses' }, { key: 'C', text: 'faire' }, { key: 'D', text: 'fait' }], answer: 'B' },
  { prompt: 'Bien qu’il ___ tard, il a continué.', choices: [{ key: 'A', text: 'est' }, { key: 'B', text: 'soit' }, { key: 'C', text: 'était' }, { key: 'D', text: 'sera' }], answer: 'B' },
  { prompt: '___ d’efforts, il a réussi.', choices: [{ key: 'A', text: 'À force' }, { key: 'B', text: 'Par force' }, { key: 'C', text: 'Avec force' }, { key: 'D', text: 'En force' }], answer: 'A' },
];

function levelForScore(score: number): PlacementLevel {
  if (score <= 3) return 'A1';
  if (score <= 5) return 'A2';
  if (score <= 7) return 'B1';
  return 'B2';
}

export function Placement({ token, onPlaced }: PlacementProps) {
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<string[]>([]);
  const [options] = React.useState<PlacementChoice[][]>(() => QUESTIONS.map((q) => shuffle(q.choices)));
  const [result, setResult] = React.useState<PlacementResult | null>(null);
  const [error, setError] = React.useState('');

  const question = QUESTIONS[index];

  async function choose(key: string) {
    if (result) return;
    const next = [...answers, key];
    setAnswers(next);
    if (next.length < QUESTIONS.length) {
      setIndex(index + 1);
      return;
    }
    const score = QUESTIONS.filter((q, i) => next[i] === q.answer).length;
    const level = levelForScore(score);
    try {
      const res: PlacementResponse = await apiPost('/api/me/placement', { level }, token);
      setResult({ score, level, placementStatus: res.placement_status });
      onPlaced?.();
    } catch (e) {
      // getErrorMessage is the null-safe normalizer for caught values —
      // the catch parameter stays unannotated per the type-boundary rule.
      setError(getErrorMessage(e));
    }
  }

  if (result) {
    const guide = levelGuides[result.level];
    return (
      <Page>
        <PageHeader
          eyebrow="Placement complete"
          title={<>Your level: {formatLevelWithClb(result.level)}{guide ? ` · ${guide.label}` : ''}</>}
          lede={`You scored ${result.score} out of ${QUESTIONS.length}. Your sessions will now target ${result.level} content.`}
        />
        {guide && (
          <Box as="section" className="level-guide panel">
            <Box><Text as="span" variant="eyebrow">{formatLevelWithClb(result.level)} · {guide.label}</Text><Text as="h2">{guide.goal}</Text></Box>
            <Box className="guide-columns">
              <Box><Text as="strong">What to focus on</Text><Text>{guide.focus}</Text></Box>
              <Box><Text as="strong">Reading practice</Text><Text>{guide.read}</Text></Box>
            </Box>
          </Box>
        )}
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Placement"
        title="Find your starting level"
        lede={`Ten quick questions, A1 to B2. Question ${index + 1} of ${QUESTIONS.length}.`}
      />
      <ExerciseShell eyebrow="placement">
        <Text as="h2">{question.prompt}</Text>
        <Box className="mcq-options">
          {options[index].map((option) => (
            <Box as="button" key={option.key} onClick={() => choose(option.key)}>
              {option.key}. {option.text}
            </Box>
          ))}
        </Box>
      </ExerciseShell>
      {error && <ErrorMessage message={error} />}
      <Text variant="muted" size="sm"><ClipboardCheck size={14} aria-hidden="true" /> Your result sets your starting level — nothing is graded here.</Text>
    </Page>
  );
}
