export interface AudioServiceConfig {
  onAudioLevel: (level: { volume: number; frequencies: number[] }) => void;
  onRecordingComplete: (audioBlob: Blob) => void;
  onError: (error: Error) => void;
}

export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animationFrame: number | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private config: AudioServiceConfig;
  private recordingCompleteCallback: ((blob: Blob) => void) | null = null;

  constructor(config: AudioServiceConfig) {
    this.config = config;
  }

  async startRecording(): Promise<void> {
    this.stopPlayback();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream = stream;

      // Set up audio context for visualization
      this.audioContext = new AudioContext();
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate overall volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const volume = sum / bufferLength / 255;

        // Get frequency bands (16 bands)
        const bands = 16;
        const freqStep = Math.floor(bufferLength / bands);
        const frequencies: number[] = [];
        for (let b = 0; b < bands; b++) {
          let bandSum = 0;
          for (let i = b * freqStep; i < (b + 1) * freqStep && i < bufferLength; i++) {
            bandSum += dataArray[i];
          }
          frequencies.push(bandSum / freqStep / 255);
        }

        this.config.onAudioLevel({ volume, frequencies });
        this.animationFrame = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Start recording
      this.audioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        this.cleanupRecording();
        if (this.recordingCompleteCallback) {
          this.recordingCompleteCallback(blob);
          this.recordingCompleteCallback = null;
        }
      };
      this.mediaRecorder.start();
    } catch (error) {
      this.config.onError(error as Error);
      throw error;
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.stream) {
        reject(new Error('No active recording'));
        return;
      }

      this.recordingCompleteCallback = resolve;
      this.mediaRecorder.stop();
    });
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.cleanupRecording();
  }

  private cleanupRecording(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.audioChunks = [];
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.source = null;
    this.analyser = null;
  }

  getIsRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  async playAudio(
    blob: Blob,
    onAudioLevel?: (level: { volume: number; frequencies: number[] }) => void,
    onComplete?: () => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.audioElement = audio;

      // Set up analyser for playback visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(audio);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!audio.paused && !audio.ended && onAudioLevel) {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const volume = sum / bufferLength / 255;

          const bands = 16;
          const freqStep = Math.floor(bufferLength / bands);
          const frequencies: number[] = [];
          for (let b = 0; b < bands; b++) {
            let bandSum = 0;
            for (let i = b * freqStep; i < (b + 1) * freqStep && i < bufferLength; i++) {
              bandSum += dataArray[i];
            }
            frequencies.push(bandSum / freqStep / 255);
          }

          onAudioLevel({ volume, frequencies });
          requestAnimationFrame(updateLevel);
        }
      };

      audio.onplay = () => {
        updateLevel();
      };

      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioCtx.close();
        onComplete?.();
        resolve();
      };

      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        audioCtx.close();
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }

  stopPlayback(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }

  cleanup(): void {
    this.cancelRecording();
    this.stopPlayback();
  }
}

export const audioService = new AudioService({
  onAudioLevel: () => {},
  onRecordingComplete: () => {},
  onError: () => {},
});