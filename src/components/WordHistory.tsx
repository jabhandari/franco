import React from 'react';
import { useApiResource } from '../hooks/useApi.js';
import type { WordHistoryResponse } from '../api/client.js';
import { browserTimeZone } from '../presenters/streak.presenter.js';
import { historyDayLabel, wordsHistoryPath } from '../presenters/daily-words.presenter.js';
import { Box, Text } from './ui';

// FRA-155: review table at the bottom of the words page — the sets from
// the last 7 days before today as one plain two-column table (French word
// / English meaning), grouped by day rows, read-only. Renders nothing for
// a learner with no past sets yet.
export function WordHistory({ token }: { token?: string | null }) {
  const { data } = useApiResource<WordHistoryResponse>(wordsHistoryPath(), token);
  if (!token || !data || !Array.isArray(data.days) || !data.days.length) return null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: browserTimeZone() }).format(new Date());
  return (
    <Box as="section" className="word-history">
      <Text className="home-kicker">REVIEW</Text>
      <Text as="h2" className="word-history-title">Your last 7 days</Text>
      <Box as="table" className="word-history-table">
        <Box as="thead">
          <Box as="tr">
            <Box as="th" className="wh-head-cell">French</Box>
            <Box as="th" className="wh-head-cell">English</Box>
          </Box>
        </Box>
        {data.days.map((day) => (
          <Box as="tbody" key={day.date}>
            <Box as="tr" className="wh-day-row">
              <Box as="td" className="wh-day-cell">{historyDayLabel(day.date, today)}</Box>
              <Box as="td" className="wh-day-cell wh-day-level">{day.level}</Box>
            </Box>
            {day.words.map((word) => (
              <Box as="tr" key={word.id}>
                <Box as="td" className="wh-cell-fr">{word.word}</Box>
                <Box as="td" className="wh-cell-en">{word.gloss}</Box>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
