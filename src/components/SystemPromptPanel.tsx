import { useState } from 'react';
import { motion } from 'motion/react';
import { useVoiceStore } from '../store/useVoiceStore';

const DEFAULT_PROMPT = 'You are VOX, an enhanced voice assistant. You are helpful, concise, and natural. Keep responses under 2 paragraphs unless asked for detail. Use a warm, conversational tone.';

interface SystemPromptPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemPromptPanel({ isOpen, onClose }: SystemPromptPanelProps) {
  const { settings, updateSystemPrompt } = useVoiceStore();
  const [localPrompt, setLocalPrompt] = useState(settings.systemPrompt);

  const handleSave = () => {
    updateSystemPrompt(localPrompt);
    onClose();
  };

  const handleReset = () => {
    setLocalPrompt(DEFAULT_PROMPT);
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
        className="glass-strong rounded-2xl w-[600px] max-h-[85vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <h2 className="text-sm font-medium text-white/80">System Prompt</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <textarea
            value={localPrompt}
            onChange={(e) => setLocalPrompt(e.target.value)}
            className="w-full h-[300px] glass rounded-2xl p-4 text-xs text-white/70 leading-relaxed resize-none outline-none focus:ring-1 focus:ring-purple-500/30"
            placeholder="Enter system prompt..."
          />
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl text-[11px] text-white/40 hover:text-white/60 transition-colors cursor-pointer"
            >
              Reset to default
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-[11px] text-white/40 hover:text-white/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-[11px] font-medium bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
