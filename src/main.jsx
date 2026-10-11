import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  BarChart3,
  ChevronRight,
  CirclePlay,
  ClipboardCheck,
  Database,
  GraduationCap,
  Home as HomeIcon,
  Lock,
  LogOut,
  Mail,
  Mic,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRound,
  Sun,
  Moon,
  Zap
} from 'lucide-react';
import './styles.css';
import { apiGet, apiPost } from './api/client.js';
import { ThemeProvider, useTheme } from 'next-themes';
import { LoadingScreen, NavButton, Brand, Button, Field, ErrorMessage, Box, Text, TextInput } from './components/ui';
import { Home } from './views/Home.jsx';
import { Learn } from './views/Learn.jsx';
import { Session } from './views/Session.jsx';
import { Content } from './views/Content.jsx';
import { PastQuestions } from './views/PastQuestions.jsx';
import { Progress } from './views/Progress.jsx';
import { Conversation } from './views/Conversation.jsx';
import { Placement } from './views/Placement.jsx';
import { ReviewQueue, REVIEW_KEY_STORAGE } from './views/ReviewQueue.jsx';
import { Profile } from './views/Profile.jsx';

const TOKEN_KEY = 'franco_auth_token';

const navItems = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
  { id: 'placement', label: 'Placement', icon: ClipboardCheck },
  { id: 'session', label: 'Session', icon: CirclePlay },
  { id: 'content', label: 'Content', icon: BookOpen },
  { id: 'past', label: 'Past questions', icon: BookOpen },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'conversation', label: 'Conversation', icon: Mic },
  { id: 'profile', label: 'Profile', icon: UserRound }
];

<<<<<<< HEAD
const viewPaths = { home: '/', learn: '/learn', placement: '/placement', session: '/session', content: '/content', past: '/past-questions', progress: '/progress', conversation: '/conversation', review: '/review' };
=======
const viewPaths = { home: '/', placement: '/placement', session: '/session', content: '/content', past: '/past-questions', progress: '/progress', conversation: '/conversation', review: '/review', profile: '/profile' };
>>>>>>> dd1c2b7 (FRA-56: collect first/last name at signup; editable profile)
function viewFromPath(pathname) {
  const entry = Object.entries(viewPaths).find(([, path]) => path === pathname || (path !== '/' && pathname.startsWith(`${path}/`)));
  return entry?.[0] || 'home';
}

function App() {
  const [authView, setAuthView] = React.useState('login');
  const [session, setSession] = React.useState(null);
  const [authToken, setAuthToken] = React.useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [userData, setUserData] = React.useState(null);
  const [view, setView] = React.useState(() => viewFromPath(window.location.pathname));
  const [sessionLevel, setSessionLevel] = React.useState(null);
  const [loading, setLoading] = React.useState(Boolean(authToken));
  const [error, setError] = React.useState('');
  const { resolvedTheme: theme, setTheme } = useTheme();
  // FRA-2: the Review queue nav link only appears once a review API key
  // has been stored in this browser (the view itself manages the key).
  const [hasReviewKey, setHasReviewKey] = React.useState(() => Boolean(localStorage.getItem(REVIEW_KEY_STORAGE)));
  const visibleNavItems = hasReviewKey
    ? [...navItems, { id: 'review', label: 'Review queue', icon: ShieldCheck }]
    : navItems;

  function navigate(nextView, replace = false) {
    setView(nextView);
    window.history[replace ? 'replaceState' : 'pushState']({}, '', viewPaths[nextView] || '/');
  }

  React.useEffect(() => {
    const onPopState = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function refreshUserData() {
    if (!authToken) return;
    apiGet('/api/me', authToken)
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
  }

  React.useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    setLoading(true);
    apiGet('/api/me', authToken)
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

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email')?.toString().trim();
    const firstName = formData.get('first_name')?.toString().trim();
    const lastName = formData.get('last_name')?.toString().trim();
    const password = formData.get('password')?.toString() || '';
    const endpoint = authView === 'signup' ? '/api/auth/signup' : '/api/auth/login';

    setError('');
    if (authView === 'signup' && (!firstName || !lastName)) {
      setError('Please enter your first and last name.');
      return;
    }

    setLoading(true);

    try {
      const payload = await apiPost(
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
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setSession(null);
    setAuthToken(null);
    setUserData(null);
    sessionStorage.removeItem(TOKEN_KEY);
    setAuthView('login');
    navigate('home', true);
  }

  function handleProfileSaved(user) {
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
    <Box className="app-shell">
      <Box as="aside" className="sidebar">
        <Brand onClick={() => navigate('home')} />

        <Box as="nav" aria-label="Main navigation">
          {visibleNavItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              active={view === item.id}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </NavButton>
          ))}
        </Box>

        <Box className="sidebar-panel">
          <Text>Signed in as</Text>
          <Text as="strong">{session.name}</Text>
          <Text as="span">Your learning space</Text>
        </Box>

        <Box className="sidebar-actions">
          <Box as="button" className="theme-toggle" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            <Text as="span">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</Text>
          </Box>
          <Button variant="nav" onClick={logout} icon={LogOut} iconSize={18}>
            <Text as="span">Log out</Text>
          </Button>
        </Box>
      </Box>

      <Box as="main" className={`main-content ${view === 'content' ? 'wide-content' : ''}`}>
        {view === 'home' && <Home userData={userData} onStart={() => navigate('session')} onPlacement={() => navigate('placement')} />}
        {view === 'learn' && <Learn token={authToken} onQuiz={(level) => { setSessionLevel(level); navigate('session'); }} />}
        {view === 'placement' && <Placement token={authToken} onPlaced={() => refreshUserData()} />}
        {view === 'session' && <Session key={sessionLevel || 'default'} token={authToken} initialLevel={sessionLevel} />}
        {view === 'content' && <Content token={authToken} />}
        {view === 'past' && <PastQuestions token={authToken} />}
        {view === 'progress' && <Progress token={authToken} />}
        {view === 'conversation' && <Conversation token={authToken} />}
        {view === 'review' && <ReviewQueue onKeyChange={setHasReviewKey} />}
        {view === 'profile' && <Profile token={authToken} user={session} onSaved={handleProfileSaved} />}
      </Box>
    </Box>
  );
}

function AuthScreen({ mode, onModeChange, onSubmit, loading, error }) {
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
              <>
                <Field label="First name" icon={UserRound}>
                  <TextInput name="first_name" type="text" placeholder="Marie" autoComplete="given-name" required />
                </Field>
                <Field label="Last name" icon={UserRound}>
                  <TextInput name="last_name" type="text" placeholder="Curie" autoComplete="family-name" required />
                </Field>
              </>
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
