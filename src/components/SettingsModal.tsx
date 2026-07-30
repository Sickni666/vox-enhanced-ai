import { useState } from 'react';
import { motion } from 'motion/react';
import { useVoiceStore } from '../store/useVoiceStore';

interface SettingsModalProps {
  onClose: () => void;
}

const TABS = [
  { id: 'stt' as const, label: 'STT' },
  { id: 'llm' as const, label: 'LLM' },
  { id: 'tts' as const, label: 'TTS' },
  { id: 'systemPrompt' as const, label: 'Prompt' },
];

const INPUTS: Record<string, Array<{ key: string; label: string; type: string; placeholder: string }>> = {
  stt: [
    { key: 'apiUrl', label: 'API URL', type: 'text', placeholder: 'https://api.openai.com/v1' },
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' },
    { key: 'modelId', label: 'Model', type: 'text', placeholder: 'whisper-1' },
  ],
  llm: [
    { key: 'apiUrl', label: 'API URL', type: 'text', placeholder: 'https://api.openai.com/v1' },
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' },
    { key: 'modelId', label: 'Model', type: 'text', placeholder: 'gpt-4o-mini' },
    { key: 'temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
    { key: 'maxTokens', label: 'Max Tokens', type: 'number', placeholder: '4096' },
  ],
  tts: [
    { key: 'apiUrl', label: 'API URL', type: 'text', placeholder: 'Leave empty for Edge TTS' },
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' },
    { key: 'modelId', label: 'Model', type: 'text', placeholder: 'edge-tts' },
    { key: 'voice', label: 'Voice', type: 'text', placeholder: 'en-US-GuyNeural' },
    { key: 'speed', label: 'Speed', type: 'number', placeholder: '1.0' },
  ],
};

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useVoiceStore();
  const [activeTab, setActiveTab] = useState<string>('stt');

  const currentTab = activeTab;
  const currentSettings = currentTab === 'systemPrompt'
    ? null
    : settings[currentTab as keyof typeof settings];

  const handleFieldChange = (key: string, value: string | number) => {
    if (currentTab === 'systemPrompt') {
      updateSettings({ systemPrompt: value as string });
      return;
    }
    updateSettings({
      [currentTab]: { ...(currentSettings as object), [key]: value } as any,
    });
  };

  const handleTest = async () => {
    try {
      const response = await fetch(`/api/test-${currentTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: currentSettings }),
      });
      const data = await response.json();
      useVoiceStore.getState().addToast({
        type: data.success ? 'success' : 'error',
        title: data.success ? 'Test Passed' : 'Test Failed',
        message: data.message || 'Unknown response'
      });
    } catch (err: any) {
      useVoiceStore.getState().addToast({ type: 'error', title: 'Test Error', message: err.message });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="glass-strong rounded-2xl w-[520px] max-h-[80vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <h2 className="text-sm font-medium text-white/80">Settings</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-4 pb-2 border-b border-white/[0.03]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentTab === tab.id
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[50vh] px-5 py-4 space-y-3">
          {currentTab === 'systemPrompt' ? (
            <div className="space-y-2">
              <label className="text-[11px] text-white/30 uppercase tracking-wider">System Prompt</label>
              <textarea
                value={settings.systemPrompt}
                onChange={(e) => handleFieldChange('systemPrompt', e.target.value)}
                rows={10}
                className="input-field resize-none text-xs font-mono"
                placeholder="You are a helpful voice assistant..."
              />
            </div>
          ) : (
            INPUTS[currentTab]?.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[11px] text-white/30 uppercase tracking-wider">{field.label}</label>
                <input
                  type={field.type}
                  value={(currentSettings as any)?.[field.key] ?? ''}
                  onChange={(e) => handleFieldChange(
                    field.key,
                    field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                  )}
                  placeholder={field.placeholder}
                  className="input-field text-xs"
                />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
          <button
            onClick={handleTest}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/20 hover:bg-purple-600/30 transition-all cursor-pointer"
          >
            Test Connection
          </button>
          <span className="text-[10px] text-white/15">Changes saved automatically</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
