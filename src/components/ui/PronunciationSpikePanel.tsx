import React from 'react';
import { recordingToPcm } from '../../pronunciation/audio';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

type WorkerReply =
  | { id: number; kind: 'progress'; progress: number; file: string }
  | { id: number; kind: 'result'; phones: string[]; loadMs: number; inferenceMs: number; sampleCount: number }
  | { id: number; kind: 'error'; message: string };

type Result = Extract<WorkerReply, { kind: 'result' }>;

export function PronunciationSpikePanel() {
  const recorder = useAudioRecorder(60);
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<'ready' | 'decoding' | 'loading' | 'analyzing'>('ready');
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState('');
  const [consented, setConsented] = React.useState(false);
  const worker = React.useRef<Worker | null>(null);
  const request = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    worker.current?.terminate();
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function analyze() {
    const recording = file || recorder.blob;
    if (!recording || !consented || phase !== 'ready') return;
    const id = ++request.current;
    setError(''); setResult(null); setProgress(0); setPhase('decoding');
    try {
      const pcm = await recordingToPcm(recording);
      if (pcm.length < 4000 || pcm.length > 16_000 * 60) throw new Error('Choose a recording between 0.25 and 60 seconds.');
      if (!worker.current) {
        worker.current = new Worker(new URL('../../pronunciation/worker.ts', import.meta.url), { type: 'module' });
      }
      worker.current.onmessage = (event: MessageEvent<WorkerReply>) => {
        const reply = event.data;
        if (reply.id !== id) return;
        if (reply.kind === 'progress') { setProgress(Math.round(reply.progress)); setPhase('loading'); return; }
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        setPhase('ready');
        if (reply.kind === 'error') { setError(reply.message); return; }
        setResult(reply);
      };
      worker.current.onerror = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        setError('The local pronunciation worker could not start on this device.');
        setPhase('ready'); worker.current?.terminate(); worker.current = null;
      };
      setPhase('analyzing');
      // The first download can be slow. Only the device test decides if its
      // steady-state inference is usable on iPhone Safari.
      timer.current = setTimeout(() => {
        worker.current?.terminate(); worker.current = null; setPhase('ready');
        setError('The local model timed out. The normal speaking exercise still uses transcription.');
      }, 300_000);
      worker.current.postMessage({ id, samples: pcm }, [pcm.buffer]);
    } catch (caught) {
      setPhase('ready'); setError(caught instanceof Error ? caught.message : 'Could not decode this recording.');
    }
  }

  const busy = phase !== 'ready';
  return <section className="phoneme-spike">
    <span className="phoneme-spike-kicker">FRA-132 · DEVICE FEASIBILITY TEST</span>
    <h1>Pronunciation model test</h1>
    <p>Measure the browser-side phoneme recognizer on your device. This test does not grade pronunciation or save a practice attempt. Audio stays on this device.</p>
    <div className="phoneme-spike-card">
      <strong>Before you begin</strong>
      <p>The first run downloads about 241 MB. Your browser may evict the cached model later. Use Wi-Fi if you want to avoid mobile data charges.</p>
      <label className="phoneme-spike-consent"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} /> Download the model on this device</label>
    </div>
    <div className="phoneme-spike-card">
      <strong>Choose a French recording</strong>
      <label className="phoneme-spike-file">Use an existing clip <input type="file" accept="audio/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
      <p className="phoneme-spike-or">or record a fresh clip</p>
      {recorder.phase === 'idle' && <button type="button" onClick={() => { setFile(null); void recorder.startRecording(); }} disabled={busy || !recorder.browserSupported}>Start recording</button>}
      {recorder.phase === 'requesting' && <p role="status">Requesting microphone…</p>}
      {recorder.phase === 'recording' && <button type="button" onClick={recorder.stopRecording}>Stop recording · {recorder.elapsed}s</button>}
      {recorder.phase === 'ready' && <audio controls src={recorder.previewUrl} aria-label="Your recording" />}
      {file && <p>Selected: {file.name}</p>}
      {recorder.recordingError && <p role="alert">{recorder.recordingError}</p>}
    </div>
    <button className="phoneme-spike-run" type="button" disabled={busy || !consented || !(file || recorder.blob)} onClick={() => void analyze()}>
      {busy ? 'Analyzing locally…' : 'Analyze recording'}
    </button>
    {busy && <div className="phoneme-spike-card" role="status">
      <strong>{phase === 'decoding' ? 'Preparing audio' : phase === 'loading' ? `Downloading model · ${progress}%` : 'Running model on this device'}</strong>
      {phase === 'loading' && <progress max="100" value={progress} />}
    </div>}
    {error && <p className="phoneme-spike-error" role="alert">{error}</p>}
    {result && <div className="phoneme-spike-card" aria-live="polite">
      <strong>Phonemes heard by the model</strong>
      <p className="phoneme-spike-phones">{result.phones.join(' ') || 'No phonemes recognized'}</p>
      <p>Model load: {(result.loadMs / 1000).toFixed(1)}s · Inference: {(result.inferenceMs / 1000).toFixed(1)}s · Recording: {(result.sampleCount / 16_000).toFixed(1)}s</p>
      <p>This is a recognizer output, not a pronunciation score. Compare its substitutions with the 12-clip reference report.</p>
    </div>}
  </section>;
}
