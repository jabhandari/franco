import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  BookOpenText,
  ChevronRight,
  GraduationCap,
  Home as HomeIcon,
  Lock,
  LogOut,
  Mail,
  Mic,
  Shapes,
  Sun,
  Moon,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './styles.css';
import { ApiError, apiGet, apiPost, getErrorMessage } from './api/client.js';
import type { AuthResponse, MeResponse, StreakResponse } from './api/client.js';
import type { AuthMode, UserPayload } from './types';
import { ThemeProvider, useTheme } from 'next-themes';
import { LoadingScreen, NavButton, Brand, Button, Field, ErrorMessage, Box, Text, TextInput, UserMenu, PronunciationSpikePanel } from './components/ui';
import { streakPath } from './presenters/streak.presenter.js';
import { Home } from './views/Home.js';
import { Session } from './views/Session.js';
import { Content } from './views/Content.js';
import { PastQuestions } from './views/PastQuestions.js';
import { Practice } from './views/Practice';
import { Progress } from './views/Progress.js';
import { Conversation } from './views/Conversation.js';
import { Placement } from './views/Placement.js';
import { ReviewQueue } from './views/ReviewQueue.js';
import { AuthScreen } from './views/Auth';

import { LanguageTools } from './components/LanguageTools';
import { Profile } from './views/Profile.js';
import { QuestionTypes } from './views/QuestionTypes.js';
import { Puzzles } from './views/Puzzles.js';
import { StoriesPage } from './views/StoriesPage';
import { WordsOfDay } from './views/WordsOfDay.js';

const Race = React.lazy(() => import('./views/Race.js').then(({ Race: RaceView }) => ({ default: RaceView })));

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
type ViewId = 'practice' | 'home' | 'learn' | 'placement' | 'session' | 'content' | 'past' | 'progress' | 'conversation' | 'review' | 'profile' | 'question-types' | 'puzzles' | 'stories' | 'race' | 'pronunciation-spike' | 'words';
const authViewFromPath = (): AuthMode => window.location.pathname === '/reset-password' ? 'reset' : window.location.pathname === '/verify-email' ? 'verify' : window.location.pathname === '/forgot-password' ? 'forgot' : 'login';

type NavItem = {
  id: ViewId;
  label: string;
  icon: LucideIcon;
};

const TOKEN_KEY = 'franco_auth_token';
const googleCallback=new URLSearchParams(window.location.hash.slice(1));
const returnedCode=googleCallback.get('auth_code');
const returnedState=googleCallback.get('auth_state');
const expectedState=sessionStorage.getItem('franco_oauth_return_state');
const matchesCallback=Boolean(expectedState && returnedState===expectedState);
// Single-use 60s handoff code: only accepted when this tab initiated the
// flow. The URL is scrubbed immediately so the code never lingers in the
// address bar or history; the session token itself never appears in a URL.
const pendingGoogleCode=matchesCallback && !googleCallback.get('auth_error') ? returnedCode : null;
const googleError=googleCallback.get('auth_error') || (returnedCode && !matchesCallback ? 'google_failed' : null);
if(matchesCallback) sessionStorage.removeItem('franco_oauth_return_state');
if(returnedCode || googleError || returnedState) window.history.replaceState({},'',window.location.pathname+window.location.search);


const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
  { id: 'practice', label: 'Practice', icon: BookOpen },
  { id: 'conversation', label: 'Conversation', icon: Mic },
  { id: 'puzzles', label: 'Puzzles', icon: Shapes },
  { id: 'stories', label: 'Stories', icon: BookOpenText },
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
  'question-types': '/question-types',
  puzzles: '/puzzles',
  stories: '/stories',
  race: '/race',
  'pronunciation-spike': '/pronunciation-spike',
  words: '/words',
};
const VIEW_IDS: ViewId[] = ['practice', 'home', 'learn', 'placement', 'session', 'content', 'past', 'progress', 'conversation', 'review', 'profile', 'question-types', 'puzzles', 'stories', 'race', 'pronunciation-spike', 'words'];

function viewFromPath(pathname: string): ViewId {
  for (const id of VIEW_IDS) {
    const path = viewPaths[id];
    if (path === pathname || (path !== '/' && pathname.startsWith(`${path}/`))) return id;
  }
  return 'home';
}

function App(): React.JSX.Element {
  const [authView, setAuthMode] = React.useState<AuthMode>(authViewFromPath);
  const [session, setSession] = React.useState<UserPayload | null>(null);
  const [authToken, setAuthToken] = React.useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [userData, setUserData] = React.useState<MeResponse | AuthResponse | null>(null);
  const [streak, setStreak] = React.useState<StreakResponse | null>(null);
  const latestAuthToken=React.useRef(authToken);
  const latestMeRequest=React.useRef(0);
  const profileRevision=React.useRef(0);
  const latestSavedProfile=React.useRef<UserPayload|null>(null);
  React.useLayoutEffect(()=>{latestAuthToken.current=authToken;},[authToken]);
  const [view, setView] = React.useState<ViewId>(() => viewFromPath(window.location.pathname));
  const [sessionLevel, setSessionLevel] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(Boolean(authToken) || Boolean(pendingGoogleCode));
  const [error, setError] = React.useState<string>(googleError==='google_cancelled' ? 'Google sign-in was cancelled. Please try again or use email.' : googleError==='email_taken' ? 'An account with this email already exists. Please log in with your password instead.' : googleError ? 'Google sign-in could not be completed. Please try again or use email.' : '');
  const { resolvedTheme: theme, setTheme } = useTheme();
  function navigate(nextView: ViewId, replace = false, params?: URLSearchParams): void {
    setView(nextView);
    window.history[replace ? 'replaceState' : 'pushState']({}, '', `${viewPaths[nextView] || '/'}${params ? `?${params}` : ''}`);
  }

  React.useEffect(() => {
    const onPopState = () => { setView(viewFromPath(window.location.pathname)); setAuthMode(authViewFromPath()); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // FRA-57: exchange the single-use Google handoff code for a session token.
  // The session is fetched by the existing [authToken] effect once set.
  React.useEffect(() => {
    if (!pendingGoogleCode) return;
    let active = true;
    setLoading(true);
    apiPost<{token: string}>('/api/auth/google/exchange', { code: pendingGoogleCode })
      .then(({ token }) => {
        if (!active) return;
        sessionStorage.setItem(TOKEN_KEY, token);
        latestAuthToken.current = token;
        setAuthToken(token);
      })
      .catch(() => {
        if (active) setError('Google sign-in could not be completed. Please try again or use email.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Page navigation refreshes the shared learner snapshot after any exercise
  // surface records attempts, so Home/Profile never retain pre-practice data.
  React.useEffect(() => {
    if (!authToken || !session) return;
    let cancelled = false;
    const request = ++latestMeRequest.current;
    const revision = profileRevision.current;
    apiGet<MeResponse>('/api/me', authToken).then(payload => {
      if (!cancelled) applyUserSnapshot(payload, request, revision, authToken);
    }).catch(() => {});
    apiGet<StreakResponse>(streakPath(), authToken).then(payload => {
      if (!cancelled) setStreak(payload);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [view, authToken]);

  function applyUserSnapshot(payload:MeResponse,request:number,revision:number,token:string):void {
    if(token!==latestAuthToken.current || request!==latestMeRequest.current) return;
    const savedUser=latestSavedProfile.current;
    const user=revision!==profileRevision.current && savedUser?.id===payload.user.id ? savedUser : payload.user;
    setSession(user);
    setUserData({...payload,user});
    setError('');
  }

  function refreshUserData(): void {
    if (!authToken || authToken!==latestAuthToken.current) return;
    const request=++latestMeRequest.current,revision=profileRevision.current;
    apiGet<MeResponse>('/api/me', authToken)
      .then((payload) => {
        applyUserSnapshot(payload,request,revision,authToken);
      })
      .catch(() => {
        if(authToken!==latestAuthToken.current || request!==latestMeRequest.current) return;
        latestAuthToken.current=null;
        sessionStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        setSession(null);
        setUserData(null);
      });
    apiGet<StreakResponse>(streakPath(), authToken).then(payload=>{if(authToken===latestAuthToken.current) setStreak(payload);}).catch(() => {});
  }

  React.useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    const request=++latestMeRequest.current,revision=profileRevision.current;
    setLoading(true);
    apiGet<MeResponse>('/api/me', authToken)
      .then((payload) => {
        if (cancelled) return;
        applyUserSnapshot(payload,request,revision,authToken);
      })
      .catch(() => {
        if (cancelled || authToken!==latestAuthToken.current || request!==latestMeRequest.current) return;
        latestAuthToken.current=null;
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

    setError('');
    if (authView === 'signup' && (!firstName || !lastName)) {
      setError('Please enter your first and last name.');
      return;
    }

    setLoading(true);

    try {
      if (authView === 'signup') {
        await apiPost<{message:string}>('/api/auth/signup', { email, first_name: firstName, last_name: lastName, password });
        setAuthMode('check-email');
        return;
      }
      const payload = await apiPost<AuthResponse>('/api/auth/login', { email, password });
      sessionStorage.setItem(TOKEN_KEY, payload.token);
      latestAuthToken.current=payload.token;
      setAuthToken(payload.token);
      setSession(payload.user);
      setUserData(payload);
      navigate('home', true);
    } catch (requestError) {
      // Type boundary: narrow the unknown catch value before reading it.
      if (requestError instanceof ApiError && ['email_not_verified','verification_email_failed'].includes(requestError.code || '')) setAuthMode('unverified');
      setError(requestError instanceof Error ? getErrorMessage(requestError) : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function logout(): void {
    latestAuthToken.current=null;latestMeRequest.current++;latestSavedProfile.current=null;profileRevision.current++;
    setSession(null);
    setAuthToken(null);
    setUserData(null);
    sessionStorage.removeItem(TOKEN_KEY);
    setAuthMode('login');
    navigate('home', true);
  }

  function handleProfileSaved(user: UserPayload): void {
    if(!authToken || authToken!==latestAuthToken.current) return;
    latestSavedProfile.current=user;profileRevision.current++;
    setSession(user);
    setUserData((prev) => (prev ? { ...prev, user } : prev));
  }

  function handlePasswordReset(): void {
    latestAuthToken.current=null;latestMeRequest.current++;
    setSession(null);setAuthToken(null);setUserData(null);
    sessionStorage.removeItem(TOKEN_KEY);
    setAuthMode('login');setError('');
    window.history.replaceState({},'','/');
  }

  if (view === 'race') {
    const code = window.location.pathname.match(/^\/race\/([A-Za-z0-9]{8})\/?$/)?.[1] ?? null;
    return <React.Suspense fallback={<LoadingScreen />}><Race code={code} token={authToken} onExit={() => navigate('puzzles')} /></React.Suspense>;
  }

  if (loading && authToken && !session) {
    return <LoadingScreen />;
  }

  if (!session || ['forgot','reset','verify'].includes(authView)) {
    return <AuthScreen mode={authView} onModeChange={(mode) => {setAuthMode(mode);setError(''); const path = mode === 'forgot' ? '/forgot-password' : mode === 'reset' ? '/reset-password' : mode === 'verify' ? '/verify-email' : '/'; window.history.pushState({},'',path); }} onSubmit={handleAuthSubmit} loading={loading} error={error} onPasswordReset={handlePasswordReset} />;
  }

  return (
    <Box className={`app-shell language-tools-enabled${view === 'learn' || view === 'content' ? ' learn-page-shell' : ''}`}>
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
        <UserMenu active={view === 'profile'} name={session.name} level={userData?.profile?.current_level} onClick={() => navigate('profile')} />
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
          onConversation={() => navigate('conversation')} onPuzzles={() => navigate('puzzles')}
          onWords={() => navigate('words')}
        />}
        {view === 'learn' && <Content token={authToken} onPractice={(level) => { setSessionLevel(level); navigate('session'); }} />}
        {view === 'placement' && <Placement token={authToken} onPlaced={() => refreshUserData()} />}
        {view === 'session' && <Session key={sessionLevel || 'default'} token={authToken} initialLevel={sessionLevel} />}
        {view === 'content' && <Content token={authToken} onPractice={(level) => { setSessionLevel(level); navigate('session'); }} />}
        {view === 'past' && <PastQuestions token={authToken} />}
        {view === 'practice' && <Practice token={authToken} />}
        {view === 'progress' && <Progress token={authToken} />}
        {view === 'conversation' && <Conversation token={authToken} />}
        {view === 'review' && <ReviewQueue />}
        {view === 'profile' && <Profile token={authToken} user={session} userData={userData} streak={streak} onSaved={handleProfileSaved} onLogout={logout} onRoadmap={() => navigate('content')} />}
        {view === 'question-types' && <QuestionTypes token={authToken} />}
        {view === 'puzzles' && <Puzzles token={authToken} onRace={() => navigate('race')} />}
        {view === 'stories' && <StoriesPage token={authToken} />}
        {view === 'pronunciation-spike' && <PronunciationSpikePanel />}
        {view === 'words' && <WordsOfDay token={authToken} onHome={() => navigate('home')} />}
      </Box>
    </Box>
  );
}

createRoot(document.getElementById('root')).render(
  <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem storageKey="franco_theme">
    <App />
  </ThemeProvider>
);
