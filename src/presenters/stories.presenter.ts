import type {StoryStop} from '../types';
export function storyStateLabel(stop:StoryStop):string {
  return stop.state==='completed'?'Completed':stop.state==='skipped'?'Skipped':stop.answered?`${stop.answered}/6 answered`:'Ready to read';
}
export function storySummary(stories:StoryStop[]):string {
  const completed=stories.filter(s=>s.state==='completed').length,skipped=stories.filter(s=>s.state==='skipped').length;
  return `${completed} completed · ${skipped} skipped · ${stories.length} stories`;
}
