import { AppSettings } from '../types';

export interface VisionResponse {
  text: string;
  model?: string;
}

export class VisionService {
  private settings: AppSettings['llm']; // Reuse LLM settings for vision (OpenAI-compatible vision models)

  constructor(settings: AppSettings['llm']) {
    this.settings = settings;
  }

  updateSettings(settings: AppSettings['llm']) {
    this.settings = settings;
  }

  async analyzeImage(imageFile: File): Promise<VisionResponse> {
    const base64Image = await this.fileToBase64(imageFile);

    // Try OpenAI-compatible vision endpoint first
    try {
      const response = await fetch(`${this.settings.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`,
          ...JSON.parse(this.settings.additionalHeaders || '{}'),
        },
        body: JSON.stringify({
          model: this.settings.modelId || 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this image and describe what you see in detail.' },
                { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${base64Image}` } },
              ],
            },
          ],
          max_tokens: this.settings.maxTokens || 1024,
          temperature: this.settings.temperature || 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          text: data.choices?.[0]?.message?.content || '',
          model: data.model,
        };
      }
    } catch (error) {
      console.warn('OpenAI vision failed, trying Gemini:', error);
    }

    // Fallback to Google Gemini Vision
    return this.analyzeWithGemini(base64Image, imageFile.type);
  }

  private async analyzeWithGemini(base64Image: string, mimeType: string): Promise<VisionResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.settings.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Analyze this image and describe what you see in detail.' },
              { inline_data: { mime_type: mimeType, data: base64Image } }
            ]
          }]
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini Vision error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text, model: 'gemini-1.5-flash' };
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.settings.apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: 'OpenAI-compatible Vision endpoint connected' };
      }
    } catch {}

    // Try Gemini
    if (this.settings.apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${this.settings.apiKey}`
        );
        if (response.ok) {
          return { success: true, message: 'Gemini Vision endpoint connected' };
        }
      } catch {}
    }

    return { success: false, message: 'Could not connect to any Vision provider' };
  }
}