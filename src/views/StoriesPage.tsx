import React from 'react';
import {BookOpen} from 'lucide-react';
import {EmptyState,LoadingSpinner,Page} from '../components/ui';
// The companion implementation is optional during independent PR rollout.
// Vite resolves it at build time once FRA-147 lands; no missing runtime import.
const screens=import.meta.glob<{Stories:React.ComponentType<{token:string|null}>}>('./Stories.tsx');
const load=screens['./Stories.tsx'];
const StoryScreen=load?React.lazy(async()=>({default:(await load()).Stories})):null;
export function StoriesPage({token}:{token:string|null}) {
  if(!StoryScreen) return <Page><EmptyState icon={BookOpen} title="Your story adventure is coming" text="Read short French stories, answer six questions, and follow a path from A1 to C2."/></Page>;
  return <React.Suspense fallback={<LoadingSpinner label="Opening stories…"/>}><StoryScreen token={token}/></React.Suspense>;
}
