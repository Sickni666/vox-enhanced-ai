import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { VisionService } from '../services/visionService';
import { useVoiceStore } from '../store/useVoiceStore';

interface VisionModalProps {
  onClose: () => void;
}

export function VisionModal({ onClose }: VisionModalProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { settings } = useVoiceStore();
  const visionServiceRef = useRef<VisionService | null>(null);

  if (!visionServiceRef.current) {
    visionServiceRef.current = new VisionService(settings.llm);
  }

  const handleImageSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      useVoiceStore.getState().addToast({ type: 'error', title: 'Image too large', message: 'Please select an image under 10MB' });
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setAnalysis('');
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setAnalysis('');
    try {
      const result = await visionServiceRef.current!.analyzeImage(selectedImage);
      setAnalysis(result.text || 'No analysis returned.');
    } catch (err: any) {
      setAnalysis(`Error: ${err.message}`);
      useVoiceStore.getState().addToast({ type: 'error', title: 'Vision Error', message: err.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
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
        className="glass-strong rounded-2xl w-[600px] max-h-[85vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <h2 className="text-sm font-medium text-white/80">Vision Analysis</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              preview
                ? 'border-purple-500/20 bg-purple-500/5'
                : 'border-white/[0.08] hover:border-purple-500/20 hover:bg-purple-500/[0.02]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
            />
            {preview ? (
              <div className="space-y-3">
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
                <p className="text-[11px] text-white/30">{selectedImage?.name}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-white/20">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                  <circle cx="12" cy="13" r="3"/>
                </svg>
                <p className="text-xs text-white/40">Drop an image or click to browse</p>
                <p className="text-[10px] text-white/20">Supports JPG, PNG, GIF, WEBP — max 10MB</p>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          {preview && !analysis && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Analyzing...
                </span>
              ) : 'Analyze Image'}
            </button>
          )}

          {/* Analysis Result */}
          {analysis && (
            <div className="glass rounded-2xl p-4 max-h-48 overflow-y-auto">
              <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{analysis}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
