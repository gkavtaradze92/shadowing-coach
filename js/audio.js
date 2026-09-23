// Builds one audio track: segment 1 + silence + segment 2 + silence + ...

// clips: [{ samples: Float32Array, sampleRate }], pauseSeconds: number
// Returns { samples, sampleRate, starts } where starts[i] is segment i's start time in seconds.
export function buildTrack(clips, pauseSeconds) {
  const sampleRate = clips[0].sampleRate;
  const pauseLen = Math.round(pauseSeconds * sampleRate);
  clips = clips.map(trimSilence);
  const total = clips.reduce((sum, c) => sum + c.samples.length + pauseLen, 0);
  const samples = new Float32Array(total);
  const starts = [];
  let offset = 0;
  for (const c of clips) {
    starts.push(offset / sampleRate);
    samples.set(c.samples, offset);
    offset += c.samples.length + pauseLen; // the gap stays zero = silence
  }
  return { samples, sampleRate, starts };
}

// The voice adds its own quiet lead-in/tail; trim it so the chosen pause is the real pause.
export function trimSilence({ samples, sampleRate }) {
  const threshold = 0.01;
  let start = 0;
  let end = samples.length - 1;
  while (start < end && Math.abs(samples[start]) < threshold) start++;
  while (end > start && Math.abs(samples[end]) < threshold) end--;
  start = Math.max(0, start - Math.round(0.05 * sampleRate));   // keep 50 ms before
  end = Math.min(samples.length, end + Math.round(0.1 * sampleRate)); // keep 100 ms after
  return { samples: samples.slice(start, end), sampleRate };
}

// 16-bit mono WAV, used for playback inside the app.
export function toWavBlob(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos, s) => { for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i)); };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);            // PCM
  view.setUint16(22, 1, true);            // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let pos = 44;
  for (let i = 0; i < samples.length; i++, pos += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
