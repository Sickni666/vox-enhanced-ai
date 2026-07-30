import { useEffect, useRef, useState } from 'react';
import { useVoiceStore } from './store/useVoiceStore';
import { VoiceOrb } from './components/VoiceOrb';
import { ConversationPanel } from './components/ConversationPanel';
import { SettingsModal } from './components/SettingsModal';
import { VisionModal } from './components/VisionModal';
import { ToastContainer } from './components/ToastContainer';
import { AudioViz } from './components/AudioViz';
import { SystemPromptPanel } from './components/SystemPromptPanel';
import { AudioService } from './services/audioService';
import { STTService } from './services/sttService';
import { LLMService } from './services/llmService';
import { TTSService } from './services/ttsService';
import { VisionService } from './services/visionService';
import { Message, VoiceState, AppSettings } from './types';

// React Bits components
import Aurora from './components/reactbits/Backgrounds/Aurora/Aurora';
import Beams from './components/reactbits/Backgrounds/Beams/Beams';
import Grainient from './components/reactbits/Backgrounds/Grainient/Grainient';
import Orb from './components/reactbits/Backgrounds/Orb/Orb';
import ShinyText from './components/reactbits/TextAnimations/ShinyText/ShinyText';
import CountUp from './components/reactbits/TextAnimations/CountUp/CountUp';
import BlurText from './components/reactbits/TextAnimations/BlurText/BlurText';
import DecryptedText from './components/reactbits/TextAnimations/DecryptedText/DecryptedText';
import TextPressure from './components/reactbits/TextAnimations/TextPressure/TextPressure';
import SpecularButton from './components/reactbits/Components/SpecularButton/SpecularButton';
import BorderGlow from './components/reactbits/Components/BorderGlow/BorderGlow';
import SplashCursor from './components/reactbits/Animations/SplashCursor/SplashCursor';
import FadeContent from './components/reactbits/Animations/FadeContent/FadeContent';

function App() {
  const {
    voiceState,
    messages,
    settings,
    audioLevel,
    toasts,
    addToast,
    removeToast,
    setVoiceState,
    addMessage,
    clearMessages,
    updateApiSettings,
    updateSystemPrompt,
    setAudioLevel,
    setIsRecording,
    startListening: storeStartListening,
    stopListeningAndProcess: storeStopListeningAndProcess,
    interruptSession: storeInterruptSession,
    sendTextMessage,
  } = useVoiceStore();

  const audioServiceRef = useRef<AudioService | null>(null);
  const sttServiceRef = useRef<STTService | null>(null);
  const llmServiceRef = useRef<LLMService | null>(null);
  const ttsServiceRef = useRef<TTSService | null>(null);
  const visionServiceRef = useRef<VisionService | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showVision, setShowVision] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize services
  useEffect(() => {
    audioServiceRef.current = new AudioService({
      onAudioLevel: (level) => setAudioLevel(level),
      onRecordingComplete: handleRecordingComplete,
      onError: (err) => addToast({ type: 'error', title: 'Audio Error', message: err.message }),
    });

    const s = useVoiceStore.getState().settings;
    sttServiceRef.current = new STTService(s.stt);
    llmServiceRef.current = new LLMService(s.llm);
    ttsServiceRef.current = new TTSService(s.tts);
    visionServiceRef.current = new VisionService(s.llm);

    // Load persisted data
    useVoiceStore.getState().loadMessages();
    useVoiceStore.getState().loadSettings();

    // Request microphone permission early
    navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});

    return () => {
      audioServiceRef.current?.cleanup();
    };
  }, []);

  // Update services when settings change
  useEffect(() => {
    sttServiceRef.current?.updateSettings(settings.stt);
    llmServiceRef.current?.updateSettings(settings.llm);
    ttsServiceRef.current?.updateSettings(settings.tts);
    visionServiceRef.current?.updateSettings(settings.llm);
  }, [settings]);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setVoiceState('thinking');
    setIsProcessing(true);

    try {
      // STT
      const { text: userText } = await sttServiceRef.current!.transcribe(audioBlob);
      
      if (!userText.trim()) {
        addToast({ type: 'info', title: 'No speech detected', message: 'Try speaking louder or closer to the microphone' });
        setVoiceState('idle');
        return;
      }

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userText,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMessage);

      // LLM — use fresh messages from store
      const allMessages = useVoiceStore.getState().messages;
      const { text: assistantText } = await llmServiceRef.current!.generateResponse(
        allMessages.map(m => ({ role: m.role, content: m.content })),
        settings.systemPrompt
      );

      if (!assistantText.trim()) {
        addToast({ type: 'error', title: 'Empty response', message: 'The LLM returned an empty response' });
        setVoiceState('idle');
        return;
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString(),
      };
      addMessage(assistantMessage);

      // TTS
      setVoiceState('speaking');
      const { audioBlob: ttsBlob } = await ttsServiceRef.current!.synthesize(assistantText);
      await audioServiceRef.current!.playAudio(ttsBlob);

    } catch (err: any) {
      console.error('Voice processing error:', err);
      addToast({ type: 'error', title: 'Processing Error', message: err.message || 'Something went wrong' });
    } finally {
      setVoiceState('idle');
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    
    const userText = textInput.trim();
    setTextInput('');
    setIsProcessing(true);
    setVoiceState('thinking');

    try {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userText,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMessage);

      // Use fresh messages from store
      const allMessages = useVoiceStore.getState().messages;
      const { text: assistantText } = await llmServiceRef.current!.generateResponse(
        allMessages.map(m => ({ role: m.role, content: m.content })),
        settings.systemPrompt
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString(),
      };
      addMessage(assistantMessage);

      if (voiceState !== 'listening') {
        setVoiceState('speaking');
        const { audioBlob } = await ttsServiceRef.current!.synthesize(assistantText);
        await audioServiceRef.current!.playAudio(audioBlob);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setVoiceState('idle');
      setIsProcessing(false);
    }
  };

  const handleMicClick = () => {
    if (voiceState === 'speaking') {
      // Barge-in: interrupt and start listening
      interruptSession();
      audioServiceRef.current?.stopPlayback();
      setTimeout(() => startListening(), 100);
    } else if (voiceState === 'listening' || audioServiceRef.current?.getIsRecording()) {
      stopListeningAndProcess();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    audioServiceRef.current?.startRecording();
    storeStartListening();
  };

  const stopListeningAndProcess = () => {
    audioServiceRef.current?.stopRecording();
    storeStopListeningAndProcess();
  };

  const interruptSession = () => {
    audioServiceRef.current?.stopPlayback();
    storeInterruptSession();
  };

  return (
    <div className="fixed inset-0 bg-[#050505] font-inter">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Aurora background */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <Aurora 
            colorStops={['#7C3AED', '#8B5CF6', '#A78BFA']} 
            amplitude={1.2} 
            blend={0.6} 
            speed={0.3} 
          />
        </div>
        
        {/* Grainient overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <Grainient
            color1="#8B5CF6"
            color2="#7C3AED"
            color3="#A78BFA"
            grainAmount={0.15}
            grainScale={1.5}
            contrast={1.2}
            saturation={0.8}
            warpStrength={0.5}
            warpSpeed={0.3}
            rotationAmount={100}
          />
        </div>

        {/* Orb background element */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30">
          <Orb 
            hue={270} 
            hoverIntensity={0.15} 
            rotateOnHover={false} 
            forceHoverState={voiceState === 'listening' || voiceState === 'speaking'}
            backgroundColor="#050505"
          />
        </div>
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] -translate-x-1/2 translate-y-1/2 pointer-events-none opacity-20">
          <Orb 
            hue={300} 
            hoverIntensity={0.1} 
            rotateOnHover={false} 
            forceHoverState={voiceState === 'thinking'}
            backgroundColor="#050505"
          />
        </div>

        {/* Splash cursor effect */}
        <SplashCursor 
          SIM_RESOLUTION={128}
          DYE_RESOLUTION={1440}
          SPLAT_RADIUS={0.15}
          SPLAT_FORCE={4000}
          COLOR="#8B5CF6"
          TRANSPARENT={true}
        />
      </div>

      {/* Main Layout */}
      <div className="flex h-screen w-screen overflow-hidden">
        {/* Left Sidebar - Conversation */}
        <BorderGlow 
          className="w-[360px] h-full flex flex-col border-r border-white/[0.03] bg-[#050505]/50"
          colors={['#8B5CF6', '#A78BFA', '#7C3AED']}
          animated={voiceState !== 'idle'}
          glowColor="40 80 80"
          glowIntensity={voiceState === 'listening' ? 1.2 : 0.8}
        >
          <ConversationPanel 
            messages={messages}
            onClear={clearMessages}
            onDelete={(id) => useVoiceStore.getState().removeMessage?.(id)}
          />
        </BorderGlow>

        {/* Center - Voice Orb */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div className="relative z-10">
            <VoiceOrb 
              audioLevel={audioLevel} 
              voiceState={voiceState}
              className="w-[320px] h-[320px]"
            />
            
            {/* Audio Visualization */}
            <AudioViz 
              frequencies={audioLevel.frequencies}
              isListening={voiceState === 'listening'}
              isSpeaking={voiceState === 'speaking'}
            />

            {/* Status text with animation */}
            <FadeContent
              threshold={0.1}
              duration={600}
              delay={200}
            >
              <BlurText
                text={voiceState === 'idle' ? 'Tap the orb or press Space to start' : 
                     voiceState === 'listening' ? 'Listening...' :
                     voiceState === 'thinking' ? 'Thinking...' : 'Speaking...'}
                animateBy="words"
                delay={50}
                stepDuration={0.2}
                className="mt-6 text-center text-sm font-light text-white/50 tracking-wider"
              />
            </FadeContent>

            {/* Message count */}
            <div className="mt-4 flex items-center gap-4">
              <CountUp 
                from={0} 
                to={messages.length} 
                duration={1.5} 
                className="text-2xl font-light text-white/30 tabular-nums"
              />
              <span className="text-xs text-white/20 tracking-widest uppercase">messages</span>
            </div>
          </div>

          {/* Text Input */}
          <form onSubmit={handleTextSubmit} className="mt-8 w-full max-w-md">
            <div className="relative">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={voiceState === 'listening' ? 'Processing...' : 'Type a message...'}
                disabled={isProcessing || voiceState === 'listening'}
                className="w-full px-5 py-3.5 rounded-xl input-field text-sm pr-14"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isProcessing || voiceState === 'listening'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white/40 hover:text-white/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </form>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center gap-3">
            <SpecularButton
              size="md"
              radius={14}
              tint="#8B5CF6"
              tintOpacity={0.15}
              lineColor="#8B5CF6"
              baseColor="#1A1A2E"
              intensity={voiceState === 'listening' ? 1.5 : 1}
              speed={voiceState === 'listening' ? 0.5 : 0.35}
              followMouse={true}
              autoAnimate={voiceState === 'listening' || voiceState === 'speaking'}
              onClick={() => setShowSettings(true)}
              className="px-4 py-2"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Settings
              </span>
            </SpecularButton>

            <SpecularButton
              size="md"
              radius={14}
              tint="#22D3EE"
              tintOpacity={0.15}
              lineColor="#22D3EE"
              baseColor="#1A1A2E"
              intensity={1}
              speed={0.35}
              followMouse={true}
              onClick={() => setShowVision(true)}
              className="px-4 py-2"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Vision
              </span>
            </SpecularButton>

            <SpecularButton
              size="md"
              radius={14}
              tint="#F59E0B"
              tintOpacity={0.15}
              lineColor="#F59E0B"
              baseColor="#1A1A2E"
              intensity={1}
              speed={0.35}
              followMouse={true}
              onClick={() => setShowSystemPrompt(true)}
              className="px-4 py-2"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  <path d="M15 5l4 4"/>
                </svg>
                Prompt
              </span>
            </SpecularButton>
          </div>
        </div>

        {/* Right Panel - Empty for now, could show logs or settings */}
        <div className="w-[300px] h-full border-l border-white/[0.03] bg-[#050505]/50 flex flex-col">
          <div className="p-4 border-b border-white/[0.03]">
            <h3 className="text-xs text-white/30 tracking-widest uppercase font-light mb-3">Audio Levels</h3>
            <div className="h-24 flex items-end justify-center gap-1">
              {audioLevel.frequencies.slice(0, 32).map((val, i) => (
                <div
                  key={i}
                  className="w-[4px] rounded-full transition-all duration-50"
                  style={{
                    height: `${Math.max(4, val * 80)}px`,
                    background: `linear-gradient(to top, rgba(139,92,246,${0.3 + val * 0.7}), rgba(167,139,250,${0.1 + val * 0.5}))`,
                    opacity: 0.4 + val * 0.6,
                  }}
                />
              ))}
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-xs text-white/30 tracking-widest uppercase font-light mb-3">Session Log</h3>
            <div className="space-y-2 text-xs font-mono text-white/30">
              <div>VOX initialized</div>
              <div>Audio context ready</div>
              <div className="text-purple-400/60">Waiting for input...</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      
      {showVision && (
        <VisionModal onClose={() => setShowVision(false)} />
      )}

      {showSystemPrompt && (
        <SystemPromptPanel 
          isOpen={showSystemPrompt} 
          onClose={() => setShowSystemPrompt(false)} 
        />
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;