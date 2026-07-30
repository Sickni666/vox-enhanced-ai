import { useMemo } from 'react';

interface AudioVizProps {
  frequencies: number[];
  isListening: boolean;
  isSpeaking: boolean;
}

export function AudioViz({ frequencies, isListening, isSpeaking }: AudioVizProps) {
  const bars = useMemo(() => {
    const count = 32;
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i / count) * frequencies.length);
      result.push(frequencies[idx] || 0);
    }
    return result;
  }, [frequencies]);

  return (
    <div className="mt-8 flex items-end justify-center gap-[3px] h-12">
      {bars.map((val, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-all duration-75"
          style={{
            height: `${Math.max(4, val * 48)}px`,
            background: isListening
              ? `linear-gradient(to top, rgba(139,92,246,${0.3 + val * 0.7}), rgba(167,139,250,${0.1 + val * 0.5}))`
              : `linear-gradient(to top, rgba(167,139,250,${0.2 + val * 0.6}), rgba(139,92,246,${0.05 + val * 0.3}))`,
            opacity: 0.4 + val * 0.6,
          }}
        />
      ))}
    </div>
  );
}
