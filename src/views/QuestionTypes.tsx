import React from 'react';
import { ExerciseCard, type ExerciseItem } from '../components/exercises/ExerciseCard';
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
    },
  },
  {
    id: 'listening',
    label: 'Listening',
    description: 'Listen to the audio, then answer. (Audio playback disabled in showcase.)',
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
    id: 'dictation',
    label: 'Dictation',
    description: 'Listen and type exactly what you hear. (Audio playback disabled in showcase.)',
    entry: {
      id: 'showcase-dictation-1',
      item_kind: 'content_item',
      type: 'dictation',
      level: 'B1',
      skill: 'listening',
      prompt: 'Type what you hear.',
      expected: 'Bonjour, comment allez-vous aujourd\'hui?',
    },
  },
  {
    id: 'pronunciation',
    label: 'Pronunciation',
    description: 'Say the word aloud — get feedback on your pronunciation.',
    entry: {
      id: 'showcase-pronunciation-1',
      item_kind: 'content_item',
      type: 'pronunciation_drill',
      level: 'A1',
      skill: 'speaking',
      prompt: 'Pronounce this word:',
      expected: 'bonjour',
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
    label: 'Speaking',
    description: 'Speak on the topic — cover the key points, then try a follow-up.',
    entry: {
      id: 'showcase-speaking-1',
      item_kind: 'content_item',
      type: 'speaking_prompt',
      level: 'B1',
      skill: 'speaking',
      prompt: 'Talk about your favorite hobby for 30 seconds.',
      expected_points: [
        'Name the hobby and say why you enjoy it',
        'Mention how often you do it',
        'Describe a memorable moment related to it',
      ],
      follow_up_questions: [
        'Would you recommend this hobby to a friend? Why?',
        'How did you first get interested in it?',
      ],
    },
  },
  {
    id: 'free_text',
    label: 'Free Text',
    description: 'Type a free-form answer to the question.',
    entry: {
      id: 'showcase-freetext-1',
      item_kind: 'content_item',
      type: 'free_text',
      level: 'A1',
      skill: 'vocabulary',
      prompt: 'What is the capital of France?',
      expected: 'Paris',
    },
  },
];

type QuestionTypesProps = {
  token?: string | null;
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
        <Text as="p" variant="note">Preview mode — submissions are disabled. This page shows the question UI only.</Text>
        <ExerciseCard
          key={active.id}
          entry={active.entry}
          token={token}
          preview
        />
      </Box>
    </Page>
  );
}
