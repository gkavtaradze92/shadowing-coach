// Text-to-speech module.
// Everything that knows about the voice engine lives in this file (and kokoro-worker.js).
// To switch to ElevenLabs/OpenAI later, replace this file and keep the same exports:
//   VOICES, DEFAULT_VOICE,
//   loadEngine(onStatus)                 -> Promise<void>
//   synthesize(text, { voice, speed })   -> Promise<{ samples: Float32Array, sampleRate: number }>

export const VOICES = [
  { id: 'af_heart', label: 'Heart (female)' },
  { id: 'af_bella', label: 'Bella (female)' },
  { id: 'af_nicole', label: 'Nicole (female)' },
  { id: 'am_michael', label: 'Michael (male)' },
  { id: 'am_fenrir', label: 'Fenrir (male)' },
  { id: 'am_puck', label: 'Puck (male)' },
];

export const DEFAULT_VOICE = 'af_heart';

let worker = null;
let nextId = 1;
const pending = new Map();
let statusListener = () => {};

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./kokoro-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === 'loading') {
      statusListener({ stage: 'loading', firstDownload: msg.firstDownload });
      return;
    }
    if (msg.type === 'download') {
      statusListener({ stage: 'download', loaded: msg.loaded, total: msg.total });
      return;
    }
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.type === 'error') p.reject(new Error(msg.message));
    else p.resolve(msg);
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'Voice engine failed to start'));
    pending.clear();
    worker = null;
  };
  return worker;
}

function call(message) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, ...message });
  });
}

// onStatus receives { stage: 'loading', firstDownload } and { stage: 'download', loaded, total }.
export async function loadEngine(onStatus = () => {}) {
  statusListener = onStatus;
  await call({ cmd: 'load' });
}

// Cache so that regenerating with a different pause doesn't re-synthesize every segment.
const cache = new Map();

export async function synthesize(text, { voice, speed }) {
  const key = `${voice}|${speed}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const res = await call({ cmd: 'generate', text, voice, speed });
  const result = { samples: res.samples, sampleRate: res.sampleRate };
  cache.set(key, result);
  return result;
}
