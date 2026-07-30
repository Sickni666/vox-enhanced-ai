import { AppSettings } from '../types';

const STORAGE_KEY = 'vox_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  stt: {
    apiUrl: '',
    apiKey: '',
    modelId: 'whisper-1',
    temperature: 0,
    maxTokens: 0,
  },
  llm: {
    apiUrl: '',
    apiKey: '',
    modelId: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
  },
  tts: {
    apiUrl: '',
    apiKey: '',
    modelId: 'edge-tts',
    voice: 'en-US-GuyNeural',
    speed: 1.0,
    responseFormat: 'mp3',
  },
  systemPrompt: 'You are a warm, helpful voice assistant named VOX. Keep responses concise and natural for spoken conversation.',
};

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings', e);
  }
}

export { DEFAULT_SETTINGS };
