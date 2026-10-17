import React from 'react';
import { recordingToPcm } from '../../pronunciation/audio';
import { comparePhones, findTargetWord } from '../../pronunciation/compare';
import type { SoundComparison } from '../../pronunciation/compare';

type WorkerReply =
  | { id: number; kind: 'progress'; progress: number; file: string }
  | { id: number; kind: 'result'; phones: string[]; loadMs: number; inferenceMs: number; sampleCount: number }
  | { id: number; kind: 'error'; message: string };

type Props = { recording: Blob; referenceUrl?: string; targetText: string; attemptId: string };

export function PronunciationComparison({ recording, referenceUrl, targetText, attemptId }: Props) {
  const [phase, setPhase] = React.useState<'ready' | 'preparing' | 'loading' | 'checking'>('ready');
  const [progress, setProgress] = React.useState(0);
  const [comparison, setComparison] = React.useState<SoundComparison | null>(null);
  const [heard, setHeard] = React.useState<string[]>([]);
  const [expected, setExpected] = React.useState<string[]>([]);
  const [error, setError] = React.useState('');
  const worker = React.useRef<Worker | null>(null);
  const run = React.useRef(0);

  React.useEffect(() => {
    run.current += 1;
    worker.current?.terminate(); worker.current = null;
    setComparison(null); setError(''); setPhase('ready');
    return () => { run.current += 1; worker.current?.terminate(); worker.current = null; };
  }, [attemptId]);

  async function analyze() {
    if (phase !== 'ready') return;
    const current = ++run.current;
    setPhase('preparing'); setError(''); setComparison(null); setProgress(0);
    const target = findTargetWord(targetText);
    try {
      const userSamples = await recordingToPcm(recording);
      if (current !== run.current) return;
      const localWorker = new Worker(new URL('../../pronunciation/worker.ts', import.meta.url), { type: 'module' });
      worker.current = localWorker;
      let requestId = 0;
      function recognize(samples: Float32Array, reference: boolean): Promise<string[]> {
        const id = ++requestId;
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('The local model timed out on this device.')), 300_000);
          localWorker.onmessage = (event: MessageEvent<WorkerReply>) => {
            const reply = event.data;
            if (reply.id !== id || current !== run.current) return;
            if (reply.kind === 'progress') { setProgress(Math.round(reply.progress)); setPhase('loading'); return; }
            clearTimeout(timeout);
            if (reply.kind === 'error') reject(new Error(reply.message));
            else resolve(reply.phones);
          };
          localWorker.onerror = () => { clearTimeout(timeout); reject(new Error('The local model could not start on this device.')); };
          localWorker.postMessage({ id, samples, reference }, [samples.buffer]);
        });
      }
      let referencePhones = target?.phones;
      if (!referencePhones) {
        if (!referenceUrl) throw new Error('This exercise has no reference audio to compare.');
        const response = await fetch(referenceUrl);
        if (!response.ok) throw new Error('Could not load the reference recording.');
        const referenceSamples = await recordingToPcm(await response.blob());
        if (current !== run.current) return;
        setPhase('checking');
        referencePhones = await recognize(referenceSamples, true);
        if (!referencePhones.length) throw new Error('The model could not identify sounds in the reference recording.');
      }
      if (current !== run.current) return;
      setPhase('checking');
      const userPhones = await recognize(userSamples, false);
      if (current !== run.current) return;
      setExpected(referencePhones); setHeard(userPhones);
      setComparison(comparePhones(referencePhones, userPhones));
    } catch (caught) {
      if (current === run.current) setError(caught instanceof Error ? caught.message : 'Could not compare these recordings.');
    } finally {
      if (current === run.current) { worker.current?.terminate(); worker.current = null; setPhase('ready'); }
    }
  }

  return <div className="local-pronunciation">
    <strong>Compare how it sounded</strong>
    <p>Compare your recording with “{targetText}” on this device. The first check downloads about 241 MB; later checks may use your browser cache. Audio stays on this device.</p>
    <button type="button" className="local-pronunciation-action" disabled={phase !== 'ready'} onClick={() => void analyze()}>
      {phase === 'ready' ? 'Compare my pronunciation' : phase === 'preparing' ? 'Preparing audio…' : phase === 'loading' ? `Downloading model · ${progress}%` : 'Listening to both recordings…'}
    </button>
    {phase !== 'ready' && <p role="status">{phase === 'loading' ? `Model download ${progress}%` : 'Local sound analysis in progress…'}</p>}
    {error && <p role="alert" className="local-pronunciation-error">{error}</p>}
    {comparison && <div className="local-pronunciation-result" aria-live="polite">
      <div className="local-pronunciation-meter"><strong>{comparison.similarity}%</strong><span>model sound overlap</span></div>
      <div className="local-pronunciation-tracks">
        <div><span>Target sounds</span><strong>{expected.join(' ')}</strong></div>
        <div><span>Your sounds</span><strong>{heard.join(' ') || 'No clear sounds detected'}</strong></div>
      </div>
      <div className="local-pronunciation-sounds" aria-label="Sound comparison">
        {comparison.sounds.map((sound, index) => <span key={`${index}-${sound.expected}`} className={`local-pronunciation-sound local-pronunciation-sound--${sound.status}`}
          title={sound.status === 'matched' ? 'Sound matched' : sound.heard ? `Heard ${sound.heard} instead` : 'Sound not heard'}>{sound.expected}</span>)}
      </div>
      {comparison.extra.length > 0 && <p>Extra sounds heard: {comparison.extra.join(' ')}</p>}
      <p>This is an experimental phoneme recognizer, not a validated pronunciation grade. Background voices and microphone noise can change the result; listen back and try again if it seems wrong.</p>
    </div>}
  </div>;
}
