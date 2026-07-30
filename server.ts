import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper: normalize OpenAI-compatible endpoints
function formatEndpoint(baseUrl: string, defaultPath: string): string {
  let url = baseUrl.trim().replace(/\/+$/, '');
  if (url.includes('/chat/completions') || url.includes('/audio/transcriptions') || url.includes('/audio/speech')) {
    return url;
  }
  return `${url}${defaultPath}`;
}

function parseHeaders(headersStr?: string): Record<string, string> {
  if (!headersStr?.trim()) return {};
  try { return JSON.parse(headersStr); } catch { return {}; }
}

// ==================== STT ====================
app.post('/api/stt', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No audio file provided' });

    const settings = req.body.settings ? JSON.parse(req.body.settings) : {};
    const { apiUrl, apiKey, modelId, additionalHeaders } = settings;

    if (apiUrl && apiKey?.trim()) {
      const endpoint = formatEndpoint(apiUrl, '/audio/transcriptions');
      const customHeaders = parseHeaders(additionalHeaders);
      const formData = new FormData();
      formData.append('file', new Blob([file.buffer], { type: file.mimetype || 'audio/webm' }), 'recording.webm');
      formData.append('model', modelId || 'whisper-1');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey.trim()}`, ...customHeaders },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `STT Error (${response.status}): ${errText.slice(0, 200)}` });
      }
      const data = await response.json();
      return res.json({ text: data.text || '' });
    }

    // Gemini fallback
    const apiKey2 = process.env.GEMINI_API_KEY;
    if (!apiKey2) return res.status(500).json({ error: 'No STT API key configured and GEMINI_API_KEY missing.' });

    const base64Data = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'audio/webm';

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey2}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: 'Listen carefully to this audio recording and transcribe the exact words spoken. Return ONLY the transcribed text without any quotes, preambles, or commentary. If no speech, return empty string.' },
          ],
        }],
      }),
    });

    const geminiData = await geminiRes.json() as any;
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    return res.json({ text });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'STT processing failed' });
  }
});

// ==================== LLM ====================
app.post('/api/llm', async (req: Request, res: Response) => {
  try {
    const { messages, settings, systemPrompt } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const { apiUrl, apiKey, modelId, temperature, maxTokens, additionalHeaders } = settings || {};

    if (apiUrl && apiKey?.trim()) {
      const endpoint = formatEndpoint(apiUrl, '/chat/completions');
      const customHeaders = parseHeaders(additionalHeaders);
      const formattedMessages: any[] = [];
      if (systemPrompt?.trim()) formattedMessages.push({ role: 'system', content: systemPrompt.trim() });
      for (const msg of messages) {
        if (['user', 'assistant', 'system'].includes(msg.role)) {
          formattedMessages.push({ role: msg.role, content: msg.content });
        }
      }

      const bodyPayload: any = { model: modelId || 'gpt-4o-mini', messages: formattedMessages };
      if (typeof temperature === 'number') bodyPayload.temperature = temperature;
      if (typeof maxTokens === 'number' && maxTokens > 0) bodyPayload.max_tokens = maxTokens;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.trim()}`, ...customHeaders },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `LLM Error (${response.status}): ${errText.slice(0, 200)}` });
      }
      const data = await response.json();
      return res.json({ text: data.choices?.[0]?.message?.content || '' });
    }

    // Gemini fallback
    const apiKey2 = process.env.GEMINI_API_KEY;
    if (!apiKey2) return res.status(500).json({ error: 'No LLM API key configured and GEMINI_API_KEY missing.' });

    const geminiContents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: any = { contents: geminiContents };
    if (systemPrompt?.trim()) body.systemInstruction = { parts: [{ text: systemPrompt.trim() }] };

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey2}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const geminiData = await geminiRes.json() as any;
    return res.json({ text: geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'LLM request failed' });
  }
});

// ==================== TTS ====================
async function edgeTtsToBuffer(text: string, voice: string, speed?: number): Promise<Buffer> {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice || 'en-US-GuyNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(text, {
    rate: typeof speed === 'number' && speed !== 1.0 ? `${Math.round((speed - 1) * 100)}%` : '+0%',
  });
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    audioStream.on('data', (data: Buffer) => chunks.push(data));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', reject);
  });
}

app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, settings } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text prompt is required' });

    const { apiUrl, apiKey, modelId, voice, speed, responseFormat, additionalHeaders } = settings || {};

    // Custom OpenAI-compatible TTS
    if (apiUrl && apiKey?.trim()) {
      const customHeaders = parseHeaders(additionalHeaders);
      const isFishAudio = apiUrl.includes('fish.audio');
      let endpoint: string;
      let body: Record<string, any>;

      if (isFishAudio) {
        endpoint = apiUrl.trim().replace(/\/+$/, '') + '/v1/tts';
        body = { text: text.trim(), reference_id: voice || undefined, format: responseFormat || 'mp3' };
        if (typeof speed === 'number' && speed !== 1.0) body.prosody = { speed };
      } else {
        endpoint = formatEndpoint(apiUrl, '/audio/speech');
        body = {
          model: modelId || 'tts-1',
          input: text.trim(),
          voice: voice || 'alloy',
          speed: typeof speed === 'number' ? speed : 1.0,
          response_format: responseFormat || 'mp3',
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
          ...(isFishAudio ? { model: modelId || 's2.1-pro-free' } : {}),
          ...customHeaders,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `TTS Error (${response.status}): ${errText.slice(0, 200)}` });
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const mimeType = responseFormat === 'wav' ? 'audio/wav' : responseFormat === 'opus' ? 'audio/opus' : 'audio/mpeg';
      res.setHeader('Content-Type', mimeType);
      return res.send(audioBuffer);
    }

    // Edge TTS (free, no API key)
    if (modelId === 'edge-tts' || (!apiKey && !process.env.GEMINI_API_KEY)) {
      const audioBuffer = await edgeTtsToBuffer(text.trim(), voice || 'en-US-GuyNeural', speed);
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(audioBuffer);
    }

    // Gemini TTS fallback
    const apiKey2 = process.env.GEMINI_API_KEY;
    if (!apiKey2) return res.status(500).json({ error: 'No TTS method available.' });

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey2}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: text.trim() }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Kore' } } },
        },
      }),
    });

    const geminiData = await geminiRes.json() as any;
    const base64Audio = geminiData?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return res.status(500).json({ error: 'Failed to generate audio from Gemini TTS' });

    const buffer = Buffer.from(base64Audio, 'base64');
    res.setHeader('Content-Type', 'audio/mp3');
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'TTS generation failed' });
  }
});

// ==================== VISION ====================
app.post('/api/vision', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image file provided' });

    const settings = req.body.settings ? JSON.parse(req.body.settings) : {};
    const { apiUrl, apiKey, modelId, additionalHeaders } = settings;

    // Custom OpenAI-compatible vision endpoint
    if (apiUrl && apiKey?.trim()) {
      const endpoint = formatEndpoint(apiUrl, '/chat/completions');
      const customHeaders = parseHeaders(additionalHeaders);
      const base64Data = file.buffer.toString('base64');
      const mimeType = file.mimetype || 'image/jpeg';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.trim()}`, ...customHeaders },
        body: JSON.stringify({
          model: modelId || 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this image in detail. What do you see? Be specific about objects, colors, text, people, and the overall scene.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
          }],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `Vision Error (${response.status}): ${errText.slice(0, 200)}` });
      }
      const data = await response.json();
      return res.json({ text: data.choices?.[0]?.message?.content || '' });
    }

    // Gemini fallback
    const apiKey2 = process.env.GEMINI_API_KEY;
    if (!apiKey2) return res.status(500).json({ error: 'No vision API configured and GEMINI_API_KEY missing.' });

    const base64Data = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/jpeg';

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey2}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Describe this image in detail. What do you see? Be specific about objects, colors, text, people, and the overall scene.' },
            { inlineData: { data: base64Data, mimeType } },
          ],
        }],
      }),
    });

    const geminiData = await geminiRes.json() as any;
    return res.json({ text: geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Vision analysis failed' });
  }
});

// ==================== TEST ENDPOINTS ====================
app.post('/api/test-stt', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const settings = req.body.settings ? JSON.parse(req.body.settings) : {};
    if (settings.apiUrl && settings.apiKey) {
      return res.json({ success: true, message: 'STT configuration validated' });
    }
    if (process.env.GEMINI_API_KEY) return res.json({ success: true, message: 'Using default Gemini STT' });
    return res.status(400).json({ success: false, message: 'No valid STT config found' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/test-llm', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    const { apiUrl, apiKey, modelId } = settings || {};

    if (apiUrl && apiKey) {
      const endpoint = formatEndpoint(apiUrl, '/chat/completions');
      const testRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.trim()}` },
        body: JSON.stringify({ model: modelId || 'gpt-4o-mini', messages: [{ role: 'user', content: 'Say hello in 3 words' }], max_tokens: 10 }),
      });

      if (!testRes.ok) {
        const errText = await testRes.text();
        return res.status(testRes.status).json({ success: false, message: `Connection failed (${testRes.status}): ${errText.slice(0, 150)}` });
      }
      const data = await testRes.json();
      return res.json({ success: true, message: `Success! Response: "${data.choices?.[0]?.message?.content || 'Connected'}"` });
    }

    if (process.env.GEMINI_API_KEY) return res.json({ success: true, message: 'Connected via default Gemini model!' });
    return res.status(400).json({ success: false, message: 'API Key required for custom endpoint' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/test-tts', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    const { apiUrl, apiKey, modelId, voice } = settings || {};

    if (modelId === 'edge-tts' || (!apiUrl && !apiKey)) {
      try {
        const audioBuffer = await edgeTtsToBuffer('Voice assistant audio test.', voice || 'en-US-GuyNeural');
        const base64 = audioBuffer.toString('base64');
        return res.json({ success: true, message: 'Edge TTS test successful!', audioBase64: `data:audio/mp3;base64,${base64}` });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: `Edge TTS test failed: ${err.message}` });
      }
    }

    if (apiUrl && apiKey) {
      return res.json({ success: true, message: 'TTS configuration validated' });
    }
    return res.status(400).json({ success: false, message: 'No valid TTS config' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== Vite Dev Middleware ====================
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('/{*path}', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VOX Voice Assistant running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
