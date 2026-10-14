import React from 'react';
import {
  ExerciseCard,
  type AttemptResult,
  type ExerciseItem,
  type SimulateSubmit,
} from '../components/exercises/ExerciseCard';
import type { Choice } from '../presenters/collections.presenter.js';
import {
  Box,
  Page,
  PageHeader,
  Tabs,
  Text,
} from '../components/ui';
import type { TabOption } from '../components/ui';

/**
 * Internal showcase of every distinct question type on the platform.
 * Not in the sidebar nav — reachable manually via /question-types.
 * For Samyak + Juhi to review the full exercise catalog in one place.
 */

type ShowcaseEntry = ExerciseItem & {
  choices?: Choice[];
  tokens?: string[];
  expected?: string;
  example?: string;
  correctKey?: string;
  context?: string;
  skill?: string;
  instructions?: string;
  rubric?: Record<string, string>;
};

type QuestionTypeDef = {
  id: string;
  label: string;
  description: string;
  entry: ShowcaseEntry;
};

const SAMPLE_ENTRIES: QuestionTypeDef[] = [
  {
    id: 'multiple_choice',
    label: 'Multiple Choice',
    description: 'Standard MCQ — pick the correct answer from four options.',
    entry: {
      id: 'showcase-mcq-1',
      item_kind: 'content_item',
      type: 'multiple_choice',
      level: 'A1',
      skill: 'vocabulary',
      prompt: 'What does "bonjour" mean?',
      choices: [
        { key: 'A', text: 'Hello' },
        { key: 'B', text: 'Goodbye' },
        { key: 'C', text: 'Thank you' },
        { key: 'D', text: 'Please' },
      ],
      correctKey: 'A',
    },
  },
  {
    id: 'find_the_error',
    label: 'Find the Error',
    description: 'MCQ variant — spot the sentence with a grammatical mistake (FRA-7 error-correction items).',
    entry: {
      id: 'showcase-error-1',
      item_kind: 'content_item',
      type: 'multiple_choice',
      level: 'A2',
      skill: 'grammar',
      prompt: 'Which sentence contains an error?',
      choices: [
        { key: 'A', text: 'Je suis allé au marché.' },
        { key: 'B', text: 'Elle a mangé une pomme.' },
        { key: 'C', text: 'Je suis aller au marché.' },
        { key: 'D', text: 'Nous avons vu un film.' },
      ],
      correctKey: 'C',
    },
  },
  {
    id: 'reading',
    label: 'Reading',
    description: 'Read a passage, then answer the comprehension question.',
    entry: {
      id: 'showcase-reading-1',
      item_kind: 'content_item',
      type: 'reading',
      level: 'B1',
      skill: 'reading',
      context: 'Marie habite à Paris depuis dix ans. Elle travaille comme architecte dans un grand bureau près de la Tour Eiffel. Chaque matin, elle prend le métro pour aller au travail. Le week-end, elle aime visiter les musées et se promener le long de la Seine avec son chien.',
      prompt: 'How does Marie get to work?',
      choices: [
        { key: 'A', text: 'By car' },
        { key: 'B', text: 'By metro' },
        { key: 'C', text: 'By bus' },
        { key: 'D', text: 'She walks' },
      ],
      correctKey: 'B',
    },
  },
  {
    id: 'grammar_focus',
    label: 'Grammar',
    description: 'Grammar-focused MCQ — pick the grammatically correct form.',
    entry: {
      id: 'showcase-grammar-1',
      item_kind: 'content_item',
      type: 'grammar_focus',
      level: 'A2',
      skill: 'grammar',
      prompt: 'Choose the correct conjugation: Ils ___ au cinéma hier.',
      choices: [
        { key: 'A', text: 'vont' },
        { key: 'B', text: 'sont allés' },
        { key: 'C', text: 'aller' },
        { key: 'D', text: 'va' },
      ],
      correctKey: 'B',
    },
  },
  {
    id: 'listening',
    label: 'Listening',
    description: 'Listen to the audio, then answer the comprehension question.',
    entry: {
      id: 'showcase-listening-1',
      item_kind: 'content_item',
      type: 'listening',
      level: 'A2',
      skill: 'listening',
      prompt: 'What did the speaker say about the weather?',
      choices: [
        { key: 'A', text: 'It is sunny' },
        { key: 'B', text: 'It is raining' },
        { key: 'C', text: 'It is snowing' },
        { key: 'D', text: 'It is cloudy' },
      ],
      correctKey: 'B',
    },
  },
  {
    id: 'word_order',
    label: 'Word Order',
    description: 'Arrange the tokens to form a correct French sentence.',
    entry: {
      id: 'showcase-wordorder-1',
      item_kind: 'content_item',
      type: 'word_order',
      level: 'A1',
      skill: 'grammar',
      prompt: 'Put the words in the correct order.',
      tokens: ['mange', 'Je', 'pomme', 'une'],
      expected: 'Je mange une pomme',
    },
  },
  {
    id: 'spelling',
    label: 'Spelling',
    description: 'Type the correct French spelling of the given word.',
    entry: {
      id: 'showcase-spelling-1',
      item_kind: 'content_item',
      type: 'spelling',
      level: 'A1',
      skill: 'vocabulary',
      prompt: 'Spell the French word for "cat".',
      expected: 'chat',
    },
  },
  {
    id: 'cloze',
    label: 'Cloze',
    description: 'Fill in the blank with the correct word.',
    entry: {
      id: 'showcase-cloze-1',
      item_kind: 'content_item',
      type: 'cloze',
      level: 'A2',
      skill: 'grammar',
      prompt: 'Complete the sentence: Je ___ au marché tous les samedis.',
      expected: 'vais',
    },
  },
  {
    id: 'listen_repeat',
    label: 'Listen & repeat',
    description: 'Listen to the audio, speak it back, or type what you heard. Reveal the words when ready.',
    entry: {
      id: 'showcase-dictation-1',
      item_kind: 'content_item',
      type: 'listen_repeat',
      level: 'B1',
      skill: 'listening',
      prompt: 'Type what you hear.',
      expected: 'Bonjour',
      media: [
        {
          kind: 'audio',
          url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Fr-bonjour.ogg',
          transcript: 'Bonjour',
        },
      ],
    },
  },
  {
    id: 'writing',
    label: 'Writing',
    description: 'Write a short text — graded against a rubric after submission.',
    entry: {
      id: 'showcase-writing-1',
      item_kind: 'content_item',
      type: 'writing_prompt',
      level: 'B1',
      skill: 'writing',
      prompt: 'Write 3-4 sentences about what you did last weekend.',
      instructions: 'Use the passé composé where appropriate.',
      rubric: {
        'Vocabulary': 'Uses varied and appropriate vocabulary for the topic.',
        'Grammar': 'Correct use of past tenses and agreement.',
        'Coherence': 'Ideas are organized logically with connectors.',
      },
    },
  },
  {
    id: 'speaking',
    label: 'Read aloud',
    description: 'Read the exact text on screen and get tentative pronunciation hints.',
    entry: {
      id: 'showcase-speaking-1',
      item_kind: 'content_item',
      type: 'speaking_prompt',
      level: 'B1',
      skill: 'speaking',
      prompt: 'Je parle français avec mes amis.',
      expected: 'Je parle français avec mes amis.',
    },
  },
  {
    id: 'free_text',
    label: 'Free Text',
    description: 'Respond freely by typing or speaking. Get specific content feedback with quotes from your answer.',
    entry: {
      id: 'showcase-freetext-1',
      item_kind: 'content_item',
      type: 'free_text',
      level: 'A2',
      skill: 'writing',
      prompt: 'Décris un endroit que tu aimes dans ta ville.',
      example: 'J’aime le parc près de chez moi. Il est calme et j’y vais le week-end.',
    },
  },
];

type QuestionTypesProps = {
  token?: string | null;
};

/**
 * Mirrors server/evaluate.js normalizeText so simulated grading matches real
 * attempt grading: accent/case/whitespace tolerant, trailing sentence
 * punctuation never decides a comparison.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[‘’‛ʼ]/g, "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?…]+$/, '')
    .trim();
}

/** The correct choice's text for an MCQ sample (the server reveals text, never just the key — FRA-7). */
function correctChoiceText(sample: ShowcaseEntry): string | null {
  const choice = (sample.choices ?? []).find((c) => c.key === sample.correctKey);
  return choice ? choice.text : null;
}

/**
 * Simulates POST /api/me/attempts for the showcase samples: grades the
 * response locally against the sample answers and returns the same
 * { correct, reveal } shape the server returns, so every renderer shows its
 * real post-submit states. Nothing is sent anywhere; no attempt is recorded.
 */
export const simulateSubmit: SimulateSubmit = (entry, response): AttemptResult => {
  const sample = SAMPLE_ENTRIES.find((def) => def.entry.id === entry.id)?.entry;
  if (!sample) return { correct: false, reveal: null };
  switch (sample.type) {
    case 'multiple_choice':
    case 'reading':
    case 'grammar_focus':
    case 'listening': {
      // Server 'choice' evaluator: case-insensitive, whitespace-tolerant key match.
      if (typeof response !== 'string' || !sample.correctKey) return { correct: false, reveal: null };
      if (normalizeAnswer(response) === normalizeAnswer(sample.correctKey)) return { correct: true, reveal: null };
      return { correct: false, reveal: correctChoiceText(sample) };
    }
    case 'word_order': {
      // Server 'token_order' evaluator: token-by-token comparison.
      const given = typeof response === 'string' ? response.split(/\s+/) : Array.isArray(response) ? response : [];
      const expected = (sample.expected ?? '').split(/\s+/).map(normalizeAnswer).filter(Boolean);
      const correct = given.length > 0 && given.length === expected.length &&
        given.every((token, index) => normalizeAnswer(token) === expected[index]);
      return { correct, reveal: correct ? null : sample.expected ?? null };
    }
    case 'free_text':
      return typeof response === 'object' && response !== null && 'text' in response && typeof response.text === 'string' && Boolean(response.text.trim())
        ? { correct: true, reveal: null } : { correct: false, reveal: null };
    case 'spelling':
    case 'cloze': {
      // Server 'normalized_text' evaluator.
      if (typeof response !== 'string') return { correct: false, reveal: sample.expected ?? null };
      if (normalizeAnswer(response) === normalizeAnswer(sample.expected ?? '')) return { correct: true, reveal: null };
      return { correct: false, reveal: sample.expected ?? null };
    }
    case 'listen_repeat':
      if (typeof response !== 'string') return { correct: true, reveal: null };
      return normalizeAnswer(response) === normalizeAnswer(sample.expected ?? '')
        ? { correct: true, reveal: null } : { correct: false, reveal: sample.expected ?? null };
    case 'writing_prompt':
      // Server 'rubric' evaluator: any non-empty response counts as completed.
      return { correct: true, reveal: null };
    case 'speaking_prompt':
      return { correct: true, reveal: null };
    default:
      return { correct: false, reveal: null };
  }
};

export function QuestionTypes({ token }: QuestionTypesProps): React.JSX.Element {
  const [activeId, setActiveId] = React.useState<string>(SAMPLE_ENTRIES[0].id);

  const tabOptions: TabOption[] = SAMPLE_ENTRIES.map((def) => ({
    id: def.id,
    label: def.label,
  }));

  const active = SAMPLE_ENTRIES.find((def) => def.id === activeId) ?? SAMPLE_ENTRIES[0];

  return (
    <Page>
      <PageHeader
        eyebrow="Internal"
        title="Question Types"
        lede="Every distinct exercise type on the platform, one per tab. For review only — not in the sidebar."
      />
      <Box className="question-types-tabs">
        <Tabs
          variant="section"
          compact
          options={tabOptions}
          value={activeId}
          onChange={setActiveId}
          ariaLabel="Question types"
        />
      </Box>
      <Box className="question-types-body">
        <Text as="p" variant="lede">{active.description}</Text>
        <Text as="p" variant="note">Simulated submissions — answers are graded locally, nothing is saved.</Text>
        <ExerciseCard
          key={active.id}
          entry={active.entry}
          token={token}
          simulateSubmit={simulateSubmit}
        />
      </Box>
    </Page>
  );
}
