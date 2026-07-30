export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ApiSettings {
  apiUrl: string;
  apiKey: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  voice?: string;
  speed?: number;
  responseFormat?: string;
  additionalHeaders?: string;
}

export interface AppSettings {
  stt: ApiSettings;
  llm: ApiSettings;
  tts: ApiSettings;
  systemPrompt: string;
}

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'error';
  title: string;
  message: string;
}

export type SettingsTab = 'stt' | 'llm' | 'tts' | 'systemPrompt';

export interface AudioLevel {
  volume: number;
  frequencies: number[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  stt: {
    apiUrl: '',
    apiKey: '',
    modelId: 'whisper-1',
    temperature: 0,
    maxTokens: 0,
    voice: '',
    speed: 1.0,
    responseFormat: '',
    additionalHeaders: '',
  },
  llm: {
    apiUrl: '',
    apiKey: '',
    modelId: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    voice: '',
    speed: 1.0,
    responseFormat: '',
    additionalHeaders: '',
  },
  tts: {
    apiUrl: '',
    apiKey: '',
    modelId: 'tts-1',
    temperature: 0,
    maxTokens: 0,
    voice: 'alloy',
    speed: 1.0,
    responseFormat: 'mp3',
    additionalHeaders: '',
  },
  systemPrompt: 'You are VOX, an enhanced voice assistant. You are helpful, concise, and natural. Keep responses under 2 paragraphs unless asked for detail. Use a warm, conversational tone.',
};
