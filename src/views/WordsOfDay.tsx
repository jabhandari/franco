import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { DailyWordsSection } from '../components/DailyWordsSection.js';
import { Box, Button } from '../components/ui';

// FRA-155: the Words of the Day page. Reached only from the Home teaser
// card (no menu item). Holds the day's 5 words and the 10-question
// practice block (DailyWordsSection); Home itself stays light.
export function WordsOfDay({ token, onHome }: { token?: string | null; onHome: () => void }) {
  return (
    <Box className="words-page">
      <Button variant="text" icon={ArrowLeft} onClick={onHome}>Back to Home</Button>
      <DailyWordsSection token={token} />
    </Box>
  );
}
