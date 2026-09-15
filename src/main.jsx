import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  ChevronRight,
  CirclePlay,
  Database,
  Home,
  Lock,
  LogOut,
  Mail,
  Mic,
  Plus,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Sun,
  Moon
} from 'lucide-react';
import './styles.css';
import { concepts, conceptSections } from './content/concepts.js';

const TOKEN_KEY = 'franco_auth_token';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'session', label: 'Session', icon: CirclePlay },
  { id: 'content', label: 'Content', icon: BookOpen },
  { id: 'past', label: 'Past questions', icon: BookOpen },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'conversation', label: 'Conversation', icon: Mic }
];

const viewPaths = { home: '/', session: '/session', content: '/content', past: '/past-questions', progress: '/progress', conversation: '/conversation' };
function viewFromPath(pathname) {
  const entry = Object.entries(viewPaths).find(([, path]) => path === pathname || (path !== '/' && pathname.startsWith(`${path}/`)));
  return entry?.[0] || 'home';
}
function sectionFromPath(pathname) {
  const match = pathname.match(/\/(?:session|content)\/(A1|A2|B1|B2)(?:\/|$)/i);
  return match ? match[1].toUpperCase() : 'A1';
}

function App() {
  const [authView, setAuthView] = React.useState('login');
  const [session, setSession] = React.useState(null);
  const [authToken, setAuthToken] = React.useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [userData, setUserData] = React.useState(null);
  const [view, setView] = React.useState(() => viewFromPath(window.location.pathname));
  const [selectedSection, setSelectedSection] = React.useState(() => sectionFromPath(window.location.pathname));
  const [loading, setLoading] = React.useState(Boolean(authToken));
  const [error, setError] = React.useState('');
  const [theme, setTheme] = React.useState(() => localStorage.getItem('franco_theme') || 'dark');

  function navigate(nextView, replace = false) {
    setView(nextView);
    const path = nextView === 'session' || nextView === 'content' ? `${viewPaths[nextView]}/${selectedSection}` : (viewPaths[nextView] || '/');
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
  }

  function selectSection(nextSection) {
    setSelectedSection(nextSection);
    if (view === 'session' || view === 'content') window.history.replaceState({}, '', `${viewPaths[view]}/${nextSection}`);
  }

  React.useEffect(() => {
    const onPopState = () => { setView(viewFromPath(window.location.pathname)); setSelectedSection(sectionFromPath(window.location.pathname)); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('franco_theme', theme);
  }, [theme]);

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
    const name = formData.get('name')?.toString().trim();
    const password = formData.get('password')?.toString() || '';
    const endpoint = authView === 'signup' ? '/api/auth/signup' : '/api/auth/login';

    setLoading(true);
    setError('');

    try {
      const payload = await apiPost(endpoint, { email, name, password });
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
    setUserData(null);
    setAuthToken(null);
    sessionStorage.removeItem(TOKEN_KEY);
    setAuthView('login');
    navigate('home', true);
  }

  if (loading && authToken && !session) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <AuthScreen mode={authView} onModeChange={setAuthView} onSubmit={handleAuthSubmit} loading={loading} error={error} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('home')} aria-label="Franco home">
          <span className="brand-mark">fr</span>
          <span>Franco</span>
        </button>

        <nav aria-label="Main navigation">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              active={view === item.id}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </NavButton>
          ))}
        </nav>

        <div className="sidebar-panel">
          <p>Signed in as</p>
          <strong>{session.name}</strong>
          <span>Your learning space</span>
        </div>

        <button className="nav-button logout-button" onClick={logout}>
          <LogOut size={18} aria-hidden="true" />
          <span>Log out</span>
        </button>
        <button className="theme-toggle" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </aside>

      <main className={`main-content ${view === 'content' ? 'wide-content' : ''}`}>
        {view === 'home' && <HomeScreen userData={userData} onStart={() => navigate('session')} />}
        {view === 'content' && <ContentScreen selectedSection={selectedSection} onSelectSection={selectSection} />}
        {view === 'past' && <PastQuestionsScreen />}
        {view === 'session' && <SessionScreen token={authToken} selectedSection={selectedSection} onSelectSection={selectSection} />}
        {view === 'progress' && <ProgressScreen userData={userData} />}
        {view === 'conversation' && <ConversationScreen token={authToken} />}
      </main>
    </div>
  );
}

function AuthScreen({ mode, onModeChange, onSubmit, loading, error }) {
  const isSignup = mode === 'signup';

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="brand large">
          <span className="brand-mark">fr</span>
          <span>Franco</span>
        </div>
        <p className="eyebrow">French learning platform</p>
        <h1>Practice should come from your real learner profile.</h1>
        <p className="lede">
          Sign in first to keep your lessons, progress, and review history connected to your account.
        </p>
        <div className="auth-principles">
          <span><Database size={17} /> Database-first learner data</span>
          <span><ShieldCheck size={17} /> User-specific progress</span>
          <span><BookOpen size={17} /> UD French GSD content sections</span>
        </div>
      </section>

      <section className="auth-card">
        <p className="eyebrow">{isSignup ? 'Create account' : 'Welcome back'}</p>
        <h2>{isSignup ? 'Sign up' : 'Log in'}</h2>
        <form onSubmit={onSubmit}>
          {isSignup && (
            <label>
              Name
              <span className="input-wrap">
                <UserRound size={18} />
                <input name="name" type="text" placeholder="Your name" autoComplete="name" />
              </span>
            </label>
          )}
          <label>
            Email
            <span className="input-wrap">
              <Mail size={18} />
              <input name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </span>
          </label>
          <label>
            Password
            <span className="input-wrap">
              <Lock size={18} />
              <input
                name="password"
                type="password"
                placeholder="Password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
              />
            </span>
          </label>
          {error && <p className="error-message">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Connecting...' : isSignup ? 'Create account' : 'Log in'} <ChevronRight size={18} />
          </button>
        </form>
        <button className="text-button" onClick={() => onModeChange(isSignup ? 'login' : 'signup')}>
          {isSignup ? 'Already have an account? Log in' : 'Need an account? Sign up'}
        </button>
        <p className="form-note">
          Your account is securely stored and synced with your profile.
        </p>
      </section>
    </main>
  );
}

function NavButton({ icon: Icon, active, onClick, children }) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={18} aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

function HomeScreen({ userData, onStart }) {
  const profile = userData?.profile;
  const progressCount = userData?.progress?.length || 0;
  const mistakeCount = userData?.mistakes?.length || 0;
  const { data: contentData } = useApiResource('/api/content/sections');
  const contentCount = contentData?.sections?.reduce((sum, section) => sum + section.example_count, 0) || 0;

  return (
    <section className="home-grid">
      <div className="daily-panel">
        <div className="daily-art" aria-hidden="true">
          <span>franco</span>
          <strong>Bonjour, {userData?.user?.name?.split(' ')[0] || 'learner'}</strong>
        </div>
        <p className="eyebrow">Today's French</p>
        <h1>Your daily French session starts here.</h1>
        <p className="lede">
          Practice with French examples and exercises matched to your level.
        </p>
        <button className="primary-button wide" onClick={onStart}>
          Start a 10-minute session <ChevronRight size={18} />
        </button>
      </div>

      <div className="stack">
        <section className="panel compact">
          <PanelHeading title="Level strength" />
          {progressCount ? (
            <RecordCount count={progressCount} label="progress rows loaded" />
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No progress records"
              text="Complete a few exercises to start building your skill profile."
            />
          )}
        </section>
        <section className="panel compact">
          <PanelHeading title="Mistake recycling" />
          {mistakeCount ? (
            <RecordCount count={mistakeCount} label="mistakes loaded" />
          ) : (
            <EmptyState
              icon={Plus}
              title="No mistakes records"
              text="Mistakes you make while practicing will appear here for review."
            />
          )}
        </section>
        <section className="panel compact">
          <PanelHeading title="Learner profile" />
          <ProfileRows profile={profile} />
        </section>
      </div>
    </section>
  );
}

function ContentScreen({ selectedSection, onSelectSection }) {
  const [activeConceptId, setActiveConceptId] = React.useState(null);
  const [layoutMode, setLayoutMode] = React.useState('roadmap');
  React.useEffect(() => setActiveConceptId(null), [selectedSection]);
  
  return <section className="map-only-page"><div className="map-toolbar"><span>{layoutMode === 'roadmap' ? 'Roadmap view' : 'Table view'}</span><button onClick={() => setLayoutMode((mode) => mode === 'roadmap' ? 'table' : 'roadmap')}>{layoutMode === 'roadmap' ? 'Show table' : 'Show roadmap'}</button></div>{layoutMode === 'roadmap' ? <ConceptMap section={selectedSection} activeConceptId={activeConceptId} onSelectConcept={setActiveConceptId} onSelectSection={onSelectSection} /> : <RoadmapTable section={selectedSection} onSelectSection={onSelectSection} />}</section>;

  /* legacy table layout retained below for reference */
  return (
    <section className="page-stack">
      <p className="eyebrow">Learn & read</p>
      <h1 className="page-title">{layoutMode === 'roadmap' ? 'Your French learning roadmap.' : 'Build your French, one level at a time.'}</h1>
      <p className="lede">
        Read examples, learn the patterns behind them, then practise what you have learned.
      </p>

      {sectionsLoading && <EmptyState icon={Database} title="Loading content sections" text="Fetching imported UD French GSD counts." />}
      {sectionsError && <EmptyState icon={Database} title="Content fetch failed" text={sectionsError} />}
      {sectionsData && (
        <>
          <div className="section-tabs" role="group" aria-label="Choose a practice section">
            {['A1', 'A2', 'B1', 'B2'].map((section) => {
              const record = sectionsData.sections.find((item) => item.section === section);
              return (
                <button
                  key={section}
                  className={selectedSection === section ? 'selected' : ''}
                  onClick={() => onSelectSection(section)}
                >
                  <strong>{section}</strong>
                  <span>{record?.example_count || 0} examples · {record?.exercise_count || 0} exercises</span>
                </button>
              );
            })}
          </div>
          <div className="content-view-toggle"><span>{layoutMode === 'roadmap' ? 'Roadmap view' : 'Table view'}</span><button onClick={() => setLayoutMode((mode) => mode === 'roadmap' ? 'table' : 'roadmap')}>{layoutMode === 'roadmap' ? 'Show table' : 'Show roadmap'}</button></div>
          {layoutMode === 'roadmap' ? <ConceptMap section={selectedSection} activeConceptId={activeConceptId} onSelectConcept={setActiveConceptId} /> : <><LevelGuide section={selectedSection} /><CurriculumLibrary section={selectedSection} activeConceptId={activeConceptId} onSelectConcept={setActiveConceptId} /></>}
        </>
      )}
    </section>
  );
}

const levelGuides = {
  A1: { label: 'Breakthrough', goal: 'Handle familiar words and simple everyday phrases.', focus: 'Greetings, identity, numbers, time, articles, and present-tense verbs.', read: 'Short notices, messages, menus, and simple personal descriptions.' },
  A2: { label: 'Waystage', goal: 'Understand the main point in predictable everyday situations.', focus: 'Routine tasks, past events, descriptions, directions, and common connectors.', read: 'Short emails, schedules, advertisements, and straightforward stories.' },
  B1: { label: 'Threshold', goal: 'Follow the essential meaning of clear speech and texts on familiar topics.', focus: 'Opinions, experiences, explanations, narrative tenses, and paragraph structure.', read: 'Articles, interviews, personal accounts, and practical workplace texts.' },
  B2: { label: 'Vantage', goal: 'Understand detailed arguments and communicate with growing precision.', focus: 'Nuance, register, cohesion, complex grammar, and topic-specific vocabulary.', read: 'Longer articles, reports, editorials, and interviews with implicit meaning.' }
};

function LevelGuide({ section }) {
  const guide = levelGuides[section];
  return <section className="level-guide panel">
    <div><span className="eyebrow">{section} · {guide.label}</span><h2>{guide.goal}</h2></div>
    <div className="guide-columns"><div><strong>Focus</strong><p>{guide.focus}</p></div><div><strong>Reading practice</strong><p>{guide.read}</p></div></div>
    <small>Level descriptors adapted from the <a href="https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors" target="_blank" rel="noreferrer">Council of Europe CEFR descriptors</a>.</small>
  </section>;
}

function RoadmapTable({ section, onSelectSection }) {
  const nodes = concepts.filter((concept) => concept.level === section);
  return <section className="roadmap-table-page"><div className="roadmap-levels">{['A1','A2','B1','B2'].map((level) => <button key={level} className={section === level ? 'selected' : ''} onClick={() => onSelectSection(level)}>{level}</button>)}</div><div className="roadmap-table"><div className="roadmap-table-head"><span>Concept</span><span>Area</span><span>What you will learn</span></div>{nodes.map((node, index) => <div className="roadmap-table-row" key={node.id}><span><b>{String(index + 1).padStart(2, '0')}</b>{node.title}</span><small>{node.category}</small><p>{node.shortDescription}</p></div>)}</div></section>;
}

function RoadmapConnectors({ section }) {
  const [shape, setShape] = React.useState({ width: 0, height: 0, paths: [] });
  React.useLayoutEffect(() => {
    const update = () => {
      const canvas = document.querySelector(`.roadmap-${section.toLowerCase()}`);
      if (!canvas) return;
      const cards = [...canvas.querySelectorAll('.roadmap-node')];
      const base = canvas.getBoundingClientRect();
      const points = cards.map((card) => { const r = card.getBoundingClientRect(); return { x: r.left - base.left + r.width / 2, top: r.top - base.top, bottom: r.bottom - base.top }; });
      const edges = section === 'A1' ? [[0,1],[1,2],[1,6],[2,3],[2,4],[3,5],[4,5],[6,7],[7,8],[7,9],[7,10],[5,11],[8,11],[9,11],[10,11],[11,12],[12,13],[12,14]] : [[0,1],[1,2],[1,5],[2,3],[2,4],[3,6],[4,6],[5,6]];
      const paths = edges.filter(([a,b]) => points[a] && points[b]).map(([a,b]) => { const from = points[a]; const to = points[b]; const mid = from.bottom + (to.top - from.bottom) * .5; return `M ${from.x} ${from.bottom} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${to.top}`; });
      setShape({ width: base.width, height: base.height, paths });
    };
    update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update);
  }, [section]);
  if (!shape.width) return null;
  return <svg className="roadmap-connectors" viewBox={`0 0 ${shape.width} ${shape.height}`} preserveAspectRatio="none" aria-hidden="true"><path d={shape.paths.join(' ')} /></svg>;
}

function ConceptMap({ section, activeConceptId, onSelectConcept, onSelectSection }) {
  const guide = levelGuides[section];
  const nodes = concepts.filter((concept) => concept.level === section);
  const active = nodes.find((node) => node.id === activeConceptId);
  return <section className={`concept-map panel ${active ? 'has-modal' : ''}`}><div className="roadmap-heading"><div className="roadmap-levels">{['A1','A2','B1','B2'].map((level) => <button key={level} className={section === level ? 'selected' : ''} onClick={() => onSelectSection(level)}>{level}</button>)}</div><span className="roadmap-badge">{nodes.length} concepts</span></div><div className={`roadmap-canvas roadmap-${section.toLowerCase()}`}><div className="roadmap-spine" /><RoadmapConnectors section={section} />{nodes.map((node, index) => <button className={`roadmap-node roadmap-node-${index + 1} ${activeConceptId === node.id ? 'active' : ''}`} key={node.id} onClick={() => onSelectConcept(activeConceptId === node.id ? null : node.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{node.title}</strong><small>{node.category}</small><i /></button>)}</div>{active && <div className="concept-modal" role="dialog" aria-modal="true"><button className="concept-modal-close" onClick={() => onSelectConcept(null)} aria-label="Close lesson">×</button><div className="concept-modal-scroll"><ConceptDetail concept={active} /></div></div>}</section>;
}

function Tv5ExerciseList({ data }) {
  const [showAll, setShowAll] = React.useState(false); const visible = showAll ? data.exercises : data.exercises.slice(0, 12);
  return <details className="content-module"><summary><span>Video activities</span><small>{data.count} activities</small></summary><section className="panel">
    <h2>{data.section} TV5MONDE practice</h2><p className="muted">Build listening skills with guided video activities.</p>
    <div className="example-list">
      {visible.map((exercise) => <article className="example-card" key={exercise.id}>
        <span>{exercise.cefr_section} · TV5MONDE</span><p>{exercise.title}</p>
        <a href={exercise.exercise_url} target="_blank" rel="noreferrer">Open activity ↗</a>
      </article>)}
    </div>
    {data.count > 12 && <button className="text-button module-action" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show fewer activities' : `Show all ${data.count} activities`}</button>}
  </section></details>;
}

function CurriculumLibrary({ section, activeConceptId, onSelectConcept }) {
  const [title, ids] = conceptSections[section];
  const items = ids.map((id) => concepts.find((concept) => concept.id === id)).filter(Boolean);
  return <section className="curriculum panel"><div className="curriculum-heading"><div><span className="eyebrow">Curriculum</span><h2>{section} · {title}</h2></div><span className="curriculum-count">{items.length} concepts</span></div><div className="concept-list">{items.map((concept, index) => <React.Fragment key={concept.id}><button id={`concept-${concept.id}`} className={`concept-row ${activeConceptId === concept.id ? 'selected' : ''}`} onClick={() => onSelectConcept(activeConceptId === concept.id ? null : concept.id)}><span className="concept-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{concept.title}</strong><small>{concept.shortDescription}</small></span><span className="concept-arrow">{activeConceptId === concept.id ? '⌃' : '›'}</span></button>{activeConceptId === concept.id && <ConceptDetail concept={concept} />}</React.Fragment>)}</div></section>;
}

function ConceptDetail({ concept }) {
  return <article className="concept-detail"><div><span className="eyebrow">{concept.category} · {concept.level}</span><h2>{concept.title}</h2><p className="concept-subtitle">{concept.shortDescription}</p></div><div className="theory-blocks">{concept.theory.map((block, index) => block[0] === 'table' ? <div className="theory-table" key={index}>{block.slice(1).map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}</div> : <div className={`theory-card ${block[0]}`} key={index}><strong>{block[0] === 'idea' ? 'The idea' : block[0] === 'rule' ? block[1] : block[0] === 'tip' ? 'Tip' : 'Example'}</strong><p>{block[0] === 'rule' ? block[2] : block[0] === 'example' ? block[2] : block[1]}</p>{block[0] === 'rule' && <code>{block[2]}</code>}</div>)}</div>{concept.vocabulary.length > 0 && <div className="related-vocab"><strong>Vocabulary</strong><div>{concept.vocabulary.map((word) => <span key={word}>{word}</span>)}</div></div>}<div className="concept-footer"><small>Further reading: {concept.sources.map(([label,url]) => <a href={url} target="_blank" rel="noreferrer" key={url}>{label}</a>)}</small></div></article>;
}

function TopicTracks({ data }) {
  return <section className="panel topic-panel">
    <h2>A1 learning tracks</h2>
    <p className="muted">Vocabulary, spelling, and practical topics from the A1 study plan.</p>
    <div className="topic-grid">
      {data.categories.map((category) => <div className="topic-group" key={category}>
        <h3>{category}</h3>
        {data.topics.filter((topic) => topic.category === category).map((topic) => <div className="topic-item" key={topic.id}><strong>{topic.title}</strong><span>{topic.item}</span></div>)}
      </div>)}
    </div>
  </section>;
}

function PastQuestionsScreen() {
  const { data, loading, error } = useApiResource('/api/exam/past-questions');
  const readingData = data ? { ...data, questions: (Array.isArray(data.questions) ? data.questions : []).filter((question) => String(question.skill || '').toLowerCase() === 'reading'), section: 'Reading ·' } : null;
  return <section className="page-stack">
    <p className="eyebrow">Exam archive</p><h1 className="page-title">Past questions</h1>
    {loading && <EmptyState icon={Database} title="Loading past questions" text="Fetching the complete exam archive." />}
    {error && <EmptyState icon={Database} title="Past questions fetch failed" text={error} />}
    {readingData && <ExamQuestionList data={readingData} />}
  </section>;
}

function SessionScreen({ token, selectedSection, onSelectSection }) {
  const { data, loading, error } = useApiResource(`/api/me/session-plan?section=${selectedSection}`, token);
  const sessionExercises = React.useMemo(() => {
    if (!data?.exercises) return [];
    return [...data.exercises].sort(() => Math.random() - 0.5).slice(0, 10);
  }, [data]);

  return (
    <section className="page-stack">
      <p className="eyebrow">Daily session</p>
      <h1 className="page-title">{selectedSection} session queue</h1>
      <p className="lede">
        Build confidence with a focused set of French questions at your level.
      </p>
      <div className="section-tabs compact" role="group" aria-label="Choose session level">
        {['A1', 'A2', 'B1', 'B2'].map((section) => (
          <button key={section} className={selectedSection === section ? 'selected' : ''} onClick={() => onSelectSection(section)}>
            <strong>{section}</strong>
          </button>
        ))}
      </div>
      {loading && <EmptyState icon={Database} title="Preparing your session" text="Loading questions for this level." />}
      {error && <EmptyState icon={Database} title="Session fetch failed" text={error} />}
      {data && (
        <>
          <ExerciseList exercises={sessionExercises} />
        </>
      )}
    </section>
  );
}

function ProgressScreen({ userData }) {
  const progress = userData?.progress || [];

  return (
    <section className="page-stack">
      <p className="eyebrow">Progress</p>
      <h1 className="page-title">Progress belongs to the signed-in user</h1>
      <p className="lede">
        This page is intentionally empty until a real user profile, attempts ledger, and skill model are available.
      </p>
      {progress.length ? <ProgressRecords progress={progress} /> : <EmptyState icon={TrendingUp} title="No progress yet" text="Complete a few exercises to see your progress here." />}
    </section>
  );
}

function ConversationScreen({ token }) {
  const { data, loading, error } = useApiResource('/api/me/conversation-targets', token);

  return (
    <section className="page-stack">
      <p className="eyebrow">Conversation</p>
      <h1 className="page-title">Conversation will use live targets</h1>
      <p className="lede">
        Roleplay prompts should be generated from the learner's weak concepts and known vocabulary. No scripted conversation is shown now.
      </p>
      {loading && <EmptyState icon={Database} title="Loading targets" text="Fetching /api/me/conversation-targets." />}
      {error && <EmptyState icon={Database} title="Target fetch failed" text={error} />}
      {data && (
        <DataContract
          title="Learning details"
          items={[
            `Scenario: ${data.scenario || 'not selected'}`,
            `Targets returned: ${data.targets.length}`,
            data.message
          ]}
        />
      )}
      {data?.targets?.length ? (
        <div className="example-list">
          {data.targets.map((target) => (
            <article className="example-card" key={target.id}>
              <span>{target.section}</span>
              <p>{target.text}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EmptyMetric({ label }) {
  return (
    <div className="metric empty-metric">
      <span>{label}</span>
      <strong>--</strong>
    </div>
  );
}

function MetricValue({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PanelHeading({ title }) {
  return (
    <div className="panel-title">
      <div>
        <p className="eyebrow">Your learning</p>
        <h2>{title}</h2>
      </div>
      <Database size={20} aria-hidden="true" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="empty-state">
      <Icon size={24} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function DataConnectionPanel() {
  return (
    <div className="data-panel">
      <Database size={20} aria-hidden="true" />
      <div>
        <strong>Your account is connected</strong>
        <p>Your profile and learning activity are synced securely.</p>
      </div>
    </div>
  );
}

function DataContract({ title, items }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <ul className="clean-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function SourcePanel({ source, note }) {
  return (
    <section className="data-panel">
      <Database size={20} aria-hidden="true" />
      <div>
        <strong>{source?.name || 'No source imported'}</strong>
        <p>{source ? `${source.license} - ${source.attribution}` : 'Run the importer to load content.'}</p>
        <p>{note}</p>
      </div>
    </section>
  );
}

function SectionExamples({ data }) {
  const [showAll, setShowAll] = React.useState(false);
  const visible = showAll ? data.examples : data.examples.slice(0, 12);
  return (
    <details className="content-module" open>
      <summary><span>Reading library</span><small>{data.examples.length} examples</small></summary>
      <section className="panel">
        <h2>{data.section} reading examples</h2>
        <p className="muted">Read each sentence aloud, notice the structure, then try a related exercise in Session.</p>
      </section>
      <div className="example-list">
        {visible.map((example) => (
          <article className="example-card" key={example.id}>
            <span>{example.cefr_section} reading</span>
            <p>{example.text}</p>
          </article>
        ))}
      </div>
      {data.examples.length > 12 && <button className="text-button module-action" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show fewer examples' : `Show all ${data.examples.length} examples`}</button>}
    </details>
  );
}

function ExerciseList({ exercises }) {
  const [resetKey, setResetKey] = React.useState(0);
  if (!exercises.length) {
    return <EmptyState icon={BookOpen} title="No exercises yet" text="Run the UD importer to generate exercise items." />;
  }

  return <>
    <div className="session-toolbar"><span>{exercises.length} questions</span><button className="reset-button" onClick={() => setResetKey((value) => value + 1)}>Reset all</button></div>
    <div className="exercise-list">{exercises.map((exercise, index) => <MultipleChoiceExercise key={exercise.id} exercise={exercise} allExercises={exercises} index={index} resetKey={resetKey} />)}</div>
  </>;
}

function MultipleChoiceExercise({ exercise, allExercises, index, resetKey }) {
  const [selected, setSelected] = React.useState(null);
  React.useEffect(() => setSelected(null), [resetKey]);
  const options = React.useMemo(() => {
    const supplied = exercise.exercise_type === 'grammar_focus' && exercise.choices?.length ? exercise.choices : [];
    const distractors = allExercises.filter((item) => item.id !== exercise.id && item.answer && item.exercise_type === exercise.exercise_type).map((item) => item.answer);
    const values = Array.from(new Set([...(supplied.length ? supplied : [exercise.answer]), ...distractors])).filter(Boolean).slice(0, 4);
    return values.sort(() => 0.5 - ((index * 17 + values.indexOf(values[0])) % 3) / 3);
  }, [exercise, allExercises, index]);
  const isCorrect = selected !== null && selected.trim().toLowerCase() === exercise.answer.trim().toLowerCase();
  return <article className={`exercise-preview mcq-card ${selected ? (isCorrect ? 'answered-correct' : 'answered-wrong') : ''}`}>
    <span>{exercise.cefr_section} · {exercise.exercise_type.replace('_', ' ')}</span>
    <h2>{exercise.prompt}</h2>
    <div className="mcq-options">
      {options.map((option, optionIndex) => <button key={`${exercise.id}-${optionIndex}`} className={selected === option ? (option.trim().toLowerCase() === exercise.answer.trim().toLowerCase() ? 'correct' : 'incorrect') : ''} onClick={() => setSelected(option)} disabled={Boolean(selected)}>{option}</button>)}
    </div>
    {selected && <div className={`mcq-feedback ${isCorrect ? 'correct' : 'incorrect'}`}><strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong><span>{isCorrect ? exercise.explanation : `Correct answer: ${exercise.answer}`}</span>{!isCorrect && <button className="retry-button" onClick={() => setSelected(null)}>Try again</button>}</div>}
  </article>;
}

function ExamQuestionList({ data }) {
  const [showAll, setShowAll] = React.useState(false);
  const [answers, setAnswers] = React.useState({});
  const visible = showAll ? data.questions : data.questions.slice(0, 12);
  const reset = () => setAnswers({});
  return <details className="content-module"><summary><span>Exam practice</span><small>{data.questions.length} questions</small></summary>
    <section className="panel"><div className="session-toolbar"><h2>{data.section} imported exam samples</h2><button className="reset-button" onClick={reset}>Reset all</button></div><p className="muted">{data.questions.length} questions loaded. {data.note}</p></section>
    <div className="exercise-list">{visible.map((question) => <ExamQuestionCard key={question.id} question={question} selected={answers[question.id] || null} onSelect={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} onRetry={() => setAnswers(({ [question.id]: _removed, ...rest }) => rest)} />)}</div>
    {data.questions.length > 12 && <button className="text-button module-action" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show fewer questions' : `Show all ${data.questions.length} questions`}</button>}
  </details>;
}

function ExamQuestionCard({ question, selected, onSelect, onRetry }) {
  const choices = React.useMemo(() => {
    const rawChoices = question.choices ?? question.choices_json;
    if (Array.isArray(rawChoices)) return rawChoices;
    if (typeof rawChoices === 'string') {
      try { const parsed = JSON.parse(rawChoices); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  }, [question.choices, question.choices_json]);
  const correct = question.answer ? String(question.answer).trim().toLowerCase() : null;
  const selectedChoice = choices.find((choice) => choice.key === selected || choice.text === selected);
  const isCorrect = Boolean(selected && correct && (String(selected).trim().toLowerCase() === correct || selectedChoice?.key?.toLowerCase() === correct));
  const prompt = String(question.prompt || '').replace(/^Sur le livret,\s*vous lisez\s*:\s*/i, '');
  let passage = String(question.context || '').replace(/^.*?Sur le livret,\s*vous lisez\s*:\s*/i, '').replace(/^Sur le livret,\s*vous lisez\s*:\s*/i, '').replace(/\s*Cochez (?:une case|la bonne réponse)[\s\S]*$/i, '').trim();
  if (passage.toLowerCase().startsWith(prompt.toLowerCase())) passage = passage.slice(prompt.length).trim();
  passage = passage.replace(/^A\.\s+[\s\S]*$/i, '').trim();
  return <article className={`exercise-preview mcq-card ${selected && correct ? (isCorrect ? 'answered-correct' : 'answered-wrong') : ''}`}>
    <span>{question.exam_name} - {question.skill}</span>{passage && passage.toLowerCase() !== prompt.toLowerCase() && <div className="reading-passage"><strong>Read the passage</strong><p>{passage}</p></div>}<h2>{prompt}</h2>
    {choices.length > 0 && <div className="mcq-options">{choices.map((choice) => <button key={choice.key} className={selected === choice.key && correct ? (choice.key.toLowerCase() === correct ? 'correct' : 'incorrect') : ''} onClick={() => onSelect(choice.key)} disabled={Boolean(selected)}>{choice.key}. {choice.text}</button>)}</div>}
    {selected && correct && <div className={`mcq-feedback ${isCorrect ? 'correct' : 'incorrect'}`}><strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong><span>{isCorrect ? (question.explanation || 'Well done.') : `Correct answer: ${question.answer}`}</span>{!isCorrect && <button className="retry-button" onClick={onRetry}>Try again</button>}</div>}
    {!correct && <small>{question.explanation}</small>}
  </article>;
}

function SkeletonBar({ label }) {
  return (
    <div className="skill-row skeleton-row">
      <span>{label}</span>
      <div className="bar skeleton-bar" />
      <strong>--</strong>
    </div>
  );
}

function ProfileRows({ profile }) {
  const rows = [
    ['Placement', profile?.placement_status || 'not_started'],
    ['Current level', profile?.current_level || 'not set'],
    ['Learning goal', profile?.learning_goal || 'not set']
  ];

  return (
    <div className="record-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function RecordCount({ count, label }) {
  return (
    <div className="record-count">
      <strong>{count}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProgressRecords({ progress }) {
  return (
    <div className="progress-grid">
      {progress.map((row) => (
        <section className="panel compact" key={`${row.cefr_level}-${row.skill}`}>
          <h2>{row.cefr_level}</h2>
          <p className="muted">{row.skill}</p>
          <SkeletonBar label={row.skill} />
        </section>
      ))}
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="auth-shell single">
      <section className="auth-card">
        <p className="eyebrow">Franco</p>
        <h1>Loading your account</h1>
        <p className="lede">Preparing your learning space.</p>
      </section>
    </main>
  );
}

function useApiResource(path, token) {
  const [state, setState] = React.useState({ data: null, loading: true, error: '' });

  React.useEffect(() => {
    if (!token && path.startsWith('/api/me')) {
      setState({ data: null, loading: false, error: '' });
      return;
    }
    let cancelled = false;
    setState({ data: null, loading: true, error: '' });

    apiGet(path, token)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, loading: false, error: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [path, token]);

  return state;
}

async function apiPost(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return parseApiResponse(response);
}

async function apiGet(path, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const response = await fetch(path, { headers, cache: 'no-store' });
  return parseApiResponse(response);
}

async function parseApiResponse(response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

createRoot(document.getElementById('root')).render(<App />);
