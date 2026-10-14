import React from 'react';
import { apiGet } from '../api/client';
import type { ContentItemsResponse, ContentReviewQueueItem, ExamQuestion, ExamQuestionsResponse } from '../api/client';
import type { SkillId, CefrLevel } from '../types';
import { itemBelongsToSkill, practiceItemsUrl, PRACTICE_PAGE_SIZE } from '../presenters/learn.presenter';
import { getErrorMessage } from '../presenters/format.presenter';
import { EXAM_SKILLS } from '../../shared/learning-skills';

type InventoryState = {
  key?: string;
  items: ContentReviewQueueItem[];
  questions: ExamQuestion[];
  total: number;
  page: number;
  loading: boolean;
  loadingPage: boolean;
  error: string;
  pageError: string;
};

const empty = (): InventoryState => ({ items: [], questions: [], total: 0, page: 0, loading: false, loadingPage: false, error: '', pageError: '' });

export function usePracticeInventory(skill: SkillId, level: CefrLevel, enabled: boolean, token?: string | null) {
  const [state, setState] = React.useState<InventoryState>(empty);
  const inFlight = React.useRef<string | null>(null);
  const key = `${skill}:${level}`;

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState({ ...empty(), key, loading: true });
    Promise.all([
      apiGet<ContentItemsResponse>(practiceItemsUrl(skill, level), token),
      apiGet<ExamQuestionsResponse>(`/api/exam/questions?section=${level}`, token),
    ]).then(([page, exam]) => {
      const questions = exam.questions.filter((question) => EXAM_SKILLS[question.skill.trim().toLowerCase()] === skill);
      if (!cancelled) setState({ key, items: page.items.filter((item) => itemBelongsToSkill(item.type, skill)),
        questions, total: page.total, page: 0, loading: false, loadingPage: false, error: '', pageError: '' });
    }).catch((error) => {
      if (!cancelled) setState({ ...empty(), key, error: getErrorMessage(error) });
    });
    return () => { cancelled = true; };
  }, [enabled, key, skill, level, token]);

  async function goToPage(target: number) {
    const pageCount = Math.max(1, Math.ceil(state.total / PRACTICE_PAGE_SIZE));
    if (!enabled || state.key !== key || state.loading || state.loadingPage || target < 0 || target >= pageCount || target === state.page || inFlight.current === key) return;
    inFlight.current = key;
    setState((current) => current.key === key ? { ...current, loadingPage: true, pageError: '' } : current);
    try {
      const page = await apiGet<ContentItemsResponse>(practiceItemsUrl(skill, level, target * PRACTICE_PAGE_SIZE), token);
      if (!page.items.length && target * PRACTICE_PAGE_SIZE < page.total) throw new Error('The exercise inventory changed while loading. Please try again.');
      setState((current) => current.key === key
        ? { ...current, items: page.items.filter((item) => itemBelongsToSkill(item.type, skill)),
          total: page.total, page: target, loadingPage: false, pageError: '' } : current);
    } catch (error) {
      setState((current) => current.key === key ? { ...current, loadingPage: false, pageError: getErrorMessage(error) } : current);
    } finally {
      if (inFlight.current === key) inFlight.current = null;
    }
  }

  const current = enabled && state.key !== key ? { ...empty(), loading: true } : state;
  return { ...current, pageCount: Math.max(1, Math.ceil(current.total / PRACTICE_PAGE_SIZE)), goToPage };
}
