import type {CefrLevel, StoryStop} from '../types';

export type StoryChapterTone = 'teal' | 'sky' | 'amber' | 'coral' | 'violet' | 'navy';

export type StoryChapter = {
  level: CefrLevel;
  number: number;
  nameFr: string;
  descriptor: string;
  tone: StoryChapterTone;
  stops: StoryStop[];
  total: number;
  completed: number;
  earned: boolean;
};

export type StoryTrophyProgress = {
  chapters: StoryChapter[];
  total: number;
  completed: number;
  earned: number;
};

const LEVEL_ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const CHAPTER_META: Record<CefrLevel, {nameFr: string; descriptor: string; tone: StoryChapterTone}> = {
  A1: {nameFr: 'Premiers pas', descriptor: 'Everyday beginnings', tone: 'teal'},
  A2: {nameFr: 'Petites aventures', descriptor: 'A little more to discover', tone: 'sky'},
  B1: {nameFr: 'En route', descriptor: 'Choices and consequences', tone: 'amber'},
  B2: {nameFr: 'Nouveaux horizons', descriptor: 'More than one point of view', tone: 'coral'},
  C1: {nameFr: 'Voix et idées', descriptor: 'Read between the lines', tone: 'violet'},
  C2: {nameFr: 'Les grandes questions', descriptor: 'Ideas with many layers', tone: 'navy'},
};

export function storyStateLabel(stop: StoryStop): string {
  return stop.state === 'completed' ? 'Completed' : stop.answered ? `${stop.answered}/6 answered` : 'Ready to read';
}

export function storySummary(stories: StoryStop[]): string {
  const completed = stories.filter(s => s.state === 'completed').length;
  return `${completed} completed · ${stories.length} stories`;
}

export function storyChapters(stories: StoryStop[]): StoryChapter[] {
  const sorted = [...stories].sort((a, b) => a.order_index - b.order_index);
  return LEVEL_ORDER.flatMap((level, index) => {
    const stops = sorted.filter(s => s.level === level);
    if (!stops.length) return [];
    const completed = stops.filter(s => s.state === 'completed').length;
    return [{
      level,
      number: index + 1,
      nameFr: CHAPTER_META[level].nameFr,
      descriptor: CHAPTER_META[level].descriptor,
      tone: CHAPTER_META[level].tone,
      stops,
      total: stops.length,
      completed,
      earned: completed === stops.length,
    }];
  });
}

export function storyTrophyProgress(stories: StoryStop[]): StoryTrophyProgress {
  const chapters = storyChapters(stories);
  return {
    chapters,
    total: stories.length,
    completed: stories.filter(s => s.state === 'completed').length,
    earned: chapters.filter(c => c.earned).length,
  };
}

export function nextStory(stories: StoryStop[]): StoryStop | null {
  const sorted = [...stories].sort((a, b) => a.order_index - b.order_index);
  return sorted.find(s => s.state !== 'completed') ?? sorted[0] ?? null;
}

export function storyCtaLabel(stop: StoryStop): string {
  return stop.state === 'completed'
    ? `Read again · ${stop.title}`
    : stop.answered
      ? `Continue · ${stop.title}`
      : `Start · ${stop.title}`;
}
