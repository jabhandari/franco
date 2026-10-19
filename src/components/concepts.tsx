// Level descriptions remain shared with Placement. Retired roadmap UI removed.
type LevelGuideInfo = {label:string;goal:string;focus:string;read:string};
export const levelGuides: Record<string, LevelGuideInfo> = {
  A1: { label: 'Breakthrough', goal: 'Handle familiar words and simple everyday phrases.', focus: 'Greetings, identity, numbers, time, articles, and present-tense verbs.', read: 'Short notices, messages, menus, and simple personal descriptions.' },
  A2: { label: 'Waystage', goal: 'Understand the main point in predictable everyday situations.', focus: 'Routine tasks, past events, descriptions, directions, and common connectors.', read: 'Short emails, schedules, advertisements, and straightforward stories.' },
  B1: { label: 'Threshold', goal: 'Follow the essential meaning of clear speech and texts on familiar topics.', focus: 'Opinions, experiences, explanations, narrative tenses, and paragraph structure.', read: 'Articles, interviews, personal accounts, and practical workplace texts.' },
  B2: { label: 'Vantage', goal: 'Understand detailed arguments and communicate with growing precision.', focus: 'Nuance, register, cohesion, complex grammar, and topic-specific vocabulary.', read: 'Longer articles, reports, editorials, and interviews with implicit meaning.' },
  C1: { label: 'Effective proficiency', goal: 'Use French flexibly and effectively for social, academic, and professional purposes.', focus: 'Implicit meaning, stylistic control, complex argumentation, and precise vocabulary.', read: 'Long demanding texts, literature, and specialised articles.' },
  C2: { label: 'Mastery', goal: 'Understand virtually everything with ease and express yourself with precision.', focus: 'Fine shades of meaning, idiomatic control, and effortless adaptation to context.', read: 'Anything: abstract, literary, and technically dense material.' },
};
