import { AppSettings } from '../types';

export interface TTSResponse {
  audioBlob: Blob;
  format: 'mp3' | 'wav' | 'ogg';
}

export class TTSService {
  private settings: AppSettings['tts'];

  constructor(settings: AppSettings['tts']) {
    this.settings = settings;
  }

  updateSettings(settings: AppSettings['tts']) {
    this.settings = settings;
  }

  async synthesize(text: string): Promise<TTSResponse> {
    // Try OpenAI-compatible endpoint first
    try {
      const response = await fetch(`${this.settings.apiUrl}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`,
          ...JSON.parse(this.settings.additionalHeaders || '{}'),
        },
        body: JSON.stringify({
          model: this.settings.modelId || 'tts-1',
          input: text,
          voice: this.settings.voice || 'alloy',
          response_format: this.settings.responseFormat || 'mp3',
          speed: this.settings.speed ?? 1.0,
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        return { audioBlob, format: 'mp3' };
      }
    } catch (error) {
      console.warn('OpenAI TTS failed, trying Edge TTS:', error);
    }

    // Fallback to Edge TTS (via server-side proxy)
    return this.synthesizeWithEdgeTTS(text);
  }

  private async synthesizeWithEdgeTTS(text: string): Promise<TTSResponse> {
    const response = await fetch(`${this.settings.apiUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: 'edge-tts',
        input: text,
        voice: this.settings.voice || 'en-US-AriaNeural',
        response_format: this.settings.responseFormat || 'mp3',
        speed: this.settings.speed ?? 1.0,
      }),
    });

    if (!response.ok) {
      // Try server-side Edge TTS proxy
      return this.synthesizeWithServerEdgeTTS(text);
    }

    const audioBlob = await response.blob();
    return { audioBlob, format: 'mp3' };
  }

  private async synthesizeWithServerEdgeTTS(text: string): Promise<TTSResponse> {
    // This will be handled by the server-side Edge TTS endpoint
    const response = await fetch('/api/tts/edge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: this.settings.voice || 'en-US-AriaNeural',
        speed: this.settings.speed ?? 1.0,
      }),
    });

    if (!response.ok) {
      // Last resort: try Gemini TTS
      return this.synthesizeWithGemini(text);
    }

    const audioBlob = await response.blob();
    return { audioBlob, format: 'mp3' };
  }

  private async synthesizeWithGemini(text: string): Promise<TTSResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${this.settings.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: this.settings.voice || 'Kore',
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini TTS error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) {
      throw new Error('No audio data from Gemini TTS');
    }

    // Convert base64 to blob
    const binaryString = atob(audioData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return { audioBlob: new Blob([bytes], { type: 'audio/wav' }), format: 'wav' };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.settings.apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: 'OpenAI-compatible TTS endpoint connected' };
      }
    } catch {}

    // Try Edge TTS
    try {
      const response = await fetch(`${this.settings.apiUrl}/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'edge-tts', input: 'test', voice: 'en-US-AriaNeural' }),
      });
      if (response.ok) {
        return { success: true, message: 'Edge TTS endpoint connected' };
      }
    } catch {}

    // Try Gemini
    if (this.settings.apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${this.settings.apiKey}`
        );
        if (response.ok) {
          return { success: true, message: 'Gemini TTS endpoint connected' };
        }
      } catch {}
    }

    return { success: false, message: 'Could not connect to any TTS provider' };
  }
}