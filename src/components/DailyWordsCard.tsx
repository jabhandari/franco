import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import type { DailyWordsResponse } from '../api/client.js';
import { dailyWordsPath, wordsTeaser } from '../presenters/daily-words.presenter.js';
import { Box, Text } from './ui';

// FRA-155: the Home entry point for Words of the Day — one compact,
// whole-card-clickable teaser. The words and practice live on the words
// page (views/WordsOfDay) so Home stays light; this card carries only
// today's headline and progress. Renders nothing when logged out or
// when the bank is empty.
export function DailyWordsCard({ token, onOpen }: { token?: string | null; onOpen: () => void }) {
  const { data } = useApiResource<DailyWordsResponse>(dailyWordsPath(), token);
  if (!token || !data || !Array.isArray(data.words) || !data.words.length) return null;
  const teaser = wordsTeaser(data);
  return (
    <Box as="button" type="button" className="daily-words-teaser" onClick={onOpen}>
      <Box className="daily-words-teaser-copy">
        <Text as="span" className="home-kicker">{teaser.kicker}</Text>
        <Text as="span" className="daily-words-teaser-title">{teaser.title}</Text>
        <Text as="span" className="daily-words-teaser-sub">{teaser.subtitle}</Text>
      </Box>
      <Box className="daily-words-teaser-side">
        <Text as="span" className="daily-words-teaser-progress">{teaser.progressLabel}</Text>
        {teaser.done ? <Check size={20} aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />}
      </Box>
    </Box>
  );
}
