// Runs Kokoro in a background thread so the page stays responsive.
// Used only by tts.js.
import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const MODEL_FILE_URL = `https://huggingface.co/${MODEL_ID}/resolve/main/onnx/model_quantized.onnx`;

let ttsPromise = null;

async function isModelCached() {
  try {
    const cache = await caches.open('transformers-cache');
    return Boolean(await cache.match(MODEL_FILE_URL));
  } catch {
    return false;
  }
}

async function load() {
  const cached = await isModelCached();
  self.postMessage({ type: 'loading', firstDownload: !cached });
  return KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p) => {
      if (p.status === 'progress' && p.file && p.file.endsWith('.onnx')) {
        self.postMessage({ type: 'download', loaded: p.loaded, total: p.total });
      }
    },
  });
}

self.onmessage = async (e) => {
  const { id, cmd, text, voice, speed } = e.data;
  try {
    if (!ttsPromise) ttsPromise = load();
    const tts = await ttsPromise;
    if (cmd === 'load') {
      self.postMessage({ id, type: 'done' });
      return;
    }
    const audio = await tts.generate(text, { voice, speed });
    self.postMessage({ id, type: 'done', samples: audio.audio, sampleRate: audio.sampling_rate }, [audio.audio.buffer]);
  } catch (err) {
    if (cmd === 'load') ttsPromise = null; // allow a retry after a failed download
    self.postMessage({ id, type: 'error', message: String(err && err.message ? err.message : err) });
  }
};
