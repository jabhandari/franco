import { AutoModelForCTC, Wav2Vec2FeatureExtractor, env } from '@huggingface/transformers';
import { decodePhones } from './ctc';
import { hasClearSpeech } from './signal';
import type { PronunciationWorkerReply, PronunciationWorkerRequest } from '../types';

const MODEL = 'qnighy/wav2vec2-xlsr-53-espeak-cv-ft-ONNX';
const REVISION = 'd2987af7ae07d53eafee15dc7190479062faa1e8';
const ROOT = `https://huggingface.co/${MODEL}/resolve/${REVISION}`;

function send(reply: PronunciationWorkerReply) { self.postMessage(reply); }

env.allowLocalModels = false;
env.useBrowserCache = true;
// Cloudflare preview pages do not enable cross-origin isolation, so do not
// request SharedArrayBuffer-backed WASM threading on iOS Safari.
env.backends.onnx.wasm.numThreads = 1;
let loaded: Promise<{ model: Awaited<ReturnType<typeof AutoModelForCTC.from_pretrained>>;
  extractor: Awaited<ReturnType<typeof Wav2Vec2FeatureExtractor.from_pretrained>>; vocab: string[] }> | null = null;

async function load(id: number) {
  if (!loaded) loaded = (async () => {
    const model = await AutoModelForCTC.from_pretrained(MODEL, {
      revision: REVISION, dtype: 'q4',
      progress_callback: (status) => {
        if (status.status === 'progress' && typeof status.progress === 'number') {
          send({ id, kind: 'progress', progress: status.progress, file: status.file || 'model' });
        }
      },
    });
    const extractor = await Wav2Vec2FeatureExtractor.from_pretrained(MODEL, { revision: REVISION });
    const response = await fetch(`${ROOT}/vocab.json`);
    if (!response.ok) throw new Error('Could not download the phoneme vocabulary.');
    const entries: Record<string, number> = await response.json();
    const vocab: string[] = [];
    for (const [phone, index] of Object.entries(entries)) vocab[index] = phone;
    return { model, extractor, vocab };
  })().catch((error) => { loaded = null; throw error; });
  return loaded;
}

self.onmessage = async (event: MessageEvent<PronunciationWorkerRequest>) => {
  const { id, samples, reference } = event.data;
  try {
    if (!(samples instanceof Float32Array) || samples.length < 4000 || samples.length > 16_000 * 60) {
      throw new Error('Choose a recording between 0.25 and 60 seconds.');
    }
    if (!reference && !hasClearSpeech(samples)) throw new Error('Could not separate clear speech from background noise. Try again closer to the microphone in a quieter place.');
    const loadStart = performance.now();
    const { model, extractor, vocab } = await load(id);
    const loadMs = Math.round(performance.now() - loadStart);
    const inferenceStart = performance.now();
    const output = await model(await extractor(samples));
    const inferenceMs = Math.round(performance.now() - inferenceStart);
    const [, frames, classes] = output.logits.dims;
    const phones = decodePhones(Float32Array.from(output.logits.data), frames, classes, vocab);
    send({ id, kind: 'result', phones, loadMs, inferenceMs, sampleCount: samples.length });
  } catch (error) {
    send({ id, kind: 'error', message: error instanceof Error ? error.message : 'Phoneme analysis failed.' });
  }
};
