import { AppSettings } from '../types';

export interface STTResponse {
  text: string;
  language?: string;
  duration?: number;
}

export class STTService {
  private settings: AppSettings['stt'];

  constructor(settings: AppSettings['stt']) {
    this.settings = settings;
  }

  updateSettings(settings: AppSettings['stt']) {
    this.settings = settings;
  }

  async transcribe(audioBlob: Blob): Promise<STTResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', this.settings.modelId);
    if (this.settings.temperature !== undefined) {
      formData.append('temperature', this.settings.temperature.toString());
    }
    if (this.settings.responseFormat) {
      formData.append('response_format', this.settings.responseFormat);
    }

    // Try OpenAI-compatible endpoint first
    try {
      const response = await fetch(`${this.settings.apiUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`,
          ...JSON.parse(this.settings.additionalHeaders || '{}'),
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return { text: data.text };
      }
    } catch (error) {
      console.warn('OpenAI STT failed, trying Gemini:', error);
    }

    // Fallback to Google Gemini
    return this.transcribeWithGemini(audioBlob);
  }

  private async transcribeWithGemini(audioBlob: Blob): Promise<STTResponse> {
    const base64Audio = await this.blobToBase64(audioBlob);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.settings.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Transcribe this audio to text. Return only the transcription text.' },
              { inline_data: { mime_type: 'audio/webm', data: base64Audio } }
            ]
          }]
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini STT error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text };
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.settings.apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: 'OpenAI-compatible STT endpoint connected' };
      }
    } catch {}

    // Try Gemini
    if (this.settings.apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${this.settings.apiKey}`
        );
        if (response.ok) {
          return { success: true, message: 'Gemini STT endpoint connected' };
        }
      } catch {}
    }

    return { success: false, message: 'Could not connect to any STT provider' };
  }
}