// Splits a script into short, easy-to-repeat segments.

const MAX_WORDS = 12;   // a segment longer than this gets split further
const MIN_WORDS = 3;    // pieces shorter than this get merged with a neighbour

const ABBREVIATIONS = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'e.g', 'i.e', 'u.s', 'a.m', 'p.m', 'no'];
const CONJUNCTIONS = ['and', 'but', 'or', 'because', 'so', 'which', 'when', 'if', 'while', 'although', 'since', 'where', 'then', 'until', 'unless'];

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;

export function splitScript(text) {
  const segments = [];
  const paragraphs = text.replace(/\r/g, '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
  for (const p of paragraphs) {
    for (const sentence of splitSentences(p)) {
      for (const piece of splitLong(sentence)) {
        const clean = cleanSegment(piece);
        if (clean) segments.push(clean);
      }
    }
  }
  return segments;
}

function splitSentences(paragraph) {
  const words = paragraph.split(/\s+/).filter(Boolean);
  const sentences = [];
  let current = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    current.push(w);
    const next = words[i + 1];
    // Sentence end: . ! ? … (optionally followed by quotes/brackets)
    if (next && /[.!?…]["'”’)\]]*$/.test(w) && !isAbbreviation(w) && /^["'“‘(\[]*[A-Z0-9]/.test(next)) {
      sentences.push(current.join(' '));
      current = [];
    }
  }
  if (current.length) sentences.push(current.join(' '));
  return sentences;
}

function isAbbreviation(word) {
  const w = word.toLowerCase().replace(/^["'“‘(]+/, '').replace(/\.$/, '');
  return ABBREVIATIONS.includes(w);
}

function splitLong(sentence) {
  if (wordCount(sentence) <= MAX_WORDS) return [sentence];

  // 1) Break at commas, semicolons, colons and dashes, then pack pieces up to MAX_WORDS.
  const parts = sentence
    .split(/(?<=[,;:])\s+|(?<=\s[—–-])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  let chunks = pack(parts);
  chunks = mergeTiny(chunks);

  // 2) Anything still too long: break before a conjunction near the middle.
  return chunks.flatMap(splitAtConjunction);
}

function pack(parts) {
  const chunks = [];
  let cur = '';
  for (const part of parts) {
    if (cur && wordCount(cur) + wordCount(part) > MAX_WORDS) {
      chunks.push(cur);
      cur = part;
    } else {
      cur = cur ? `${cur} ${part}` : part;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function mergeTiny(chunks) {
  const out = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (wordCount(c) < MIN_WORDS && i + 1 < chunks.length) {
      chunks[i + 1] = `${c} ${chunks[i + 1]}`;
    } else if (wordCount(c) < MIN_WORDS && out.length) {
      out[out.length - 1] += ` ${c}`;
    } else {
      out.push(c);
    }
  }
  return out;
}

function splitAtConjunction(chunk) {
  const words = chunk.split(/\s+/);
  if (words.length <= MAX_WORDS) return [chunk];

  const middle = words.length / 2;
  let best = -1;
  for (let i = MIN_WORDS; i <= words.length - MIN_WORDS; i++) {
    const w = words[i].toLowerCase().replace(/[^a-z']/g, '');
    if (CONJUNCTIONS.includes(w) && (best < 0 || Math.abs(i - middle) < Math.abs(best - middle))) best = i;
  }
  // No natural break: cut in the middle, but only if the chunk is really long.
  if (best < 0) {
    if (words.length <= MAX_WORDS + 4) return [chunk];
    best = Math.round(middle);
  }
  return [
    ...splitAtConjunction(words.slice(0, best).join(' ')),
    ...splitAtConjunction(words.slice(best).join(' ')),
  ];
}

function cleanSegment(s) {
  let t = s.trim().replace(/\s+[—–-]$/, '').trim();
  // Drop a lone opening or closing quote that belongs to another segment.
  const count = (re) => (t.match(re) || []).length;
  if (count(/["“”]/g) % 2 === 1) t = t.replace(/^["“”]|["“”]$/g, '').trim();
  return t;
}
