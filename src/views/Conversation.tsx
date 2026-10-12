import React from 'react';
import { Database, Timer } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { safeText } from '../presenters/format.presenter.js';
import {
  Checklist,
  Chip,
  EmptyState,
  LoadingSpinner,
  Page,
  PageHeader,
  Panel,
  PanelHeader,
  Steps,
  Text,
} from '../components/ui';

// FRA-67: local type for the GET /api/me/conversation-targets payload.
// Targets are built from concept rows as { id, section, title, text } in
// server/index.js; canonical ownership belongs to a later ticket (see
// "Notes for FRA-68").
type ConversationTarget = {
  id: string;
  section: string;
  title: string;
  text: string;
};

type ConversationApiResponse = {
  scenario?: string;
  message?: string;
  targets?: ConversationTarget[];
};

type ConversationProps = {
  token?: string | null;
};

// Guided speaking practice. There is no scripted chatbot here: the server
// picks a roleplay scenario from your weakest concepts (or starter concepts
// for your level), and you practice it out loud, with a partner, or into a
// voice recorder — weaving each target concept into what you say.
const STEPS = [
  { title: 'Lancez le minuteur', text: 'Deux minutes de français continu, sans pause. Two minutes, no stopping.' },
  { title: 'Placez chaque objectif', text: 'Cochez chaque objectif dès que vous l’avez utilisé. Tick each one off as you use it.' },
  { title: 'Enregistrez-vous', text: 'Réécoutez-vous et notez vos hésitations : c’est votre prochaine révision. Listen back — your hesitations are your next review.' },
];

export function Conversation({ token }: ConversationProps) {
  const { data, loading, error } = useApiResource<ConversationApiResponse>('/api/me/conversation-targets', token);
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => setChecked({}), [data?.scenario]);
  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const targets: ConversationTarget[] = (data?.targets || []).filter(
    (target: ConversationTarget) => target && (safeText(target.title) || safeText(target.section)),
  );
  const done = targets.filter((target) => checked[target.id]).length;

  return (
    <Page>
      <PageHeader
        eyebrow="Conversation"
        title="À vous de parler"
        lede={
          <>
            Deux minutes de français continu, construites autour de vos objectifs du moment.
            <Text as="span" className="lede-sub"> A two-minute speaking drill built around your current targets — out loud, with a partner, or into a voice recorder.</Text>
          </>
        }
      />
      {loading && <LoadingSpinner label="Préparation de votre scénario — loading your speaking scenario…" />}
      {error && <EmptyState icon={Database} title="Pratique indisponible" text={error} />}
      {data && (
        <>
          <Panel>
            <PanelHeader
              eyebrow="Votre scénario"
              title={safeText(data.scenario) || 'Introduce yourself: name, where you live, what you do.'}
              aside={<Chip icon={Timer} iconSize={14}>2 min</Chip>}
            />
            {safeText(data.message) && <Text variant="muted">{safeText(data.message)}</Text>}
          </Panel>
          {targets.length > 0 && (
            <Panel>
              <PanelHeader
                eyebrow="Objectifs"
                title="Glissez-les dans votre discours"
                aside={<Text as="span" variant="muted" size="sm" nowrap>{done} sur {targets.length}</Text>}
              />
              <Checklist
                items={targets.map((target) => ({
                  id: target.id,
                  title: safeText(target.title) || safeText(target.section),
                  sub: safeText(target.text) || undefined,
                }))}
                checked={checked}
                onToggle={toggle}
              />
            </Panel>
          )}
          <Panel>
            <Text variant="eyebrow">Méthode</Text>
            <Steps steps={STEPS} />
          </Panel>
        </>
      )}
    </Page>
  );
}
