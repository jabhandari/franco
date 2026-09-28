// MediaRecorder WebM files often omit Segment Info.Duration. Walk EBML
// elements to find cluster and block timestamps without decoding audio.
const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const CLUSTER = 0x1f43b675;
const BLOCK_GROUP = 0xa0;
const SIMPLE_BLOCK = 0xa3;
const BLOCK = 0xa1;
const TIMECODE = 0xe7;
const TIMECODE_SCALE = 0x2ad7b1;
const BLOCK_DURATION = 0x9b;
const CLUSTER_END_IDS = new Set([CLUSTER, INFO, 0x1c53bb6b, 0x1254c367]);

function vint(bytes, offset, keepMarker) {
  if (offset >= bytes.length) throw new Error('Truncated EBML value.');
  const first = bytes[offset];
  if (!first) throw new Error('Invalid EBML value.');
  let width = 1;
  while (width <= 8 && !(first & (0x80 >> (width - 1)))) width++;
  if (width > 8 || offset + width > bytes.length) throw new Error('Invalid EBML width.');
  let value = BigInt(keepMarker ? first : first & ((1 << (8 - width)) - 1));
  for (let i = 1; i < width; i++) value = (value << 8n) | BigInt(bytes[offset + i]);
  const unknown = !keepMarker && value === (1n << BigInt(width * 7)) - 1n;
  if (!unknown && value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('EBML value is too large.');
  return { value: unknown ? null : Number(value), width, unknown };
}

function unsigned(bytes, start, end) {
  if (end - start > 8 || end <= start) throw new Error('Invalid EBML integer.');
  let value = 0n;
  for (let i = start; i < end; i++) value = (value << 8n) | BigInt(bytes[i]);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('EBML integer is too large.');
  return Number(value);
}

export function webmDurationSeconds(bytes) {
  const state = { scale: 1000000, clusterTime: 0, maxTicks: -1, blockTime: null, segment: false };

  function walk(start, end, context, depth) {
    if (depth > 5) throw new Error('EBML is nested too deeply.');
    let offset = start;
    while (offset < end) {
      const elementStart = offset;
      const id = vint(bytes, offset, true);
      offset += id.width;
      const size = vint(bytes, offset, false);
      offset += size.width;
      if (context === 'cluster' && CLUSTER_END_IDS.has(id.value)) return elementStart;
      if (size.unknown && id.value !== SEGMENT && id.value !== CLUSTER) throw new Error('Unexpected open EBML element.');
      const elementEnd = size.unknown ? end : offset + size.value;
      if (elementEnd > end) throw new Error('Truncated EBML element.');

      if (id.value === SEGMENT) {
        state.segment = true;
        walk(offset, elementEnd, 'segment', depth + 1);
      } else if (id.value === INFO) {
        walk(offset, elementEnd, 'info', depth + 1);
      } else if (id.value === CLUSTER) {
        state.clusterTime = 0;
        const next = walk(offset, elementEnd, 'cluster', depth + 1);
        if (size.unknown) { offset = next; continue; }
      } else if (id.value === BLOCK_GROUP && context === 'cluster') {
        state.blockTime = null;
        walk(offset, elementEnd, 'group', depth + 1);
      } else if (id.value === TIMECODE_SCALE && context === 'info') {
        state.scale = unsigned(bytes, offset, elementEnd);
      } else if (id.value === TIMECODE && context === 'cluster') {
        state.clusterTime = unsigned(bytes, offset, elementEnd);
      } else if ((id.value === SIMPLE_BLOCK && context === 'cluster') || (id.value === BLOCK && context === 'group')) {
        const track = vint(bytes, offset, false);
        const timeOffset = offset + track.width;
        if (timeOffset + 2 > elementEnd) throw new Error('Truncated WebM block.');
        const relative = bytes.readInt16BE(timeOffset);
        const ticks = state.clusterTime + relative;
        if (ticks < 0) throw new Error('Invalid WebM timestamp.');
        state.maxTicks = Math.max(state.maxTicks, ticks);
        if (context === 'group') state.blockTime = ticks;
      } else if (id.value === BLOCK_DURATION && context === 'group' && state.blockTime !== null) {
        state.maxTicks = Math.max(state.maxTicks, state.blockTime + unsigned(bytes, offset, elementEnd));
      }
      offset = elementEnd;
    }
    return offset;
  }

  walk(0, bytes.length, 'root', 0);
  if (!state.segment || state.maxTicks < 0 || !Number.isFinite(state.scale) || state.scale <= 0) return null;
  return (state.maxTicks * state.scale) / 1000000000 + 0.1;
}
