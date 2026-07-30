import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message, AppSettings, VoiceState, ToastNotification, AudioLevel, DEFAULT_SETTINGS, ApiSettings } from '../types';

interface VoiceStore {
  // Voice state
  voiceState: VoiceState;
  setVoiceState: (state: VoiceState) => void;

  // Messages
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  removeMessage: (id: string) => void;
  loadMessages: () => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateApiSettings: (type: 'stt' | 'llm' | 'tts', settings: Partial<ApiSettings>) => void;
  updateSystemPrompt: (prompt: string) => void;
  loadSettings: () => void;

  // Audio levels
  audioLevel: AudioLevel;
  setAudioLevel: (level: AudioLevel) => void;

  // Toast notifications
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id'>) => string;
  removeToast: (id: string) => void;

  // Voice actions
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  
  // Voice control actions
  toggleMicrophone: () => void;
  startListening: () => void;
  stopListeningAndProcess: () => void;
  interruptSession: () => void;
  sendTextMessage: (text: string) => void;
}

const MESSAGES_STORAGE_KEY = 'vox_messages_v1';

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set, get) => ({
      // Voice state
      voiceState: 'idle',
      setVoiceState: (state) => set({ voiceState: state }),

      // Messages
      messages: [],
      addMessage: (message) =>
        set((state) => {
          const newMessages = [...state.messages, message];
          localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(newMessages));
          return { messages: newMessages };
        }),
      clearMessages: () => {
        localStorage.removeItem(MESSAGES_STORAGE_KEY);
        set({ messages: [] });
      },
      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
        })),
      loadMessages: () => {
        try {
          const saved = localStorage.getItem(MESSAGES_STORAGE_KEY);
          if (saved) {
            set({ messages: JSON.parse(saved) });
          }
        } catch (e) {
          console.warn('Failed to load messages:', e);
        }
      },

      // Settings
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((state) => {
          const updated = { ...state.settings, ...newSettings };
          localStorage.setItem('vox_settings_v1', JSON.stringify(updated));
          return { settings: updated };
        }),
      updateApiSettings: (type, apiSettings) =>
        set((state) => {
          const updated = {
            ...state.settings,
            [type]: { ...state.settings[type], ...apiSettings },
          };
          localStorage.setItem('vox_settings_v1', JSON.stringify(updated));
          return { settings: updated };
        }),
      updateSystemPrompt: (prompt) =>
        set((state) => {
          const updated = { ...state.settings, systemPrompt: prompt };
          localStorage.setItem('vox_settings_v1', JSON.stringify(updated));
          return { settings: updated };
        }),
      loadSettings: () => {
        try {
          const saved = localStorage.getItem('vox_settings_v1');
          if (saved) {
            const parsed = JSON.parse(saved);
            set({ settings: { ...DEFAULT_SETTINGS, ...parsed } });
          }
        } catch (e) {
          console.warn('Failed to load settings:', e);
        }
      },

      // Audio levels
      audioLevel: { volume: 0, frequencies: new Array(16).fill(0) },
      setAudioLevel: (level) => set({ audioLevel: level }),

      // Toast notifications
      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        return id;
      },
      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      // Recording state
      isRecording: false,
      setIsRecording: (recording) => set({ isRecording: recording }),

      // Voice control actions
      toggleMicrophone: () => {
        const { voiceState, isRecording, startListening, stopListeningAndProcess, setIsRecording } = get();
        if (voiceState === 'speaking') {
          // Barge-in: interrupt speech and start listening
          get().interruptSession();
          setTimeout(() => startListening(), 100);
        } else if (isRecording || voiceState === 'listening') {
          stopListeningAndProcess();
        } else {
          startListening();
        }
      },

      startListening: () => {
        set({ voiceState: 'listening', isRecording: true });
        // Actual recording start handled by audioService in App.tsx
      },

      stopListeningAndProcess: () => {
        set({ voiceState: 'thinking', isRecording: false });
        // Actual processing handled by App.tsx
      },

      interruptSession: () => {
        set({ voiceState: 'idle', isRecording: false });
        // Audio service playback stop handled by App.tsx
      },

      sendTextMessage: (text: string) => {
        const message: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: text,
          timestamp: new Date().toISOString(),
        };
        get().addMessage(message);
        set({ voiceState: 'thinking' });
        // Actual LLM call handled by App.tsx
      },
    }),
    {
      name: 'vox-voice-store',
      partialize: (state) => ({
        settings: state.settings,
        messages: state.messages,
      }),
    }
  )
);