import { AppSettings } from '../types';

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LLMService {
  private settings: AppSettings['llm'];

  constructor(settings: AppSettings['llm']) {
    this.settings = settings;
  }

  updateSettings(settings: AppSettings['llm']) {
    this.settings = settings;
  }

  async generateResponse(
    messages: { role: string; content: string }[],
    systemPrompt: string
  ): Promise<LLMResponse> {
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Try OpenAI-compatible endpoint first
    try {
      const response = await fetch(`${this.settings.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`,
          ...JSON.parse(this.settings.additionalHeaders || '{}'),
        },
        body: JSON.stringify({
          model: this.settings.modelId,
          messages: fullMessages,
          temperature: this.settings.temperature ?? 0.7,
          max_tokens: this.settings.maxTokens ?? 2048,
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          text: data.choices?.[0]?.message?.content || '',
          usage: data.usage,
        };
      }
    } catch (error) {
      console.warn('OpenAI LLM failed, trying Gemini:', error);
    }

    // Fallback to Google Gemini
    return this.generateWithGemini(fullMessages);
  }

  private async generateWithGemini(messages: { role: string; content: string }[]): Promise<LLMResponse> {
    // Convert messages to Gemini format
    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.settings.modelId}:generateContent?key=${this.settings.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: this.settings.temperature ?? 0.7,
            maxOutputTokens: this.settings.maxTokens ?? 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini LLM error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.settings.apiUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.settings.apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: 'OpenAI-compatible LLM endpoint connected' };
      }
    } catch {}

    // Try Gemini
    if (this.settings.apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${this.settings.apiKey}`
        );
        if (response.ok) {
          return { success: true, message: 'Gemini LLM endpoint connected' };
        }
      } catch {}
    }

    return { success: false, message: 'Could not connect to any LLM provider' };
  }
}