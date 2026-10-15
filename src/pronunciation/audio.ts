// Decode browser-supported recording formats and resample to the model's 16 kHz mono PCM.
export async function recordingToPcm(blob: Blob): Promise<Float32Array> {
  if (!blob.size || blob.size > 8_388_608) throw new Error('Choose an audio file under 8 MB.');
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration < 0.25 || decoded.duration > 60) throw new Error('Choose a recording between 0.25 and 60 seconds.');
    const length = Math.ceil(decoded.duration * 16_000);
    const offline = new OfflineAudioContext(1, length, 16_000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice();
  } finally {
    await context.close();
  }
}
