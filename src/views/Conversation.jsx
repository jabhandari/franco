import React from 'react';
import { Database, Timer } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { safeText } from '../api/client.js';
import { EmptyState } from '../components/ui.jsx';

// Guided speaking practice. There is no scripted chatbot here: the server
// picks a roleplay scenario from your weakest concepts (or starter concepts
// for your level), and you practice it out loud, with a partner, or into a
// voice recorder — weaving each target concept into what you say.
const STEPS = [
  { title: 'Lancez le minuteur', text: 'Deux minutes de français continu, sans pause. Two minutes, no stopping.' },
  { title: 'Placez chaque objectif', text: 'Cochez chaque objectif dès que vous l’avez utilisé. Tick each one off as you use it.' },
  { title: 'Enregistrez-vous', text: 'Réécoutez-vous et notez vos hésitations : c’est votre prochaine révision. Listen back — your hesitations are your next review.' },
];

export function Conversation({ token }) {
  const { data, loading, error } = useApiResource('/api/me/conversation-targets', token);
  const [checked, setChecked] = React.useState({});
  React.useEffect(() => setChecked({}), [data?.scenario]);
  const toggle = (id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const targets = (data?.targets || []).filter(
    (target) => target && (safeText(target.title) || safeText(target.section)),
  );
  const done = targets.filter((target) => checked[target.id]).length;

  return (
    <section className="page-stack">
      <p className="eyebrow">Conversation</p>
      <h1 className="page-title">À vous de parler</h1>
      <p className="lede">
        Deux minutes de français continu, construites autour de vos objectifs du moment.
        <span className="lede-sub"> A two-minute speaking drill built around your current targets — out loud, with a partner, or into a voice recorder.</span>
      </p>
      {loading && <EmptyState icon={Database} title="Préparation de votre scénario…" text="Loading your speaking scenario…" />}
      {error && <EmptyState icon={Database} title="Pratique indisponible" text={error} />}
      {data && (
        <>
          <section className="panel scenario-hero">
            <div className="panel-title">
              <div>
                <p className="eyebrow">Votre scénario</p>
                <h2>{safeText(data.scenario) || 'Introduce yourself: name, where you live, what you do.'}</h2>
              </div>
              <span className="timer-chip"><Timer size={14} aria-hidden="true" /> 2 min</span>
            </div>
            {safeText(data.message) && <p className="muted">{safeText(data.message)}</p>}
          </section>
          {targets.length > 0 && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <p className="eyebrow">Objectifs</p>
                  <h2>Glissez-les dans votre discours</h2>
                </div>
                <span className="muted small nowrap">{done} sur {targets.length}</span>
              </div>
              <ul className="checklist">
                {targets.map((target) => (
                  <li key={target.id}>
                    <button
                      type="button"
                      className={checked[target.id] ? 'checked' : ''}
                      onClick={() => toggle(target.id)}
                      aria-pressed={!!checked[target.id]}
                    >
                      <span className="checkbox" aria-hidden="true" />
                      <span>
                        <strong>{safeText(target.title) || safeText(target.section)}</strong>
                        {safeText(target.text) && <small>{safeText(target.text)}</small>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="panel">
            <p className="eyebrow">Méthode</p>
            <div className="steps-row">
              {STEPS.map((step, index) => (
                <div className="step-card" key={step.title}>
                  <span className="step-number">{index + 1}</span>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
