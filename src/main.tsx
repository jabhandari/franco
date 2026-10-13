import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Home as HomeIcon,
  Lock,
  LogOut,
  Mail,
  Mic,
  Sun,
  Moon,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './styles.css';
import { apiGet, apiPost, getErrorMessage } from './api/client.js';
import type { AuthResponse, MeResponse, StreakResponse } from './api/client.js';
import type { UserPayload } from './types';
import { ThemeProvider, useTheme } from 'next-themes';
import { LoadingScreen, NavButton, Brand, Button, Field, ErrorMessage, Box, Text, TextInput, UserMenu } from './components/ui';
import { streakPath } from './presenters/streak.presenter.js';
import { Home } from './views/Home.js';
import { Learn } from './views/Learn.js';
import { Session } from './views/Session.js';
import { Content } from './views/Content.js';
import { PastQuestions } from './views/PastQuestions.js';
import { Progress } from './views/Progress.js';
import { Conversation } from './views/Conversation.js';
import { Placement } from './views/Placement.js';
import { ReviewQueue } from './views/ReviewQueue.js';
import { LanguageTools } from './components/LanguageTools';
import { Profile } from './views/Profile.js';

// next-themes ships its own types, but this repo has no @types/react, so
// `React.PropsWithChildren` in its ThemeProviderProps resolves to nothing
// and the `children` prop is missing from the declared props. Re-declare it
// via module augmentation (not an assertion) so the <ThemeProvider> wrapper
// below typechecks, using the same `React.ReactNode` children type as the
// component library (the repo's no-`unknown` rule forbids an escape hatch
// here). Remove when @types/react lands (migration closeout) —
// PropsWithChildren will supply children then, making this redundant.
declare module 'next-themes' {
  interface ThemeProviderProps {
    children?: React.ReactNode;
  }
}

// FRA-67: app-shell types. ViewId is the sidebar's view vocabulary — the
// auth gate, router, and nav all speak it, so a bad view id is a type
// error, not a silent blank page.
type ViewId = 'practice' | 'home' | 'learn' | 'placement' | 'session' | 'content' | 'past' | 'progress' | 'conversation' | 'review' | 'profile';
type AuthView = 'login' | 'signup';

type NavItem = {
  id: ViewId;
  label: string;
  icon: LucideIcon;
};

const TOKEN_KEY = 'franco_auth_token';

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
  { id: 'practice', label: 'Practice', icon: BookOpen },
  { id: 'conversation', label: 'Conversation', icon: Mic },
];

const viewPaths: Record<ViewId, string> = {
  home: '/',
  practice: '/practice',
  learn: '/learn',
  placement: '/placement',
  session: '/session',
  content: '/content',
  past: '/past-questions',
  progress: '/progress',
  conversation: '/conversation',
  review: '/review',
  profile: '/profile',
};

const VIEW_IDS: ViewId[] = ['practice', 'home', 'learn', 'placement', 'session', 'content', 'past', 'progress', 'conversation', 'review', 'profile'];

function viewFromPath(pathname: string): ViewId {
  for (const id of VIEW_IDS) {
    const path = viewPaths[id];
    if (path === pathname || (path !== '/' && pathname.startsWith(`${path}/`))) return id;
  }
  return 'home';
}

function App(): React.JSX.Element {
  const [authView, setAuthView] = React.useState<AuthView>('login');
  const [session, setSession] = React.useState<UserPayload | null>(null);
  const [authToken, setAuthToken] = React.useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [userData, setUserData] = React.useState<MeResponse | null>(null);
  const [streak, setStreak] = React.useState<StreakResponse | null>(null);
  const [view, setView] = React.useState<ViewId>(() => viewFromPath(window.location.pathname));
  const [sessionLevel, setSessionLevel] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(Boolean(authToken));
  const [error, setError] = React.useState<string>('');
  const { resolvedTheme: theme, setTheme } = useTheme();
  function navigate(nextView: ViewId, replace = false, params?: URLSearchParams): void {
    setView(nextView);
    window.history[replace ? 'replaceState' : 'pushState']({}, '', `${viewPaths[nextView] || '/'}${params ? `?${params}` : ''}`);
  }

  React.useEffect(() => {
    const onPopState = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Page navigation refreshes the shared learner snapshot after any exercise
  // surface records attempts, so Home/Profile never retain pre-practice data.
  React.useEffect(() => {
    if (!authToken || !session) return;
    let cancelled = false;
    apiGet<MeResponse>('/api/me', authToken).then(payload => {
      if (!cancelled) { setSession(payload.user); setUserData(payload); }
    }).catch(() => {});
    apiGet<StreakResponse>(streakPath(), authToken).then(payload => {
      if (!cancelled) setStreak(payload);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [view, authToken]);

  function refreshUserData(): void {
    if (!authToken) return;
    apiGet<MeResponse>('/api/me', authToken)
      .then((payload) => {
        setSession(payload.user);
        setUserData(payload);
        setError('');
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        setSession(null);
        setUserData(null);
      });
    apiGet<StreakResponse>(streakPath(), authToken).then(setStreak).catch(() => {});
  }

  React.useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    setLoading(true);
    apiGet<MeResponse>('/api/me', authToken)
      .then((payload) => {
        if (cancelled) return;
        setSession(payload.user);
        setUserData(payload);
        setError('');
      })
      .catch(() => {
        if (cancelled) return;
        sessionStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        setSession(null);
        setUserData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  // FRA-44: streak read model for the sidebar chip and the Home hero.
  React.useEffect(() => {
    if (!authToken) {
      setStreak(null);
      return;
    }
    let cancelled = false;
    apiGet<StreakResponse>(streakPath(), authToken)
      .then((payload) => {
        if (!cancelled) setStreak(payload);
      })
      .catch(() => {
        if (!cancelled) setStreak(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email')?.toString().trim() ?? '';
    const firstName = formData.get('first_name')?.toString().trim() ?? '';
    const lastName = formData.get('last_name')?.toString().trim() ?? '';
    const password = formData.get('password')?.toString() || '';
    const endpoint = authView === 'signup' ? '/api/auth/signup' : '/api/auth/login';

    setError('');
    if (authView === 'signup' && (!firstName || !lastName)) {
      setError('Please enter your first and last name.');
      return;
    }

    setLoading(true);

    try {
      const payload = await apiPost<AuthResponse>(
        endpoint,
        authView === 'signup'
          ? { email, first_name: firstName, last_name: lastName, password }
          : { email, password },
      );
      sessionStorage.setItem(TOKEN_KEY, payload.token);
      setAuthToken(payload.token);
      setSession(payload.user);
      setUserData(payload);
      navigate('home', true);
    } catch (requestError) {
      // Type boundary: narrow the unknown catch value before reading it.
      setError(requestError instanceof Error ? getErrorMessage(requestError) : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function logout(): void {
    setSession(null);
    setAuthToken(null);
    setUserData(null);
    sessionStorage.removeItem(TOKEN_KEY);
    setAuthView('login');
    navigate('home', true);
  }

  function handleProfileSaved(user: UserPayload): void {
    setSession(user);
    setUserData((prev) => (prev ? { ...prev, user } : prev));
  }

  if (loading && authToken && !session) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <AuthScreen mode={authView} onModeChange={setAuthView} onSubmit={handleAuthSubmit} loading={loading} error={error} />;
  }

  return (
    <Box className="app-shell language-tools-enabled">
      <LanguageTools key={session.id} userId={session.id} token={authToken} page={view}/>
      <Box as="aside" className="sidebar">
        <Brand onClick={() => navigate('home')} />

        <Box as="nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              active={view === item.id || (item.id === 'practice' && view === 'past') || (item.id === 'learn' && view === 'content')}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </NavButton>
          ))}
        </Box>

        <Box className="sidebar-actions">
          <Box as="button" type="button" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            <Text as="span">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</Text>
          </Box>
          <Button variant="nav" aria-label="Log out" onClick={logout} icon={LogOut} iconSize={18}>
            <Text as="span">Log out</Text>
          </Button>
        </Box>
        <UserMenu name={session.name} level={userData?.profile?.current_level} onClick={() => navigate('profile')} />
      </Box>

      <Box as="nav" className="phone-tabs" aria-label="Phone navigation">
        {navItems.map((item) => <NavButton key={item.id} icon={item.icon} active={view === item.id || (item.id === 'practice' && view === 'past') || (item.id === 'learn' && view === 'content')} onClick={() => navigate(item.id)}>{item.label}</NavButton>)}
      </Box>

      <Box as="main" className={`main-content ${view === 'content' ? 'wide-content' : ''}`}>
        {view === 'home' && <Home token={authToken} userData={userData} streak={streak}
          onStart={() => { setSessionLevel(userData?.profile?.current_level || 'A1'); navigate('session'); }}
          onPlacement={() => navigate('placement')}
          onContinue={(lesson) => navigate('content', false, new URLSearchParams({ level:lesson.level_code,concept:lesson.slug,section:lesson.section }))}
          onLesson={(lesson) => navigate('content', false, new URLSearchParams({ level:lesson.level_code || 'A1',concept:lesson.slug }))}
          onExplore={() => navigate('content', false, new URLSearchParams({ level:userData?.profile?.current_level || 'A1' }))}
          onConversation={() => navigate('conversation')}
        />}
        {view === 'learn' && <Learn token={authToken} onQuiz={(level) => { setSessionLevel(level); navigate('session'); }} />}
        {view === 'placement' && <Placement token={authToken} onPlaced={() => refreshUserData()} />}
        {view === 'session' && <Session key={sessionLevel || 'default'} token={authToken} initialLevel={sessionLevel} />}
        {view === 'content' && <Content token={authToken} />}
        {(view === 'past' || view === 'practice') && <PastQuestions token={authToken} />}
        {view === 'progress' && <Progress token={authToken} />}
        {view === 'conversation' && <Conversation token={authToken} />}
        {view === 'review' && <ReviewQueue />}
        {view === 'profile' && <Profile token={authToken} user={session} onSaved={handleProfileSaved} />}
      </Box>
    </Box>
  );
}

type AuthScreenProps = {
  mode: AuthView;
  onModeChange: (mode: AuthView) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string;
};

function AuthScreen({ mode, onModeChange, onSubmit, loading, error }: AuthScreenProps): React.JSX.Element {
  const isSignup = mode === 'signup';

  return (
    <Box as="main" className="auth-page">
      <Box className="auth-topbar">
        <Box className="auth-brand-wrap">
          <Text as="span" className="auth-brand-mark">fr</Text>
          <Text as="strong" className="auth-brand-name">Franco</Text>
          <Text as="span" className="auth-brand-subtitle">FRENCH LEARNING PLATFORM</Text>
        </Box>
      </Box>

      <Box className="auth-shell">
        <Box as="section" className="auth-intro">
          <Text as="p" className="auth-kicker">APPRENDRE. PROGRESSER. RÉUSSIR.</Text>
          <Text as="h1" className="auth-hero-title"><Text as="span" className="auth-hero-line">A little French,</Text><Text as="span" className="auth-hero-line">every day.</Text></Text>
          <Text className="auth-hero-copy">
            Build confidence through lessons, practice and review that fit your level.
          </Text>

          <Box
            as="button"
            type="button"
            className="auth-practice-panel"
            aria-label="Today's practice"
          >
            <Box as="span" className="auth-practice-icon"><BookOpen size={26} /></Box>
            <Box as="span" className="auth-practice-copy">
              <Text as="span" className="auth-practice-label">TODAY'S PRACTICE</Text>
              <Text as="strong">Les habitudes quotidiennes</Text>
              <Text as="small">Learn to talk about your daily routine.</Text>
            </Box>
            <ChevronRight className="auth-practice-arrow" size={25} aria-hidden="true" />
          </Box>
        </Box>

        <Box as="section" className="auth-card">
          <Text variant="eyebrow">{isSignup ? 'Create your account' : 'Welcome back'}</Text>
          <Text as="h2">{isSignup ? 'Start learning with Franco' : 'Log in to Franco'}</Text>
          <Text className="auth-card-subtitle">{isSignup ? 'Build a practice habit that fits your life.' : 'Pick up where you left off.'}</Text>
          <Box as="form" onSubmit={onSubmit}>
            {isSignup && (
              <Box className="auth-name-row">
                <Field label="First name" icon={UserRound}>
                  <TextInput name="first_name" type="text" placeholder="Marie" autoComplete="given-name" required />
                </Field>
                <Field label="Last name" icon={UserRound}>
                  <TextInput name="last_name" type="text" placeholder="Curie" autoComplete="family-name" required />
                </Field>
              </Box>
            )}
            <Field label="Email" icon={Mail}>
              <TextInput name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </Field>
            <Field label="Password" icon={Lock}>
              <TextInput
                name="password"
                type="password"
                placeholder="Password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
              />
            </Field>
            {!isSignup && <Text as="span" className="auth-forgot">Forgot password?</Text>}
            {error && <ErrorMessage message={error} />}
            <Button variant="primary" wide type="submit" disabled={loading} icon={ChevronRight} iconSize={18} iconPosition="after">
              {loading ? 'Connecting...' : isSignup ? 'Create account' : 'Log in'}
            </Button>
          </Box>
          <Box className="auth-divider"><Box as="span" />or<Box as="span" /></Box>
          <Box as="button" type="button" className="auth-secondary" onClick={() => onModeChange(isSignup ? 'login' : 'signup')}>
            {isSignup ? 'Already have an account? ' : 'New to Franco? '}
            <Text as="span">{isSignup ? 'Log in' : 'Create an account'}</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

createRoot(document.getElementById('root')).render(
  <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem storageKey="franco_theme">
    <App />
  </ThemeProvider>
);
