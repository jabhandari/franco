import React from 'react';
import { Database, MessagesSquare } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { EmptyState } from '../components/ui.jsx';

// Guided speaking practice. There is no scripted chatbot here: the server
// picks a roleplay scenario from your weakest concepts (or starter concepts
// for your level), and you practice it out loud, with a partner, or into a
// voice recorder — weaving each target concept into what you say.
export function Conversation({ token }) {
  const { data, loading, error } = useApiResource('/api/me/conversation-targets', token);

  return (
    <section className="page-stack">
      <p className="eyebrow">Conversation</p>
      <h1 className="page-title">Conversation practice</h1>
      <p className="lede">
        Take the scenario below and speak about it for two minutes — out loud, with a partner, or into a voice
        recorder. Try to naturally use each target concept as you go.
      </p>
      {loading && <EmptyState icon={Database} title="Loading targets" text="Fetching /api/me/conversation-targets." />}
      {error && <EmptyState icon={Database} title="Target fetch failed" text={error} />}
      {data && (
        <>
          <section className="panel">
            <div className="panel-title">
              <div>
                <p className="eyebrow">Your scenario</p>
                <h2>{data.scenario || 'Introduce yourself: name, where you live, what you do.'}</h2>
              </div>
              <MessagesSquare size={20} aria-hidden="true" />
            </div>
            {data.message && <p className="muted">{data.message}</p>}
          </section>
          {(data.targets || []).length > 0 && (
            <section className="panel">
              <p className="eyebrow">Target concepts</p>
              <h2>Weave these into your speaking</h2>
              <div className="topic-grid">
                {(data.targets || []).map((target) => (
                  <div className="topic-item" key={target.id}>
                    <strong>{target.title || target.section}</strong>
                    <span>{target.text}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="panel">
            <p className="eyebrow">How to practice</p>
            <h2>Make it count</h2>
            <div className="topic-grid">
              <div className="topic-item"><strong>1 · Set a timer</strong><span>Two minutes of continuous French. Don't stop to look things up.</span></div>
              <div className="topic-item"><strong>2 · Hit every target</strong><span>Check off each concept above as you use it in a sentence.</span></div>
              <div className="topic-item"><strong>3 · Record yourself</strong><span>Listen back and note where you hesitated — that's your next review.</span></div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
