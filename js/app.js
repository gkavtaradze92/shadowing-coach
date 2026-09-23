import { VOICES, DEFAULT_VOICE } from './tts.js';

const $ = (id) => document.getElementById(id);

const SPEEDS = [0.75, 0.8, 0.85, 0.9, 1.0, 1.1, 1.2];
const PAUSES = [0.5, 1, 1.5, 2, 3, 4];
const MODES = [
  { id: 'repeat', label: 'Listen & Repeat' },
  { id: 'shadowing', label: 'Shadowing' },
  { id: 'camera', label: 'Camera Mode' },
];

const state = {
  settings: {
    mode: 'repeat',
    voice: DEFAULT_VOICE,
    speed: 0.8,
    pause: 1.5,
  },
};

// ---------- Settings UI ----------

function renderChips(containerId, items, isSelected, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = item.label;
    b.setAttribute('aria-pressed', String(isSelected(item)));
    b.addEventListener('click', () => onPick(item));
    box.appendChild(b);
  }
}

function renderSettings() {
  const s = state.settings;
  renderChips('mode-chips', MODES, (m) => m.id === s.mode, (m) => {
    s.mode = m.id;
    renderSettings();
  });
  renderChips('speed-chips', SPEEDS.map((v) => ({ value: v, label: `${v}x` })),
    (c) => c.value === s.speed, (c) => { s.speed = c.value; renderSettings(); });
  renderChips('pause-chips', PAUSES.map((v) => ({ value: v, label: `${v}s` })),
    (c) => c.value === s.pause, (c) => { s.pause = c.value; renderSettings(); });
  $('voice').value = s.voice;
}

function initVoiceSelect() {
  const sel = $('voice');
  for (const v of VOICES) {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.label;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => { state.settings.voice = sel.value; });
}

// ---------- Start ----------

initVoiceSelect();
renderSettings();
