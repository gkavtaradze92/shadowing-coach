// Text-to-speech module.
// Everything that knows about the voice engine lives in this file.
// To switch to ElevenLabs/OpenAI later, replace this file and keep the same exports.

export const VOICES = [
  { id: 'af_heart', label: 'Heart (female)' },
  { id: 'af_bella', label: 'Bella (female)' },
  { id: 'af_nicole', label: 'Nicole (female)' },
  { id: 'am_michael', label: 'Michael (male)' },
  { id: 'am_fenrir', label: 'Fenrir (male)' },
  { id: 'am_puck', label: 'Puck (male)' },
];

export const DEFAULT_VOICE = 'af_heart';
