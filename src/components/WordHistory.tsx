import React from 'react';
import { useApiResource } from '../hooks/useApi.js';
import type { WordHistoryResponse } from '../api/client.js';
import { browserTimeZone } from '../presenters/streak.presenter.js';
import { historyDayLabel, wordsHistoryPath, wordMeta } from '../presenters/daily-words.presenter.js';
import { Box, Text } from './ui';

// FRA-155: review strip at the bottom of the words page — the sets from
// the last 7 days before today, newest first, read-only. Renders nothing
// for a learner with no past sets yet.
export function WordHistory({ token }: { token?: string | null }) {
  const { data } = useApiResource<WordHistoryResponse>(wordsHistoryPath(), token);
  if (!token || !data || !Array.isArray(data.days) || !data.days.length) return null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: browserTimeZone() }).format(new Date());
  return (
    <Box as="section" className="word-history">
      <Text className="home-kicker">REVIEW</Text>
      <Text as="h2" className="word-history-title">Your last 7 days</Text>
      <Text className="word-history-sub">The words from the past week — worth another look.</Text>
      {data.days.map((day) => (
        <Box key={day.date} className="word-history-day">
          <Box className="word-history-day-head">
            <Text as="span" className="word-history-date">{historyDayLabel(day.date, today)}</Text>
            <Text as="span" className="word-history-level">{day.level}</Text>
          </Box>
          <Box className="daily-words-grid">
            {day.words.map((word) => (
              <Box key={word.id} className="daily-word">
                <Text as="p" className="daily-word-fr">{word.word}</Text>
                <Text as="span" className="daily-word-meta">{wordMeta(word)}</Text>
                <Text as="p" className="daily-word-gloss">{word.gloss}</Text>
                <Text as="p" className="daily-word-example">{word.example_fr}</Text>
                <Text as="p" className="daily-word-example-en">{word.example_en}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
