import React from 'react';
import { ArrowRight } from 'lucide-react';
import { apiPost } from '../api/client.js';
import type { DailyWordsResponse, WordAnswerResponse, WordQuestion } from '../api/client.js';
import { useApiResource } from '../hooks/useApi.js';
import { browserTimeZone } from '../presenters/streak.presenter.js';
import { dailyWordsPath, practiceProgress, questionHeading, wordMeta, nextQuestion } from '../presenters/daily-words.presenter.js';
import { Box, Text, Button, OptionList, Feedback, ErrorMessage } from './ui';

type DailyWordsSectionProps = {
  token?: string | null;
};

type LastResult = { question_id: string; correct: boolean; correct_choice_id: string; choice_id: string };

// FRA-155: Words of the Day body — rendered on the words page, which is
// reached from the compact teaser card on Home (no menu item).
// The day's 5 words plus the 10-question practice block. Practice state
// comes from the server (refresh-safe); answers post to the words endpoint
// only, never to attempts, so the streak is untouched (FRA-154).
export function DailyWordsSection({ token }: DailyWordsSectionProps) {
  const { data, error } = useApiResource<DailyWordsResponse>(dailyWordsPath(), token);
  const [answeredLocal, setAnsweredLocal] = React.useState<Record<string, { correct: boolean }>>({});
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [lastResult, setLastResult] = React.useState<LastResult | null>(null);
  const [pending, setPending] = React.useState(false);
  const [answerError, setAnswerError] = React.useState('');

  if (!token) return null;
  if (!data) {
    if (error) return null; // Home stays usable if today's words fail to load.
    return (
      <Box as="section" className="daily-words-card">
        <Text className="home-kicker">WORDS OF THE DAY</Text>
        <Text as="h2">Five new words for today</Text>
        <Text>Loading today&apos;s words…</Text>
      </Box>
    );
  }
  if (!Array.isArray(data.words) || !data.words.length || !Array.isArray(data.questions)) return null;

  const answered: Record<string, { correct: boolean }> = { ...data.answered, ...answeredLocal };
  const answeredCount = Object.keys(answered).length;
  const completed = answeredCount >= data.total_questions && data.total_questions > 0;
  const current: WordQuestion | null = (focusId ? data.questions.find((q) => q.id === focusId) : null) || nextQuestion(data.questions, answered);
  const focusAnswered = current ? answered[current.id] : undefined;
  const showFeedback = Boolean(current && lastResult && lastResult.question_id === current.id);
  const correctChoiceText = current && lastResult ? current.choices.find((c) => c.id === lastResult.correct_choice_id)?.text : undefined;

  async function choose(choiceId: string) {
    if (!current || pending || focusAnswered) return;
    setPending(true);
    setAnswerError('');
    try {
      setFocusId(current.id); // Keep this question on screen for its feedback.
      const result = await apiPost<WordAnswerResponse>('/api/me/words/answers', { question_id: current.id, choice_id: choiceId, tz: browserTimeZone() }, token);
      setAnsweredLocal((prev) => ({ ...prev, [current.id]: { correct: result.correct } }));
      setLastResult({ question_id: current.id, correct: result.correct, correct_choice_id: result.correct_choice_id, choice_id: choiceId });
    } catch {
      setAnswerError('Could not save that answer. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  function advance() {
    if (!current) return;
    const merged = { ...answered };
    const next = nextQuestion(data.questions, merged);
    setFocusId(next ? next.id : null);
    setLastResult(null);
  }

  return (
    <Box as="section" className="daily-words-card">
      <Box className="daily-words-head">
        <Box>
          <Text className="home-kicker">WORDS OF THE DAY · {data.level}</Text>
          <Text as="h2">Five new words for today</Text>
        </Box>
        <Text as="span" className="daily-words-progress">{practiceProgress(answeredCount, data.total_questions)}</Text>
      </Box>

      <Box className="daily-words-grid">
        {data.words.map((word) => (
          <Box className="daily-word" key={word.id}>
            <Text className="daily-word-fr">{word.word}</Text>
            <Text as="small" className="daily-word-meta">{wordMeta(word)}</Text>
            <Text className="daily-word-gloss">{word.gloss}</Text>
            <Text as="small" className="daily-word-example">{word.example_fr}</Text>
            <Text as="small" className="daily-word-example-en">{word.example_en}</Text>
          </Box>
        ))}
      </Box>

      <Box className="daily-words-practice">
        {completed && !showFeedback ? (
          <Feedback tone="correct" title="Done for today" message="You finished today's words. Come back tomorrow for five new ones." />
        ) : current ? (
          <Box className="daily-words-question">
            <Text className="home-kicker">{questionHeading(current)}</Text>
            <Text className="daily-words-prompt">{current.prompt}</Text>
            {current.hint ? <Text as="small" className="daily-words-hint">{current.hint}</Text> : null}
            <OptionList
              options={current.choices.map((c) => ({ key: c.id, label: c.text }))}
              selectedKey={showFeedback && lastResult ? lastResult.choice_id : undefined}
              answered={showFeedback}
              correct={showFeedback && lastResult ? lastResult.correct : false}
              disabled={pending || showFeedback}
              onSelect={choose}
            />
            {answerError && <ErrorMessage message={answerError} />}
            {showFeedback && lastResult ? (
              <Box className="daily-words-feedback">
                <Feedback
                  tone={lastResult.correct ? 'correct' : 'incorrect'}
                  title={lastResult.correct ? 'Correct!' : 'Not quite'}
                  message={lastResult.correct ? undefined : `The right answer is: ${correctChoiceText || ''}`}
                />
                <Button variant="text" icon={ArrowRight} iconPosition="after" onClick={advance}>
                  {answeredCount >= data.total_questions ? 'Finish' : 'Next question'}
                </Button>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
