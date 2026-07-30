import { AnimatePresence, motion } from 'motion/react';
import { ToastNotification } from '../types';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`pointer-events-auto rounded-2xl p-4 shadow-lg border backdrop-blur-2xl cursor-pointer ${
              toast.type === 'success'
                ? 'bg-emerald-900/30 border-emerald-500/20'
                : toast.type === 'error'
                ? 'bg-red-900/30 border-red-500/20'
                : 'glass'
            }`}
            onClick={() => onRemove(toast.id)}
          >
            <div className="flex items-start gap-3">
              <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                toast.type === 'success' ? 'bg-emerald-400' :
                toast.type === 'error' ? 'bg-red-400' :
                'bg-purple-400'
              }`} />
              <div>
                <p className="text-xs font-medium text-white/80">{toast.title}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{toast.message}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
