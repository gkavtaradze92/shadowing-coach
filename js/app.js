import { VOICES, DEFAULT_VOICE } from './tts.js';
import { splitScript } from './segmenter.js';

const $ = (id) => document.getElementById(id);

const SPEEDS = [0.5, 0.75, 0.8, 0.85, 0.9, 1.0, 1.1, 1.2];
const PAUSES = [0.5, 1, 1.5, 2, 3, 4];
const MODES = [
  { id: 'repeat', label: 'Listen & Repeat' },
  { id: 'shadowing', label: 'Shadowing' },
  { id: 'camera', label: 'Camera Mode' },
];

const state = {
  segments: [],
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

// ---------- Segments ----------

function setSegments(list) {
  state.segments = list;
  renderSegments();
}

function renderSegments() {
  const list = $('segment-list');
  list.innerHTML = '';
  const n = state.segments.length;
  $('segments-empty').hidden = n > 0;
  $('segment-count').textContent = n ? `(${n})` : '';

  state.segments.forEach((text, i) => {
    const li = document.createElement('li');
    li.className = 'segment';

    const num = document.createElement('span');
    num.className = 'segment-num';
    num.textContent = i + 1;

    const box = document.createElement('textarea');
    box.className = 'segment-text';
    box.rows = 1;
    box.value = text;
    box.dataset.caret = '';
    const rememberCaret = () => { box.dataset.caret = box.selectionStart; };
    for (const ev of ['click', 'keyup', 'select', 'focus']) box.addEventListener(ev, rememberCaret);
    box.addEventListener('input', () => {
      rememberCaret();
      state.segments[i] = box.value;
      autoGrow(box);
    });

    const actions = document.createElement('div');
    actions.className = 'segment-actions';
    actions.append(
      smallButton('Split here', () => splitSegment(i, box)),
      smallButton('Merge ↓', () => mergeSegment(i), i === n - 1),
      smallButton('Delete', () => deleteSegment(i), false, 'danger'),
    );

    const body = document.createElement('div');
    body.className = 'segment-body';
    body.append(box, actions);
    li.append(num, body);
    list.appendChild(li);
    autoGrow(box);
  });
}

function smallButton(label, onClick, disabled = false, extraClass = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn small ${extraClass}`;
  b.textContent = label;
  b.disabled = disabled;
  // Keep the cursor inside the text box when the button is pressed.
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', onClick);
  return b;
}

function autoGrow(box) {
  box.style.height = 'auto';
  box.style.height = `${box.scrollHeight + 2}px`;
}

function splitSegment(i, box) {
  const text = box.value;
  const caret = Number(box.dataset.caret);
  const before = text.slice(0, caret).trim();
  const after = text.slice(caret).trim();
  if (box.dataset.caret === '' || !before || !after) {
    alert('Tap inside the text where you want to split, then press "Split here".');
    return;
  }
  state.segments.splice(i, 1, before, after);
  renderSegments();
}

function mergeSegment(i) {
  const merged = `${state.segments[i].trim()} ${state.segments[i + 1].trim()}`;
  state.segments.splice(i, 2, merged);
  renderSegments();
}

function deleteSegment(i) {
  state.segments.splice(i, 1);
  renderSegments();
}

$('split-btn').addEventListener('click', () => {
  const text = $('script-text').value.trim();
  if (!text) {
    alert('Paste a script first.');
    return;
  }
  if (state.segments.length && !confirm('Replace your current segments?')) return;
  setSegments(splitScript(text));
});

// ---------- Start ----------

initVoiceSelect();
renderSettings();
renderSegments();
