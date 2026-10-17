import {nextStory, storyChapters, storyCtaLabel, storyStateLabel, storySummary, storyTrophyProgress} from './stories.presenter';
import type {StoryStop} from '../types';

const equal = (a: string, b: string) => { if (a !== b) throw new Error(`${a} != ${b}`); };
const check = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };

const stop: StoryStop = {id: 'story-01', title: 'Test', title_en: 'Test', level: 'A1', order_index: 1, state: 'current', answered: 0};

// State labels: no "Skipped" anywhere — a skipped story reads as ready or in progress.
equal(storyStateLabel(stop), 'Ready to read');
equal(storyStateLabel({...stop, answered: 3}), '3/6 answered');
equal(storyStateLabel({...stop, state: 'completed'}), 'Completed');
equal(storyStateLabel({...stop, state: 'skipped'}), 'Ready to read');
equal(storyStateLabel({...stop, state: 'skipped', answered: 2}), '2/6 answered');

// Summary counts completions only.
equal(storySummary([stop, {...stop, id: 'story-02', state: 'completed'}, {...stop, id: 'story-03', state: 'skipped'}]), '1 completed · 3 stories');

// Chapters group by level in CEFR order, with per-chapter trophy state.
const a1a: StoryStop = {...stop, id: 'story-01', order_index: 1, state: 'completed'};
const a1b: StoryStop = {...stop, id: 'story-02', order_index: 2, answered: 4};
const a2a: StoryStop = {...stop, id: 'story-10', title: 'A2 one', level: 'A2', order_index: 10, state: 'completed'};
const a2b: StoryStop = {...stop, id: 'story-11', title: 'A2 two', level: 'A2', order_index: 11, state: 'completed'};
const chapters = storyChapters([a2b, a1b, a2a, a1a]);
check(chapters.length === 2, 'two chapters');
check(chapters[0].level === 'A1' && chapters[0].number === 1 && chapters[0].tone === 'teal', 'A1 chapter first, teal');
check(chapters[0].total === 2 && chapters[0].completed === 1 && !chapters[0].earned, 'A1 trophy not earned at 1/2');
check(chapters[0].stops[0].id === 'story-01' && chapters[0].stops[1].id === 'story-02', 'stops sorted by order_index');
check(chapters[1].level === 'A2' && chapters[1].earned, 'A2 trophy earned at 2/2');

// Trophy progress rolls chapters up.
const progress = storyTrophyProgress([a1a, a1b, a2a, a2b]);
check(progress.total === 4 && progress.completed === 3 && progress.earned === 1, 'trophy progress totals');

// Next story is the first unfinished stop in path order; all-finished falls back to the first.
check(nextStory([a1a, a1b, a2a])?.id === 'story-02', 'next is first unfinished');
check(nextStory([a1a, a2a])?.id === 'story-01', 'all completed falls back to first');
check(nextStory([]) === null, 'no stories, no next');

// CTA wording matches the stop's state.
equal(storyCtaLabel(a1b), 'Continue · Test');
equal(storyCtaLabel(a1a), 'Read again · Test');
equal(storyCtaLabel(stop), 'Start · Test');

console.log('Stories presenter: states, chapters, trophies, next story passed.');
