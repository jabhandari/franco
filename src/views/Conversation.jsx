import React from 'react';
import { Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { DataContract, EmptyState } from '../components/ui.jsx';

export function Conversation({ token }) {
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
