import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON with up to 25MB payload for audio
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Lazy Google GenAI Client getter
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// MIME Type normalization
function normalizeAudioMimeType(type: string, fileName = ''): string {
  const cleanType = (type || '').toLowerCase().split(';')[0].trim();
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (cleanType === 'audio/x-m4a' || cleanType === 'audio/m4a' || extension === 'm4a') {
    return 'audio/mp4';
  }

  if (cleanType === 'audio/mpeg' || cleanType === 'audio/mp3' || extension === 'mp3') {
    return 'audio/mpeg';
  }

  if (cleanType === 'audio/wav' || cleanType === 'audio/x-wav' || extension === 'wav') {
    return 'audio/wav';
  }

  if (cleanType === 'audio/ogg' || cleanType === 'audio/opus' || extension === 'ogg' || extension === 'opus') {
    return 'audio/ogg';
  }

  if (cleanType === 'audio/webm' || extension === 'webm') {
    return 'audio/webm';
  }

  return cleanType || 'audio/webm';
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'EKTBLY API' });
});

// Serve asset alias for ektbly-hero.jpg if requested
app.get('/assets/ektbly-hero.jpg', (req, res) => {
  res.redirect('/990fb9d1-0f4e-43f1-bc0b-e228d0ebeafe.jpg');
});

// Transcription prompt
const transcriptionPrompt = `
Transcribe the provided audio faithfully into Arabic script.
Support Modern Standard Arabic and Arabic dialects, especially Egyptian Arabic.
Preserve every spoken word and the speaker's actual meaning.
Add reasonable punctuation only.
Do not translate, summarize, rewrite, correct, explain, or answer the audio.
If only a small word or section cannot be understood, write [غير واضح] only in that exact position.
Do not return [غير واضح] for the entire audio unless the audio contains no intelligible speech.
Return only the Arabic transcript without introductions, headings, notes, or Markdown.
`;

// Transcribe endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, audioData, mimeType, fileName } = req.body;
    const rawBase64 = audioBase64 || audioData;

    // Validate incoming data
    if (!rawBase64 || typeof rawBase64 !== 'string') {
      return res.status(400).json({
        error: 'لم يتم استلام بيانات الصوت بصورة صحيحة.',
      });
    }

    // Clean base64 string if it has data URL prefix
    const cleanBase64 = rawBase64.includes(',')
      ? rawBase64.split(',')[1]
      : rawBase64;

    if (cleanBase64.length < 1000) {
      return res.status(400).json({
        error: 'بيانات الملف الصوتي فارغة أو غير مكتملة.',
      });
    }

    const normalizedMimeType = normalizeAudioMimeType(mimeType || '', fileName || '');

    if (!normalizedMimeType.startsWith('audio/')) {
      return res.status(400).json({
        error: 'نوع الملف الصوتي غير صحيح.',
      });
    }

    // Temporary safe diagnostic logging
    console.log({
      mimeType: normalizedMimeType,
      base64Length: cleanBase64.length,
      approximateBytes: Math.floor(cleanBase64.length * 0.75),
      model: 'gemini-3.1-flash-lite',
    });

    const ai = getGenAI();

    let transcript = '';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: normalizedMimeType,
                },
              },
              {
                text: transcriptionPrompt,
              },
            ],
          },
        ],
      });

      transcript = response.text?.trim() || '';
    } catch (primaryErr: any) {
      console.warn('Primary model call error, attempting fallback to gemini-3.7-flash:', primaryErr?.message);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: normalizedMimeType,
                },
              },
              {
                text: transcriptionPrompt,
              },
            ],
          },
        ],
      });

      transcript = fallbackResponse.text?.trim() || '';
    }

    // Clean up transcript output
    let cleanTranscript = (transcript || '').trim();

    // Remove markdown fences if any were returned
    if (cleanTranscript.startsWith('```') && cleanTranscript.endsWith('```')) {
      cleanTranscript = cleanTranscript.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
    }

    if (!cleanTranscript) {
      return res.status(500).json({
        error: 'لم يُرجع نموذج التحويل نصًا. يرجى إعادة المحاولة.',
      });
    }

    return res.status(200).json({
      transcript: cleanTranscript,
    });
  } catch (error: any) {
    console.error('Transcription API error:', {
      name: error?.name,
      status: error?.status,
      message: error?.message,
    });

    const status =
      error?.status === 429 ? 429 :
      error?.status >= 400 && error?.status < 600 ? error.status :
      500;

    return res.status(status).json({
      error:
        status === 429
          ? 'تم الوصول إلى الحد المؤقت لاستخدام خدمة التحويل. انتظر قليلًا ثم أعد المحاولة.'
          : 'تعذر إكمال التحويل مؤقتًا. يرجى إعادة المحاولة.',
    });
  }
});

// Final Express error handler that always returns JSON
app.use((error: any, req: any, res: any, next: any) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = error?.type === 'entity.too.large' ? 413 : 500;

  return res.status(status).json({
    error:
      status === 413
        ? 'حجم الملف الصوتي أكبر من الحد المسموح.'
        : 'حدث خطأ مؤقت في الخادم. يرجى إعادة المحاولة.',
  });
});

// Setup Vite or static serving
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EKTBLY server running on http://0.0.0.0:${PORT}`);
  });
}

initServer();
