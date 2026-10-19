import React from 'react';
import { Flame, LogOut, ArrowRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { skillCompletion } from '../presenters/progress.presenter';
import { clbForCefr } from '../presenters/levels.presenter';
import type { AuthResponse, MeResponse, StreakResponse } from '../api/client';
import type { SkillId } from '../types';
import { apiPost, type UpdateProfileResponse } from '../api/client.js';
import type { UserPayload } from '../types';
import { getErrorMessage } from '../presenters/format.presenter.js';
import { Box, Button, CheckRow, ErrorMessage, Field, Text, TextInput, StreakHeatmap, ProgressRing } from '../components/ui';

export type ProfileProps = {
  token: string | null;
  user: UserPayload | null;
  userData: MeResponse | AuthResponse | null;
  streak: StreakResponse | null;
  onLogout: () => void;
  onRoadmap: () => void;
  onSaved?: (user: UserPayload) => void;
  key?: React.Key;
};

// FRA-56: profile page — shows the signed-in user's email (read-only) and
// lets them edit the first/last name collected at signup.
export function Profile({ token, user, userData, streak, onSaved, onLogout, onRoadmap }: ProfileProps) {
  const [firstName, setFirstName] = React.useState(user?.first_name || '');
  const [lastName, setLastName] = React.useState(user?.last_name || '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  // No notification-preferences API exists yet. These are session-only controls.
  const [reminder, setReminder] = React.useState(false);
  const [emailUpdates, setEmailUpdates] = React.useState(false);
  const learner=userData && 'skill_progress' in userData ? userData : null;
  const level = learner?.profile?.current_level;
  const clb = clbForCefr(level);
  const skills: { id: SkillId; label: string }[] = [{id:'lire',label:'Lire'},{id:'ecouter',label:'Écouter'},{id:'ecrire',label:'Écrire'},{id:'parler',label:'Parler'}];
  const done = learner?.skill_progress.reduce((sum, row) => sum + row.exercises_done, 0) || 0;
  const correct = learner?.skill_progress.reduce((sum, row) => sum + row.exercises_correct, 0) || 0;
  const completed = learner?.progress.filter(row => row.state === 'completed').length || 0;


  async function save(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      setError('Please enter your first and last name.');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload = await apiPost<UpdateProfileResponse>(
        '/api/me/profile',
        { first_name: first, last_name: last },
        token,
      );
      setFirstName(payload.user.first_name || '');
      setLastName(payload.user.last_name || '');
      setSaved(true);
      onSaved?.(payload.user);
    } catch (requestError) {
      setError(requestError instanceof Error ? getErrorMessage(requestError) : 'Could not save your name. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box as="section" className="profile-page">
      <Box className="profile-header">
        <Box className="profile-avatar" aria-hidden="true">{Array.from(user?.name.trim() || 'F')[0].toUpperCase()}</Box>
        <Box><Text as="h1">{user?.name || 'Your profile'}</Text><Text>{user?.email}</Text>
          <Text className="profile-facts">{!learner ? 'Loading your learning profile…' : `${level ? `Level ${level}${clb ? ` · CLB ${clb}` : ''}` : 'Not placed yet'} · ${learner.profile?.placement_status === 'complete' ? 'Placement complete' : 'Placement pending'}`}</Text>
        </Box>
      </Box>
      <Box className="profile-columns">
        <Box className="profile-account-settings">
          <Box as="section" aria-label="Account" className="profile-account">
            <Text as="h2" className="profile-section-title">Account</Text>
            <Box className="profile-email"><Text as="span">Email</Text><Text>{user?.email || '—'}</Text></Box>
            <Box as="form" onSubmit={save}>
              <Box className="profile-name-fields">
                <Field label="First name"><TextInput name="first_name" value={firstName} onChange={event => {setFirstName(event.target.value);setSaved(false);}} autoComplete="given-name" required /></Field>
                <Field label="Last name"><TextInput name="last_name" value={lastName} onChange={event => {setLastName(event.target.value);setSaved(false);}} autoComplete="family-name" required /></Field>
              </Box>
              {error && <ErrorMessage message={error} />}
              <Box className="profile-save"><Button variant="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button><Box as="span" role="status">{saved && !error ? 'Saved' : ''}</Box></Box>
            </Box>
          </Box>
          <Box as="section" aria-label="Settings" className="profile-settings">
            <Text as="h2" className="profile-section-title">Settings</Text>
            <Box className="profile-theme"><Text as="span">Theme</Text>
              <Box className="theme-segments" role="group" aria-label="Theme">
                <Box as="button" type="button" aria-pressed={resolvedTheme === 'light'} onClick={() => setTheme('light')}>Light</Box>
                <Box as="button" type="button" aria-pressed={resolvedTheme === 'dark'} onClick={() => setTheme('dark')}>Dark</Box>
              </Box>
            </Box>
            <CheckRow label="Daily reminder" checked={reminder} onChange={() => setReminder(value => !value)} />
            <CheckRow label="Email updates" checked={emailUpdates} onChange={() => setEmailUpdates(value => !value)} />
            <Text className="profile-preferences-note">Notification preferences are a preview and reset when you leave this page.</Text>
          </Box>
          <Button variant="text" icon={LogOut} onClick={onLogout}>Log out</Button>
        </Box>
        <Box as="section" aria-label="Your progress" className="profile-progress">
          <Text as="h2" className="profile-section-title">Your progress</Text>
          {!learner && <Text variant="muted">Loading progress…</Text>}
          {learner && <Box className="profile-stats">
            <Box><Text as="strong">{streak ? <><Flame size={18} aria-hidden="true" /> {streak.currentStreak}</> : '—'}</Text><Text>Day streak · best {streak?.longestStreak ?? '—'}</Text></Box>
            <Box><Text as="strong">{completed}</Text><Text>Lessons completed</Text></Box>
            <Box><Text as="strong">{done}</Text><Text>Exercises done</Text></Box>
            <Box><Text as="strong">{done ? `${Math.round(correct / done * 100)}%` : '—'}</Text><Text>Accuracy</Text></Box>
            <Box><Text as="strong">{streak?.activeDays ?? '—'}</Text><Text>Active days</Text></Box>
          </Box>}
          <Text as="h3" className="profile-section-title">Activity · last 16 weeks</Text>
          {streak?.today ? <Box className="profile-heatmap"><StreakHeatmap days={streak.days} today={streak.today} weeks={16} /><Text className="profile-activity-summary">Any day with an exercise counts toward your streak.</Text></Box> : <Text variant="muted">Activity is currently unavailable.</Text>}
          <Text as="h3" className="profile-section-title">Skills</Text>
          <Box className="profile-skills">{skills.map(skill => {
            const progress = skillCompletion(learner?.skill_progress || [], skill.id);
            return <Box key={skill.id}>{learner && <ProgressRing percent={progress.percent} size={62} label={`${skill.label}: ${progress.done} of ${progress.total} exercises done`} />}<Text>{skill.label}</Text></Box>;
          })}</Box>
          <Button variant="text" icon={ArrowRight} iconPosition="after" onClick={onRoadmap}>Explore topics</Button>
        </Box>
      </Box>
    </Box>
  );
}
