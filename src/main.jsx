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
  UserRound
} from 'lucide-react';
import './styles.css';

const TOKEN_KEY = 'franco_auth_token';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'content', label: 'Content', icon: BookOpen },
  { id: 'past', label: 'Past questions', icon: BookOpen },
  { id: 'session', label: 'Session', icon: CirclePlay },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'conversation', label: 'Conversation', icon: Mic }
];

function App() {
  const [authView, setAuthView] = React.useState('login');
  const [session, setSession] = React.useState(null);
  const [authToken, setAuthToken] = React.useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [userData, setUserData] = React.useState(null);
  const [view, setView] = React.useState('home');
  const [selectedSection, setSelectedSection] = React.useState('A1');
  const [loading, setLoading] = React.useState(Boolean(authToken));
  const [error, setError] = React.useState('');

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
      setView('home');
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
    setView('home');
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
        <button className="brand" onClick={() => setView('home')} aria-label="Franco home">
          <span className="brand-mark">fr</span>
          <span>Franco</span>
        </button>

        <nav aria-label="Main navigation">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              active={view === item.id}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </NavButton>
          ))}
        </nav>

        <div className="sidebar-panel">
          <p>Signed in as</p>
          <strong>{session.name}</strong>
          <span>Waiting for database-backed learner data.</span>
        </div>

        <button className="nav-button logout-button" onClick={logout}>
          <LogOut size={18} aria-hidden="true" />
          <span>Log out</span>
        </button>
      </aside>

      <main className="main-content">
        {view === 'home' && <HomeScreen userData={userData} />}
        {view === 'content' && <ContentScreen selectedSection={selectedSection} onSelectSection={setSelectedSection} />}
        {view === 'past' && <PastQuestionsScreen />}
        {view === 'session' && <SessionScreen token={authToken} selectedSection={selectedSection} onSelectSection={setSelectedSection} />}
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
          Sign in first. The dashboard, review queue, mistakes, and progress will be fetched from the database once the backend is connected.
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
          Credentials are now sent to the local API and stored in the SQLite database.
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

function HomeScreen({ userData }) {
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
          <strong>Ready for data</strong>
        </div>
        <p className="eyebrow">Today's French</p>
        <h1>Your daily session will appear after your profile loads.</h1>
        <p className="lede">
          The app is connected to the database and now has real French examples imported from UD French GSD.
        </p>
        <div className="empty-grid">
          <EmptyMetric label="Reviews due" />
          <MetricValue label="Imported examples" value={contentCount || '--'} />
          <EmptyMetric label="Session length" />
        </div>
        <DataConnectionPanel />
        <button className="primary-button wide" disabled>
          Start daily session <ChevronRight size={18} />
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
              text="The database connection works, but this user has no skill estimates yet."
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
              text="The mistakes table is connected and waiting for exercise attempts."
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
  const { data: sectionsData, loading: sectionsLoading, error: sectionsError } = useApiResource('/api/content/sections');
  const { data: sectionData, loading: sectionLoading, error: sectionError } = useApiResource(`/api/content/sections/${selectedSection}`);
  const { data: examData, loading: examLoading, error: examError } = useApiResource(`/api/exam/questions?section=${selectedSection}`);
  const { data: topicData } = useApiResource('/api/content/topics?section=A1');
  const { data: tv5Data } = useApiResource(`/api/content/tv5-exercises?section=${selectedSection}`);

  return (
    <section className="page-stack">
      <p className="eyebrow">Imported content</p>
      <h1 className="page-title">French GSD sections</h1>
      <p className="lede">
        These A1-B2 sections are generated from UD annotation heuristics. They are useful for practice, but not official CEFR labels.
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
          <SourcePanel source={sectionsData.source} note={sectionsData.note} />
        </>
      )}

      {sectionLoading && <EmptyState icon={Database} title={`Loading ${selectedSection}`} text="Fetching example sentences and exercises." />}
      {sectionError && <EmptyState icon={Database} title="Section fetch failed" text={sectionError} />}
      {sectionData && <SectionExamples data={sectionData} />}
      {selectedSection === 'A1' && topicData && <TopicTracks data={topicData} />}
      {examLoading && <EmptyState icon={Database} title={`Loading ${selectedSection} exam samples`} text="Fetching imported official sample questions." />}
      {examError && <EmptyState icon={Database} title="Exam sample fetch failed" text={examError} />}
      {examData && <ExamQuestionList data={examData} />}
      {tv5Data && <Tv5ExerciseList data={tv5Data} />}
    </section>
  );
}

function Tv5ExerciseList({ data }) {
  return <section className="panel">
    <h2>{data.section} TV5MONDE exercises</h2>
    <p className="muted">{data.count} free activities imported from the TV5MONDE catalogue.</p>
    <div className="example-list">
      {data.exercises.map((exercise) => <article className="example-card" key={exercise.id}>
        <span>{exercise.cefr_section} · TV5MONDE</span><p>{exercise.title}</p>
        <a href={exercise.exercise_url} target="_blank" rel="noreferrer">Open activity ↗</a>
      </article>)}
    </div>
  </section>;
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
  return <section className="page-stack">
    <p className="eyebrow">Exam archive</p><h1 className="page-title">Past questions</h1>
    <p className="lede">All imported official sample questions are kept here separately from generated UD exercises.</p>
    {loading && <EmptyState icon={Database} title="Loading past questions" text="Fetching the complete exam archive." />}
    {error && <EmptyState icon={Database} title="Past questions fetch failed" text={error} />}
    {data && <ExamQuestionList data={{ ...data, section: 'All levels' }} />}
  </section>;
}

function SessionScreen({ token, selectedSection, onSelectSection }) {
  const { data, loading, error } = useApiResource(`/api/me/session-plan?section=${selectedSection}`, token);

  return (
    <section className="page-stack">
      <p className="eyebrow">Daily session</p>
      <h1 className="page-title">{selectedSection} session queue</h1>
      <p className="lede">
        The session plan is now generated from imported UD French GSD examples. Later we can mix this with due reviews and your mistake history.
      </p>
      <div className="section-tabs compact" role="group" aria-label="Choose session level">
        {['A1', 'A2', 'B1', 'B2'].map((section) => (
          <button key={section} className={selectedSection === section ? 'selected' : ''} onClick={() => onSelectSection(section)}>
            <strong>{section}</strong>
          </button>
        ))}
      </div>
      {loading && <EmptyState icon={Database} title="Loading session plan" text="Fetching /api/me/session-plan." />}
      {error && <EmptyState icon={Database} title="Session fetch failed" text={error} />}
      {data && (
        <>
          <DataContract
            title="Database response"
            items={[
              `Section: ${data.section}`,
              `Reviews due: ${data.reviewsDue}`,
              `Available examples: ${data.newConcepts}`,
              `Exercises returned: ${data.exercises.length}`,
              data.message
            ]}
          />
          <ExerciseList exercises={data.exercises} />
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
      {progress.length ? <ProgressRecords progress={progress} /> : <EmptyState icon={TrendingUp} title="No progress rows yet" text="The progress table is connected, but this user has not generated skill evidence." />}
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
          title="Database response"
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
        <p className="eyebrow">Database field</p>
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
        <strong>API status: connected</strong>
        <p>Authentication and user reads are backed by the local SQLite database.</p>
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
  return (
    <>
      <section className="panel">
        <h2>{data.section} examples</h2>
        <p className="muted">{data.examples.length} sentences loaded for this section.</p>
      </section>
      <div className="example-list">
        {data.examples.map((example) => (
          <article className="example-card" key={example.id}>
            <span>{example.cefr_section} - {example.token_count} tokens - score {example.difficulty_score}</span>
            <p>{example.text}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function ExerciseList({ exercises }) {
  if (!exercises.length) {
    return <EmptyState icon={BookOpen} title="No exercises yet" text="Run the UD importer to generate exercise items." />;
  }

  return (
    <div className="exercise-list">
      {exercises.map((exercise) => (
        <article className="exercise-preview" key={exercise.id}>
          <span>{exercise.cefr_section} - {exercise.exercise_type}</span>
          <h2>{exercise.prompt}</h2>
          {exercise.choices?.length ? (
            <div className="choice-pills">
              {exercise.choices.slice(0, 10).map((choice) => <span key={choice}>{choice}</span>)}
            </div>
          ) : null}
          <details>
            <summary>Answer</summary>
            <p>{exercise.answer}</p>
            <small>{exercise.explanation}</small>
          </details>
        </article>
      ))}
    </div>
  );
}

function ExamQuestionList({ data }) {
  return (
    <>
      <section className="panel">
        <h2>{data.section} imported exam samples</h2>
        <p className="muted">{data.questions.length} questions loaded. {data.note}</p>
      </section>
      <div className="exercise-list">
        {data.questions.map((question) => (
          <article className="exercise-preview" key={question.id}>
            <span>{question.exam_name} - {question.skill}</span>
            <h2>{question.prompt}</h2>
            {question.context ? <p>{question.context}</p> : null}
            {question.choices?.length ? (
              <div className="choice-pills">
                {question.choices.map((choice) => <span key={choice.key}>{choice.key}. {choice.text}</span>)}
              </div>
            ) : null}
            <small>{question.explanation}</small>
          </article>
        ))}
      </div>
    </>
  );
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
        <p className="lede">Checking the local API session.</p>
      </section>
    </main>
  );
}

function useApiResource(path, token) {
  const [state, setState] = React.useState({ data: null, loading: true, error: '' });

  React.useEffect(() => {
    if (!token) return;
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
  const response = await fetch(path, { headers });
  return parseApiResponse(response);
}

async function parseApiResponse(response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

createRoot(document.getElementById('root')).render(<App />);
