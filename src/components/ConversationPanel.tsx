import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../types';

interface ConversationPanelProps {
  messages: Message[];
  onClear: () => void;
  onDelete: (id: string) => void;
}

export function ConversationPanel({ messages, onClear, onDelete }: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.03]">
        <span className="text-xs text-white/30 tracking-widest uppercase font-light">
          Conversation
        </span>
        {messages.length > 1 && (
          <button
            onClick={onClear}
            className="text-[10px] text-white/20 hover:text-red-400/60 transition-colors cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-2">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-white/15">No messages yet</p>
            </div>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`group relative rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-purple-600/10 border border-purple-500/10 ml-8'
                  : 'glass mr-8'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-white/90 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                <button
                  onClick={() => onDelete(msg.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400/60 transition-all shrink-0 mt-0.5 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] ${msg.role === 'user' ? 'text-purple-400/40' : 'text-white/20'}`}>
                  {msg.role === 'user' ? 'You' : 'VOX'}
                </span>
                <span className="text-[10px] text-white/10">{msg.timestamp}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
