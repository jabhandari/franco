import React from 'react';
import {
  Apple, Armchair, Bike, BookOpen, BookText, Building2, CalendarCheck, CalendarClock, Camera, ChefHat,
  ClipboardCheck, ClipboardList, Coffee, Coins, Compass, Crown, DoorOpen, Feather, Flag,
  FlaskConical, Flower2, Footprints, Gauge, Gift, KeyRound, Landmark, Languages, Lightbulb,
  ListChecks, Mail, Map, Megaphone, MessageSquare, MessagesSquare, MoonStar, Notebook,
  PartyPopper, PhoneOff, PiggyBank, Quote, Route, Salad, Scale, School, ShoppingBag, Signpost,
  Sparkles, Sprout, Star, Ticket, Trophy, Truck, Umbrella, UtensilsCrossed, Volume2, VolumeX,
  Check,
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {CefrLevel, StoryStop} from '../../types';
import {storyChapters, storyStateLabel} from '../../presenters/stories.presenter';

// One icon per story, matched to its title in content/stories/stories.v1.json.
// A story added without an entry falls back to the chapter icon.
const STORY_ICONS: Record<string, LucideIcon> = {
  'story-01': ShoppingBag,
  'story-02': Apple,
  'story-03': Coffee,
  'story-04': DoorOpen,
  'story-05': MoonStar,
  'story-06': Flower2,
  'story-07': UtensilsCrossed,
  'story-08': PhoneOff,
  'story-09': Gift,
  'story-10': Umbrella,
  'story-11': CalendarClock,
  'story-12': Salad,
  'story-13': Bike,
  'story-14': CalendarCheck,
  'story-15': Mail,
  'story-16': School,
  'story-17': Footprints,
  'story-18': Megaphone,
  'story-19': KeyRound,
  'story-20': Sprout,
  'story-21': Route,
  'story-22': BookOpen,
  'story-23': Volume2,
  'story-24': ChefHat,
  'story-25': Camera,
  'story-26': PartyPopper,
  'story-27': Landmark,
  'story-28': MessageSquare,
  'story-29': Coins,
  'story-30': ClipboardList,
  'story-31': Signpost,
  'story-32': Armchair,
  'story-33': Truck,
  'story-34': Ticket,
  'story-35': ClipboardCheck,
  'story-36': FlaskConical,
  'story-37': BookText,
  'story-38': Lightbulb,
  'story-39': ListChecks,
  'story-40': Quote,
  'story-41': Scale,
  'story-42': MessageSquare,
  'story-43': VolumeX,
  'story-44': Notebook,
  'story-45': Gauge,
  'story-46': Languages,
  'story-47': Building2,
  'story-48': PiggyBank,
  'story-49': MessagesSquare,
  'story-50': Flag,
};

const CHAPTER_ICONS: Record<CefrLevel, LucideIcon> = {
  A1: Sparkles,
  A2: Compass,
  B1: Route,
  B2: Map,
  C1: Feather,
  C2: Crown,
};

function StoryDots({answered}: {answered: number}) {
  return (
    <span className="story-dots" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i < answered ? 'story-dot filled' : 'story-dot'} />
      ))}
    </span>
  );
}

function storyStatus(stop: StoryStop, isNext: boolean): string {
  if (stop.state === 'completed') return 'Completed · Read again';
  if (stop.answered) return `${stop.answered}/6 answered · Jump back in`;
  if (isNext) return 'Your next adventure';
  return 'Start story';
}

export type StoryPathProps = {
  stops: StoryStop[];
  onSelect: (id: string) => void;
  nextId?: string | null;
  key?: React.Key;
};

export function StoryPath({stops, onSelect, nextId = null}: StoryPathProps) {
  const chapters = storyChapters(stops);
  return (
    <div className="story-chapters">
      {chapters.map(chapter => {
        const ChapterIcon = CHAPTER_ICONS[chapter.level];
        return (
          <section
            key={chapter.level}
            className={`story-chapter tone-${chapter.tone}`}
            aria-label={`Chapter ${chapter.number} · ${chapter.level} · ${chapter.nameFr}`}
          >
            <header className="story-chapter-head" id={`stories-${chapter.level.toLowerCase()}`}>
              <span className="story-chapter-chip">
                <ChapterIcon size={22} aria-hidden="true" />
              </span>
              <span className="story-chapter-copy">
                <small>Chapter {String(chapter.number).padStart(2, '0')} · {chapter.level}</small>
                <h3>{chapter.nameFr}</h3>
                <span className="story-chapter-descriptor">{chapter.descriptor}</span>
              </span>
              <span className="story-chapter-count">
                {chapter.completed} of {chapter.total} stories
              </span>
              <span className={`story-chapter-trophy${chapter.earned ? ' earned' : ''}`}>
                <Trophy size={15} aria-hidden="true" />
                {chapter.earned ? 'Trophy earned' : `${chapter.completed}/${chapter.total}`}
              </span>
            </header>
            <ol className="story-path" aria-label={`${chapter.level} stories`}>
              {chapter.stops.map(stop => {
                const Icon = STORY_ICONS[stop.id] ?? ChapterIcon;
                const isNext = stop.id === nextId;
                const status = storyStatus(stop, isNext);
                return (
                  <li key={stop.id} className={`story-stop ${stop.state}${isNext ? ' next' : ''}`}>
                    <button
                      type="button"
                      className="story-stop-button"
                      aria-label={`${stop.order_index}. ${stop.title}. ${isNext && !stop.answered ? 'Your next adventure' : storyStateLabel(stop)}`}
                      onClick={() => onSelect(stop.id)}
                    >
                      <span className="story-stop-cover" aria-hidden="true">
                        <span className="story-stop-cover-orbit" />
                        <span className="story-stop-marker">
                          {stop.state === 'completed' ? (
                            <Check size={38} aria-hidden="true" />
                          ) : (
                            <Icon size={38} aria-hidden="true" />
                          )}
                        </span>
                        <span className="story-cover-number">FRANCO · {String(stop.order_index).padStart(2, '0')}</span>
                      </span>
                      <span className="story-stop-copy">
                        <small>
                          {String(stop.order_index).padStart(2, '0')} · {stop.level}
                        </small>
                        <strong>{stop.title}</strong>
                        <span>{stop.title_en}</span>
                        <span className="story-stop-status">
                          {stop.answered > 0 && stop.state !== 'completed' && (
                            <StoryDots answered={stop.answered} />
                          )}
                          <small>{status}</small>
                        </span>
                      </span>
                      {stop.state === 'completed' && (
                        <span className="story-stop-star">
                          <Star size={18} aria-hidden="true" />
                        </span>
                      )}
                      {isNext && <span className="story-stop-cta">{stop.answered ? 'Jump back in' : 'Start reading'}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className={`story-trophy-stop${chapter.earned ? ' earned' : ''}`}>
              <span className="story-trophy-medal">
                <Trophy size={34} aria-hidden="true" />
              </span>
              <strong>
                {chapter.level} Trophy · {chapter.nameFr}
              </strong>
              <span>
                {chapter.earned
                  ? 'Trophy earned — every story in this chapter is finished.'
                  : `Finish all ${chapter.total} ${chapter.level} stories to earn this trophy · ${chapter.completed} of ${chapter.total} done`}
              </span>
            </div>
          </section>
        );
      })}
    </div>
  );
}
